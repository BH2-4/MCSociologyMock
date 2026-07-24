import { deterministicAddress, hashObject, keyedRandom } from "./determinism.js";
import { buildValidation, calculateBranchMetrics } from "./metrics.js";
import type {
  AgentAction,
  BranchConfig,
  BranchRun,
  Claim,
  ConsumerAgent,
  DecisionMode,
  DecisionRecord,
  Evidence,
  ExperimentEvent,
  PairedExperimentResult,
  PaymentRecord,
} from "./model.js";
import { DOES_NOT_PROVE, PRODUCT_OFFER, PROOF_SCOPE } from "./model.js";
import { createBranchConfig, lockDefaultProtocol, validateBranchDiff } from "./protocol.js";

interface PendingExposure {
  tick: number;
  recipientId: string;
  claimId: string;
  causedByEventId: string;
  channel: "CHAT" | "POST";
}

interface InteractionState {
  observationEventId: string;
  inspected: boolean;
  acted: boolean;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function initialAudienceFor(seed: ConsumerAgent, agents: ConsumerAgent[]): string[] {
  return [1, 2, 3, 4, 5]
    .map((offset) => agents[(seed.index + offset) % agents.length].id);
}

function baseCredibility(agent: ConsumerAgent, relationshipTrust: number): number {
  return clamp(agent.baselineTrust * 0.35 + agent.productAffinity * 0.45 + relationshipTrust * 0.2);
}

function chooseAction(agent: ConsumerAgent, credibility: number, mode: DecisionMode): AgentAction {
  const selector = agent.index % 4;
  if (selector === 0) {
    const threshold = mode === "evidence-blind" ? 0.53 : agent.adoptionThreshold;
    return credibility >= threshold ? "BUY" : "IDLE";
  }
  if (selector === 1) return credibility >= agent.socialThreshold ? "POST" : "IDLE";
  if (selector === 2) return credibility >= 0.52 ? "CHAT" : "IDLE";
  return "IDLE";
}

function runBranch(config: BranchConfig): BranchRun {
  const events: ExperimentEvent[] = [];
  const decisions: DecisionRecord[] = [];
  const claims: Claim[] = [];
  const evidence: Evidence[] = [];
  const payments: PaymentRecord[] = [];
  const pending: PendingExposure[] = [];
  const interactions = new Map<string, InteractionState>();
  const purchased = new Set<string>();
  const wallets = config.agents.map((agent) => ({
    logicalAgentId: agent.id,
    branchId: config.branchId,
    address: deterministicAddress(config.walletNamespace, agent.id),
    keyRef: `secret://agorasim/${config.branchId}/${agent.id}`,
    initialBalance: agent.budgetMicros,
    balance: agent.budgetMicros,
    nonce: 0,
  }));
  const initialTotalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  let merchantBalance = 0;
  let remainingSupply = PRODUCT_OFFER.unitSupply;
  let sequence = 0;

  const addEvent = (
    tick: number,
    type: ExperimentEvent["type"],
    values: Partial<Pick<ExperimentEvent, "actorId" | "targetId" | "entityId" | "causedByEventId">> = {},
    payload: Record<string, unknown> = {},
  ): ExperimentEvent => {
    sequence += 1;
    const event: ExperimentEvent = {
      eventId: `${config.runId}:evt:${String(sequence).padStart(4, "0")}`,
      experimentId: "exp-agorasim-p0",
      runId: config.runId,
      branchId: config.branchId,
      tick,
      occurredAt: new Date(Date.UTC(2026, 0, 1, 0, tick, 0, sequence)).toISOString(),
      type,
      ...values,
      payload,
      schemaVersion: 2,
    };
    events.push(event);
    return event;
  };

  const buyWithMockPayment = (agent: ConsumerAgent, tick: number, causedByEventId?: string): Evidence | null => {
    if (purchased.has(agent.id) || remainingSupply < 1) return null;
    const wallet = wallets.find((candidate) => candidate.logicalAgentId === agent.id);
    if (!wallet || wallet.balance < Number(PRODUCT_OFFER.amount)) return null;
    const paymentId = `${config.runId}:payment:${agent.id}`;
    const common = { actorId: agent.id, targetId: "merchant-01", entityId: paymentId, causedByEventId };
    const required = addEvent(tick, "X402_PAYMENT_REQUIRED", common, { mode: "MOCK", network: PRODUCT_OFFER.network, amount: PRODUCT_OFFER.amount });
    const approved = addEvent(tick, "X402_POLICY_APPROVED", { ...common, causedByEventId: required.eventId }, { policyVersion: "mock-policy-v1" });
    const signed = addEvent(tick, "X402_PAYMENT_SIGNED", { ...common, causedByEventId: approved.eventId }, { signatureStored: false, mode: "MOCK" });
    const verified = addEvent(tick, "X402_PAYMENT_VERIFIED", { ...common, causedByEventId: signed.eventId }, { receiptSource: "MOCK" });
    const settling = addEvent(tick, "X402_PAYMENT_SETTLING", { ...common, causedByEventId: verified.eventId });

    wallet.balance -= Number(PRODUCT_OFFER.amount);
    wallet.nonce += 1;
    merchantBalance += Number(PRODUCT_OFFER.amount);
    remainingSupply -= 1;
    purchased.add(agent.id);

    const settled = addEvent(tick, "X402_PAYMENT_SETTLED", { ...common, causedByEventId: settling.eventId }, { txHash: null, mockReceipt: true });
    const fulfilled = addEvent(tick, "PRODUCT_FULFILLED", { ...common, causedByEventId: settled.eventId }, { fulfillmentId: `${paymentId}:fulfillment` });
    addEvent(tick, "PRODUCT_ADOPTED", { ...common, causedByEventId: fulfilled.eventId });
    const payment: PaymentRecord = {
      id: paymentId,
      payerAgentId: agent.id,
      merchantId: "merchant-01",
      productId: PRODUCT_OFFER.id,
      amount: Number(PRODUCT_OFFER.amount),
      state: "FULFILLED",
      mockReceiptId: `mock-receipt:${config.protocolSeed}:${config.branchId}:${agent.id}`,
      txHash: null,
      tick,
    };
    payments.push(payment);
    const verifiedEvidence: Evidence = {
      id: `${config.runId}:evidence:${agent.id}`,
      subjectAgentId: agent.id,
      paymentId,
      productId: PRODUCT_OFFER.id,
      merchantId: "merchant-01",
      amount: PRODUCT_OFFER.amount,
      status: "VERIFIED",
      proofScope: PROOF_SCOPE,
      doesNotProve: DOES_NOT_PROVE,
      verifiedAtTick: tick,
      txHash: null,
      blockscoutUrl: null,
      source: "MOCK",
    };
    evidence.push(verifiedEvidence);
    addEvent(tick, "EVIDENCE_VERIFIED", { actorId: agent.id, entityId: verifiedEvidence.id, causedByEventId: fulfilled.eventId }, {
      paymentId,
      proofScope: PROOF_SCOPE,
      doesNotProve: DOES_NOT_PROVE,
      source: "MOCK",
    });
    return verifiedEvidence;
  };

  addEvent(0, "PROTOCOL_LOCKED", { entityId: config.protocolHash }, { protocolHash: config.protocolHash });
  addEvent(0, "BRANCH_DIFF_VALIDATED", {}, { pass: true, receiptVisibility: config.receiptVisibility });

  for (let tick = 1; tick <= config.tickCount; tick += 1) {
    if (tick === 1) {
      for (const seed of config.agents.filter((agent) => agent.isSeed)) buyWithMockPayment(seed, tick);
    }

    if (tick === 2) {
      for (const seed of config.agents.filter((agent) => agent.isSeed)) {
        const body = "I bought the Eco Cup for 0.30 USDC from the Agora merchant.";
        const claim: Claim = {
          id: `claim:${seed.id}`,
          authorId: seed.id,
          productId: PRODUCT_OFFER.id,
          body,
          contentHash: hashObject({ authorId: seed.id, body, tick, channel: "POST", productId: PRODUCT_OFFER.id }),
          stance: "POSITIVE",
          channel: "POST",
          publishedTick: tick,
          initialAudience: initialAudienceFor(seed, config.agents),
          evidenceId: evidence.find((item) => item.subjectAgentId === seed.id)?.id,
        };
        claims.push(claim);
        const published = addEvent(tick, "CLAIM_PUBLISHED", { actorId: seed.id, entityId: claim.id }, {
          contentHash: claim.contentHash,
          channel: claim.channel,
          initialAudience: claim.initialAudience,
        });
        for (const recipientId of claim.initialAudience) {
          pending.push({ tick: tick + 1, recipientId, claimId: claim.id, causedByEventId: published.eventId, channel: "POST" });
        }
      }
    }

    for (const delivery of pending.filter((item) => item.tick === tick)) {
      const key = `${delivery.recipientId}:${delivery.claimId}`;
      if (interactions.has(key)) continue;
      const claim = claims.find((candidate) => candidate.id === delivery.claimId);
      if (!claim) continue;
      const visibleEvidence = config.receiptVisibility === "VERIFIED_SUMMARY"
        ? evidence.find((item) => item.id === claim.evidenceId && item.status === "VERIFIED")
        : undefined;
      const observation = addEvent(tick, "OBSERVATION_DELIVERED", {
        targetId: delivery.recipientId,
        entityId: claim.id,
        causedByEventId: delivery.causedByEventId,
      }, {
        claimId: claim.id,
        evidenceIds: visibleEvidence ? [visibleEvidence.id] : [],
        channel: delivery.channel,
      });
      if (visibleEvidence) {
        addEvent(tick, "EVIDENCE_EXPOSED", {
          actorId: claim.authorId,
          targetId: delivery.recipientId,
          entityId: visibleEvidence.id,
          causedByEventId: observation.eventId,
        }, {
          claimId: claim.id,
          visibility: "VERIFIED_PURCHASE",
          proofScope: visibleEvidence.proofScope,
          doesNotProve: visibleEvidence.doesNotProve,
        });
      }
      interactions.set(key, { observationEventId: observation.eventId, inspected: false, acted: false });
    }

    if (tick >= 3 && tick <= 7) {
      for (const [key, state] of interactions.entries()) {
        if (state.acted) continue;
        const [agentId, claimId] = key.split(":claim:");
        const resolvedClaimId = `claim:${claimId}`;
        const agent = config.agents.find((candidate) => candidate.id === agentId);
        const claim = claims.find((candidate) => candidate.id === resolvedClaimId);
        if (!agent || !claim || agent.isSeed) continue;
        const relationship = config.relationships.find((edge) => edge.sourceId === claim.authorId && edge.targetId === agent.id);
        const trust = relationship?.trust ?? 0.5;
        const visibleEvidence = config.receiptVisibility === "VERIFIED_SUMMARY" && Boolean(claim.evidenceId);
        const credibility = clamp(baseCredibility(agent, trust) + (
          config.decisionMode === "fixed-threshold" && visibleEvidence ? agent.evidenceWeight : 0
        ));

        addEvent(tick, "CREDIBILITY_ASSESSED", { actorId: agent.id, entityId: claim.id, causedByEventId: state.observationEventId }, {
          credibilityAssessment: credibility,
        });

        if (config.decisionMode === "fixed-threshold" && visibleEvidence && !state.inspected) {
          const action = addEvent(tick, "ACTION_PROPOSED", { actorId: agent.id, entityId: claim.id, causedByEventId: state.observationEventId }, { action: "INSPECT_EVIDENCE" });
          addEvent(tick, "EVIDENCE_INSPECTED", { actorId: agent.id, entityId: claim.evidenceId, causedByEventId: action.eventId }, { claimId: claim.id });
          decisions.push({
            agentId: agent.id,
            tick,
            claimId: claim.id,
            action: "INSPECT_EVIDENCE",
            credibilityAssessment: credibility,
            observedClaimIds: [claim.id],
            observedEvidenceIds: claim.evidenceId ? [claim.evidenceId] : [],
            reasonCodes: ["RECEIPT_VERIFIED"],
            causedByEventId: state.observationEventId,
          });
          state.inspected = true;
          continue;
        }

        const actionName = chooseAction(agent, credibility, config.decisionMode);
        const action = addEvent(tick, "ACTION_PROPOSED", { actorId: agent.id, entityId: claim.id, causedByEventId: state.observationEventId }, { action: actionName });
        decisions.push({
          agentId: agent.id,
          tick,
          claimId: claim.id,
          action: actionName,
          credibilityAssessment: credibility,
          observedClaimIds: [claim.id],
          observedEvidenceIds: visibleEvidence && claim.evidenceId ? [claim.evidenceId] : [],
          reasonCodes: visibleEvidence ? ["RECEIPT_VERIFIED", "PRODUCT_FIT"] : ["NO_VISIBLE_RECEIPT", "PRODUCT_FIT"],
          causedByEventId: state.observationEventId,
        });
        state.acted = true;

        if (actionName === "BUY") buyWithMockPayment(agent, tick, action.eventId);
        if (actionName === "POST") {
          const post = addEvent(tick, "POST_PUBLISHED", { actorId: agent.id, entityId: claim.id, causedByEventId: action.eventId }, { claimId: claim.id });
          addEvent(tick, "CLAIM_FORWARDED", { actorId: agent.id, entityId: claim.id, causedByEventId: post.eventId }, { channel: "POST" });
          for (const edge of config.relationships.filter((candidate) => candidate.sourceId === agent.id && candidate.channel === "POST")) {
            if (keyedRandom(config.protocolSeed, tick, agent.id, `contact:${edge.targetId}`) <= edge.contactProbability) {
              pending.push({ tick: tick + 1, recipientId: edge.targetId, claimId: claim.id, causedByEventId: post.eventId, channel: "POST" });
            }
          }
        }
        if (actionName === "CHAT") {
          const target = config.relationships.find((edge) => edge.sourceId === agent.id && edge.channel === "CHAT")?.targetId;
          if (target) {
            const chat = addEvent(tick, "CHAT_SENT", { actorId: agent.id, targetId: target, entityId: claim.id, causedByEventId: action.eventId }, { claimId: claim.id });
            pending.push({ tick: tick + 1, recipientId: target, claimId: claim.id, causedByEventId: chat.eventId, channel: "CHAT" });
          }
        }
      }
    }
  }

  const runWithoutMetrics: Omit<BranchRun, "metrics"> = {
    branchId: config.branchId,
    runId: config.runId,
    protocolHash: config.protocolHash,
    decisionMode: config.decisionMode,
    receiptVisibility: config.receiptVisibility,
    status: "COMPLETED",
    currentTick: 8,
    agents: config.agents,
    merchant: {
      id: "merchant-01",
      deterministic: true,
      productId: "offer_eco_cup",
    },
    relationships: config.relationships,
    wallets,
    merchantBalance,
    initialTotalBalance,
    initialSupply: PRODUCT_OFFER.unitSupply,
    remainingSupply,
    claims,
    evidence,
    payments,
    decisions,
    events,
  };
  const metrics = calculateBranchMetrics(runWithoutMetrics);
  addEvent(8, "METRIC_COMPUTED", {}, metrics as unknown as Record<string, unknown>);
  return { ...runWithoutMetrics, events, metrics };
}

export function runPairedExperiment(
  protocolSeed: string,
  decisionMode: DecisionMode,
): PairedExperimentResult {
  const protocol = lockDefaultProtocol(protocolSeed);
  const controlConfig = createBranchConfig(protocol, "control", decisionMode);
  const treatmentConfig = createBranchConfig(protocol, "treatment", decisionMode);
  const branchDiffReport = validateBranchDiff(controlConfig, treatmentConfig);
  if (!branchDiffReport.pass) throw new Error("Branch semantic diff validation failed");
  const control = runBranch(controlConfig);
  const treatment = runBranch(treatmentConfig);
  const pairedEffect = treatment.metrics.adoptionRate - control.metrics.adoptionRate;
  const partial = { control, treatment, pairedEffect };
  return {
    protocol,
    branchDiffReport,
    ...partial,
    validation: buildValidation(partial),
  };
}
