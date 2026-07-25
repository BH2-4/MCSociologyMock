import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import type { RecordedSeedPayment } from "@agorasim/core";

import { createApp } from "./app.js";
import { PostgresRunStore } from "./db.js";
import { resolveWorkspacePath } from "./env.js";
import { OpenAiCompatibleDecisionAdapter } from "./llm-adapter.js";
import { parsePartialSeedReceiptFixture, parseSeedReceiptFixture } from "./seed-receipt-fixture.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required; no runtime database fallback is available");

const port = Number(process.env.SERVER_PORT ?? 4100);
const store = new PostgresRunStore(databaseUrl);
await store.migrate();

const llmValues = [
  process.env.PROGRAM_E_AI_BASE_URL,
  process.env.PROGRAM_E_AI_API_KEY,
  process.env.PROGRAM_E_AI_MODEL,
];
const decisionAdapter = llmValues.every(Boolean) ? new OpenAiCompatibleDecisionAdapter({
  baseUrl: process.env.PROGRAM_E_AI_BASE_URL!,
  apiKey: process.env.PROGRAM_E_AI_API_KEY!,
  model: process.env.PROGRAM_E_AI_MODEL!,
  nativeJsonSchema: false,
  reasoningSplit: process.env.PROGRAM_E_AI_MODEL!.startsWith("MiniMax-"),
}) : undefined;

const x402Mode = process.env.X402_MODE ?? "mock";
if (x402Mode !== "mock" && x402Mode !== "testnet") {
  throw new Error("X402_MODE must be either mock or testnet");
}
const x402 = x402Mode === "testnet" ? {
  facilitatorUrl: requiredEnvironment("X402_FACILITATOR_URL"),
  facilitatorServiceToken: requiredEnvironment("FACILITATOR_SERVICE_TOKEN"),
  publicResourceBaseUrl: requiredEnvironment("PUBLIC_RESOURCE_BASE_URL"),
  merchantAddress: requiredEnvironment("MERCHANT_AGENT_ADDRESS") as `0x${string}`,
} : undefined;
const receiptFixturePath = resolveWorkspacePath(process.env.TESTNET_RECEIPT_FIXTURE_PATH ?? "fixtures/testnet-seed-receipts.json");
let recordedSeedPayments: RecordedSeedPayment[] | undefined;
if (x402Mode === "testnet" && existsSync(receiptFixturePath)) {
  const input = JSON.parse(await readFile(receiptFixturePath, "utf8")) as unknown;
  const partial = parsePartialSeedReceiptFixture(input, x402!.merchantAddress);
  recordedSeedPayments = partial.payments.length === 4
    ? parseSeedReceiptFixture(partial, x402!.merchantAddress)
    : undefined;
}

const server = createApp({
  store,
  x402,
  decisionAdapter,
  paymentMode: x402Mode,
  recordedSeedPayments,
}).listen(port, (error?: Error) => {
  if (error) throw error;
  console.log(`AgoraSim API listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  await store.close();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required in testnet mode`);
  return value;
}
