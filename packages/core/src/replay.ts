import { hashObject } from "./determinism.js";
import { buildValidation, calculateBranchMetrics } from "./metrics.js";
import type { BranchRun, PairedExperimentResult } from "./model.js";

export interface ReplayResult {
  controlMetrics: BranchRun["metrics"];
  treatmentMetrics: BranchRun["metrics"];
  pairedEffect: number;
  validation: PairedExperimentResult["validation"];
  eventHash: string;
  sideEffects: { llmCalls: 0; signatures: 0; facilitatorCalls: 0 };
}

export function replayPairedExperiment(recording: PairedExperimentResult): ReplayResult {
  const controlMetrics = calculateBranchMetrics(recording.control);
  const treatmentMetrics = calculateBranchMetrics(recording.treatment);
  const pairedEffect = treatmentMetrics.adoptionRate - controlMetrics.adoptionRate;
  const replayPair = {
    control: { ...recording.control, metrics: controlMetrics },
    treatment: { ...recording.treatment, metrics: treatmentMetrics },
    pairedEffect,
  };
  return {
    controlMetrics,
    treatmentMetrics,
    pairedEffect,
    validation: buildValidation(replayPair),
    eventHash: hashObject({ control: recording.control.events, treatment: recording.treatment.events }),
    sideEffects: { llmCalls: 0, signatures: 0, facilitatorCalls: 0 },
  };
}
