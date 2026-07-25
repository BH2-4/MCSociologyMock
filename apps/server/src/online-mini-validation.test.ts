import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { resolveWorkspacePath } from "./env.js";

describe("online MiniMax validation evidence", () => {
  it("contains a complete redacted paired diagnostic and no side effects", () => {
    const report = JSON.parse(readFileSync(
      resolveWorkspacePath("fixtures/online-mini-validation.json"),
      "utf8",
    )) as {
      substitutesForFull24AgentRun: boolean;
      rows: Array<{
        branch: string;
        attempts: number;
        schemaFailed: boolean;
        observedEvidenceIds: string[];
      }>;
      validation: {
        completedDecisionCount: number;
        expectedDecisionCount: number;
        concurrency: number;
        controlCompletedBeforeTreatment: boolean;
        frozenObservationParity: boolean;
        controlEvidenceLeakCount: number;
        treatmentEvidenceCitationCount: number;
        schemaFailureCount: number;
        invalidReferenceCount: number;
        invalidActionCount: number;
        providerMismatchCount: number;
        missingHashCount: number;
        totalAttempts: number;
        usage: { promptTokens: number; completionTokens: number };
        sideEffects: { signatures: number; facilitatorCalls: number; chainTransactions: number };
        providerError: string | null;
      };
      passed: boolean;
    };

    expect(report.substitutesForFull24AgentRun).toBe(false);
    expect(report.passed).toBe(true);
    expect(report.validation).toMatchObject({
      completedDecisionCount: 2,
      expectedDecisionCount: 2,
      concurrency: 1,
      controlCompletedBeforeTreatment: true,
      frozenObservationParity: true,
      controlEvidenceLeakCount: 0,
      treatmentEvidenceCitationCount: 1,
      schemaFailureCount: 0,
      invalidReferenceCount: 0,
      invalidActionCount: 0,
      providerMismatchCount: 0,
      missingHashCount: 0,
      totalAttempts: 2,
      sideEffects: { signatures: 0, facilitatorCalls: 0, chainTransactions: 0 },
      providerError: null,
    });
    expect(report.validation.usage.promptTokens).toBeGreaterThan(0);
    expect(report.validation.usage.completionTokens).toBeGreaterThan(0);
    expect(report.rows.every((row) => row.attempts === 1 && !row.schemaFailed)).toBe(true);
    expect(report.rows.find((row) => row.branch === "control")?.observedEvidenceIds).toEqual([]);
    expect(report.rows.find((row) => row.branch === "treatment")?.observedEvidenceIds).toEqual([
      "evidence:mini-validation-retry-20260725",
    ]);

    const serialized = JSON.stringify(report).toLowerCase();
    expect(serialized).not.toMatch(/["_](api[_-]?key|private[_-]?key|authorization|key_ref|signature|reasoning|chain.of.thought)["_:]/);
  });

  it("contains a complete redacted 24-Agent online Run audit", () => {
    const report = JSON.parse(readFileSync(
      resolveWorkspacePath("fixtures/online-llm-run-audit.json"),
      "utf8",
    )) as {
      pairId: string;
      decisionMode: string;
      resultAcceptedWithoutPromptTuning: boolean;
      pairedEffect: number;
      validation: {
        claimParity: boolean;
        controlEvidenceLeakCount: number;
        treatmentEvidenceOmissionCount: number;
        walletIsolation: boolean;
        seedPaymentParity: boolean;
        balancesConserved: boolean;
        suppliesConserved: boolean;
      };
      branches: Record<string, {
        currentTick: number;
        agentCount: number;
        schemaFailureCount: number;
        providerMismatchCount: number;
        missingHashCount: number;
        verifiedTestnetEvidenceCount: number;
      }>;
      chainEvidence: { uniqueTransactionCount: number; txHashes: string[]; blockscoutLinks: string[] };
      replay: { eventHash: string; sideEffects: { llmCalls: number; signatures: number; facilitatorCalls: number } };
      exportAudit: { forbiddenKeys: string[]; containsRawSignatureValue: boolean };
      allChecksPass: boolean;
    };

    expect(report.pairId).toBe("pair-ccdd15dc5e91285c");
    expect(report.decisionMode).toBe("llm");
    expect(report.resultAcceptedWithoutPromptTuning).toBe(true);
    expect(report.pairedEffect).toBe(-4 / 22);
    expect(report.allChecksPass).toBe(true);
    expect(report.validation).toMatchObject({
      claimParity: true,
      controlEvidenceLeakCount: 0,
      treatmentEvidenceOmissionCount: 0,
      walletIsolation: true,
      seedPaymentParity: true,
      balancesConserved: true,
      suppliesConserved: true,
    });
    expect(Object.values(report.branches).every((branch) =>
      branch.currentTick === 8
      && branch.agentCount === 24
      && branch.schemaFailureCount === 0
      && branch.providerMismatchCount === 0
      && branch.missingHashCount === 0
      && branch.verifiedTestnetEvidenceCount === 2
    )).toBe(true);
    expect(report.chainEvidence.uniqueTransactionCount).toBe(4);
    expect(report.chainEvidence.txHashes).toHaveLength(4);
    expect(report.chainEvidence.blockscoutLinks).toHaveLength(4);
    expect(report.replay.eventHash).toMatch(/^[a-f0-9]{64}$/);
    expect(report.replay.sideEffects).toEqual({ llmCalls: 0, signatures: 0, facilitatorCalls: 0 });
    expect(report.exportAudit).toEqual({ forbiddenKeys: [], containsRawSignatureValue: false });
  });
});
