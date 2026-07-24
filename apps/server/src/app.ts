import cors from "cors";
import express from "express";
import {
  hashObject,
  replayPairedExperiment,
  runPairedExperiment,
  runPairedExperimentWithDecisionAdapter,
  type DecisionRequest,
  type ExternalDecision,
  type RecordedSeedPayment,
} from "@agorasim/core";
import { z } from "zod";

import { createResearchExport } from "./export.js";
import type { PairSummary, RunStore, StoredPair } from "./store.js";
import { registerX402Resource, type X402ResourceConfig } from "./x402-resource.js";

const runRequestSchema = z.object({
  protocolSeed: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  decisionMode: z.enum(["evidence-blind", "fixed-threshold", "llm"]),
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
}

export function missingLlmProviderError(
  decisionMode: "evidence-blind" | "fixed-threshold" | "llm",
  decisionAdapter?: RunnerDecisionAdapter,
) {
  return decisionMode === "llm" && !decisionAdapter ? {
    error: "LLM_PROVIDER_NOT_CONFIGURED",
    required: ["LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"],
  } : null;
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
  paymentMode = "mock",
  recordedSeedPayments,
}: {
  store: RunStore;
  x402?: X402ResourceConfig;
  decisionAdapter?: RunnerDecisionAdapter;
  paymentMode?: "mock" | "testnet";
  recordedSeedPayments?: RecordedSeedPayment[];
}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "64kb" }));
  if (x402) registerX402Resource(app, x402);

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", storage: "postgresql", simulation: "paired-p0" });
  });

  app.post("/v1/experiments/agorasim-p0/runs", async (request, response) => {
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

  app.get("/v1/experiments/agorasim-p0/comparison", async (_request, response) => {
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
