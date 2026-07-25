import type { PairedExperimentResult } from "@gesellschaft/core";

export function createResearchExport(result: PairedExperimentResult) {
  const sanitizeBranch = (branch: PairedExperimentResult["control"]) => ({
    ...branch,
    wallets: branch.wallets.map(({ keyRef: _keyRef, ...wallet }) => wallet),
  });
  return {
    protocol: result.protocol,
    branchDiffReport: result.branchDiffReport,
    control: sanitizeBranch(result.control),
    treatment: sanitizeBranch(result.treatment),
    pairedEffect: result.pairedEffect,
    validation: result.validation,
    exportBoundary: {
      excluded: ["private_keys", "key_ref", "payment_signatures", "authorization_headers", "hidden_reasoning"],
      statement: "Synthetic simulation. Not a real-market forecast.",
    },
  };
}
