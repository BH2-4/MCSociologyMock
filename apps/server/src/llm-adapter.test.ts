import { hashObject, runPairedExperimentWithDecisionAdapter } from "@gesellschaft/core";
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

function toolCompletion(argumentsJson: string, content = "provider reasoning that must be ignored"): Response {
  return new Response(JSON.stringify({
    choices: [{ message: {
      content,
      reasoning_content: "provider-internal-content",
      tool_calls: [{
        type: "function",
        function: { name: "submit_gesellschaft_action", arguments: argumentsJson },
      }],
    } }],
    usage: { prompt_tokens: 120, completion_tokens: 50 },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("OpenAI-compatible decision adapter", () => {
  it("requires a successful minimal provider probe before a full run", async () => {
    const fetchFixture = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 529 }));
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
    }, fetchFixture);

    await expect(adapter.probeProvider()).rejects.toThrow("LLM health probe failed with 529");
    expect(fetchFixture).toHaveBeenCalledTimes(1);
  });

  it("bounds provider calls with a timeout", async () => {
    const fetchFixture = vi.fn<typeof fetch>((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
    }));
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
      requestTimeoutMs: 1,
    }, fetchFixture);

    await expect(adapter.probeProvider()).rejects.toThrow("LLM request timed out after 1ms");
  });

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
    expect(result.usage).toEqual({ promptTokens: 300, completionTokens: 120 });
    expect(result.attemptAudit).toEqual([
      expect.objectContaining({ attempt: 1, failureCode: "SCHEMA_INVALID", schemaValid: false, referencesValid: null, usage: { promptTokens: 100, completionTokens: 40 } }),
      expect.objectContaining({ attempt: 2, failureCode: "SCHEMA_INVALID", schemaValid: false, referencesValid: null, usage: { promptTokens: 100, completionTokens: 40 } }),
      expect.objectContaining({ attempt: 3, failureCode: null, schemaValid: true, referencesValid: true, usage: { promptTokens: 100, completionTokens: 40 } }),
    ]);
    expect(fetchFixture).toHaveBeenCalledTimes(3);
  });

  it("records IDLE after three invalid responses without changing provider", async () => {
    const fetchFixture = vi.fn<typeof fetch>().mockImplementation(async () => completion(JSON.stringify({ action: "BUY" })));
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
    expect(result.usage).toEqual({ promptTokens: 300, completionTokens: 120 });
    expect(result.attemptAudit).toHaveLength(3);
    expect(result.attemptAudit.every((attempt) => !attempt.schemaValid)).toBe(true);
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
    const fetchFixture = vi.fn<typeof fetch>().mockImplementation(async () => completion(hallucinated));
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
    }, fetchFixture);

    const result = await adapter.decide(observation);
    expect(result.schemaFailed).toBe(true);
    expect(result.attemptAudit).toHaveLength(3);
    expect(result.attemptAudit.every((attempt) => attempt.failureCode === "REFERENCE_INVALID")).toBe(true);
    expect(result.attemptAudit.every((attempt) => attempt.schemaValid && !attempt.referencesValid)).toBe(true);
  });

  it("does not hash malformed envelopes that contain only provider reasoning", async () => {
    const malformed = () => new Response(JSON.stringify({
      choices: [{ message: { reasoning_content: "provider-internal-content" } }],
      usage: { prompt_tokens: 100, completion_tokens: 40 },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
    const fetchFixture = vi.fn<typeof fetch>().mockImplementation(async () => malformed());
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
      reasoningSplit: true,
    }, fetchFixture);

    const result = await adapter.decide(observation);

    expect(result.responseHash).toBeNull();
    expect(result.attemptAudit).toHaveLength(3);
    expect(result.attemptAudit.every((attempt) => attempt.responseHash === null)).toBe(true);
    expect(result.attemptAudit.every((attempt) => attempt.failureCode === "RESPONSE_INVALID")).toBe(true);
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

  it("requests separated reasoning for providers that expose it", async () => {
    const fetchFixture = vi.fn<typeof fetch>().mockResolvedValue(completion(JSON.stringify({
      action: "IDLE",
      target_ids: [],
      content: "",
      decision_summary: {
        observed_claim_ids: [],
        observed_evidence_ids: [],
        credibility_assessment: 0.5,
        reason_codes: ["WAIT_FOR_MORE_INFO"],
        expected_outcome: "Wait.",
        confidence: 0.5,
      },
    })));
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
      reasoningSplit: true,
    }, fetchFixture);

    await adapter.decide(observation);

    const body = JSON.parse(String(fetchFixture.mock.calls[0]?.[1]?.body));
    expect(body.reasoning_split).toBe(true);
    expect(body.response_format.type).toBe("json_schema");
  });

  it("supports providers without native JSON Schema response format", async () => {
    const fetchFixture = vi.fn<typeof fetch>().mockResolvedValue(completion(JSON.stringify({
      action: "IDLE",
      target_ids: [],
      content: "",
      decision_summary: {
        observed_claim_ids: [],
        observed_evidence_ids: [],
        credibility_assessment: 0.5,
        reason_codes: ["WAIT_FOR_MORE_INFO"],
        expected_outcome: "Wait.",
        confidence: 0.5,
      },
    })));
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
      maxCompletionTokens: 2048,
      nativeJsonSchema: false,
    }, fetchFixture);

    await adapter.decide(observation);

    const body = JSON.parse(String(fetchFixture.mock.calls[0]?.[1]?.body));
    expect(body.response_format).toBeUndefined();
    expect(body.max_tokens).toBeUndefined();
    expect(body.max_completion_tokens).toBe(2048);
    expect(body.messages[0].content).toContain("Return only JSON matching this schema");
  });

  it("uses a function tool for providers that support tools but not response_format", async () => {
    const valid = JSON.stringify({
      action: "BUY",
      target_ids: ["merchant-01"],
      content: "",
      decision_summary: {
        observed_claim_ids: ["claim-01"],
        observed_evidence_ids: ["evidence-01"],
        credibility_assessment: 0.78,
        reason_codes: ["RECEIPT_VERIFIED", "PRICE_ACCEPTABLE"],
        expected_outcome: "Receive one simulated Eco Cup.",
        confidence: 0.72,
      },
    });
    const fetchFixture = vi.fn<typeof fetch>().mockResolvedValue(toolCompletion(valid));
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
      nativeJsonSchema: false,
      toolJsonSchema: true,
      reasoningSplit: true,
    }, fetchFixture);

    const result = await adapter.decide(observation);
    const body = JSON.parse(String(fetchFixture.mock.calls[0]?.[1]?.body));

    expect(result.decision.action).toBe("BUY");
    expect(result.schemaFailed).toBe(false);
    expect(result.responseHash).toBe(hashObject(valid));
    expect(body.response_format).toBeUndefined();
    expect(body.tool_choice).toBe("required");
    expect(body.tools[0].function.name).toBe("submit_gesellschaft_action");
    expect(body.tools[0].function.parameters.type).toBe("object");
    expect(body.tools[0].function.parameters.required).toEqual([
      "action",
      "target_ids",
      "content",
      "decision_summary",
    ]);
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
    expect(result.treatment.decisions[0]?.attemptAudit).toHaveLength(1);
    expect(fetchFixture).toHaveBeenCalled();
  });

  it("accepts the P1 publishing action schema through the same provider adapter", async () => {
    const fetchFixture = vi.fn<typeof fetch>().mockResolvedValue(completion(JSON.stringify({
      action: "PLAN_PULL",
      target_ids: [],
      source_ids: ["R14", "R15", "R16"],
      message_id: "message:combat_value_first",
      reason_code: "COMBAT_FIT",
      confidence: 0.74,
    })));
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
    }, fetchFixture);

    const result = await adapter.decidePublishingForRunner({
      agent: {
        id: "jp-consumer-03", index: 2, segment: "budget-constrained", activityStatus: "ACTIVE", platformPreference: "MOBILE",
        rosterNeed: 0.6, combatPreference: 0.7, characterAffinity: 0.4, cosmeticAffinity: 0.3,
        pullBudget: 120, ownedCurrency: 80, guaranteeState: "NONE", spendPropensity: 0.5, returnFriction: 0.2, sourceTrust: 0.7,
      },
      tick: 4,
      message: { id: "message:combat_value_first", sourceIds: ["R14", "R15", "R16"], positioning: "COMBAT_VALUE_FIRST", order: ["combat-context", "character-context", "offer-context"], blocks: [] },
      facts: [],
      visibleSourceIds: ["R14", "R15", "R16"],
      allowedActions: ["PLAN_PULL", "SAVE", "SKIP", "IDLE"],
      allowedTargetIds: [],
      currentBalance: 130,
    });

    expect(result).toEqual(expect.objectContaining({
      action: "PLAN_PULL",
      targetIds: [],
      sourceIds: ["R14", "R15", "R16"],
      messageId: "message:combat_value_first",
      reasonCode: "COMBAT_FIT",
      confidence: 0.74,
      provider: "openai-compatible",
      model: "fixture-model",
      attempts: 1,
      schemaFailed: false,
    }));
    expect(result.requestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.responseHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.attemptAudit).toHaveLength(1);
    expect(fetchFixture).toHaveBeenCalledTimes(1);
  });

  it("records P1 IDLE after two schema retries without switching provider", async () => {
    const fetchFixture = vi.fn<typeof fetch>().mockImplementation(async () => completion("not-json"));
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1",
      apiKey: "test-only-key",
      model: "fixture-model",
    }, fetchFixture);

    const result = await adapter.decidePublishing({
      agent: {
        id: "jp-consumer-03", index: 2, segment: "budget-constrained", activityStatus: "ACTIVE", platformPreference: "MOBILE",
        rosterNeed: 0.6, combatPreference: 0.7, characterAffinity: 0.4, cosmeticAffinity: 0.3,
        pullBudget: 120, ownedCurrency: 80, guaranteeState: "NONE", spendPropensity: 0.5, returnFriction: 0.2, sourceTrust: 0.7,
      },
      tick: 4,
      message: { id: "message:combat_value_first", sourceIds: ["R14", "R15", "R16"], positioning: "COMBAT_VALUE_FIRST", order: ["combat-context", "character-context", "offer-context"], blocks: [] },
      facts: [],
      visibleSourceIds: ["R14", "R15", "R16"],
      allowedActions: ["PLAN_PULL", "SAVE", "SKIP", "IDLE"],
      allowedTargetIds: [],
      currentBalance: 130,
    });

    expect(result.decision.action).toBe("IDLE");
    expect(result.decision.message_id).toBe("message:combat_value_first");
    expect(result.decision.source_ids).toEqual(["R14", "R15", "R16"]);
    expect(result.schemaFailed).toBe(true);
    expect(result.attemptAudit.every((attempt) => attempt.failureCode === "SCHEMA_INVALID")).toBe(true);
    expect(fetchFixture).toHaveBeenCalledTimes(3);
  });

  it("retries P1 references that were not visible before accepting a valid response", async () => {
    const decision = (sourceIds: string[]) => completion(JSON.stringify({
      action: "PLAN_PULL", target_ids: [], source_ids: sourceIds,
      message_id: "message:combat_value_first", reason_code: "COMBAT_FIT", confidence: 0.7,
    }));
    const fetchFixture = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(decision(["R99"]))
      .mockResolvedValueOnce(decision(["R14"]));
    const adapter = new OpenAiCompatibleDecisionAdapter({
      baseUrl: "https://llm.invalid/v1", apiKey: "test-only-key", model: "fixture-model",
    }, fetchFixture);

    const result = await adapter.decidePublishing({
      agent: {
        id: "jp-consumer-03", index: 2, segment: "budget-constrained", activityStatus: "ACTIVE", platformPreference: "MOBILE",
        rosterNeed: 0.6, combatPreference: 0.7, characterAffinity: 0.4, cosmeticAffinity: 0.3,
        pullBudget: 120, ownedCurrency: 80, guaranteeState: "NONE", spendPropensity: 0.5, returnFriction: 0.2, sourceTrust: 0.7,
      },
      tick: 4,
      message: { id: "message:combat_value_first", sourceIds: ["R14", "R15", "R16"], positioning: "COMBAT_VALUE_FIRST", order: ["combat-context", "character-context", "offer-context"], blocks: [] },
      facts: [],
      visibleSourceIds: ["R14", "R15", "R16"],
      allowedActions: ["PLAN_PULL", "SAVE", "SKIP", "SIMULATED_TOP_UP", "IDLE"],
      allowedTargetIds: [],
      currentBalance: 130,
    });

    expect(result.decision.source_ids).toEqual(["R14"]);
    expect(result.attempts).toBe(2);
    expect(result.attemptAudit.map((attempt) => attempt.failureCode)).toEqual(["REFERENCE_INVALID", null]);
  });
});
