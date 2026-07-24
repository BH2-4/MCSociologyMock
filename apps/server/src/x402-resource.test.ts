import { describe, expect, it } from "vitest";

import { FulfillmentLedger } from "./payment-state.js";
import { finalizeFulfillmentFromHttpOutcome } from "./x402-resource.js";

function receipt(success: boolean): string {
  return Buffer.from(JSON.stringify({ success })).toString("base64");
}

describe("x402 resource fulfillment outcome", () => {
  it("releases paid content only on confirmed settlement", () => {
    const ledger = new FulfillmentLedger(24);
    ledger.reserve("idem-success", "payment-success");

    finalizeFulfillmentFromHttpOutcome(ledger, "idem-success", 200, receipt(true));
    const replay = ledger.reserve("idem-success", "payment-success");

    expect(replay.status).toBe("FULFILLED");
    expect(replay.paidResponseReleased).toBe(true);
    expect(ledger.availableSupply).toBe(23);
  });

  it("treats a final 402 or missing successful receipt as settlement failure", () => {
    const ledger = new FulfillmentLedger(24);
    ledger.reserve("idem-failed", "payment-failed");

    finalizeFulfillmentFromHttpOutcome(ledger, "idem-failed", 402, receipt(false));
    expect(ledger.availableSupply).toBe(24);
    const retried = ledger.reserve("idem-failed", "payment-failed");

    expect(retried.status).toBe("RESERVED");
    expect(retried.paidResponseReleased).toBe(false);
    expect(ledger.availableSupply).toBe(23);
  });
});
