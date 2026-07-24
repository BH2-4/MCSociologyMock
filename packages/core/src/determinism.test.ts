import { describe, expect, it } from "vitest";

import { canonicalJson, keyedRandom } from "./determinism.js";

describe("deterministic primitives", () => {
  it("canonicalizes object keys", () => {
    expect(canonicalJson({ z: 1, a: { d: 2, b: 1 } })).toBe('{"a":{"b":1,"d":2},"z":1}');
  });

  it("derives draws by semantic key instead of call order", () => {
    const first = keyedRandom("seed-1", 3, "consumer-04", "contact:consumer-09");
    keyedRandom("seed-1", 2, "consumer-01", "unrelated");
    expect(keyedRandom("seed-1", 3, "consumer-04", "contact:consumer-09")).toBe(first);
    expect(keyedRandom("seed-1", 3, "consumer-04", "different-draw")).not.toBe(first);
  });
});
