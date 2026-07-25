import { replayPairedExperiment, runPairedExperiment } from "@gesellschaft/core";

const recording = runPairedExperiment(process.env.REPLAY_PROTOCOL_SEED ?? "demo-seed-01", "fixed-threshold");
const replay = replayPairedExperiment(recording);
console.log(JSON.stringify({
  protocolHash: recording.protocol.protocolHash,
  pairedEffect: replay.pairedEffect,
  controlMetrics: replay.controlMetrics,
  treatmentMetrics: replay.treatmentMetrics,
  eventHash: replay.eventHash,
  sideEffects: replay.sideEffects,
}, null, 2));
