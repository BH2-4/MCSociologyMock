import { createApp } from "./app.js";
import { PostgresRunStore } from "./db.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required; no runtime database fallback is available");

const port = Number(process.env.SERVER_PORT ?? 4100);
const store = new PostgresRunStore(databaseUrl);
await store.migrate();

const server = createApp({ store }).listen(port, (error?: Error) => {
  if (error) throw error;
  console.log(`AgoraSim API listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  await store.close();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
