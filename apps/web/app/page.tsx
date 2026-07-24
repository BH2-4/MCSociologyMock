import { runPairedExperiment } from "@agorasim/core";

import { ExperimentConsole } from "./experiment-console";

export default function Home() {
  const recordedResult = runPairedExperiment("demo-seed-01", "fixed-threshold");
  return <ExperimentConsole initialResult={recordedResult} />;
}
