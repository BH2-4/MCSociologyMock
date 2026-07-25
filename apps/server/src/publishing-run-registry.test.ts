import { runPublishingPair } from "@gesellschaft/core";
import { describe, expect, it } from "vitest";

import { PublishingRunRegistry } from "./publishing-run-registry.js";

const observation = {
  point: "T_RELEASE" as const,
  observedAt: "2026-07-29T00:00:00+09:00",
  publishedAt: "2026-07-29T00:00:00+09:00",
  collectedAt: "2026-07-29T00:05:00+09:00",
  sourceUrl: "https://example.test/public-fixture",
  sourceTier: "B_MEASURED" as const,
  platformScope: "JP_IOS_APP_STORE" as const,
  metricName: "jp_ios_grossing_rank",
  measurementPeriod: "T_release point observation",
  licenseStatus: "PUBLIC_REFERENCE_ONLY" as const,
  value: 10,
  unit: "ORDINAL_RANK" as const,
  currency: "NONE" as const,
  methodology: "Synthetic server test fixture; not a product observation.",
};

describe("publishing run registry", () => {
  it("appends a validated observation without changing the frozen protocol or Snapshot", () => {
    const registry = new PublishingRunRegistry();
    const result = runPublishingPair("registry-observation-01", 4);
    registry.save("pair-01", result);

    const report = registry.appendObservation("pair-01", observation, new Date("2026-07-29T00:06:00+09:00"));

    expect(report.status).toBe("PARTIAL_POSTLAUNCH_OBSERVATION");
    expect(report.protocolHash).toBe(result.protocol.protocolHash);
    expect(report.snapshotId).toBe(result.snapshot.snapshotId);
    expect(report.observations[0]).toEqual(expect.objectContaining({ market: "JP", licenseStatus: "PUBLIC_REFERENCE_ONLY" }));
    expect(() => registry.appendObservation("pair-01", observation, new Date("2026-07-29T00:06:00+09:00"))).toThrow("DUPLICATE_POSTLAUNCH_OBSERVATION");
  });

  it("rejects future observations and retains the original waiting report", () => {
    const registry = new PublishingRunRegistry();
    registry.save("pair-02", runPublishingPair("registry-observation-02", 4));

    expect(() => registry.appendObservation("pair-02", observation, new Date("2026-07-25T12:00:00+09:00"))).toThrow("OBSERVATION_FROM_FUTURE");
    expect(registry.report("pair-02")?.status).toBe("AWAITING_POSTLAUNCH_OBSERVATION");
  });

  it("keeps only the configured number of in-session records", () => {
    const registry = new PublishingRunRegistry(2);
    registry.save("pair-a", runPublishingPair("registry-a", 4));
    registry.save("pair-b", runPublishingPair("registry-b", 4));
    registry.save("pair-c", runPublishingPair("registry-c", 4));

    expect(registry.get("pair-a")).toBeUndefined();
    expect(registry.get("pair-b")).toBeDefined();
    expect(registry.get("pair-c")).toBeDefined();
  });
});
