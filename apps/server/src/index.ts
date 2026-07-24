import { createApp } from "./app.js";
import { PostgresRunStore } from "./db.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required; no runtime database fallback is available");

const port = Number(process.env.SERVER_PORT ?? 4100);
const store = new PostgresRunStore(databaseUrl);
await store.migrate();

const x402Mode = process.env.X402_MODE ?? "mock";
if (x402Mode !== "mock" && x402Mode !== "testnet") {
  throw new Error("X402_MODE must be either mock or testnet");
}
const x402 = x402Mode === "testnet" ? {
  facilitatorUrl: requiredEnvironment("X402_FACILITATOR_URL"),
  publicResourceBaseUrl: requiredEnvironment("PUBLIC_RESOURCE_BASE_URL"),
  merchantAddress: requiredEnvironment("MERCHANT_AGENT_ADDRESS") as `0x${string}`,
} : undefined;

const server = createApp({ store, x402 }).listen(port, (error?: Error) => {
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
