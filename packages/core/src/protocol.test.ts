import { describe, expect, it } from "vitest";

import { createBranchConfig, lockDefaultProtocol, validateBranchDiff } from "./protocol.js";

describe("protocol and branch isolation", () => {
  it("allows only branch operations and receipt visibility", () => {
    const protocol = lockDefaultProtocol("paired-seed-01");
    const control = createBranchConfig(protocol, "control", "fixed-threshold");
    const treatment = createBranchConfig(protocol, "treatment", "fixed-threshold");
    const report = validateBranchDiff(control, treatment);

    expect(report.pass).toBe(true);
    expect(report.semanticDifferenceCount).toBe(0);
    expect(report.differences.map((difference) => difference.path)).toEqual([
      "branchId",
      "receiptVisibility",
      "runId",
      "walletNamespace",
    ]);
  });

  it("rejects a hidden product price difference", () => {
    const protocol = lockDefaultProtocol("paired-seed-01");
    const control = createBranchConfig(protocol, "control", "fixed-threshold");
    const treatment = createBranchConfig(protocol, "treatment", "fixed-threshold");
    const invalidTreatment = {
      ...treatment,
      offer: { ...treatment.offer, amount: "400000" as "300000" },
    };
    const report = validateBranchDiff(control, invalidTreatment);

    expect(report.pass).toBe(false);
    expect(report.differences).toContainEqual({
      path: "offer.amount",
      control: "300000",
      treatment: "400000",
      allowed: false,
    });
  });
});
