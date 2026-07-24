import { runPairedExperiment } from "@agorasim/core";

import { ExperimentConsole } from "./experiment-console";

export default function Home() {
  const recordedResult = runPairedExperiment("demo-seed-01", "fixed-threshold");
  const evidenceBlind = runPairedExperiment("demo-seed-01", "evidence-blind");
  return <ExperimentConsole initialResult={recordedResult} initialComparisons={[
    {
      protocolSeed: "demo-seed-01",
      decisionMode: "evidence-blind",
      pairedEffect: evidenceBlind.pairedEffect,
      controlAdoptionRate: evidenceBlind.control.metrics.adoptionRate,
      treatmentAdoptionRate: evidenceBlind.treatment.metrics.adoptionRate,
    },
    {
      protocolSeed: "demo-seed-01",
      decisionMode: "fixed-threshold",
      pairedEffect: recordedResult.pairedEffect,
      controlAdoptionRate: recordedResult.control.metrics.adoptionRate,
      treatmentAdoptionRate: recordedResult.treatment.metrics.adoptionRate,
    },
    {
      protocolSeed: "demo-seed-01",
      decisionMode: "llm",
      pairedEffect: null,
      controlAdoptionRate: null,
      treatmentAdoptionRate: null,
    },
  ]} />;
}
