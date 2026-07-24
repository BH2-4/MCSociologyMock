import type { PairSummary, RunStore, StoredPair } from "./store.js";
import { describe, expect, it } from "vitest";

import { createApp } from "./app.js";

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
});
