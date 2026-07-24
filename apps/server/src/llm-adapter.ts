import { hashObject, type DecisionRequest, type ExternalDecision } from "@agorasim/core";
import { z } from "zod";

const actions = ["INSPECT_EVIDENCE", "CHAT", "POST", "BUY", "IDLE"] as const;
const reasonCodes = [
  "RECEIPT_VERIFIED",
  "NO_VISIBLE_RECEIPT",
  "KNOWN_SENDER",
  "LOW_TRUST",
  "PRODUCT_FIT",
  "PRICE_ACCEPTABLE",
  "PRICE_TOO_HIGH",
  "SOCIAL_THRESHOLD_MET",
  "SKEPTICISM",
  "BUDGET_LIMIT",
  "WAIT_FOR_MORE_INFO",
] as const;

export const llmDecisionSchema = z.object({
  action: z.enum(actions),
  target_ids: z.array(z.string()).max(8),
  content: z.string().max(500),
  decision_summary: z.object({
    observed_claim_ids: z.array(z.string()).max(16),
    observed_evidence_ids: z.array(z.string()).max(16),
    credibility_assessment: z.number().min(0).max(1),
    reason_codes: z.array(z.enum(reasonCodes)).min(1).max(6),
    expected_outcome: z.string().max(240),
    confidence: z.number().min(0).max(1),
  }).strict(),
}).strict();

export type LlmDecision = z.infer<typeof llmDecisionSchema>;

export type LlmObservation = DecisionRequest;

export interface LlmDecisionResult {
  decision: LlmDecision;
  attempts: number;
  schemaFailed: boolean;
  provider: "openai-compatible";
  model: string;
  requestHash: string;
  responseHash: string | null;
  usage: { promptTokens: number; completionTokens: number } | null;
}

export interface OpenAiCompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
}

const responseJsonSchema = {
  name: "agorasim_agent_action",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["action", "target_ids", "content", "decision_summary"],
    properties: {
      action: { type: "string", enum: actions },
      target_ids: { type: "array", items: { type: "string" }, maxItems: 8 },
      content: { type: "string", maxLength: 500 },
      decision_summary: {
        type: "object",
        additionalProperties: false,
        required: ["observed_claim_ids", "observed_evidence_ids", "credibility_assessment", "reason_codes", "expected_outcome", "confidence"],
        properties: {
          observed_claim_ids: { type: "array", items: { type: "string" }, maxItems: 16 },
          observed_evidence_ids: { type: "array", items: { type: "string" }, maxItems: 16 },
          credibility_assessment: { type: "number", minimum: 0, maximum: 1 },
          reason_codes: { type: "array", items: { type: "string", enum: reasonCodes }, minItems: 1, maxItems: 6 },
          expected_outcome: { type: "string", maxLength: 240 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  },
} as const;

function idleDecision(): LlmDecision {
  return {
    action: "IDLE",
    target_ids: [],
    content: "",
    decision_summary: {
      observed_claim_ids: [],
      observed_evidence_ids: [],
      credibility_assessment: 0.5,
      reason_codes: ["WAIT_FOR_MORE_INFO"],
      expected_outcome: "No action this tick.",
      confidence: 0,
    },
  };
}

function validateReferences(decision: LlmDecision, observation: LlmObservation): void {
  const claimIds = new Set(observation.claims.map((claim) => claim.id));
  const evidenceIds = new Set(observation.evidence.map((item) => item.id));
  if (decision.decision_summary.observed_claim_ids.some((id) => !claimIds.has(id))) {
    throw new Error("LLM cited a claim that was not visible");
  }
  if (decision.decision_summary.observed_evidence_ids.some((id) => !evidenceIds.has(id))) {
    throw new Error("LLM cited evidence that was not visible");
  }
}

export class OpenAiCompatibleDecisionAdapter {
  readonly #config: Required<Pick<OpenAiCompatibleConfig, "baseUrl" | "apiKey" | "model">> & OpenAiCompatibleConfig;
  readonly #fetch: typeof fetch;

  constructor(config: OpenAiCompatibleConfig, fetchImplementation: typeof fetch = fetch) {
    this.#config = config;
    this.#fetch = fetchImplementation;
  }

  async decide(observation: LlmObservation): Promise<LlmDecisionResult> {
    let lastResponseHash: string | null = null;
    const requestBody = {
      model: this.#config.model,
      temperature: this.#config.temperature ?? 0,
      max_tokens: this.#config.maxTokens ?? 500,
      response_format: { type: "json_schema", json_schema: responseJsonSchema },
      messages: [
        {
          role: "system",
          content: "Choose one allowed action from visible information. Return only the JSON schema. Report a short decision summary and reason codes; do not provide hidden reasoning or chain-of-thought.",
        },
        { role: "user", content: JSON.stringify(observation) },
      ],
    };
    const requestHash = hashObject(requestBody);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await this.#fetch(`${this.#config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) throw new Error(`LLM request failed with ${response.status}`);
      try {
        const body = await response.json() as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const content = body.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("LLM response has no JSON content");
        lastResponseHash = hashObject(content);
        const decision = llmDecisionSchema.parse(JSON.parse(content));
        validateReferences(decision, observation);
        return {
          decision,
          attempts: attempt,
          schemaFailed: false,
          provider: "openai-compatible",
          model: this.#config.model,
          requestHash,
          responseHash: lastResponseHash,
          usage: body.usage ? {
            promptTokens: body.usage.prompt_tokens ?? 0,
            completionTokens: body.usage.completion_tokens ?? 0,
          } : null,
        };
      } catch {
        // PRD permits exactly two retries and no provider/model fallback.
      }
    }
    return {
      decision: idleDecision(),
      attempts: 3,
      schemaFailed: true,
      provider: "openai-compatible",
      model: this.#config.model,
      requestHash,
      responseHash: lastResponseHash,
      usage: null,
    };
  }

  async decideForRunner(observation: DecisionRequest): Promise<ExternalDecision> {
    const result = await this.decide(observation);
    return {
      action: result.decision.action,
      targetIds: result.decision.target_ids,
      credibilityAssessment: result.decision.decision_summary.credibility_assessment,
      observedClaimIds: result.decision.decision_summary.observed_claim_ids,
      observedEvidenceIds: result.decision.decision_summary.observed_evidence_ids,
      reasonCodes: result.decision.decision_summary.reason_codes,
      expectedOutcome: result.decision.decision_summary.expected_outcome,
      confidence: result.decision.decision_summary.confidence,
      provider: result.provider,
      model: result.model,
      requestHash: result.requestHash,
      responseHash: result.responseHash,
      attempts: result.attempts,
      schemaFailed: result.schemaFailed,
      usage: result.usage,
    };
  }
}
