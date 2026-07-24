import { describe, expect, it } from "vitest";

import { ACTIONS, runPairedExperiment } from "./index.js";

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
});
