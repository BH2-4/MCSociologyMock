import type { PairSummary, RunStore, StoredPair } from "./store.js";
import { describe, expect, it } from "vitest";

import { createApp, missingLlmProviderError, missingTestnetReceiptError } from "./app.js";

class TestStore implements RunStore {
  async migrate() {}
  async close() {}
  async savePair(_pair: StoredPair) {}
  async getPair(_pairId: string) { return null; }
  async listPairs(): Promise<PairSummary[]> { return []; }
}

describe("server", () => {
  it("creates the Express application with an injected store", () => {
    expect(createApp({ store: new TestStore() })).toBeDefined();
  });

  it("fails an LLM run immediately when no provider is configured", () => {
    expect(missingLlmProviderError("llm")).toEqual({
      error: "LLM_PROVIDER_NOT_CONFIGURED",
      required: ["LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL"],
    });
    expect(missingLlmProviderError("fixed-threshold")).toBeNull();
  });

  it("blocks testnet experiment execution until verified seed receipts are loaded", () => {
    expect(missingTestnetReceiptError("testnet")).toEqual({
      error: "TESTNET_SEED_RECEIPTS_NOT_READY",
      action: "Run pnpm seed:testnet, then restart the API to load the verified receipt fixture.",
    });
    expect(missingTestnetReceiptError("mock")).toBeNull();
  });
});
