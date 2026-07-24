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
});
