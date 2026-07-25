import { createPublishingReport, runPublishingPair } from "@gesellschaft/core";

import { PublishingConsole } from "../publishing-console";

export default function PublishingPage() {
  const result = runPublishingPair("zzz-jp-seed-01");
  return <PublishingConsole initialResult={result} initialReport={createPublishingReport(result)} />;
}
