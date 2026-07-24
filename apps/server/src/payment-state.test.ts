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

    expect(ledger.reserve("idem-settle-fail", "payment-01").status).toBe("RESERVED");
    expect(ledger.availableSupply).toBe(23);
  });

  it("binds one payment identity to exactly one idempotency key", () => {
    const ledger = new FulfillmentLedger(24);
    ledger.reserve("idem-01", "payment-01");

    expect(() => ledger.reserve("idem-02", "payment-01")).toThrow("PAYMENT_ALREADY_BOUND_TO_IDEMPOTENCY_KEY");
    expect(() => ledger.reserve("idem-01", "payment-02")).toThrow("IDEMPOTENCY_KEY_REUSED_FOR_DIFFERENT_PAYMENT");
    expect(ledger.availableSupply).toBe(23);
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
