import type { PairSummary, RunStore, StoredPair } from "./store.js";
import { describe, expect, it } from "vitest";

import { createApp, missingLlmProviderError, missingPublishingLlmProviderError, missingTestnetReceiptError, publishingAdminAccessError, publishingLlmAccessError } from "./app.js";

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
      required: ["PROGRAM_E_AI_BASE_URL", "PROGRAM_E_AI_API_KEY", "PROGRAM_E_AI_MODEL"],
    });
    expect(missingLlmProviderError("fixed-threshold")).toBeNull();
    expect(missingPublishingLlmProviderError("llm")).toEqual({
      error: "PUBLISHING_LLM_PROVIDER_NOT_CONFIGURED",
      required: ["PROGRAM_E_AI_BASE_URL", "PROGRAM_E_AI_API_KEY", "PROGRAM_E_AI_MODEL"],
    });
    expect(missingPublishingLlmProviderError("deterministic")).toBeNull();
  });

  it("blocks testnet experiment execution until verified seed receipts are loaded", () => {
    expect(missingTestnetReceiptError("testnet")).toEqual({
      error: "TESTNET_SEED_RECEIPTS_NOT_READY",
      action: "Run pnpm seed:testnet, then restart the API to load the verified receipt fixture.",
    });
    expect(missingTestnetReceiptError("mock")).toBeNull();
  });

  it("requires a separate P1 run token and only one active LLM pair", () => {
    expect(publishingLlmAccessError("llm", undefined, undefined, false)?.status).toBe(503);
    expect(publishingLlmAccessError("llm", "secret", "wrong", false)?.status).toBe(401);
    expect(publishingLlmAccessError("llm", "secret", "secret", true)?.status).toBe(409);
    expect(publishingLlmAccessError("llm", "secret", "secret", false)).toBeNull();
    expect(publishingLlmAccessError("deterministic", undefined, undefined, true)).toBeNull();
    expect(publishingAdminAccessError(undefined, undefined)?.status).toBe(503);
    expect(publishingAdminAccessError("secret", "wrong")?.status).toBe(401);
    expect(publishingAdminAccessError("secret", "secret")).toBeNull();
  });
});
