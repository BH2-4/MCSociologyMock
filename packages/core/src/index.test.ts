import { describe, expect, it } from "vitest";

import { PRODUCT_OFFER, SIMULATION_CONFIG } from "./index";

describe("P0 constants", () => {
  it("pins the experiment and Injective testnet offer", () => {
    expect(SIMULATION_CONFIG).toMatchObject({ consumerCount: 24, tickCount: 8 });
    expect(PRODUCT_OFFER).toMatchObject({
      amount: "300000",
      network: "eip155:1439",
    });
  });
});
