import { describe, expect, it } from "vitest";

import { runPublishingPair } from "./publishing-experiment.js";
import { createPublicProxyObservation, createPublishingReport } from "./publishing-report.js";

function observation(point: "T_RELEASE" | "T_PLUS_24H" | "T_PLUS_72H", observedAt: string) {
  return createPublicProxyObservation({
    point,
    observedAt,
    publishedAt: observedAt,
    collectedAt: "2026-08-01T01:30:00+09:00",
    sourceUrl: "https://example.test/public-fixture",
    sourceTier: "B_MEASURED",
    platformScope: "JP_IOS_APP_STORE",
    metricName: "test_only_rank",
    measurementPeriod: "Synthetic test observation point.",
    licenseStatus: "PUBLIC_REFERENCE_ONLY",
    value: 10,
    unit: "ORDINAL_RANK",
    currency: "NONE",
    methodology: "Synthetic unit-test fixture. Never included in the product dataset.",
  }, new Date("2026-08-01T02:00:00+09:00"));
}

describe("publishing report and post-launch contract", () => {
  it("rejects observations before their real time window", () => {
    expect(() => observation("T_RELEASE", "2026-07-28T23:59:59+09:00")).toThrow("OBSERVATION_POINT_TOO_EARLY");
    expect(() => observation("T_PLUS_72H", "2026-07-31T23:59:59+09:00")).toThrow("OBSERVATION_POINT_TOO_EARLY");
  });

  it("rejects future-dated observations in the formal collection path", () => {
    expect(() => createPublicProxyObservation({
      point: "T_RELEASE",
      observedAt: "2026-07-29T00:00:00+09:00",
      publishedAt: "2026-07-29T00:00:00+09:00",
      collectedAt: "2026-07-29T00:05:00+09:00",
      sourceUrl: "https://example.test/future-fixture",
      sourceTier: "B_MEASURED",
      platformScope: "JP_IOS_APP_STORE",
      metricName: "test_only_rank",
      measurementPeriod: "Synthetic test observation point.",
      licenseStatus: "PUBLIC_REFERENCE_ONLY",
      value: 10,
      unit: "ORDINAL_RANK",
      currency: "NONE",
      methodology: "Synthetic unit-test fixture.",
    }, new Date("2026-07-25T12:00:00+09:00"))).toThrow("OBSERVATION_FROM_FUTURE");
  });

  it("keeps the pre-launch report in an explicit awaiting state", () => {
    const result = runPublishingPair("report-jp-01");
    const report = createPublishingReport(result);

    expect(report.status).toBe("AWAITING_POSTLAUNCH_OBSERVATION");
    expect(report.observations).toEqual([]);
    expect(report.primaryResult.pairedDifference).toBe(result.pairedEffect);
    expect(report.failureChecks.every((check) => check.pass)).toBe(true);
  });

  it("completes the observation window without changing protocol or snapshot hashes", () => {
    const result = runPublishingPair("report-jp-02");
    const beforeProtocol = result.protocol.protocolHash;
    const beforeSnapshot = result.snapshot.snapshotId;
    const report = createPublishingReport(result, [
      observation("T_RELEASE", "2026-07-29T00:00:00+09:00"),
      observation("T_PLUS_24H", "2026-07-30T00:00:00+09:00"),
      observation("T_PLUS_72H", "2026-08-01T00:00:00+09:00"),
    ]);

    expect(report.status).toBe("POSTLAUNCH_WINDOW_COMPLETE");
    expect(result.protocol.protocolHash).toBe(beforeProtocol);
    expect(result.snapshot.snapshotId).toBe(beforeSnapshot);
    expect(new Set(report.observations.map((item) => item.contentHash)).size).toBe(3);
  });
});
