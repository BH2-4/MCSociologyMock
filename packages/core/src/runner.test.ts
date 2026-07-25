import { describe, expect, it } from "vitest";

import {
  ACTIONS,
  runPairedExperiment,
  runPairedExperimentWithDecisionAdapter,
  type DecisionRequest,
  type ExternalDecision,
  type RecordedSeedPayment,
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
    attemptAudit: [{
      attempt: 1,
      requestHash: `request-${request.agent.id}-${request.tick}`,
      responseHash: `response-${request.agent.id}-${request.tick}`,
      schemaValid: true,
      referencesValid: true,
      failureCode: null,
      usage: { promptTokens: 80, completionTokens: 30 },
    }],
    schemaFailed: false,
    usage: { promptTokens: 80, completionTokens: 30 },
  };
}

function recordedSeedPayments(): RecordedSeedPayment[] {
  return ([
    ["control", "consumer-01"],
    ["control", "consumer-13"],
    ["treatment", "consumer-01"],
    ["treatment", "consumer-13"],
  ] as const).map(([branchId, logicalAgentId], index) => {
    const payerAddress = `0x${String(index + 1).repeat(40)}` as `0x${string}`;
    const txHash = `0x${String(index + 1).repeat(64)}` as `0x${string}`;
    const paymentId = `seed:${branchId}:${logicalAgentId}`;
    return {
      branchId,
      logicalAgentId,
      payerAddress,
      fulfillmentId: `fulfillment:${branchId}:${logicalAgentId}`,
      txHash,
      evidence: {
        id: `evidence:${paymentId}`,
        subjectAgentId: logicalAgentId,
        paymentId,
        productId: "offer_eco_cup",
        merchantId: "merchant-01",
        amount: "300000",
        status: "VERIFIED",
        proofScope: ["PURCHASE_OCCURRED", "AMOUNT", "MERCHANT", "TIME"],
        doesNotProve: ["PRODUCT_QUALITY", "ACTUAL_USAGE", "REVIEW_TRUTH", "RECOMMENDATION_MOTIVE"],
        verifiedAtTick: 1,
        txHash,
        blockscoutUrl: `https://testnet.blockscout.injective.network/tx/${txHash}`,
        source: "INJECTIVE_TESTNET",
      },
    };
  });
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
    expect(result.validation.walletIsolation).toBe(true);
    expect(result.validation.seedPaymentParity).toBe(true);
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

  it("replays verified testnet seed receipts inside the paired experiment", () => {
    const recordings = recordedSeedPayments();
    const result = runPairedExperiment("testnet-recording", "fixed-threshold", {
      recordedSeedPayments: recordings,
    });

    for (const recording of recordings) {
      const branch = result[recording.branchId];
      expect(branch.wallets.find((wallet) => wallet.logicalAgentId === recording.logicalAgentId)?.address)
        .toBe(recording.payerAddress);
      expect(branch.payments.find((payment) => payment.payerAgentId === recording.logicalAgentId)).toMatchObject({
        source: "INJECTIVE_TESTNET",
        txHash: recording.txHash,
        mockReceiptId: null,
      });
      expect(branch.evidence.find((evidence) => evidence.subjectAgentId === recording.logicalAgentId)?.blockscoutUrl)
        .toContain(recording.txHash);
    }
    expect(result.treatment.payments.some((payment) => payment.source === "MOCK")).toBe(true);
    expect(result.validation.controlEvidenceLeakCount).toBe(0);
  });

  it("blocks a recorded seed payer that reuses another branch wallet address", () => {
    const recordings = recordedSeedPayments();
    recordings[0]!.payerAddress = recordings[2]!.payerAddress;

    expect(() => runPairedExperiment("wallet-reuse", "fixed-threshold", {
      recordedSeedPayments: recordings,
    })).toThrow("RECORDED_SEED_PAYER_REUSED");
  });

  it("blocks a recorded payer that collides with a deterministic non-seed wallet", () => {
    const recordings = recordedSeedPayments();
    const deterministicRun = runPairedExperiment("wallet-collision", "fixed-threshold");
    recordings[0]!.payerAddress = deterministicRun.control.wallets
      .find((wallet) => wallet.logicalAgentId === "consumer-02")!.address;

    expect(() => runPairedExperiment("wallet-collision", "fixed-threshold", {
      recordedSeedPayments: recordings,
    })).toThrow("BRANCH_WALLET_ADDRESS_REUSED");
  });
});
