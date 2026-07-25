import { describe, expect, it } from "vitest";

import {
  createPublicSourceBundle,
  createPublishingSnapshot,
  HISTORICAL_ANALOGS,
  MARKET_FIT_SNAPSHOT,
} from "./publishing-data.js";

describe("publishing source snapshot", () => {
  it("locks the four required sources with stable hashes", () => {
    const first = createPublicSourceBundle();
    const second = createPublicSourceBundle();

    expect(first.map((source) => source.sourceId)).toEqual(["R14", "R15", "R16", "R17"]);
    expect(first.map((source) => source.contentHash)).toEqual(second.map((source) => source.contentHash));
    expect(new Set(first.map((source) => source.contentHash)).size).toBe(4);
    expect(first.find((source) => source.sourceId === "R17")?.sourceTier).toBe("C_ESTIMATED");
  });

  it("creates immutable, versioned snapshots without claiming unavailable revenue", () => {
    const snapshot = createPublishingSnapshot();
    const later = createPublishingSnapshot("2026-07-25T14:00:00+09:00");

    expect(snapshot.versionId).toBe("3.1");
    expect(snapshot.market).toBe("JP");
    expect(snapshot.targetCharacterJa).toBe("レミエール");
    expect(snapshot.status).toBe("AWAITING_POSTLAUNCH_OBSERVATION");
    expect(snapshot.snapshotId).not.toBe(later.snapshotId);
    expect(snapshot.publicSourceBundleHash).toBe(later.publicSourceBundleHash);
    expect(MARKET_FIT_SNAPSHOT.platformScope.unavailable).toContain("Japan all-platform revenue");
    expect(() => (snapshot.fixedConfounders as string[]).push("late mutation")).toThrow();
    expect(() => (snapshot.sources[0].facts as string[]).push("late mutation")).toThrow();
  });

  it("keeps four ordinal historical analogs and their non-comparable factors", () => {
    expect(HISTORICAL_ANALOGS).toHaveLength(4);
    expect(HISTORICAL_ANALOGS.every((analog) => analog.nonComparableFactors.length > 0)).toBe(true);
    expect(HISTORICAL_ANALOGS.map((analog) => analog.nextDayBestRank)).toEqual([2, 1, 1, 2]);
    expect(HISTORICAL_ANALOGS.every((analog) => analog.monthlyEstimateLabel.includes("rough estimate"))).toBe(true);
  });
});
