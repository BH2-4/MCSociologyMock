import { describe, expect, it } from "vitest";

import {
  createPublishingBranchConfig,
  createPublishingPopulation,
  lockPublishingProtocol,
  PUBLISHING_ACTIONS,
  replayPublishingPair,
  runPublishingPair,
  runPublishingPairWithDecisionAdapter,
  validateLocalizationGate,
  validatePublishingBranchDiff,
} from "./publishing-experiment.js";

describe("publishing experiment", () => {
  it("runs a four-agent smoke pair without branch leakage", () => {
    const result = runPublishingPair("smoke-jp-01", 4);

    expect(result.control.agents).toHaveLength(4);
    expect(result.localizationGate.pass).toBe(true);
    expect(result.branchDiffReport.pass).toBe(true);
    expect(result.validation.populationParity).toBe(true);
    expect(result.validation.networkParity).toBe(true);
    expect(result.validation.sourceReferencesValid).toBe(true);
    expect(result.validation.ledgerConserved).toBe(true);
  });

  it("completes the 24-agent pair with complete structured action coverage", () => {
    const result = runPublishingPair("zzz-jp-seed-01");

    expect(result.control.agents).toHaveLength(24);
    expect(result.control.currentTick).toBe(8);
    expect(result.treatment.currentTick).toBe(8);
    expect(result.status).toBe("AWAITING_POSTLAUNCH_OBSERVATION");
    expect(PUBLISHING_ACTIONS.filter((action) => !result.validation.actionCoverage[action])).toEqual([]);
    expect(result.control.ledger.some((entry) => entry.category === "SIMULATED_TOP_UP")).toBe(true);
    expect(result.treatment.ledger.some((entry) => entry.category === "SIMULATED_TOP_UP")).toBe(true);
    expect(new Set(result.control.ledger.map((entry) => entry.unit))).toEqual(new Set(["SYNTHETIC_RESOURCE_UNIT"]));
    expect(result.protocol.decisionPrompt).toContain("without hidden chain-of-thought");
    expect(result.disclaimer).toContain("不代表日本全平台或单角色真实流水");
  });

  it("rejects an illegal fact or shared configuration difference", () => {
    const protocol = lockPublishingProtocol("illegal-diff");
    const agents = createPublishingPopulation();
    const control = createPublishingBranchConfig(protocol, "control", agents);
    const treatment = createPublishingBranchConfig(protocol, "treatment", agents);
    const tampered = {
      ...treatment,
      factSlots: treatment.factSlots.map((fact, index) => index === 0 ? { ...fact, text: "Changed launch promise." } : fact),
    };

    expect(validateLocalizationGate(control, tampered).pass).toBe(false);
    expect(validatePublishingBranchDiff(control, tampered).pass).toBe(false);
  });

  it("replays metrics without network, model or ledger side effects", () => {
    const result = runPublishingPair("replay-jp-01");
    const replay = replayPublishingPair(result);

    expect(replay.controlMetrics).toEqual(result.control.metrics);
    expect(replay.treatmentMetrics).toEqual(result.treatment.metrics);
    expect(replay.pairedEffect).toBe(result.pairedEffect);
    expect(replay.eventHash).toMatch(/^[a-f0-9]{64}$/);
    expect(replay.sideEffects).toEqual({ networkCalls: 0, llmCalls: 0, ledgerWrites: 0 });
  });

  it("runs the LLM adapter serially for Control then Treatment with a fixed observation contract", async () => {
    const calls: string[] = [];
    const result = await runPublishingPairWithDecisionAdapter("llm-publishing-01", async (request) => {
      calls.push(request.message.positioning);
      if (request.currentBalance >= 180) expect(request.allowedActions).not.toContain("SIMULATED_TOP_UP");
      return {
        action: request.agent.index % 3 === 0 ? "PLAN_PULL" : "SAVE",
        targetIds: [],
        sourceIds: [...request.visibleSourceIds],
        messageId: request.message.id,
        reasonCode: "FIXTURE_DECISION",
        confidence: 0.6,
      };
    }, 4);

    expect(calls).toEqual([
      "COMBAT_VALUE_FIRST", "COMBAT_VALUE_FIRST", "COMBAT_VALUE_FIRST",
      "CHARACTER_AFFINITY_FIRST", "CHARACTER_AFFINITY_FIRST", "CHARACTER_AFFINITY_FIRST",
    ]);
    expect(result.validation.populationParity).toBe(true);
    expect(result.validation.networkParity).toBe(true);
    expect(result.control.events.some((event) => event.payload.decisionSource === "llm")).toBe(true);
  });
});
