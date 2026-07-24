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
  DecisionRequest,
  DeterministicDecisionMode,
  Evidence,
  ExternalDecision,
  ExperimentEvent,
  PairedExperimentResult,
  PaymentRecord,
  RecordedSeedPayment,
  RunOptions,
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

function chooseAction(agent: ConsumerAgent, credibility: number, mode: DeterministicDecisionMode): AgentAction {
  const selector = agent.index % 4;
  if (selector === 0) {
    const threshold = mode === "evidence-blind" ? 0.53 : agent.adoptionThreshold;
    return credibility >= threshold ? "BUY" : "IDLE";
  }
  if (selector === 1) return credibility >= agent.socialThreshold ? "POST" : "IDLE";
  if (selector === 2) return credibility >= 0.52 ? "CHAT" : "IDLE";
  return "IDLE";
}

type BranchMachine = Generator<DecisionRequest, BranchRun, ExternalDecision>;

function validateRecordedSeedPayments(recordings: RecordedSeedPayment[] | undefined): void {
  if (!recordings) return;
  const expected = new Set([
    "control:consumer-01",
    "control:consumer-13",
    "treatment:consumer-01",
    "treatment:consumer-13",
  ]);
  if (recordings.length !== expected.size) throw new Error("RECORDED_SEED_PAYMENT_SET_INCOMPLETE");
  const payers = new Set<string>();
  const transactions = new Set<string>();
  for (const recording of recordings) {
    const key = `${recording.branchId}:${recording.logicalAgentId}`;
    if (!expected.delete(key)) throw new Error("RECORDED_SEED_PAYMENT_UNEXPECTED");
    if (!/^0x[a-fA-F0-9]{40}$/.test(recording.payerAddress)) throw new Error("RECORDED_SEED_PAYER_INVALID");
    if (!/^0x[a-fA-F0-9]{64}$/.test(recording.txHash)) throw new Error("RECORDED_SEED_TRANSACTION_INVALID");
    if (payers.has(recording.payerAddress.toLowerCase())) throw new Error("RECORDED_SEED_PAYER_REUSED");
    if (transactions.has(recording.txHash.toLowerCase())) throw new Error("RECORDED_SEED_TRANSACTION_REUSED");
    payers.add(recording.payerAddress.toLowerCase());
    transactions.add(recording.txHash.toLowerCase());
    const evidence = recording.evidence;
    if (
      evidence.subjectAgentId !== recording.logicalAgentId
      || evidence.productId !== PRODUCT_OFFER.id
      || evidence.merchantId !== "merchant-01"
      || evidence.amount !== PRODUCT_OFFER.amount
      || evidence.status !== "VERIFIED"
      || evidence.source !== "INJECTIVE_TESTNET"
      || evidence.verifiedAtTick !== 1
      || evidence.txHash?.toLowerCase() !== recording.txHash.toLowerCase()
      || !evidence.blockscoutUrl?.endsWith(recording.txHash)
    ) throw new Error("RECORDED_SEED_EVIDENCE_MISMATCH");
  }
  if (expected.size > 0) throw new Error("RECORDED_SEED_PAYMENT_SET_INCOMPLETE");
}

function validateWalletIsolationBeforeRun(
  control: BranchConfig,
  treatment: BranchConfig,
  recordings: RecordedSeedPayment[] | undefined,
): void {
  const addresses = [control, treatment].flatMap((config) => config.agents.map((agent) =>
    recordings?.find((recording) =>
      recording.branchId === config.branchId && recording.logicalAgentId === agent.id
    )?.payerAddress.toLowerCase() ?? deterministicAddress(config.walletNamespace, agent.id).toLowerCase()
  ));
  if (new Set(addresses).size !== addresses.length) throw new Error("BRANCH_WALLET_ADDRESS_REUSED");
}

function validateExternalDecision(request: DecisionRequest, decision: ExternalDecision): string | null {
  const claimIds = new Set(request.claims.map((claim) => claim.id));
  const evidenceIds = new Set(request.evidence.map((item) => item.id));
  if (decision.observedClaimIds.some((id) => !claimIds.has(id))) return "CLAIM_NOT_VISIBLE";
  if (decision.observedEvidenceIds.some((id) => !evidenceIds.has(id))) return "EVIDENCE_NOT_VISIBLE";
  if (decision.action === "INSPECT_EVIDENCE" && request.evidence.length === 0) return "NO_VISIBLE_EVIDENCE";
  if (decision.action === "CHAT" && !request.allowedChatTargetIds.includes(decision.targetIds[0] ?? "")) {
    return "INVALID_CHAT_TARGET";
  }
  return null;
}

function* runBranchMachine(config: BranchConfig, recordedSeedPayments?: RecordedSeedPayment[]): BranchMachine {
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
    address: recordedSeedPayments?.find((payment) =>
      payment.branchId === config.branchId && payment.logicalAgentId === agent.id
    )?.payerAddress ?? deterministicAddress(config.walletNamespace, agent.id),
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

  const buyWithPayment = (agent: ConsumerAgent, tick: number, causedByEventId?: string): Evidence | null => {
    if (purchased.has(agent.id) || remainingSupply < 1) return null;
    const wallet = wallets.find((candidate) => candidate.logicalAgentId === agent.id);
    if (!wallet || wallet.balance < Number(PRODUCT_OFFER.amount)) return null;
    const recording = recordedSeedPayments?.find((candidate) =>
      candidate.branchId === config.branchId && candidate.logicalAgentId === agent.id
    );
    const paymentId = recording?.evidence.paymentId ?? `${config.runId}:payment:${agent.id}`;
    const source = recording ? "INJECTIVE_TESTNET" : "MOCK";
    const common = { actorId: agent.id, targetId: "merchant-01", entityId: paymentId, causedByEventId };
    const required = addEvent(tick, "X402_PAYMENT_REQUIRED", common, { mode: source, network: PRODUCT_OFFER.network, amount: PRODUCT_OFFER.amount });
    const approved = addEvent(tick, "X402_POLICY_APPROVED", { ...common, causedByEventId: required.eventId }, { policyVersion: recording ? "fixed-wallet-policy-v1" : "mock-policy-v1" });
    const signed = addEvent(tick, "X402_PAYMENT_SIGNED", { ...common, causedByEventId: approved.eventId }, { signatureStored: false, mode: source });
    const verified = addEvent(tick, "X402_PAYMENT_VERIFIED", { ...common, causedByEventId: signed.eventId }, { receiptSource: source });
    const settling = addEvent(tick, "X402_PAYMENT_SETTLING", { ...common, causedByEventId: verified.eventId });

    wallet.balance -= Number(PRODUCT_OFFER.amount);
    wallet.nonce += 1;
    merchantBalance += Number(PRODUCT_OFFER.amount);
    remainingSupply -= 1;
    purchased.add(agent.id);

    const settled = addEvent(tick, "X402_PAYMENT_SETTLED", { ...common, causedByEventId: settling.eventId }, { txHash: recording?.txHash ?? null, mockReceipt: !recording });
    const fulfilled = addEvent(tick, "PRODUCT_FULFILLED", { ...common, causedByEventId: settled.eventId }, { fulfillmentId: recording?.fulfillmentId ?? `${paymentId}:fulfillment` });
    addEvent(tick, "PRODUCT_ADOPTED", { ...common, causedByEventId: fulfilled.eventId });
    const payment: PaymentRecord = {
      id: paymentId,
      payerAgentId: agent.id,
      merchantId: "merchant-01",
      productId: PRODUCT_OFFER.id,
      amount: Number(PRODUCT_OFFER.amount),
      state: "FULFILLED",
      source,
      mockReceiptId: recording ? null : `mock-receipt:${config.protocolSeed}:${config.branchId}:${agent.id}`,
      txHash: recording?.txHash ?? null,
      tick,
    };
    payments.push(payment);
    const verifiedEvidence: Evidence = recording?.evidence ?? {
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
      source,
      txHash: verifiedEvidence.txHash,
    });
    return verifiedEvidence;
  };

  addEvent(0, "PROTOCOL_LOCKED", { entityId: config.protocolHash }, { protocolHash: config.protocolHash });
  addEvent(0, "BRANCH_DIFF_VALIDATED", {}, { pass: true, receiptVisibility: config.receiptVisibility });

  for (let tick = 1; tick <= config.tickCount; tick += 1) {
    if (tick === 1) {
      for (const seed of config.agents.filter((agent) => agent.isSeed)) buyWithPayment(seed, tick);
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
        let credibility = clamp(baseCredibility(agent, trust) + (
          config.decisionMode === "fixed-threshold" && visibleEvidence ? agent.evidenceWeight : 0
        ));

        if (config.decisionMode === "fixed-threshold" && visibleEvidence && !state.inspected) {
          addEvent(tick, "CREDIBILITY_ASSESSED", { actorId: agent.id, entityId: claim.id, causedByEventId: state.observationEventId }, {
            credibilityAssessment: credibility,
          });
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
            decisionSource: "deterministic",
          });
          state.inspected = true;
          continue;
        }

        let actionName: AgentAction;
        let targetIds: string[] = [];
        let externalDecision: ExternalDecision | undefined;
        let decisionMetadata: Partial<DecisionRecord> = { decisionSource: "deterministic" };
        if (config.decisionMode === "llm") {
          const decisionRequest: DecisionRequest = {
            agent: { id: agent.id, persona: agent.persona, budgetMicros: agent.budgetMicros },
            tick,
            claims: [{ id: claim.id, body: claim.body, authorId: claim.authorId }],
            evidence: visibleEvidence && claim.evidenceId ? [{
              id: claim.evidenceId,
              claimId: claim.id,
              proofScope: PROOF_SCOPE,
              doesNotProve: DOES_NOT_PROVE,
            }] : [],
            product: { id: PRODUCT_OFFER.id, amount: PRODUCT_OFFER.amount, assetSymbol: PRODUCT_OFFER.assetSymbol },
            allowedChatTargetIds: config.relationships
              .filter((edge) => edge.sourceId === agent.id && edge.channel === "CHAT")
              .map((edge) => edge.targetId),
            inspectedEvidenceIds: state.inspected && claim.evidenceId ? [claim.evidenceId] : [],
          };
          externalDecision = yield decisionRequest;
          const rejectionReason = validateExternalDecision(decisionRequest, externalDecision);
          credibility = clamp(externalDecision.credibilityAssessment);
          actionName = rejectionReason ? "IDLE" : externalDecision.action;
          targetIds = externalDecision.targetIds;
          decisionMetadata = {
            decisionSource: "llm",
            expectedOutcome: externalDecision.expectedOutcome,
            confidence: externalDecision.confidence,
            provider: externalDecision.provider,
            model: externalDecision.model,
            requestHash: externalDecision.requestHash,
            responseHash: externalDecision.responseHash,
            attempts: externalDecision.attempts,
            schemaFailed: externalDecision.schemaFailed,
            usage: externalDecision.usage,
          };
          if (rejectionReason) {
            addEvent(tick, "ACTION_REJECTED", { actorId: agent.id, entityId: claim.id, causedByEventId: state.observationEventId }, {
              proposedAction: externalDecision.action,
              reason: rejectionReason,
            });
          }
        } else {
          actionName = chooseAction(agent, credibility, config.decisionMode);
        }
        addEvent(tick, "CREDIBILITY_ASSESSED", { actorId: agent.id, entityId: claim.id, causedByEventId: state.observationEventId }, {
          credibilityAssessment: credibility,
        });
        const action = addEvent(tick, "ACTION_PROPOSED", { actorId: agent.id, entityId: claim.id, causedByEventId: state.observationEventId }, { action: actionName });
        decisions.push({
          agentId: agent.id,
          tick,
          claimId: claim.id,
          action: actionName,
          credibilityAssessment: credibility,
          observedClaimIds: externalDecision
            ? externalDecision.observedClaimIds.filter((id) => id === claim.id)
            : [claim.id],
          observedEvidenceIds: externalDecision
            ? externalDecision.observedEvidenceIds.filter((id) => visibleEvidence && id === claim.evidenceId)
            : visibleEvidence && claim.evidenceId ? [claim.evidenceId] : [],
          reasonCodes: externalDecision?.reasonCodes ?? (visibleEvidence ? ["RECEIPT_VERIFIED", "PRODUCT_FIT"] : ["NO_VISIBLE_RECEIPT", "PRODUCT_FIT"]),
          causedByEventId: state.observationEventId,
          ...decisionMetadata,
        });

        if (actionName === "INSPECT_EVIDENCE" && visibleEvidence && claim.evidenceId) {
          addEvent(tick, "EVIDENCE_INSPECTED", { actorId: agent.id, entityId: claim.evidenceId, causedByEventId: action.eventId }, { claimId: claim.id });
          state.inspected = true;
          continue;
        }

        state.acted = true;

        if (actionName === "BUY") buyWithPayment(agent, tick, action.eventId);
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
          const target = config.decisionMode === "llm"
            ? targetIds[0]
            : config.relationships.find((edge) => edge.sourceId === agent.id && edge.channel === "CHAT")?.targetId;
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

function runBranch(config: BranchConfig, recordedSeedPayments?: RecordedSeedPayment[]): BranchRun {
  const machine = runBranchMachine(config, recordedSeedPayments);
  const result = machine.next();
  if (!result.done) throw new Error("A decision adapter is required for llm mode");
  return result.value;
}

async function runBranchWithDecisionAdapter(
  config: BranchConfig,
  decide: (request: DecisionRequest) => Promise<ExternalDecision>,
  recordedSeedPayments?: RecordedSeedPayment[],
): Promise<BranchRun> {
  const machine = runBranchMachine(config, recordedSeedPayments);
  let result = machine.next();
  while (!result.done) {
    result = machine.next(await decide(result.value));
  }
  return result.value;
}

export function runPairedExperiment(
  protocolSeed: string,
  decisionMode: DeterministicDecisionMode,
  options: RunOptions = {},
): PairedExperimentResult {
  validateRecordedSeedPayments(options.recordedSeedPayments);
  const protocol = lockDefaultProtocol(protocolSeed);
  const controlConfig = createBranchConfig(protocol, "control", decisionMode);
  const treatmentConfig = createBranchConfig(protocol, "treatment", decisionMode);
  const branchDiffReport = validateBranchDiff(controlConfig, treatmentConfig);
  if (!branchDiffReport.pass) throw new Error("Branch semantic diff validation failed");
  validateWalletIsolationBeforeRun(controlConfig, treatmentConfig, options.recordedSeedPayments);
  const control = runBranch(controlConfig, options.recordedSeedPayments);
  const treatment = runBranch(treatmentConfig, options.recordedSeedPayments);
  const pairedEffect = treatment.metrics.adoptionRate - control.metrics.adoptionRate;
  const partial = { control, treatment, pairedEffect };
  return {
    protocol,
    branchDiffReport,
    ...partial,
    validation: buildValidation(partial),
  };
}

export async function runPairedExperimentWithDecisionAdapter(
  protocolSeed: string,
  decide: (request: DecisionRequest) => Promise<ExternalDecision>,
  options: RunOptions = {},
): Promise<PairedExperimentResult> {
  validateRecordedSeedPayments(options.recordedSeedPayments);
  const protocol = lockDefaultProtocol(protocolSeed);
  const controlConfig = createBranchConfig(protocol, "control", "llm");
  const treatmentConfig = createBranchConfig(protocol, "treatment", "llm");
  const branchDiffReport = validateBranchDiff(controlConfig, treatmentConfig);
  if (!branchDiffReport.pass) throw new Error("Branch semantic diff validation failed");
  validateWalletIsolationBeforeRun(controlConfig, treatmentConfig, options.recordedSeedPayments);
  const control = await runBranchWithDecisionAdapter(controlConfig, decide, options.recordedSeedPayments);
  const treatment = await runBranchWithDecisionAdapter(treatmentConfig, decide, options.recordedSeedPayments);
  const pairedEffect = treatment.metrics.adoptionRate - control.metrics.adoptionRate;
  const partial = { control, treatment, pairedEffect };
  return {
    protocol,
    branchDiffReport,
    ...partial,
    validation: buildValidation(partial),
  };
}
