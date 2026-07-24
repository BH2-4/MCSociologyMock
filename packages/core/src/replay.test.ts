import { describe, expect, it } from "vitest";

import { replayPairedExperiment, runPairedExperiment } from "./index.js";

describe("recorded replay", () => {
  it("rebuilds metrics without LLM, signatures, or facilitator calls", () => {
    const recording = runPairedExperiment("paired-seed-01", "fixed-threshold");
    const replay = replayPairedExperiment(recording);

    expect(replay.controlMetrics).toEqual(recording.control.metrics);
    expect(replay.treatmentMetrics).toEqual(recording.treatment.metrics);
    expect(replay.pairedEffect).toBe(recording.pairedEffect);
    expect(replay.sideEffects).toEqual({ llmCalls: 0, signatures: 0, facilitatorCalls: 0 });
  });
});
