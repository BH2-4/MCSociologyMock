import { hashObject } from "./determinism.js";
import { createFixedNetwork, createPopulation } from "./population.js";
import type {
  BranchConfig,
  BranchDiffReport,
  BranchDifference,
  BranchId,
  DecisionMode,
  LockedProtocol,
  ProtocolCard,
} from "./model.js";
import { PRODUCT_OFFER, SIMULATION_CONFIG } from "./model.js";

export const DEFAULT_PROTOCOL_CARD: ProtocolCard = {
  researchQuestion: "Does a visible, verified x402 purchase receipt change credibility, propagation, and paid adoption in this synthetic network?",
  h1: "Verified receipt visibility increases non-seed paid adoption in the model.",
  h0: "Verified receipt visibility does not change non-seed paid adoption in the model.",
  treatment: "receipt_visibility",
  primaryMetric: "non_seed_adoption_rate",
  alternativeExplanations: [
    "The decision model ignores evidence.",
    "Effects arise only in stated credibility and not purchases.",
    "Effects are unstable across paired seeds or providers.",
  ],
  failureCriteria: [
    "Any semantic branch difference other than receipt_visibility.",
    "Target Evidence appears in a Control observation.",
    "Evidence-blind paired adoption difference is non-zero.",
    "Evidence appears before payment and fulfillment verification.",
    "A technical payment failure is counted as consumer refusal.",
  ],
};

export function lockDefaultProtocol(protocolSeed: string): LockedProtocol {
  const body = {
    card: DEFAULT_PROTOCOL_CARD,
    config: SIMULATION_CONFIG,
    offer: PRODUCT_OFFER,
    protocolSeed,
  };
  return { ...body, protocolHash: hashObject(body) };
}

export function createBranchConfig(
  protocol: LockedProtocol,
  branchId: BranchId,
  decisionMode: DecisionMode,
): BranchConfig {
  const agents = createPopulation();
  return {
    branchId,
    runId: `run-${protocol.protocolSeed}-${branchId}-${decisionMode}`,
    walletNamespace: `${protocol.protocolSeed}:${branchId}`,
    receiptVisibility: branchId === "control" ? "HIDDEN" : "VERIFIED_SUMMARY",
    protocolHash: protocol.protocolHash,
    protocolSeed: protocol.protocolSeed,
    decisionMode,
    agents,
    relationships: createFixedNetwork(agents),
    offer: protocol.offer,
    tickCount: protocol.config.tickCount,
  };
}

const ALLOWED_PATHS = new Set(["branchId", "runId", "walletNamespace", "receiptVisibility"]);

function compareValues(control: unknown, treatment: unknown, path = ""): BranchDifference[] {
  if (Object.is(control, treatment)) return [];
  if (Array.isArray(control) && Array.isArray(treatment)) {
    const length = Math.max(control.length, treatment.length);
    return Array.from({ length }, (_, index) => compareValues(control[index], treatment[index], `${path}[${index}]`)).flat();
  }
  if (control !== null && treatment !== null && typeof control === "object" && typeof treatment === "object") {
    const keys = new Set([
      ...Object.keys(control as Record<string, unknown>),
      ...Object.keys(treatment as Record<string, unknown>),
    ]);
    return [...keys].sort().flatMap((key) => compareValues(
      (control as Record<string, unknown>)[key],
      (treatment as Record<string, unknown>)[key],
      path ? `${path}.${key}` : key,
    ));
  }
  const rootPath = path.split(/[.[]/, 1)[0];
  return [{ path, control, treatment, allowed: ALLOWED_PATHS.has(rootPath) }];
}

export function validateBranchDiff(control: BranchConfig, treatment: BranchConfig): BranchDiffReport {
  const differences = compareValues(control, treatment);
  const semanticDifferenceCount = differences.filter((difference) => !difference.allowed).length;
  return {
    pass: semanticDifferenceCount === 0,
    allowedPaths: [...ALLOWED_PATHS],
    differences,
    semanticDifferenceCount,
  };
}
