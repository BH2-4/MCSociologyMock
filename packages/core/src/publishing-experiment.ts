import { hashObject, keyedRandom } from "./determinism.js";
import type { LlmAttemptAudit } from "./model.js";
import { createPublishingSnapshot, type PublishingSnapshot } from "./publishing-data.js";

export const PUBLISHING_ACTIONS = [
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
] as const;

export type PublishingAction = (typeof PUBLISHING_ACTIONS)[number];
export type MessagePositioning = "COMBAT_VALUE_FIRST" | "CHARACTER_AFFINITY_FIRST";
export type PublishingBranchId = "control" | "treatment";
export type ParameterProvenance = "PUBLIC_AGGREGATE" | "HISTORICAL_CALIBRATION" | "PREREGISTERED_ASSUMPTION" | "ENGINEERING_DEFAULT";

export interface PublishingAgent {
  id: string;
  index: number;
  isSeed: boolean;
  segment: "intensity-active" | "character-active" | "budget-constrained" | "returning" | "prospect" | "cosmetic-oriented";
  activityStatus: "ACTIVE" | "RETURNING" | "PROSPECT";
  platformPreference: "MOBILE" | "PLAYSTATION" | "PC" | "CROSS_PLATFORM";
  rosterNeed: number;
  combatPreference: number;
  characterAffinity: number;
  cosmeticAffinity: number;
  pullBudget: number;
  ownedCurrency: number;
  guaranteeState: "NONE" | "GUARANTEED" | "BUILDING_PITY";
  spendPropensity: number;
  returnFriction: number;
  sourceTrust: number;
  provenance: Record<string, ParameterProvenance>;
}

export interface PublishingRelationship {
  sourceId: string;
  targetId: string;
  channel: "CHAT" | "POST";
  contactProbability: number;
}

export interface ReleaseFactSlot {
  id: string;
  sourceId: "R14" | "R15" | "R16";
  text: string;
}

export interface ReleaseMessageBlock {
  id: "combat-context" | "character-context" | "offer-context";
  sourceIds: readonly ("R14" | "R15" | "R16")[];
  text: string;
}

export interface PublishingProtocol {
  protocolSeed: string;
  protocolHash: string;
  snapshotId: string;
  promptVersion: "zzz-jp-3.1-v1";
  decisionPrompt: string;
  researchQuestion: string;
  treatment: "message_positioning";
  primaryMetric: "non_seed_simulated_character_spend";
  observationWindowHours: 72;
  alternativeExplanations: readonly string[];
  failureCriteria: readonly string[];
}

export interface PublishingBranchConfig {
  branchId: PublishingBranchId;
  runId: string;
  protocolHash: string;
  protocolSeed: string;
  messagePositioning: MessagePositioning;
  messageOrder: readonly ReleaseMessageBlock["id"][];
  factSlots: readonly ReleaseFactSlot[];
  messageBlocks: readonly ReleaseMessageBlock[];
  materialIds: readonly string[];
  channel: "OFFICIAL_JP_SOCIAL";
  releaseTick: 1;
  exposureCount: number;
  agents: readonly PublishingAgent[];
  relationships: readonly PublishingRelationship[];
  tickCount: 8;
}

export interface LocalizationGateReport {
  pass: boolean;
  factParity: boolean;
  materialParity: boolean;
  messageBlockParity: boolean;
  exposureParity: boolean;
  illegalDifferences: string[];
}

export interface PublishingBranchDiffReport {
  pass: boolean;
  allowedPaths: readonly string[];
  differences: Array<{ path: string; control: unknown; treatment: unknown; allowed: boolean }>;
  semanticDifferenceCount: number;
}

export interface PublishingEvent {
  eventId: string;
  runId: string;
  branchId: PublishingBranchId;
  tick: number;
  type: "MESSAGE_EXPOSED" | "ACTION_RECORDED" | "MESSAGE_PROPAGATED" | "PULL_DECISION_RECORDED" | "LEDGER_ENTRY_RECORDED" | "METRICS_COMPUTED";
  actorId?: string;
  targetId?: string;
  action?: PublishingAction;
  messageId?: string;
  sourceIds: string[];
  causedByEventId?: string;
  payload: Record<string, unknown>;
}

export type LedgerCategory = "OPENING_CURRENCY" | "FREE_REWARD" | "PLANNED_PULL" | "SIMULATED_TOP_UP" | "OTHER_BANNER_SPEND";

export interface SyntheticSpendLedgerEntry {
  entryId: string;
  branchId: PublishingBranchId;
  agentId: string;
  tick: number;
  category: LedgerCategory;
  amount: number;
  unit: "SYNTHETIC_RESOURCE_UNIT";
  basis: "AGENT_OPENING_STATE" | "NORMALIZED_FREE_REWARD" | "MODEL_DECISION" | "EXPLICIT_ZERO_SEPARATION";
  balanceAfter: number;
  executed: boolean;
  characterId: "remiel" | null;
  causedByEventId?: string;
}

export interface PublishingMetrics {
  simulatedCharacterSpend: number;
  plannedPullRate: number;
  simulatedTopUpRate: number;
  saveRate: number;
  skipRate: number;
  propagationCount: number;
  meanDecisionTick: number;
  segmentSpend: Record<PublishingAgent["segment"], number>;
}

export interface PublishingBranchRun {
  branchId: PublishingBranchId;
  runId: string;
  messagePositioning: MessagePositioning;
  status: "COMPLETED";
  currentTick: 8;
  agents: readonly PublishingAgent[];
  relationships: readonly PublishingRelationship[];
  events: PublishingEvent[];
  ledger: SyntheticSpendLedgerEntry[];
  metrics: PublishingMetrics;
}

export interface PublishingDecisionRequest {
  agent: Pick<PublishingAgent, "id" | "index" | "segment" | "activityStatus" | "platformPreference" | "rosterNeed" | "combatPreference" | "characterAffinity" | "cosmeticAffinity" | "pullBudget" | "ownedCurrency" | "guaranteeState" | "spendPropensity" | "returnFriction" | "sourceTrust">;
  tick: 4;
  message: {
    id: string;
    sourceIds: readonly string[];
    positioning: MessagePositioning;
    order: readonly string[];
    blocks: readonly ReleaseMessageBlock[];
  };
  facts: readonly ReleaseFactSlot[];
  visibleSourceIds: readonly string[];
  allowedActions: readonly PublishingAction[];
  allowedTargetIds: readonly string[];
  currentBalance: number;
}

export interface PublishingExternalDecision {
  action: PublishingAction;
  targetIds: string[];
  sourceIds: string[];
  messageId: string;
  reasonCode: string;
  confidence: number;
  provider?: "openai-compatible";
  model?: string;
  requestHash?: string;
  responseHash?: string | null;
  attempts?: number;
  attemptAudit?: LlmAttemptAudit[];
  schemaFailed?: boolean;
  usage?: { promptTokens: number; completionTokens: number } | null;
}

export type PublishingDecisionAdapter = (request: PublishingDecisionRequest) => Promise<PublishingExternalDecision>;

export interface PublishingPairResult {
  snapshot: PublishingSnapshot;
  protocol: PublishingProtocol;
  localizationGate: LocalizationGateReport;
  branchDiffReport: PublishingBranchDiffReport;
  control: PublishingBranchRun;
  treatment: PublishingBranchRun;
  pairedEffect: number;
  status: "AWAITING_POSTLAUNCH_OBSERVATION";
  validation: {
    populationParity: boolean;
    networkParity: boolean;
    sourceReferencesValid: boolean;
    ledgerConserved: boolean;
    actionCoverage: Record<PublishingAction, boolean>;
  };
  disclaimer: "合成模拟与移动端公开代理，不代表日本全平台或单角色真实流水";
}

export interface PublishingReplayResult {
  controlMetrics: PublishingMetrics;
  treatmentMetrics: PublishingMetrics;
  pairedEffect: number;
  eventHash: string;
  sideEffects: { networkCalls: 0; llmCalls: 0; ledgerWrites: 0 };
}

const FACT_SLOTS: readonly ReleaseFactSlot[] = Object.freeze([
  { id: "release-date", sourceId: "R14", text: "Ver.3.1 launches in Japan on 2026-07-29 JST." },
  { id: "character", sourceId: "R14", text: "Remiel (レミエール) is an announced Ver.3.1 character." },
  { id: "anniversary", sourceId: "R15", text: "The version includes separately disclosed second-anniversary benefits." },
  { id: "lucy-costume", sourceId: "R14", text: "Lucy's Princess no Kyuujitsu costume is a free event reward." },
  { id: "remiel-costumes", sourceId: "R16", text: "Two Remiel costumes are announced in the official Japanese material." },
]);

const MESSAGE_BLOCKS: readonly ReleaseMessageBlock[] = Object.freeze([
  {
    id: "combat-context",
    sourceIds: Object.freeze(["R14"] as const),
    text: "Review the official combat material and evaluate Remiel against your current roster needs.",
  },
  {
    id: "character-context",
    sourceIds: Object.freeze(["R14", "R16"] as const),
    text: "Review the official character, story and costume material and evaluate personal affinity.",
  },
  {
    id: "offer-context",
    sourceIds: Object.freeze(["R14", "R15"] as const),
    text: "Review the same release date, anniversary benefits, free Lucy costume and banner context before deciding.",
  },
]);

const SEGMENTS: readonly PublishingAgent["segment"][] = [
  "intensity-active",
  "character-active",
  "budget-constrained",
  "returning",
  "prospect",
  "cosmetic-oriented",
];

function rounded(value: number): number {
  return Number(value.toFixed(3));
}

function parityHash(value: unknown): string {
  return hashObject(value);
}

export function createPublishingPopulation(count = 24): PublishingAgent[] {
  return Array.from({ length: count }, (_, index) => {
    const segment = SEGMENTS[index % SEGMENTS.length];
    const activityStatus = segment === "returning" ? "RETURNING" : segment === "prospect" ? "PROSPECT" : "ACTIVE";
    return {
      id: `jp-consumer-${String(index + 1).padStart(2, "0")}`,
      index,
      isSeed: index === 0 || index === 12,
      segment,
      activityStatus,
      platformPreference: (["MOBILE", "PLAYSTATION", "PC", "CROSS_PLATFORM"] as const)[index % 4],
      rosterNeed: rounded(0.34 + ((index * 5) % 11) * 0.055),
      combatPreference: rounded(0.3 + ((index * 7) % 12) * 0.052),
      characterAffinity: rounded(0.29 + ((index * 3) % 13) * 0.05),
      cosmeticAffinity: rounded(0.2 + ((index * 4) % 10) * 0.065),
      pullBudget: 80 + (index % 6) * 24,
      ownedCurrency: 45 + ((index * 17) % 115),
      guaranteeState: (["NONE", "GUARANTEED", "BUILDING_PITY"] as const)[index % 3],
      spendPropensity: rounded(0.22 + ((index * 9) % 12) * 0.055),
      returnFriction: rounded(activityStatus === "ACTIVE" ? 0.16 + (index % 4) * 0.05 : 0.45 + (index % 5) * 0.08),
      sourceTrust: rounded(0.48 + (index % 7) * 0.055),
      provenance: {
        activityStatus: "PREREGISTERED_ASSUMPTION",
        platformPreference: "PREREGISTERED_ASSUMPTION",
        rosterNeed: "ENGINEERING_DEFAULT",
        combatPreference: "ENGINEERING_DEFAULT",
        characterAffinity: "ENGINEERING_DEFAULT",
        cosmeticAffinity: "ENGINEERING_DEFAULT",
        pullBudget: "ENGINEERING_DEFAULT",
        ownedCurrency: "ENGINEERING_DEFAULT",
        guaranteeState: "PREREGISTERED_ASSUMPTION",
        spendPropensity: "HISTORICAL_CALIBRATION",
        returnFriction: "PREREGISTERED_ASSUMPTION",
        sourceTrust: "ENGINEERING_DEFAULT",
      },
    };
  });
}

export function createPublishingNetwork(agents: readonly PublishingAgent[]): PublishingRelationship[] {
  return agents.flatMap((agent) => [1, 3, 6].map((offset, offsetIndex) => ({
    sourceId: agent.id,
    targetId: agents[(agent.index + offset) % agents.length].id,
    channel: offset === 1 ? "CHAT" as const : "POST" as const,
    contactProbability: rounded(0.58 + offsetIndex * 0.12),
  })));
}

export function lockPublishingProtocol(protocolSeed: string, snapshot = createPublishingSnapshot()): PublishingProtocol {
  const body = {
    protocolSeed,
    snapshotId: snapshot.snapshotId,
    promptVersion: "zzz-jp-3.1-v1" as const,
    decisionPrompt: "Using only exposed source and message IDs, choose one allowed action. Treat release facts as fixed, do not infer real revenue, and return an explicit reason code without hidden chain-of-thought.",
    researchQuestion: "Does combat-first versus character-affinity-first ordering change propagation, pull plans and synthetic top-up in the paired Japan model?",
    treatment: "message_positioning" as const,
    primaryMetric: "non_seed_simulated_character_spend" as const,
    observationWindowHours: 72 as const,
    alternativeExplanations: Object.freeze([
      "The synthetic population distribution favors one positioning by construction.",
      "The model responds to ordering but the effect does not reach simulated top-up.",
      "The direction is unstable across preregistered paired seeds.",
    ]),
    failureCriteria: Object.freeze([
      "Any branch difference beyond positioning and order.",
      "Any action cites a source or message that was not exposed.",
      "Population, network, timing or keyed random field differs between branches.",
      "Synthetic ledger balance or pull budget is violated.",
    ]),
  };
  return Object.freeze({ ...body, protocolHash: hashObject(body) });
}

export function createPublishingBranchConfig(
  protocol: PublishingProtocol,
  branchId: PublishingBranchId,
  agents = createPublishingPopulation(),
): PublishingBranchConfig {
  const messagePositioning = branchId === "control" ? "COMBAT_VALUE_FIRST" : "CHARACTER_AFFINITY_FIRST";
  return {
    branchId,
    runId: `run-zzz-jp-${protocol.protocolSeed}-${branchId}`,
    protocolHash: protocol.protocolHash,
    protocolSeed: protocol.protocolSeed,
    messagePositioning,
    messageOrder: messagePositioning === "COMBAT_VALUE_FIRST"
      ? Object.freeze(["combat-context", "character-context", "offer-context"])
      : Object.freeze(["character-context", "combat-context", "offer-context"]),
    factSlots: FACT_SLOTS,
    messageBlocks: MESSAGE_BLOCKS,
    materialIds: Object.freeze(["R14:version-overview", "R15:anniversary-benefits", "R16:remiel-costumes"]),
    channel: "OFFICIAL_JP_SOCIAL",
    releaseTick: 1,
    exposureCount: agents.length,
    agents,
    relationships: createPublishingNetwork(agents),
    tickCount: 8,
  };
}

function sortedHash<T>(items: readonly T[], key: (item: T) => string): string {
  return parityHash([...items].sort((left, right) => key(left).localeCompare(key(right))));
}

export function validateLocalizationGate(
  control: PublishingBranchConfig,
  treatment: PublishingBranchConfig,
): LocalizationGateReport {
  const factParity = sortedHash(control.factSlots, (item) => item.id) === sortedHash(treatment.factSlots, (item) => item.id);
  const materialParity = sortedHash(control.materialIds, String) === sortedHash(treatment.materialIds, String);
  const messageBlockParity = sortedHash(control.messageBlocks, (item) => item.id) === sortedHash(treatment.messageBlocks, (item) => item.id);
  const exposureParity = parityHash({
    channel: control.channel,
    releaseTick: control.releaseTick,
    exposureCount: control.exposureCount,
  }) === parityHash({
    channel: treatment.channel,
    releaseTick: treatment.releaseTick,
    exposureCount: treatment.exposureCount,
  });
  const illegalDifferences = [
    !factParity && "factSlots",
    !materialParity && "materialIds",
    !messageBlockParity && "messageBlocks",
    !exposureParity && "exposure",
  ].filter((value): value is string => Boolean(value));
  return { pass: illegalDifferences.length === 0, factParity, materialParity, messageBlockParity, exposureParity, illegalDifferences };
}

export function validatePublishingBranchDiff(
  control: PublishingBranchConfig,
  treatment: PublishingBranchConfig,
): PublishingBranchDiffReport {
  const allowedPaths = ["branchId", "runId", "messagePositioning", "messageOrder"] as const;
  const differences = [
    { path: "branchId", control: control.branchId, treatment: treatment.branchId, allowed: true },
    { path: "runId", control: control.runId, treatment: treatment.runId, allowed: true },
    { path: "messagePositioning", control: control.messagePositioning, treatment: treatment.messagePositioning, allowed: true },
    { path: "messageOrder", control: control.messageOrder, treatment: treatment.messageOrder, allowed: true },
  ];
  const shared = (config: PublishingBranchConfig) => ({
    protocolHash: config.protocolHash,
    protocolSeed: config.protocolSeed,
    factSlots: config.factSlots,
    messageBlocks: config.messageBlocks,
    materialIds: config.materialIds,
    channel: config.channel,
    releaseTick: config.releaseTick,
    exposureCount: config.exposureCount,
    agents: config.agents,
    relationships: config.relationships,
    tickCount: config.tickCount,
  });
  if (parityHash(shared(control)) !== parityHash(shared(treatment))) {
    differences.push({ path: "sharedConfiguration", control: parityHash(shared(control)), treatment: parityHash(shared(treatment)), allowed: false });
  }
  const semanticDifferenceCount = differences.filter((difference) => !difference.allowed).length;
  return { pass: semanticDifferenceCount === 0, allowedPaths, differences, semanticDifferenceCount };
}

function positioningScore(agent: PublishingAgent, positioning: MessagePositioning, seed: string): number {
  const sharedNoise = (keyedRandom(seed, 3, agent.id, "release-decision") - 0.5) * 0.08;
  const friction = agent.activityStatus === "ACTIVE" ? 0 : agent.returnFriction * 0.12;
  const score = positioning === "COMBAT_VALUE_FIRST"
    ? agent.combatPreference * 0.36 + agent.rosterNeed * 0.32 + agent.characterAffinity * 0.12 + agent.sourceTrust * 0.2
    : agent.characterAffinity * 0.34 + agent.cosmeticAffinity * 0.2 + agent.combatPreference * 0.12 + agent.sourceTrust * 0.22 + agent.rosterNeed * 0.12;
  return rounded(Math.max(0, Math.min(1, score + sharedNoise - friction)));
}

const EXPLORATION_ACTIONS: readonly PublishingAction[] = ["ASK", "CHAT", "POST", "SHARE", "SAVE", "SKIP", "IDLE"];
const PUBLISHING_DECISION_ACTIONS: readonly PublishingAction[] = ["PLAN_PULL", "SAVE", "SKIP", "SIMULATED_TOP_UP", "IDLE"];

function metricsFor(run: Pick<PublishingBranchRun, "agents" | "events" | "ledger">): PublishingMetrics {
  const nonSeed = new Set(run.agents.filter((agent) => !agent.isSeed).map((agent) => agent.id));
  const decisions = run.events.filter((event) => event.type === "PULL_DECISION_RECORDED" && event.actorId && nonSeed.has(event.actorId));
  const countAction = (action: PublishingAction) => new Set(decisions.filter((event) => event.action === action).map((event) => event.actorId)).size;
  const topUps = run.ledger.filter((entry) => entry.category === "SIMULATED_TOP_UP" && nonSeed.has(entry.agentId));
  const segmentSpend = Object.fromEntries(SEGMENTS.map((segment) => [segment, 0])) as PublishingMetrics["segmentSpend"];
  for (const entry of topUps) {
    const segment = run.agents.find((agent) => agent.id === entry.agentId)?.segment;
    if (segment) segmentSpend[segment] += entry.amount;
  }
  return {
    simulatedCharacterSpend: topUps.reduce((sum, entry) => sum + entry.amount, 0),
    plannedPullRate: nonSeed.size === 0 ? 0 : countAction("PLAN_PULL") / nonSeed.size,
    simulatedTopUpRate: nonSeed.size === 0 ? 0 : new Set(topUps.map((entry) => entry.agentId)).size / nonSeed.size,
    saveRate: nonSeed.size === 0 ? 0 : countAction("SAVE") / nonSeed.size,
    skipRate: nonSeed.size === 0 ? 0 : countAction("SKIP") / nonSeed.size,
    propagationCount: run.events.filter((event) => event.type === "MESSAGE_PROPAGATED").length,
    meanDecisionTick: decisions.length === 0 ? 0 : rounded(decisions.reduce((sum, event) => sum + event.tick, 0) / decisions.length),
    segmentSpend,
  };
}

function validatePublishingExternalDecision(
  request: PublishingDecisionRequest,
  decision: PublishingExternalDecision,
): string | null {
  if (!PUBLISHING_ACTIONS.includes(decision.action) || !request.allowedActions.includes(decision.action)) return "ACTION_NOT_ALLOWED";
  if (!decision.messageId || decision.messageId !== request.message.id) return "MESSAGE_NOT_VISIBLE";
  if (decision.sourceIds.length === 0) return "SOURCE_REFERENCE_REQUIRED";
  if (decision.sourceIds.some((sourceId) => !request.visibleSourceIds.includes(sourceId))) return "SOURCE_NOT_VISIBLE";
  if (decision.targetIds.length > 0) return "TARGET_NOT_ALLOWED_AT_PULL_DECISION";
  if (!Number.isFinite(decision.confidence) || decision.confidence < 0 || decision.confidence > 1) return "CONFIDENCE_INVALID";
  if (decision.action === "SIMULATED_TOP_UP" && request.currentBalance >= 180) return "TOP_UP_NOT_NEEDED";
  return null;
}

function publishingDecisionRequest(config: PublishingBranchConfig, agent: PublishingAgent): PublishingDecisionRequest {
  return {
    agent,
    tick: 4,
    message: {
      id: `message:${config.messagePositioning.toLowerCase()}`,
      sourceIds: ["R14", "R15", "R16"],
      positioning: config.messagePositioning,
      order: config.messageOrder,
      blocks: config.messageOrder.map((blockId) => config.messageBlocks.find((block) => block.id === blockId)!),
    },
    facts: config.factSlots,
    visibleSourceIds: ["R14", "R15", "R16"],
    allowedActions: PUBLISHING_DECISION_ACTIONS.filter((action) => action !== "SIMULATED_TOP_UP" || agent.ownedCurrency + 50 < 180),
    allowedTargetIds: config.relationships
      .filter((relationship) => relationship.sourceId === agent.id)
      .map((relationship) => relationship.targetId),
    currentBalance: agent.ownedCurrency + 50,
  };
}

function runPublishingBranch(
  config: PublishingBranchConfig,
  externalDecisions: ReadonlyMap<string, PublishingExternalDecision> = new Map(),
): PublishingBranchRun {
  const events: PublishingEvent[] = [];
  const ledger: SyntheticSpendLedgerEntry[] = [];
  const exposedMessages = new Map<string, string>();
  const balances = new Map<string, number>();
  let sequence = 0;
  const sourceIds = ["R14", "R15", "R16"];
  const messageId = `message:${config.messagePositioning.toLowerCase()}`;
  const addEvent = (event: Omit<PublishingEvent, "eventId" | "runId" | "branchId">): PublishingEvent => {
    sequence += 1;
    const recorded = { ...event, eventId: `${config.runId}:evt:${String(sequence).padStart(4, "0")}`, runId: config.runId, branchId: config.branchId };
    events.push(recorded);
    return recorded;
  };
  const addLedger = (
    agent: PublishingAgent,
    tick: number,
    category: LedgerCategory,
    amount: number,
    executed: boolean,
    basis: SyntheticSpendLedgerEntry["basis"],
    causedByEventId?: string,
  ) => {
    const balanceAfter = (balances.get(agent.id) ?? 0) + amount;
    balances.set(agent.id, balanceAfter);
    const entry: SyntheticSpendLedgerEntry = {
      entryId: `${config.runId}:ledger:${String(ledger.length + 1).padStart(4, "0")}`,
      branchId: config.branchId,
      agentId: agent.id,
      tick,
      category,
      amount,
      unit: "SYNTHETIC_RESOURCE_UNIT",
      basis,
      balanceAfter,
      executed,
      characterId: category === "PLANNED_PULL" || category === "SIMULATED_TOP_UP" ? "remiel" : null,
      causedByEventId,
    };
    ledger.push(entry);
    addEvent({ tick, type: "LEDGER_ENTRY_RECORDED", actorId: agent.id, action: category === "SIMULATED_TOP_UP" ? "SIMULATED_TOP_UP" : undefined, sourceIds: [], causedByEventId, payload: { entryId: entry.entryId, category, amount, unit: entry.unit, basis, balanceAfter, executed } });
  };

  for (const agent of config.agents) {
    addLedger(agent, 0, "OPENING_CURRENCY", agent.ownedCurrency, true, "AGENT_OPENING_STATE");
    addLedger(agent, 0, "FREE_REWARD", 50, true, "NORMALIZED_FREE_REWARD");
    addLedger(agent, 0, "OTHER_BANNER_SPEND", 0, false, "EXPLICIT_ZERO_SEPARATION");
    const exposure = addEvent({
      tick: 1,
      type: "MESSAGE_EXPOSED",
      actorId: "publisher-jp",
      targetId: agent.id,
      action: "VIEW_RELEASE_INFO",
      messageId,
      sourceIds,
      payload: { positioning: config.messagePositioning, order: config.messageOrder },
    });
    exposedMessages.set(agent.id, exposure.eventId);
  }

  for (const agent of config.agents.filter((candidate) => !candidate.isSeed)) {
    const exposureId = exposedMessages.get(agent.id)!;
    const action = EXPLORATION_ACTIONS[agent.index % EXPLORATION_ACTIONS.length];
    const recorded = addEvent({ tick: 2, type: "ACTION_RECORDED", actorId: agent.id, action, messageId, sourceIds, causedByEventId: exposureId, payload: {} });
    if (action === "POST" || action === "SHARE" || action === "CHAT") {
      const edge = config.relationships.find((candidate) => candidate.sourceId === agent.id && (
        action === "CHAT" ? candidate.channel === "CHAT" : candidate.channel === "POST"
      ));
      if (edge && keyedRandom(config.protocolSeed, 2, agent.id, `contact:${edge.targetId}`) <= edge.contactProbability) {
        addEvent({ tick: 3, type: "MESSAGE_PROPAGATED", actorId: agent.id, targetId: edge.targetId, action, messageId, sourceIds, causedByEventId: recorded.eventId, payload: { channel: edge.channel, depth: 1 } });
      }
    }
  }

  for (const agent of config.agents.filter((candidate) => !candidate.isSeed)) {
    const score = positioningScore(agent, config.messagePositioning, config.protocolSeed);
    const external = externalDecisions.get(agent.id);
    const action: PublishingAction = external?.action ?? (score >= 0.61 ? "PLAN_PULL" : score < 0.43 ? "SKIP" : "SAVE");
    const decision = addEvent({
      tick: 4,
      type: "PULL_DECISION_RECORDED",
      actorId: agent.id,
      action,
      messageId,
      sourceIds: external?.sourceIds ?? sourceIds,
      causedByEventId: exposedMessages.get(agent.id),
      payload: {
        score,
        reasonCode: external?.reasonCode ?? (action === "PLAN_PULL" ? "POSITIONING_FIT" : action === "SAVE" ? "WAIT_AND_COMPARE" : "LOW_FIT_OR_BUDGET"),
        confidence: external?.confidence,
        decisionSource: external ? "llm" : "deterministic",
        sourceIds: external?.sourceIds ?? sourceIds,
        messageId,
        targetIds: external?.targetIds ?? [],
        provider: external?.provider,
        model: external?.model,
        requestHash: external?.requestHash,
        responseHash: external?.responseHash,
        attempts: external?.attempts,
        attemptAudit: external?.attemptAudit,
        schemaFailed: external?.schemaFailed,
        usage: external?.usage,
      },
    });
    if (action === "PLAN_PULL" || action === "SIMULATED_TOP_UP") {
      if (action === "PLAN_PULL") addLedger(agent, 4, "PLANNED_PULL", 0, false, "MODEL_DECISION", decision.eventId);
      const available = balances.get(agent.id) ?? 0;
      const explicitTopUp = action === "SIMULATED_TOP_UP";
      if (available < 180 && (explicitTopUp || score * agent.spendPropensity >= 0.29)) {
        const topUp = Math.min(agent.pullBudget, 180 - available);
        if (topUp > 0) addLedger(agent, 5, "SIMULATED_TOP_UP", topUp, true, "MODEL_DECISION", decision.eventId);
      }
    }
  }

  const withoutMetrics = {
    branchId: config.branchId,
    runId: config.runId,
    messagePositioning: config.messagePositioning,
    status: "COMPLETED" as const,
    currentTick: 8 as const,
    agents: config.agents,
    relationships: config.relationships,
    events,
    ledger,
  };
  const metrics = metricsFor(withoutMetrics);
  addEvent({ tick: 8, type: "METRICS_COMPUTED", sourceIds: [], payload: metrics as unknown as Record<string, unknown> });
  return { ...withoutMetrics, metrics };
}

function ledgerIsConserved(run: PublishingBranchRun): boolean {
  return run.agents.every((agent) => {
    const entries = run.ledger.filter((entry) => entry.agentId === agent.id);
    const runningTotal = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const finalBalance = entries.at(-1)?.balanceAfter ?? 0;
    const topUp = entries.filter((entry) => entry.category === "SIMULATED_TOP_UP").reduce((sum, entry) => sum + entry.amount, 0);
    return runningTotal === finalBalance && topUp <= agent.pullBudget && entries.some((entry) => entry.category === "OTHER_BANNER_SPEND");
  });
}

export function runPublishingPair(protocolSeed: string, agentCount = 24): PublishingPairResult {
  const snapshot = createPublishingSnapshot();
  const protocol = lockPublishingProtocol(protocolSeed, snapshot);
  const agents = createPublishingPopulation(agentCount);
  const controlConfig = createPublishingBranchConfig(protocol, "control", agents);
  const treatmentConfig = createPublishingBranchConfig(protocol, "treatment", agents);
  const localizationGate = validateLocalizationGate(controlConfig, treatmentConfig);
  const branchDiffReport = validatePublishingBranchDiff(controlConfig, treatmentConfig);
  if (!localizationGate.pass) throw new Error(`LOCALIZATION_GATE_FAILED:${localizationGate.illegalDifferences.join(",")}`);
  if (!branchDiffReport.pass) throw new Error("PUBLISHING_BRANCH_DIFF_FAILED");
  const control = runPublishingBranch(controlConfig);
  const treatment = runPublishingBranch(treatmentConfig);
  const allEvents = [...control.events, ...treatment.events];
  const actionCoverage = Object.fromEntries(PUBLISHING_ACTIONS.map((action) => [
    action,
    allEvents.some((event) => event.action === action),
  ])) as Record<PublishingAction, boolean>;
  const validSources = new Set(snapshot.sources.map((source) => source.sourceId));
  return {
    snapshot,
    protocol,
    localizationGate,
    branchDiffReport,
    control,
    treatment,
    pairedEffect: treatment.metrics.simulatedCharacterSpend - control.metrics.simulatedCharacterSpend,
    status: "AWAITING_POSTLAUNCH_OBSERVATION",
    validation: {
      populationParity: parityHash(control.agents) === parityHash(treatment.agents),
      networkParity: parityHash(control.relationships) === parityHash(treatment.relationships),
      sourceReferencesValid: allEvents.every((event) => event.sourceIds.every((sourceId) => validSources.has(sourceId as "R14"))),
      ledgerConserved: ledgerIsConserved(control) && ledgerIsConserved(treatment),
      actionCoverage,
    },
    disclaimer: "合成模拟与移动端公开代理，不代表日本全平台或单角色真实流水",
  };
}

export async function runPublishingPairWithDecisionAdapter(
  protocolSeed: string,
  adapter: PublishingDecisionAdapter,
  agentCount = 24,
): Promise<PublishingPairResult> {
  const snapshot = createPublishingSnapshot();
  const protocol = lockPublishingProtocol(protocolSeed, snapshot);
  const agents = createPublishingPopulation(agentCount);
  const controlConfig = createPublishingBranchConfig(protocol, "control", agents);
  const treatmentConfig = createPublishingBranchConfig(protocol, "treatment", agents);
  const localizationGate = validateLocalizationGate(controlConfig, treatmentConfig);
  const branchDiffReport = validatePublishingBranchDiff(controlConfig, treatmentConfig);
  if (!localizationGate.pass) throw new Error(`LOCALIZATION_GATE_FAILED:${localizationGate.illegalDifferences.join(",")}`);
  if (!branchDiffReport.pass) throw new Error("PUBLISHING_BRANCH_DIFF_FAILED");

  const resolveBranch = async (config: PublishingBranchConfig) => {
    const decisions = new Map<string, PublishingExternalDecision>();
    for (const agent of config.agents.filter((candidate) => !candidate.isSeed)) {
      const request = publishingDecisionRequest(config, agent);
      const decision = await adapter(request);
      const invalid = validatePublishingExternalDecision(request, decision);
      if (invalid) throw new Error(`PUBLISHING_DECISION_INVALID:${invalid}`);
      decisions.set(agent.id, decision);
    }
    return runPublishingBranch(config, decisions);
  };

  const control = await resolveBranch(controlConfig);
  const treatment = await resolveBranch(treatmentConfig);
  const allEvents = [...control.events, ...treatment.events];
  const actionCoverage = Object.fromEntries(PUBLISHING_ACTIONS.map((action) => [
    action,
    allEvents.some((event) => event.action === action),
  ])) as Record<PublishingAction, boolean>;
  const validSources = new Set(snapshot.sources.map((source) => source.sourceId));
  return {
    snapshot,
    protocol,
    localizationGate,
    branchDiffReport,
    control,
    treatment,
    pairedEffect: treatment.metrics.simulatedCharacterSpend - control.metrics.simulatedCharacterSpend,
    status: "AWAITING_POSTLAUNCH_OBSERVATION",
    validation: {
      populationParity: parityHash(control.agents) === parityHash(treatment.agents),
      networkParity: parityHash(control.relationships) === parityHash(treatment.relationships),
      sourceReferencesValid: allEvents.every((event) => event.sourceIds.every((sourceId) => validSources.has(sourceId as "R14"))),
      ledgerConserved: ledgerIsConserved(control) && ledgerIsConserved(treatment),
      actionCoverage,
    },
    disclaimer: "合成模拟与移动端公开代理，不代表日本全平台或单角色真实流水",
  };
}

export function replayPublishingPair(recording: PublishingPairResult): PublishingReplayResult {
  const controlMetrics = metricsFor(recording.control);
  const treatmentMetrics = metricsFor(recording.treatment);
  return {
    controlMetrics,
    treatmentMetrics,
    pairedEffect: treatmentMetrics.simulatedCharacterSpend - controlMetrics.simulatedCharacterSpend,
    eventHash: hashObject({ control: recording.control.events, treatment: recording.treatment.events }),
    sideEffects: { networkCalls: 0, llmCalls: 0, ledgerWrites: 0 },
  };
}
