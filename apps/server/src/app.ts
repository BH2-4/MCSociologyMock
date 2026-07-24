import cors from "cors";
import express from "express";
import { hashObject, replayPairedExperiment, runPairedExperiment } from "@agorasim/core";
import { z } from "zod";

import { createResearchExport } from "./export.js";
import type { PairSummary, RunStore, StoredPair } from "./store.js";

const runRequestSchema = z.object({
  protocolSeed: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  decisionMode: z.enum(["evidence-blind", "fixed-threshold"]),
}).strict();

function pairIdFor(protocolSeed: string, decisionMode: string): string {
  return `pair-${hashObject({ protocolSeed, decisionMode }).slice(0, 16)}`;
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

export function createApp({ store }: { store: RunStore }) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "64kb" }));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", storage: "postgresql", simulation: "paired-p0" });
  });

  app.post("/v1/experiments/agorasim-p0/runs", async (request, response) => {
    const parsed = runRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: "INVALID_RUN_REQUEST", issues: parsed.error.issues });
      return;
    }
    const pairId = pairIdFor(parsed.data.protocolSeed, parsed.data.decisionMode);
    const existing = await store.getPair(pairId);
    if (existing) {
      response.status(200).json({ ...existing.summary, idempotentReplay: true });
      return;
    }
    const result = runPairedExperiment(parsed.data.protocolSeed, parsed.data.decisionMode);
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
