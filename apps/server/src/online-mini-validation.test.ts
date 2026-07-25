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
      "evidence:mini-validation-seed",
    ]);

    const serialized = JSON.stringify(report).toLowerCase();
    expect(serialized).not.toMatch(/["_](api[_-]?key|private[_-]?key|authorization|key_ref|signature|reasoning|chain.of.thought)["_:]/);
  });
});
