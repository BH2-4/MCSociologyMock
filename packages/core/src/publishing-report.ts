import { hashObject } from "./determinism.js";
import type { PublishingPairResult, PublishingAgent, PublishingAction } from "./publishing-experiment.js";

export type ObservationPoint = "T_RELEASE" | "T_PLUS_24H" | "T_PLUS_72H";

export interface PublicProxyObservationInput {
  point: ObservationPoint;
  observedAt: string;
  collectedAt: string;
  sourceUrl: string;
  sourceTier: "A_OFFICIAL" | "B_MEASURED" | "C_ESTIMATED";
  platformScope: "JP_IOS_APP_STORE" | "JP_GOOGLE_PLAY" | "OFFICIAL_JP_CONTENT";
  metricName: string;
  value: number;
  unit: "ORDINAL_RANK" | "PUBLIC_INTERACTION_COUNT" | "OBSERVED_HOURS";
  methodology: string;
}

export interface PublicProxyObservation extends PublicProxyObservationInput {
  observationId: string;
  contentHash: string;
}

export interface PublishingReport {
  protocolHash: string;
  snapshotId: string;
  status: "AWAITING_POSTLAUNCH_OBSERVATION" | "PARTIAL_POSTLAUNCH_OBSERVATION" | "POSTLAUNCH_WINDOW_COMPLETE";
  primaryResult: {
    metric: "non_seed_simulated_character_spend";
    control: number;
    treatment: number;
    pairedDifference: number;
    direction: "COMBAT_VALUE_FIRST" | "CHARACTER_AFFINITY_FIRST" | "NO_DIFFERENCE";
  };
  funnel: Record<PublishingAction, { control: number; treatment: number }>;
  segmentEffects: Array<{ segment: PublishingAgent["segment"]; control: number; treatment: number; difference: number }>;
  failureChecks: Array<{ check: string; pass: boolean }>;
  recommendation: string;
  observations: readonly PublicProxyObservation[];
  limitations: readonly string[];
  disclaimer: PublishingPairResult["disclaimer"];
}

const RELEASE_AT_MS = Date.parse("2026-07-29T00:00:00+09:00");

const MINIMUM_POINT_TIME: Record<ObservationPoint, number> = {
  T_RELEASE: RELEASE_AT_MS,
  T_PLUS_24H: RELEASE_AT_MS + 24 * 60 * 60 * 1000,
  T_PLUS_72H: RELEASE_AT_MS + 72 * 60 * 60 * 1000,
};

export function createPublicProxyObservation(input: PublicProxyObservationInput): PublicProxyObservation {
  const observedAt = Date.parse(input.observedAt);
  const collectedAt = Date.parse(input.collectedAt);
  if (!Number.isFinite(observedAt) || !Number.isFinite(collectedAt)) throw new Error("OBSERVATION_TIME_INVALID");
  if (observedAt < MINIMUM_POINT_TIME[input.point]) throw new Error("OBSERVATION_POINT_TOO_EARLY");
  if (collectedAt < observedAt) throw new Error("OBSERVATION_COLLECTED_BEFORE_OBSERVED");
  if (!input.sourceUrl.startsWith("https://")) throw new Error("OBSERVATION_SOURCE_INVALID");
  if (!Number.isFinite(input.value) || input.value < 0) throw new Error("OBSERVATION_VALUE_INVALID");
  if (input.unit === "ORDINAL_RANK" && (!Number.isInteger(input.value) || input.value < 1)) {
    throw new Error("OBSERVATION_RANK_INVALID");
  }
  const contentHash = hashObject(input);
  return Object.freeze({ ...input, contentHash, observationId: `obs-${contentHash.slice(0, 16)}` });
}

function countAction(result: PublishingPairResult, branch: "control" | "treatment", action: PublishingAction): number {
  return result[branch].events.filter((event) => event.action === action).length;
}

function observationStatus(observations: readonly PublicProxyObservation[]): PublishingReport["status"] {
  const points = new Set(observations.map((observation) => observation.point));
  if (points.has("T_RELEASE") && points.has("T_PLUS_24H") && points.has("T_PLUS_72H")) return "POSTLAUNCH_WINDOW_COMPLETE";
  if (points.size > 0) return "PARTIAL_POSTLAUNCH_OBSERVATION";
  return "AWAITING_POSTLAUNCH_OBSERVATION";
}

export function createPublishingReport(
  result: PublishingPairResult,
  observations: readonly PublicProxyObservation[] = [],
): PublishingReport {
  const uniqueIds = new Set(observations.map((observation) => observation.observationId));
  if (uniqueIds.size !== observations.length) throw new Error("DUPLICATE_POSTLAUNCH_OBSERVATION");
  const direction = result.pairedEffect > 0
    ? "CHARACTER_AFFINITY_FIRST"
    : result.pairedEffect < 0
      ? "COMBAT_VALUE_FIRST"
      : "NO_DIFFERENCE";
  const recommendation = direction === "NO_DIFFERENCE"
    ? "Do not prefer either positioning from this run; retain both for a separately authorized human validation."
    : `Use ${direction} as the next bounded creative hypothesis, not as a real-revenue prediction.`;
  const failureChecks = [
    { check: "Localization Gate", pass: result.localizationGate.pass },
    { check: "Branch diff", pass: result.branchDiffReport.pass },
    { check: "Population parity", pass: result.validation.populationParity },
    { check: "Network parity", pass: result.validation.networkParity },
    { check: "Source references", pass: result.validation.sourceReferencesValid },
    { check: "Ledger conservation", pass: result.validation.ledgerConserved },
  ];
  return {
    protocolHash: result.protocol.protocolHash,
    snapshotId: result.snapshot.snapshotId,
    status: observationStatus(observations),
    primaryResult: {
      metric: "non_seed_simulated_character_spend",
      control: result.control.metrics.simulatedCharacterSpend,
      treatment: result.treatment.metrics.simulatedCharacterSpend,
      pairedDifference: result.pairedEffect,
      direction,
    },
    funnel: Object.fromEntries(([
      "VIEW_RELEASE_INFO",
      "ASK",
      "CHAT",
      "POST",
      "SHARE",
      "PLAN_PULL",
      "SAVE",
      "SKIP",
      "SIMULATED_TOP_UP",
      "IDLE",
    ] as const).map((action) => [action, {
      control: countAction(result, "control", action),
      treatment: countAction(result, "treatment", action),
    }])) as PublishingReport["funnel"],
    segmentEffects: Object.keys(result.control.metrics.segmentSpend).map((segment) => {
      const key = segment as PublishingAgent["segment"];
      const control = result.control.metrics.segmentSpend[key];
      const treatment = result.treatment.metrics.segmentSpend[key];
      return { segment: key, control, treatment, difference: treatment - control };
    }),
    failureChecks,
    recommendation,
    observations: Object.freeze([...observations]),
    limitations: Object.freeze([
      "The 24 Agents are synthetic and are not representative of Japanese players.",
      "Public rankings are ordinal mobile proxies and do not disclose all-platform or single-character revenue.",
      "Reality has no public randomized COMBAT_VALUE_FIRST versus CHARACTER_AFFINITY_FIRST branches.",
      "The normalized ledger has no fiat, Polychrome, pull or testnet-USDC conversion meaning.",
    ]),
    disclaimer: result.disclaimer,
  };
}
