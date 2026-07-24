import { describe, expect, it } from "vitest";

import {
  ACTIONS,
  runPairedExperiment,
  runPairedExperimentWithDecisionAdapter,
  type DecisionRequest,
  type ExternalDecision,
} from "./index.js";

function recordedDecision(request: DecisionRequest): ExternalDecision {
  const evidenceVisible = request.evidence.length > 0;
  return {
    action: evidenceVisible ? "BUY" : "IDLE",
    targetIds: evidenceVisible ? ["merchant-01"] : [],
    credibilityAssessment: evidenceVisible ? 0.8 : 0.4,
    observedClaimIds: request.claims.map((claim) => claim.id),
    observedEvidenceIds: request.evidence.map((evidence) => evidence.id),
    reasonCodes: evidenceVisible ? ["RECEIPT_VERIFIED", "PRICE_ACCEPTABLE"] : ["NO_VISIBLE_RECEIPT"],
    expectedOutcome: evidenceVisible ? "Purchase the fixed offer." : "No action.",
    confidence: 0.7,
    provider: "openai-compatible",
    model: "recorded-fixture-model",
    requestHash: `request-${request.agent.id}-${request.tick}`,
    responseHash: `response-${request.agent.id}-${request.tick}`,
    attempts: 1,
    schemaFailed: false,
    usage: { promptTokens: 80, completionTokens: 30 },
  };
}

describe("paired experiment runner", () => {
  it("runs 24 consumers and one deterministic merchant for eight ticks", () => {
    const result = runPairedExperiment("paired-seed-01", "fixed-threshold");

    expect(result.control.agents).toHaveLength(24);
    expect(new Set(result.control.agents.map((agent) => agent.persona)).size).toBe(24);
    expect(new Set(result.control.agents.map((agent) => agent.communityId)).size).toBe(4);
    expect(result.control.merchant).toEqual({
      id: "merchant-01",
      deterministic: true,
      productId: "offer_eco_cup",
    });
    expect(result.control.currentTick).toBe(8);
    expect(result.treatment.currentTick).toBe(8);
    expect(result.branchDiffReport.pass).toBe(true);
  });

  it("keeps claims identical while exposing evidence only in treatment", () => {
    const result = runPairedExperiment("paired-seed-01", "fixed-threshold");

    expect(result.validation.claimParity).toBe(true);
    expect(result.validation.controlEvidenceLeakCount).toBe(0);
    expect(result.validation.treatmentEvidenceOmissionCount).toBe(0);
    expect(result.treatment.events.some((event) => event.type === "EVIDENCE_EXPOSED")).toBe(true);
  });

  it("emits every legal agent action and recovers the preset positive direction", () => {
    const result = runPairedExperiment("paired-seed-01", "fixed-threshold");
    const observedActions = new Set(result.treatment.decisions.map((decision) => decision.action));

    expect([...ACTIONS].every((action) => observedActions.has(action))).toBe(true);
    expect(result.pairedEffect).toBeGreaterThan(0);
    expect(result.validation.fixedThresholdPositive).toBe(true);
  });

  it("holds the evidence-blind paired adoption difference at exactly zero", () => {
    const result = runPairedExperiment("paired-seed-01", "evidence-blind");

    expect(result.pairedEffect).toBe(0);
    expect(result.validation.evidenceBlindZero).toBe(true);
  });

  it("isolates wallets and conserves balances and branch supply", () => {
    const result = runPairedExperiment("paired-seed-01", "fixed-threshold");
    const controlAddresses = new Set(result.control.wallets.map((wallet) => wallet.address));
    const treatmentAddresses = new Set(result.treatment.wallets.map((wallet) => wallet.address));

    expect([...controlAddresses].every((address) => !treatmentAddresses.has(address))).toBe(true);
    expect(result.validation.balancesConserved).toBe(true);
    expect(result.validation.suppliesConserved).toBe(true);
  });

  it("lets a recorded asynchronous decision adapter drive the same event engine", async () => {
    const result = await runPairedExperimentWithDecisionAdapter("llm-recording-seed", async (request) => recordedDecision(request));

    expect(result.control.decisionMode).toBe("llm");
    expect(result.control.metrics.adoptedNonSeed).toBe(0);
    expect(result.treatment.metrics.adoptedNonSeed).toBeGreaterThan(0);
    expect(result.treatment.events.some((event) => event.type === "X402_PAYMENT_SETTLED")).toBe(true);
    expect(result.treatment.decisions.every((decision) => decision.provider === "openai-compatible")).toBe(true);
    expect(result.validation.controlEvidenceLeakCount).toBe(0);
    expect(result.validation.treatmentEvidenceOmissionCount).toBe(0);
  });

  it("rejects and redacts an external decision that cites invisible evidence", async () => {
    const result = await runPairedExperimentWithDecisionAdapter("llm-invalid-reference", async (request) => ({
      ...recordedDecision(request),
      action: "BUY",
      observedEvidenceIds: ["evidence-not-visible"],
    }));

    expect(result.control.events.some((event) => event.type === "ACTION_REJECTED")).toBe(true);
    expect(result.control.decisions.every((decision) => decision.action === "IDLE")).toBe(true);
    expect(JSON.stringify(result.control.decisions)).not.toContain("evidence-not-visible");
  });
});
