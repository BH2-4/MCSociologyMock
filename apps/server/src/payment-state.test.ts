import { describe, expect, it } from "vitest";

import { FulfillmentLedger } from "./payment-state.js";

describe("payment fulfillment failure paths", () => {
  it("releases reserved inventory once after settlement failure and never releases paid content", () => {
    const ledger = new FulfillmentLedger(24);
    const reserved = ledger.reserve("idem-settle-fail", "payment-01");
    expect(ledger.availableSupply).toBe(23);
    expect(ledger.reserve("idem-settle-fail", "payment-01")).toBe(reserved);

    const failed = ledger.settlementFailed("idem-settle-fail");
    expect(failed.status).toBe("SETTLE_FAILED");
    expect(failed.paidResponseReleased).toBe(false);
    expect(ledger.availableSupply).toBe(24);
    ledger.settlementFailed("idem-settle-fail");
    expect(ledger.availableSupply).toBe(24);
  });

  it("requires a confirmed compensating refund after post-settlement fulfillment failure", () => {
    const ledger = new FulfillmentLedger(24);
    ledger.reserve("idem-refund", "payment-02");
    ledger.settled("idem-refund");
    const failed = ledger.fulfillmentFailed("idem-refund");

    expect(failed.status).toBe("FULFILLMENT_FAILED");
    expect(ledger.availableSupply).toBe(23);
    const refunded = ledger.refundConfirmed("idem-refund", `0x${"b".repeat(64)}`);
    expect(refunded.status).toBe("REFUNDED");
    expect(refunded.originalPaymentId).toBe("payment-02");
    expect(ledger.availableSupply).toBe(24);
  });
});
