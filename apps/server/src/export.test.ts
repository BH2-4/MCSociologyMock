import { runPairedExperiment } from "@agorasim/core";
import { describe, expect, it } from "vitest";

import { createResearchExport } from "./export.js";

describe("research export", () => {
  it("omits secret references and signatures", () => {
    const exported = createResearchExport(runPairedExperiment("export-seed", "fixed-threshold"));
    const serialized = JSON.stringify(exported);

    expect(serialized).not.toContain("keyRef");
    expect(serialized).not.toContain("secret://");
    expect(serialized).not.toContain("PAYMENT-SIGNATURE");
    expect(exported.exportBoundary.excluded).toContain("hidden_reasoning");
  });
});
