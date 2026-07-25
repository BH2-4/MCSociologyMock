import {
  hashObject,
  type DecisionRequest,
  type ExternalDecision,
  type LlmAttemptAudit,
  type PublishingDecisionRequest,
  type PublishingExternalDecision,
} from "@agorasim/core";
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

const publishingDecisionSchema = z.object({
  action: z.enum(["PLAN_PULL", "SAVE", "SKIP", "SIMULATED_TOP_UP", "IDLE"]),
  target_ids: z.array(z.string()).max(8),
  source_ids: z.array(z.string()).max(8),
  message_id: z.string().min(1).max(160),
  reason_code: z.string().min(1).max(80),
  confidence: z.number().min(0).max(1),
}).strict();

type PublishingDecision = z.infer<typeof publishingDecisionSchema>;

export interface PublishingLlmDecisionResult {
  decision: PublishingDecision;
  attempts: number;
  schemaFailed: boolean;
  provider: "openai-compatible";
  model: string;
  requestHash: string;
  responseHash: string | null;
  attemptAudit: LlmAttemptAudit[];
  usage: { promptTokens: number; completionTokens: number } | null;
}

export type LlmObservation = DecisionRequest;

export interface LlmDecisionResult {
  decision: LlmDecision;
  attempts: number;
  schemaFailed: boolean;
  provider: "openai-compatible";
  model: string;
  requestHash: string;
  responseHash: string | null;
  attemptAudit: LlmAttemptAudit[];
  usage: { promptTokens: number; completionTokens: number } | null;
}

export interface OpenAiCompatibleConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens?: number;
  maxCompletionTokens?: number;
  temperature?: number;
  nativeJsonSchema?: boolean;
  toolJsonSchema?: boolean;
  reasoningSplit?: boolean;
  requestTimeoutMs?: number;
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

const actionToolName = "submit_agorasim_action";
const publishingActionToolName = "submit_publishing_action";

const publishingResponseJsonSchema = {
  name: "agorasim_publishing_action",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["action", "target_ids", "source_ids", "message_id", "reason_code", "confidence"],
    properties: {
      action: { type: "string", enum: ["PLAN_PULL", "SAVE", "SKIP", "SIMULATED_TOP_UP", "IDLE"] },
      target_ids: { type: "array", items: { type: "string" }, maxItems: 8 },
      source_ids: { type: "array", items: { type: "string" }, maxItems: 8 },
      message_id: { type: "string", maxLength: 160 },
      reason_code: { type: "string", minLength: 1, maxLength: 80 },
      confidence: { type: "number", minimum: 0, maximum: 1 },
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

function validatePublishingReferences(decision: PublishingDecision, observation: PublishingDecisionRequest): void {
  if (!observation.allowedActions.includes(decision.action)) throw new Error("LLM selected an action unavailable at this decision point");
  if (decision.message_id !== observation.message.id) throw new Error("LLM cited a message that was not visible");
  if (decision.source_ids.length === 0) throw new Error("LLM omitted visible source references");
  if (decision.source_ids.some((id) => !observation.visibleSourceIds.includes(id))) {
    throw new Error("LLM cited a source that was not visible");
  }
  if (decision.target_ids.length > 0) throw new Error("LLM supplied a target for a pull decision");
}

export class OpenAiCompatibleDecisionAdapter {
  readonly #config: Required<Pick<OpenAiCompatibleConfig, "baseUrl" | "apiKey" | "model">> & OpenAiCompatibleConfig;
  readonly #fetch: typeof fetch;

  constructor(config: OpenAiCompatibleConfig, fetchImplementation: typeof fetch = fetch) {
    this.#config = config;
    this.#fetch = fetchImplementation;
  }

  async #request(input: string, init: RequestInit): Promise<Response> {
    const timeoutMs = this.#config.requestTimeoutMs ?? 30_000;
    try {
      return await this.#fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        throw new Error(`LLM request timed out after ${timeoutMs}ms`);
      }
      throw error;
    }
  }

  async probeProvider(): Promise<void> {
    const response = await this.#request(`${this.#config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.#config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.#config.model,
        temperature: 0,
        ...(this.#config.maxCompletionTokens ? { max_completion_tokens: 16 } : { max_tokens: 1 }),
        messages: [{ role: "user", content: "Reply OK." }],
      }),
    });
    if (!response.ok) throw new Error(`LLM health probe failed with ${response.status}`);
    await response.body?.cancel();
  }

  async decide(observation: LlmObservation): Promise<LlmDecisionResult> {
    let lastResponseHash: string | null = null;
    const attemptAudit: LlmAttemptAudit[] = [];
    const requestBody = {
      model: this.#config.model,
      temperature: this.#config.temperature ?? 0,
      ...(this.#config.maxCompletionTokens
        ? { max_completion_tokens: this.#config.maxCompletionTokens }
        : { max_tokens: this.#config.maxTokens ?? 500 }),
      ...(this.#config.reasoningSplit ? { reasoning_split: true } : {}),
      ...(this.#config.toolJsonSchema ? {
        tools: [{
          type: "function",
          function: {
            name: actionToolName,
            description: "Submit the Agent's single observable action and explicit decision summary.",
            parameters: responseJsonSchema.schema,
          },
        }],
        tool_choice: "required",
      } : this.#config.nativeJsonSchema === false ? {} : {
        response_format: { type: "json_schema", json_schema: responseJsonSchema },
      }),
      messages: [
        {
          role: "system",
          content: this.#config.toolJsonSchema
            ? "Choose one allowed action from visible information and call submit_agorasim_action once. Report only an explicit decision summary and reason codes; do not provide hidden reasoning or chain-of-thought."
            : `Choose one allowed action from visible information. Return only JSON matching this schema: ${JSON.stringify(responseJsonSchema.schema)}. Report a short decision summary and reason codes; do not provide hidden reasoning or chain-of-thought.`,
        },
        { role: "user", content: JSON.stringify(observation) },
      ],
    };
    const requestHash = hashObject(requestBody);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await this.#request(`${this.#config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) throw new Error(`LLM request failed with ${response.status}`);
      const rawBody = await response.text();
      let responseHash: string | null = null;
      let usage: LlmAttemptAudit["usage"] = null;
      let content: string;
      try {
        const body = JSON.parse(rawBody) as {
          choices?: Array<{ message?: {
            content?: string;
            tool_calls?: Array<{
              type?: string;
              function?: { name?: string; arguments?: string };
            }>;
          } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        usage = body.usage ? {
          promptTokens: body.usage.prompt_tokens ?? 0,
          completionTokens: body.usage.completion_tokens ?? 0,
        } : null;
        const message = body.choices?.[0]?.message;
        content = this.#config.toolJsonSchema
          ? message?.tool_calls?.find((call) =>
            call.type === "function" && call.function?.name === actionToolName
          )?.function?.arguments as string
          : message?.content as string;
        if (typeof content !== "string") throw new Error("LLM response has no JSON content");
        responseHash = hashObject(content);
        lastResponseHash = responseHash;
      } catch {
        attemptAudit.push({
          attempt,
          requestHash,
          responseHash: null,
          schemaValid: false,
          referencesValid: null,
          failureCode: "RESPONSE_INVALID",
          usage,
        });
        continue;
      }
      let decision: LlmDecision;
      try {
        decision = llmDecisionSchema.parse(JSON.parse(content));
      } catch {
        attemptAudit.push({
          attempt,
          requestHash,
          responseHash,
          schemaValid: false,
          referencesValid: null,
          failureCode: "SCHEMA_INVALID",
          usage,
        });
        continue;
      }
      try {
        validateReferences(decision, observation);
        attemptAudit.push({
          attempt,
          requestHash,
          responseHash,
          schemaValid: true,
          referencesValid: true,
          failureCode: null,
          usage,
        });
        return {
          decision,
          attempts: attempt,
          attemptAudit,
          schemaFailed: false,
          provider: "openai-compatible",
          model: this.#config.model,
          requestHash,
          responseHash: lastResponseHash,
          usage: aggregateUsage(attemptAudit),
        };
      } catch {
        attemptAudit.push({
          attempt,
          requestHash,
          responseHash,
          schemaValid: true,
          referencesValid: false,
          failureCode: "REFERENCE_INVALID",
          usage,
        });
      }
      // PRD permits exactly two retries and no provider/model fallback.
    }
    return {
      decision: idleDecision(),
      attempts: 3,
      schemaFailed: true,
      provider: "openai-compatible",
      model: this.#config.model,
      requestHash,
      responseHash: lastResponseHash,
      attemptAudit,
      usage: aggregateUsage(attemptAudit),
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
      attemptAudit: result.attemptAudit,
      schemaFailed: result.schemaFailed,
      usage: result.usage,
    };
  }

  async decidePublishing(observation: PublishingDecisionRequest): Promise<PublishingLlmDecisionResult> {
    const requestBody = {
      model: this.#config.model,
      temperature: this.#config.temperature ?? 0,
      ...(this.#config.maxCompletionTokens
        ? { max_completion_tokens: this.#config.maxCompletionTokens }
        : { max_tokens: this.#config.maxTokens ?? 500 }),
      ...(this.#config.reasoningSplit ? { reasoning_split: true } : {}),
      ...(this.#config.toolJsonSchema ? {
        tools: [{
          type: "function",
          function: {
            name: publishingActionToolName,
            description: "Submit one observable publishing action and explicit reason code.",
            parameters: publishingResponseJsonSchema.schema,
          },
        }],
        tool_choice: "required",
      } : this.#config.nativeJsonSchema === false ? {} : {
        response_format: { type: "json_schema", json_schema: publishingResponseJsonSchema },
      }),
      messages: [
        {
          role: "system",
          content: this.#config.toolJsonSchema
            ? "Choose one allowed action using only the visible release message and source IDs. Call submit_publishing_action once. Return no hidden reasoning."
            : `Choose one allowed action using only the visible release message and source IDs. Return only JSON matching this schema: ${JSON.stringify(publishingResponseJsonSchema.schema)}. Return no hidden reasoning.`,
        },
        { role: "user", content: JSON.stringify(observation) },
      ],
    };
    const requestHash = hashObject(requestBody);
    let lastResponseHash: string | null = null;
    const attemptAudit: LlmAttemptAudit[] = [];
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const response = await this.#request(`${this.#config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.#config.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) throw new Error(`LLM request failed with ${response.status}`);
      const rawBody = await response.text();
      let responseHash: string | null = null;
      let usage: LlmAttemptAudit["usage"] = null;
      let content: string;
      try {
        const body = JSON.parse(rawBody) as {
          choices?: Array<{ message?: {
            content?: string;
            tool_calls?: Array<{ type?: string; function?: { name?: string; arguments?: string } }>;
          } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        usage = body.usage ? {
          promptTokens: body.usage.prompt_tokens ?? 0,
          completionTokens: body.usage.completion_tokens ?? 0,
        } : null;
        const message = body.choices?.[0]?.message;
        const explicitContent = this.#config.toolJsonSchema
          ? message?.tool_calls?.find((call) => call.type === "function" && call.function?.name === publishingActionToolName)?.function?.arguments
          : message?.content;
        if (typeof explicitContent !== "string") throw new Error("PUBLISHING_RESPONSE_MISSING");
        content = explicitContent;
        responseHash = hashObject(content);
        lastResponseHash = responseHash;
      } catch {
        attemptAudit.push({ attempt, requestHash, responseHash: null, schemaValid: false, referencesValid: null, failureCode: "RESPONSE_INVALID", usage });
        continue;
      }
      let decision: PublishingDecision;
      try {
        decision = publishingDecisionSchema.parse(JSON.parse(content));
      } catch {
        attemptAudit.push({ attempt, requestHash, responseHash, schemaValid: false, referencesValid: null, failureCode: "SCHEMA_INVALID", usage });
        continue;
      }
      try {
        validatePublishingReferences(decision, observation);
        attemptAudit.push({ attempt, requestHash, responseHash, schemaValid: true, referencesValid: true, failureCode: null, usage });
        return {
          decision,
          attempts: attempt,
          schemaFailed: false,
          provider: "openai-compatible",
          model: this.#config.model,
          requestHash,
          responseHash: lastResponseHash,
          attemptAudit,
          usage: aggregateUsage(attemptAudit),
        };
      } catch {
        attemptAudit.push({ attempt, requestHash, responseHash, schemaValid: true, referencesValid: false, failureCode: "REFERENCE_INVALID", usage });
      }
    }
    // P1 follows the same bounded failure rule as P0: after two retries,
    // preserve the run with an explicit IDLE rather than switching providers.
    return {
      decision: {
        action: "IDLE",
        target_ids: [],
        source_ids: [...observation.visibleSourceIds],
        message_id: observation.message.id,
        reason_code: "SCHEMA_OR_REFERENCE_FAILED",
        confidence: 0,
      },
      attempts: 3,
      schemaFailed: true,
      provider: "openai-compatible",
      model: this.#config.model,
      requestHash,
      responseHash: lastResponseHash,
      attemptAudit,
      usage: aggregateUsage(attemptAudit),
    };
  }

  async decidePublishingForRunner(observation: PublishingDecisionRequest): Promise<PublishingExternalDecision> {
    const result = await this.decidePublishing(observation);
    return {
      action: result.decision.action,
      targetIds: result.decision.target_ids,
      sourceIds: result.decision.source_ids,
      messageId: result.decision.message_id,
      reasonCode: result.decision.reason_code,
      confidence: result.decision.confidence,
      provider: result.provider,
      model: result.model,
      requestHash: result.requestHash,
      responseHash: result.responseHash,
      attempts: result.attempts,
      attemptAudit: result.attemptAudit,
      schemaFailed: result.schemaFailed,
      usage: result.usage,
    };
  }
}

function aggregateUsage(attempts: LlmAttemptAudit[]): LlmDecisionResult["usage"] {
  const reported = attempts.flatMap((attempt) => attempt.usage ? [attempt.usage] : []);
  if (reported.length === 0) return null;
  return reported.reduce((total, usage) => ({
    promptTokens: total.promptTokens + usage.promptTokens,
    completionTokens: total.completionTokens + usage.completionTokens,
  }), { promptTokens: 0, completionTokens: 0 });
}
