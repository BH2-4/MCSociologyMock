export const ACTIONS = ["INSPECT_EVIDENCE", "CHAT", "POST", "BUY", "IDLE"] as const;
export type AgentAction = (typeof ACTIONS)[number];

export type BranchId = "control" | "treatment";
export type DecisionMode = "evidence-blind" | "fixed-threshold" | "llm";
export type DeterministicDecisionMode = Exclude<DecisionMode, "llm">;
export type ReceiptVisibility = "HIDDEN" | "VERIFIED_SUMMARY";

export const EVENT_TYPES = [
  "PROTOCOL_LOCKED",
  "BRANCH_DIFF_VALIDATED",
  "OBSERVATION_DELIVERED",
  "CLAIM_PUBLISHED",
  "CLAIM_FORWARDED",
  "EVIDENCE_VERIFIED",
  "EVIDENCE_EXPOSED",
  "EVIDENCE_INSPECTED",
  "CREDIBILITY_ASSESSED",
  "ACTION_PROPOSED",
  "ACTION_REJECTED",
  "CHAT_SENT",
  "POST_PUBLISHED",
  "X402_PAYMENT_REQUIRED",
  "X402_POLICY_APPROVED",
  "X402_PAYMENT_SIGNED",
  "X402_PAYMENT_VERIFIED",
  "X402_PAYMENT_SETTLING",
  "X402_PAYMENT_SETTLED",
  "PRODUCT_FULFILLED",
  "PRODUCT_ADOPTED",
  "METRIC_COMPUTED",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface ConsumerAgent {
  id: string;
  index: number;
  communityId: string;
  persona: string;
  isSeed: boolean;
  baselineTrust: number;
  evidenceWeight: number;
  productAffinity: number;
  adoptionThreshold: number;
  socialThreshold: number;
  budgetMicros: number;
}

export interface Relationship {
  sourceId: string;
  targetId: string;
  trust: number;
  familiarity: number;
  contactProbability: number;
  channel: "CHAT" | "POST";
}

export interface ProtocolCard {
  researchQuestion: string;
  h1: string;
  h0: string;
  treatment: "receipt_visibility";
  primaryMetric: "non_seed_adoption_rate";
  alternativeExplanations: string[];
  failureCriteria: string[];
}

export interface LockedProtocol {
  card: ProtocolCard;
  config: typeof SIMULATION_CONFIG;
  offer: typeof PRODUCT_OFFER;
  protocolSeed: string;
  protocolHash: string;
}

export interface BranchConfig {
  branchId: BranchId;
  runId: string;
  walletNamespace: string;
  receiptVisibility: ReceiptVisibility;
  protocolHash: string;
  protocolSeed: string;
  decisionMode: DecisionMode;
  agents: ConsumerAgent[];
  relationships: Relationship[];
  offer: typeof PRODUCT_OFFER;
  tickCount: number;
}

export interface BranchDifference {
  path: string;
  control: unknown;
  treatment: unknown;
  allowed: boolean;
}

export interface BranchDiffReport {
  pass: boolean;
  allowedPaths: string[];
  differences: BranchDifference[];
  semanticDifferenceCount: number;
}

export interface BranchWallet {
  logicalAgentId: string;
  branchId: BranchId;
  address: `0x${string}`;
  keyRef: string;
  initialBalance: number;
  balance: number;
  nonce: number;
}

export interface Claim {
  id: string;
  authorId: string;
  productId: string;
  body: string;
  contentHash: string;
  stance: "POSITIVE";
  channel: "POST";
  publishedTick: number;
  initialAudience: string[];
  evidenceId?: string;
}

export interface Evidence {
  id: string;
  subjectAgentId: string;
  paymentId: string;
  productId: string;
  merchantId: string;
  amount: string;
  status: "VERIFIED" | "REVOKED_REFUNDED";
  proofScope: readonly string[];
  doesNotProve: readonly string[];
  verifiedAtTick: number;
  txHash: `0x${string}` | null;
  blockscoutUrl: string | null;
  source: "MOCK" | "INJECTIVE_TESTNET";
}

export interface PaymentRecord {
  id: string;
  payerAgentId: string;
  merchantId: string;
  productId: string;
  amount: number;
  state: "FULFILLED";
  source: "MOCK" | "INJECTIVE_TESTNET";
  mockReceiptId: string | null;
  txHash: `0x${string}` | null;
  tick: number;
}

export interface RecordedSeedPayment {
  branchId: BranchId;
  logicalAgentId: string;
  payerAddress: `0x${string}`;
  fulfillmentId: string;
  txHash: `0x${string}`;
  evidence: Evidence;
}

export interface RunOptions {
  recordedSeedPayments?: RecordedSeedPayment[];
}

export interface ExperimentEvent {
  eventId: string;
  experimentId: string;
  runId: string;
  branchId: BranchId;
  tick: number;
  occurredAt: string;
  type: EventType;
  actorId?: string;
  targetId?: string;
  entityId?: string;
  causedByEventId?: string;
  payload: Record<string, unknown>;
  schemaVersion: 2;
}

export interface DecisionRecord {
  agentId: string;
  tick: number;
  claimId: string;
  action: AgentAction;
  credibilityAssessment: number;
  observedClaimIds: string[];
  observedEvidenceIds: string[];
  reasonCodes: string[];
  causedByEventId: string;
  decisionSource?: "deterministic" | "llm";
  expectedOutcome?: string;
  confidence?: number;
  provider?: "openai-compatible";
  model?: string;
  requestHash?: string;
  responseHash?: string | null;
  attempts?: number;
  schemaFailed?: boolean;
  usage?: { promptTokens: number; completionTokens: number } | null;
}

export interface DecisionRequest {
  agent: {
    id: string;
    persona: string;
    budgetMicros: number;
  };
  tick: number;
  claims: Array<{ id: string; body: string; authorId: string }>;
  evidence: Array<{
    id: string;
    claimId: string;
    proofScope: readonly string[];
    doesNotProve: readonly string[];
  }>;
  product: { id: string; amount: string; assetSymbol: string };
  allowedChatTargetIds: string[];
  inspectedEvidenceIds: string[];
}

export interface ExternalDecision {
  action: AgentAction;
  targetIds: string[];
  credibilityAssessment: number;
  observedClaimIds: string[];
  observedEvidenceIds: string[];
  reasonCodes: string[];
  expectedOutcome: string;
  confidence: number;
  provider: "openai-compatible";
  model: string;
  requestHash: string;
  responseHash: string | null;
  attempts: number;
  schemaFailed: boolean;
  usage: { promptTokens: number; completionTokens: number } | null;
}

export interface BranchMetrics {
  adoptionRate: number;
  adoptedNonSeed: number;
  denominator: 22;
  evidenceExposureRate: number;
  evidenceInspectionRate: number;
  meanCredibility: number;
  chatCount: number;
  postCount: number;
  diffusionBreadth: number;
  evidenceCompleteness: number;
}

export interface BranchRun {
  branchId: BranchId;
  runId: string;
  protocolHash: string;
  decisionMode: DecisionMode;
  receiptVisibility: ReceiptVisibility;
  status: "COMPLETED";
  currentTick: 8;
  agents: ConsumerAgent[];
  merchant: {
    id: "merchant-01";
    deterministic: true;
    productId: "offer_eco_cup";
  };
  relationships: Relationship[];
  wallets: BranchWallet[];
  merchantBalance: number;
  initialTotalBalance: number;
  initialSupply: number;
  remainingSupply: number;
  claims: Claim[];
  evidence: Evidence[];
  payments: PaymentRecord[];
  decisions: DecisionRecord[];
  events: ExperimentEvent[];
  metrics: BranchMetrics;
}

export interface PairedExperimentResult {
  protocol: LockedProtocol;
  branchDiffReport: BranchDiffReport;
  control: BranchRun;
  treatment: BranchRun;
  pairedEffect: number;
  validation: {
    evidenceBlindZero: boolean | null;
    fixedThresholdPositive: boolean | null;
    claimParity: boolean;
    controlEvidenceLeakCount: number;
    treatmentEvidenceOmissionCount: number;
    walletIsolation: boolean;
    seedPaymentParity: boolean;
    balancesConserved: boolean;
    suppliesConserved: boolean;
  };
}

export const PRODUCT_OFFER = {
  id: "offer_eco_cup",
  amount: "300000",
  assetSymbol: "USDC",
  assetAddress: "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d",
  network: "eip155:1439",
  unitSupply: 24,
  maxPerConsumer: 1,
} as const;

export const SIMULATION_CONFIG = {
  consumerCount: 24,
  communityCount: 4,
  seedConsumerCount: 2,
  tickCount: 8,
} as const;

export const PROOF_SCOPE = ["PURCHASE_OCCURRED", "AMOUNT", "MERCHANT", "TIME"] as const;
export const DOES_NOT_PROVE = ["PRODUCT_QUALITY", "ACTUAL_USAGE", "REVIEW_TRUTH", "RECOMMENDATION_MOTIVE"] as const;
