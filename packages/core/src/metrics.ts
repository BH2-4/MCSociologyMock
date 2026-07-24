import type { BranchMetrics, BranchRun, PairedExperimentResult } from "./model.js";

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function calculateBranchMetrics(run: Omit<BranchRun, "metrics">): BranchMetrics {
  const nonSeedIds = new Set(run.agents.filter((agent) => !agent.isSeed).map((agent) => agent.id));
  const adopted = new Set(
    run.events
      .filter((event) => event.type === "PRODUCT_ADOPTED" && event.actorId && nonSeedIds.has(event.actorId))
      .map((event) => event.actorId as string),
  );
  const exposed = new Set(
    run.events
      .filter((event) => event.type === "OBSERVATION_DELIVERED" && event.targetId && nonSeedIds.has(event.targetId))
      .map((event) => event.targetId as string),
  );
  const evidenceExposed = new Set(
    run.events
      .filter((event) => event.type === "EVIDENCE_EXPOSED" && event.targetId && nonSeedIds.has(event.targetId))
      .map((event) => event.targetId as string),
  );
  const inspected = new Set(
    run.events
      .filter((event) => event.type === "EVIDENCE_INSPECTED" && event.actorId && nonSeedIds.has(event.actorId))
      .map((event) => event.actorId as string),
  );
  const credibility = run.decisions
    .filter((decision) => nonSeedIds.has(decision.agentId))
    .map((decision) => decision.credibilityAssessment);
  const fulfilled = run.payments.length;

  return {
    adoptionRate: adopted.size / 22,
    adoptedNonSeed: adopted.size,
    denominator: 22,
    evidenceExposureRate: exposed.size === 0 ? 0 : evidenceExposed.size / exposed.size,
    evidenceInspectionRate: evidenceExposed.size === 0 ? 0 : inspected.size / evidenceExposed.size,
    meanCredibility: Number(mean(credibility).toFixed(4)),
    chatCount: run.events.filter((event) => event.type === "CHAT_SENT").length,
    postCount: run.events.filter((event) => event.type === "POST_PUBLISHED").length,
    diffusionBreadth: exposed.size,
    evidenceCompleteness: fulfilled === 0 ? 1 : run.evidence.length / fulfilled,
  };
}

export function buildValidation(
  result: Pick<PairedExperimentResult, "control" | "treatment" | "pairedEffect">,
): PairedExperimentResult["validation"] {
  const claimKey = (run: BranchRun) => run.claims.map(({ authorId, body, contentHash, publishedTick, initialAudience }) => ({
    authorId,
    body,
    contentHash,
    publishedTick,
    initialAudience,
  }));
  const controlEvidenceLeakCount = result.control.events.filter((event) => event.type === "EVIDENCE_EXPOSED").length;
  const treatmentObservationCount = result.treatment.events.filter((event) => event.type === "OBSERVATION_DELIVERED").length;
  const treatmentEvidenceCount = result.treatment.events.filter((event) => event.type === "EVIDENCE_EXPOSED").length;
  const balanceConserved = (run: BranchRun) =>
    run.wallets.reduce((sum, wallet) => sum + wallet.balance, 0) + run.merchantBalance === run.initialTotalBalance;
  const supplyConserved = (run: BranchRun) => run.remainingSupply + run.payments.length === run.initialSupply;

  return {
    evidenceBlindZero: result.control.decisionMode === "evidence-blind" ? result.pairedEffect === 0 : null,
    fixedThresholdPositive: result.control.decisionMode === "fixed-threshold" ? result.pairedEffect > 0 : null,
    claimParity: JSON.stringify(claimKey(result.control)) === JSON.stringify(claimKey(result.treatment)),
    controlEvidenceLeakCount,
    treatmentEvidenceOmissionCount: treatmentObservationCount - treatmentEvidenceCount,
    balancesConserved: balanceConserved(result.control) && balanceConserved(result.treatment),
    suppliesConserved: supplyConserved(result.control) && supplyConserved(result.treatment),
  };
}
