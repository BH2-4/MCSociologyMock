import cors from "cors";
import express from "express";
import {
  hashObject,
  replayPublishingPair,
  replayPairedExperiment,
  runPublishingPair,
  runPublishingPairWithDecisionAdapter,
  runPairedExperiment,
  runPairedExperimentWithDecisionAdapter,
  type DecisionRequest,
  type ExternalDecision,
  type RecordedSeedPayment,
  type PublishingDecisionRequest,
  type PublishingExternalDecision,
  type PublishingPairResult,
  type PublicProxyObservationInput,
} from "@gesellschaft/core";
import { z } from "zod";

import { createResearchExport } from "./export.js";
import { PublishingRunRegistry } from "./publishing-run-registry.js";
import type { PairSummary, RunStore, StoredPair } from "./store.js";
import { registerX402Resource, type X402ResourceConfig } from "./x402-resource.js";

const runRequestSchema = z.object({
  protocolSeed: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  decisionMode: z.enum(["evidence-blind", "fixed-threshold", "llm"]),
}).strict();

const publishingRunRequestSchema = z.object({
  protocolSeed: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  agentCount: z.union([z.literal(4), z.literal(24)]).default(24),
  decisionMode: z.enum(["deterministic", "llm"]).default("deterministic"),
}).strict();

const publishingReplayRequestSchema = z.object({
  pairId: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
}).strict();

const publishingObservationSchema = z.object({
  point: z.enum(["T_RELEASE", "T_PLUS_24H", "T_PLUS_72H"]),
  observedAt: z.string().datetime({ offset: true }),
  publishedAt: z.string().datetime({ offset: true }),
  collectedAt: z.string().datetime({ offset: true }),
  sourceUrl: z.string().url().refine((value) => value.startsWith("https://"), "HTTPS source required"),
  sourceTier: z.enum(["A_OFFICIAL", "B_MEASURED", "C_ESTIMATED"]),
  platformScope: z.enum(["JP_IOS_APP_STORE", "JP_GOOGLE_PLAY", "OFFICIAL_JP_CONTENT"]),
  metricName: z.string().min(2).max(120).regex(/^[a-z0-9_]+$/),
  measurementPeriod: z.string().min(3).max(240),
  licenseStatus: z.literal("PUBLIC_REFERENCE_ONLY"),
  value: z.number().finite().nonnegative(),
  unit: z.enum(["ORDINAL_RANK", "PUBLIC_INTERACTION_COUNT", "OBSERVED_HOURS"]),
  currency: z.literal("NONE"),
  methodology: z.string().min(10).max(500),
}).strict();

function pairIdFor(protocolSeed: string, decisionMode: string, paymentFingerprint: string): string {
  return `pair-${hashObject({ protocolSeed, decisionMode, paymentFingerprint }).slice(0, 16)}`;
}

function summaryFor(pairId: string, result: ReturnType<typeof runPairedExperiment>): PairSummary {
  return {
    pairId,
    protocolSeed: result.protocol.protocolSeed,
    protocolHash: result.protocol.protocolHash,
    decisionMode: result.control.decisionMode,
    pairedEffect: result.pairedEffect,
    controlAdoptionRate: result.control.metrics.adoptionRate,
    treatmentAdoptionRate: result.treatment.metrics.adoptionRate,
    validation: result.validation,
    createdAt: new Date().toISOString(),
  };
}

interface RunnerDecisionAdapter {
  decideForRunner(request: DecisionRequest): Promise<ExternalDecision>;
  decidePublishingForRunner?(request: PublishingDecisionRequest): Promise<PublishingExternalDecision>;
  probeProvider?(): Promise<void>;
}

export function missingLlmProviderError(
  decisionMode: "evidence-blind" | "fixed-threshold" | "llm",
  decisionAdapter?: RunnerDecisionAdapter,
) {
  return decisionMode === "llm" && !decisionAdapter ? {
    error: "LLM_PROVIDER_NOT_CONFIGURED",
    required: ["PROGRAM_E_AI_BASE_URL", "PROGRAM_E_AI_API_KEY", "PROGRAM_E_AI_MODEL"],
  } : null;
}

export function missingPublishingLlmProviderError(
  decisionMode: "deterministic" | "llm",
  decisionAdapter?: RunnerDecisionAdapter,
) {
  return decisionMode === "llm" && !decisionAdapter?.decidePublishingForRunner ? {
    error: "PUBLISHING_LLM_PROVIDER_NOT_CONFIGURED",
    required: ["PROGRAM_E_AI_BASE_URL", "PROGRAM_E_AI_API_KEY", "PROGRAM_E_AI_MODEL"],
  } : null;
}

export function publishingLlmAccessError(
  decisionMode: "deterministic" | "llm",
  configuredToken: string | undefined,
  suppliedToken: string | undefined,
  inProgress: boolean,
) {
  if (decisionMode !== "llm") return null;
  if (!configuredToken) return { status: 503, error: "PUBLISHING_LLM_RUN_TOKEN_NOT_CONFIGURED" } as const;
  if (suppliedToken !== configuredToken) return { status: 401, error: "PUBLISHING_LLM_RUN_UNAUTHORIZED" } as const;
  if (inProgress) return { status: 409, error: "PUBLISHING_LLM_RUN_IN_PROGRESS" } as const;
  return null;
}

export function publishingAdminAccessError(configuredToken: string | undefined, suppliedToken: string | undefined) {
  if (!configuredToken) return { status: 503, error: "PUBLISHING_ADMIN_TOKEN_NOT_CONFIGURED" } as const;
  if (suppliedToken !== configuredToken) return { status: 401, error: "PUBLISHING_ADMIN_UNAUTHORIZED" } as const;
  return null;
}

export function missingTestnetReceiptError(
  paymentMode: "mock" | "testnet",
  recordedSeedPayments?: RecordedSeedPayment[],
) {
  return paymentMode === "testnet" && !recordedSeedPayments ? {
    error: "TESTNET_SEED_RECEIPTS_NOT_READY",
    action: "Run pnpm seed:testnet, then restart the API to load the verified receipt fixture.",
  } : null;
}

export function createApp({
  store,
  x402,
  decisionAdapter,
  publishingLlmRunToken,
  paymentMode = "mock",
  recordedSeedPayments,
}: {
  store: RunStore;
  x402?: X402ResourceConfig;
  decisionAdapter?: RunnerDecisionAdapter;
  publishingLlmRunToken?: string;
  paymentMode?: "mock" | "testnet";
  recordedSeedPayments?: RecordedSeedPayment[];
}) {
  const app = express();
  const publishingRuns = new PublishingRunRegistry(16);
  let publishingLlmRunInProgress = false;
  app.use(cors());
  app.use(express.json({ limit: "64kb" }));
  if (x402) registerX402Resource(app, x402);

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", storage: "postgresql", simulation: "paired-p0" });
  });

  app.post("/v1/experiments/zzz-3.1-jp/runs", async (request, response) => {
    const parsed = publishingRunRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "INVALID_PUBLISHING_RUN_REQUEST", issues: parsed.error.issues });
      return;
    }
    const configurationError = missingPublishingLlmProviderError(parsed.data.decisionMode, decisionAdapter);
    if (configurationError) {
      response.status(503).json(configurationError);
      return;
    }
    const accessError = publishingLlmAccessError(
      parsed.data.decisionMode,
      publishingLlmRunToken,
      request.header("x-gesellschaft-run-token"),
      publishingLlmRunInProgress,
    );
    if (accessError) {
      response.status(accessError.status).json({ error: accessError.error });
      return;
    }
    if (parsed.data.decisionMode === "llm") {
      publishingLlmRunInProgress = true;
    }
    let result: PublishingPairResult;
    try {
      if (parsed.data.decisionMode === "llm") {
        await decisionAdapter!.probeProvider?.();
        result = await runPublishingPairWithDecisionAdapter(
          parsed.data.protocolSeed,
          (observation) => decisionAdapter!.decidePublishingForRunner!(observation),
          parsed.data.agentCount,
        );
      } else {
        result = runPublishingPair(parsed.data.protocolSeed, parsed.data.agentCount);
      }
    } catch (error) {
      response.status(502).json({
        error: "PUBLISHING_RUN_FAILED",
        reason: error instanceof Error ? error.message : "UNKNOWN_PROVIDER_ERROR",
      });
      return;
    } finally {
      if (parsed.data.decisionMode === "llm") publishingLlmRunInProgress = false;
    }
    const eventHash = hashObject({ control: result.control.events, treatment: result.treatment.events });
    const pairId = `zzz-jp-${hashObject({ seed: parsed.data.protocolSeed, agentCount: parsed.data.agentCount, decisionMode: parsed.data.decisionMode, eventHash }).slice(0, 16)}`;
    publishingRuns.save(pairId, result);
    response.status(201).json({
      pairId,
      decisionMode: parsed.data.decisionMode,
      result,
      report: publishingRuns.report(pairId),
    });
  });

  app.post("/v1/experiments/zzz-3.1-jp/replay", (request, response) => {
    const parsed = publishingReplayRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "INVALID_PUBLISHING_REPLAY_REQUEST", issues: parsed.error.issues });
      return;
    }
    const record = publishingRuns.get(parsed.data.pairId);
    if (!record) {
      response.status(404).json({ error: "PUBLISHING_PAIR_NOT_FOUND", action: "Run the pair in this API session before Replay." });
      return;
    }
    response.json({ replay: replayPublishingPair(record.result) });
  });

  app.get("/v1/experiments/zzz-3.1-jp/runs/:pairId/report", (request, response) => {
    const pairId = publishingReplayRequestSchema.shape.pairId.safeParse(request.params.pairId);
    if (!pairId.success) {
      response.status(400).json({ error: "INVALID_PUBLISHING_PAIR_ID" });
      return;
    }
    const report = publishingRuns.report(pairId.data);
    if (!report) {
      response.status(404).json({ error: "PUBLISHING_PAIR_NOT_FOUND" });
      return;
    }
    response.json({ report });
  });

  app.post("/v1/experiments/zzz-3.1-jp/runs/:pairId/observations", (request, response) => {
    const accessError = publishingAdminAccessError(publishingLlmRunToken, request.header("x-gesellschaft-run-token"));
    if (accessError) {
      response.status(accessError.status).json({ error: accessError.error });
      return;
    }
    const pairId = publishingReplayRequestSchema.shape.pairId.safeParse(request.params.pairId);
    const input = publishingObservationSchema.safeParse(request.body);
    if (!pairId.success || !input.success) {
      response.status(400).json({
        error: "INVALID_POSTLAUNCH_OBSERVATION",
        issues: input.success ? [] : input.error.issues,
      });
      return;
    }
    try {
      const report = publishingRuns.appendObservation(pairId.data, input.data as PublicProxyObservationInput);
      response.status(201).json({ observation: report.observations.at(-1), report });
    } catch (error) {
      const reason = error instanceof Error ? error.message : "POSTLAUNCH_OBSERVATION_REJECTED";
      const status = reason === "PUBLISHING_PAIR_NOT_FOUND" ? 404
        : reason === "DUPLICATE_POSTLAUNCH_OBSERVATION" ? 409
          : 422;
      response.status(status).json({ error: reason });
    }
  });

  app.post("/v1/experiments/gesellschaft-p0/runs", async (request, response) => {
    const parsed = runRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "INVALID_RUN_REQUEST", issues: parsed.error.issues });
      return;
    }
    const receiptError = missingTestnetReceiptError(paymentMode, recordedSeedPayments);
    if (receiptError) {
      response.status(503).json(receiptError);
      return;
    }
    const paymentFingerprint = recordedSeedPayments
      ? hashObject(recordedSeedPayments.map(({ branchId, logicalAgentId, txHash }) => ({ branchId, logicalAgentId, txHash })))
      : "mock";
    const pairId = pairIdFor(parsed.data.protocolSeed, parsed.data.decisionMode, paymentFingerprint);
    const existing = await store.getPair(pairId);
    if (existing) {
      response.status(200).json({ ...existing.summary, idempotentReplay: true });
      return;
    }
    const configurationError = missingLlmProviderError(parsed.data.decisionMode, decisionAdapter);
    if (configurationError) {
      response.status(503).json(configurationError);
      return;
    }
    const result = parsed.data.decisionMode === "llm"
      ? await runPairedExperimentWithDecisionAdapter(
        parsed.data.protocolSeed,
        (observation) => decisionAdapter!.decideForRunner(observation),
        { recordedSeedPayments },
      )
      : runPairedExperiment(parsed.data.protocolSeed, parsed.data.decisionMode, { recordedSeedPayments });
    const stored: StoredPair = { summary: summaryFor(pairId, result), result };
    await store.savePair(stored);
    response.status(201).json(stored.summary);
  });

  app.get("/v1/experiments/gesellschaft-p0/comparison", async (_request, response) => {
    response.json({
      disclaimer: "Synthetic simulation. Not a real-market forecast.",
      pairs: await store.listPairs(),
    });
  });

  app.get("/v1/pairs/:pairId", async (request, response) => {
    const pair = await store.getPair(request.params.pairId);
    if (!pair) {
      response.status(404).json({ error: "PAIR_NOT_FOUND" });
      return;
    }
    response.json(pair);
  });

  app.get("/v1/pairs/:pairId/events", async (request, response) => {
    const pair = await store.getPair(request.params.pairId);
    if (!pair) {
      response.status(404).json({ error: "PAIR_NOT_FOUND" });
      return;
    }
    response.json([...pair.result.control.events, ...pair.result.treatment.events]);
  });

  app.get("/v1/pairs/:pairId/stream", async (request, response) => {
    const pair = await store.getPair(request.params.pairId);
    if (!pair) {
      response.status(404).json({ error: "PAIR_NOT_FOUND" });
      return;
    }
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache");
    for (const event of [...pair.result.control.events, ...pair.result.treatment.events]) {
      response.write(`id: ${event.eventId}\nevent: experiment-event\ndata: ${JSON.stringify(event)}\n\n`);
    }
    response.write(`event: completed\ndata: ${JSON.stringify({ pairId: pair.summary.pairId })}\n\n`);
    response.end();
  });

  app.post("/v1/pairs/:pairId/replay", async (request, response) => {
    const pair = await store.getPair(request.params.pairId);
    if (!pair) {
      response.status(404).json({ error: "PAIR_NOT_FOUND" });
      return;
    }
    response.json(replayPairedExperiment(pair.result));
  });

  app.get("/v1/pairs/:pairId/export", async (request, response) => {
    const pair = await store.getPair(request.params.pairId);
    if (!pair) {
      response.status(404).json({ error: "PAIR_NOT_FOUND" });
      return;
    }
    response.json(createResearchExport(pair.result));
  });

  return app;
}
