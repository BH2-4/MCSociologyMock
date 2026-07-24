import { runPairedExperimentWithDecisionAdapter } from "@agorasim/core";
import { describe, expect, it, vi } from "vitest";

import { OpenAiCompatibleDecisionAdapter, type LlmObservation } from "./llm-adapter.js";

const observation: LlmObservation = {
  agent: { id: "consumer-03", persona: "skeptical", budgetMicros: 1_200_000 },
  tick: 4,
  claims: [{ id: "claim-01", body: "I bought the Eco Cup.", authorId: "consumer-01" }],
  evidence: [{
    id: "evidence-01",
    claimId: "claim-01",
    proofScope: ["PURCHASE_OCCURRED", "AMOUNT", "MERCHANT", "TIME"],
    doesNotProve: ["PRODUCT_QUALITY", "ACTUAL_USAGE", "REVIEW_TRUTH"],
  }],
  product: { id: "offer_eco_cup", amount: "300000", assetSymbol: "USDC" },
  allowedChatTargetIds: ["consumer-04"],
  inspectedEvidenceIds: [],
};

function completion(content: string): Response {
  return new Response(JSON.stringify({
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 100, completion_tokens: 40 },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("OpenAI-compatible decision adapter", () => {
  it("retries schema errors twice and accepts a visible structured decision", async () => {
    const valid = JSON.stringify({
      action: "BUY",
      target_ids: ["merchant-01"],
      content: "",
      decision_summary: {
        observed_claim_ids: ["claim-01"],
        observed_evidence_ids: ["evidence-01"],
        credibility_assessment: 0.78,
        reason_codes: ["RECEIPT_VERIFIED", "PRODUCT_FIT", "PRICE_ACCEPTABLE"],
        expected_outcome: "Receive one simulated Eco Cup.",
        confidence: 0.72,
      },
    });
    const fetchFixture = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(completion("not json"))
      .mockResolvedValueOnce(completion(JSON.stringify({ action: "BUY" })))
      .mockResolvedValueOnce(completion(valid));
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
    }, fetchFixture);

    const result = await adapter.decide(observation);

    expect(result.decision.action).toBe("BUY");
    expect(result.attempts).toBe(3);
    expect(result.schemaFailed).toBe(false);
    expect(result.usage).toEqual({ promptTokens: 100, completionTokens: 40 });
    expect(fetchFixture).toHaveBeenCalledTimes(3);
  });

  it("records IDLE after three invalid responses without changing provider", async () => {
    const fetchFixture = vi.fn<typeof fetch>().mockResolvedValue(completion(JSON.stringify({ action: "BUY" })));
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
    }, fetchFixture);

    const result = await adapter.decide(observation);

    expect(result.decision.action).toBe("IDLE");
    expect(result.attempts).toBe(3);
    expect(result.schemaFailed).toBe(true);
    expect(result.provider).toBe("openai-compatible");
  });

  it("rejects citations to evidence absent from the observation", async () => {
    const hallucinated = JSON.stringify({
      action: "IDLE",
      target_ids: [],
      content: "",
      decision_summary: {
        observed_claim_ids: ["claim-01"],
        observed_evidence_ids: ["evidence-not-visible"],
        credibility_assessment: 0.4,
        reason_codes: ["WAIT_FOR_MORE_INFO"],
        expected_outcome: "Wait.",
        confidence: 0.5,
      },
    });
    const fetchFixture = vi.fn<typeof fetch>().mockResolvedValue(completion(hallucinated));
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
    }, fetchFixture);

    expect((await adapter.decide(observation)).schemaFailed).toBe(true);
  });

  it("fails immediately on provider HTTP errors instead of converting them to IDLE", async () => {
    const fetchFixture = vi.fn<typeof fetch>().mockResolvedValue(new Response("unavailable", { status: 503 }));
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
    }, fetchFixture);

    await expect(adapter.decide(observation)).rejects.toThrow("LLM request failed with 503");
    expect(fetchFixture).toHaveBeenCalledTimes(1);
  });

  it("drives a full paired run from recorded OpenAI-compatible responses", async () => {
    const fetchFixture = vi.fn<typeof fetch>(async (_input, init) => {
      const request = JSON.parse(String(init?.body)) as {
        messages: Array<{ content: string }>;
      };
      const visible = JSON.parse(request.messages[1].content) as LlmObservation;
      const evidenceVisible = visible.evidence.length > 0;
      return completion(JSON.stringify({
        action: evidenceVisible ? "BUY" : "IDLE",
        target_ids: evidenceVisible ? ["merchant-01"] : [],
        content: "",
        decision_summary: {
          observed_claim_ids: visible.claims.map((claim) => claim.id),
          observed_evidence_ids: visible.evidence.map((item) => item.id),
          credibility_assessment: evidenceVisible ? 0.82 : 0.38,
          reason_codes: evidenceVisible ? ["RECEIPT_VERIFIED", "PRICE_ACCEPTABLE"] : ["NO_VISIBLE_RECEIPT"],
          expected_outcome: evidenceVisible ? "Purchase the fixed offer." : "No action.",
          confidence: 0.7,
        },
      }));
    });
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
    }, fetchFixture);

    const result = await runPairedExperimentWithDecisionAdapter(
      "llm-adapter-recording",
      (request) => adapter.decideForRunner(request),
    );

    expect(result.control.metrics.adoptedNonSeed).toBe(0);
    expect(result.treatment.metrics.adoptedNonSeed).toBeGreaterThan(0);
    expect(result.treatment.decisions[0]?.requestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.treatment.decisions[0]?.responseHash).toMatch(/^[a-f0-9]{64}$/);
    expect(fetchFixture).toHaveBeenCalled();
  });
});
