import { describe, expect, it } from "vitest";

import {
  revokeEvidenceAfterRefund,
  verifyPurchaseEvidence,
  type ExpectedPurchase,
  type ReconciledReceipt,
} from "./evidence-verifier.js";
import {
  ECO_CUP_AMOUNT,
  ECO_CUP_SERVICE_ID,
  INJECTIVE_TESTNET_NETWORK,
  INJECTIVE_TESTNET_USDC,
} from "./x402-constants.js";

const payer = "0x1111111111111111111111111111111111111111" as const;
const merchant = "0x2222222222222222222222222222222222222222" as const;
const transaction = `0x${"a".repeat(64)}` as const;

const expected: ExpectedPurchase = {
  paymentId: "payment-01",
  payer,
  payerAgentId: "consumer-03",
  productId: ECO_CUP_SERVICE_ID,
  merchantId: "merchant-01",
  merchantAddress: merchant,
  amount: ECO_CUP_AMOUNT,
  requestedAt: "2026-07-25T00:00:00.000Z",
  fulfilledAt: "2026-07-25T00:00:02.000Z",
  fulfilled: true,
  verifiedAtTick: 3,
};

const receipt: ReconciledReceipt = {
  success: true,
  transaction,
  network: INJECTIVE_TESTNET_NETWORK,
  payer,
  payTo: merchant,
  asset: INJECTIVE_TESTNET_USDC,
  amount: ECO_CUP_AMOUNT,
  confirmations: 1,
  settledAt: "2026-07-25T00:00:01.000Z",
};

describe("Evidence Verifier", () => {
  it("creates bounded evidence only after every receipt and fulfillment field matches", () => {
    const evidence = verifyPurchaseEvidence(expected, receipt);

    expect(evidence.status).toBe("VERIFIED");
    expect(evidence.txHash).toBe(transaction);
    expect(evidence.verifiedAtTick).toBe(3);
    expect(evidence.blockscoutUrl).toContain(transaction);
    expect(evidence.proofScope).toEqual(["PURCHASE_OCCURRED", "AMOUNT", "MERCHANT", "TIME"]);
    expect(evidence.doesNotProve).toContain("PRODUCT_QUALITY");
  });

  it.each([
    ["PAYER_MISMATCH", { payer: merchant }],
    ["MERCHANT_MISMATCH", { payTo: payer }],
    ["AMOUNT_MISMATCH", { amount: "300001" }],
    ["NETWORK_MISMATCH", { network: "eip155:1776" }],
  ] as const)("rejects %s", (message, override) => {
    expect(() => verifyPurchaseEvidence(expected, { ...receipt, ...override })).toThrow(message);
  });

  it("revokes evidence only after a confirmed compensating refund transaction", () => {
    const evidence = verifyPurchaseEvidence(expected, receipt);
    const refund: ReconciledReceipt = {
      ...receipt,
      transaction: `0x${"b".repeat(64)}`,
      payer: merchant,
      payTo: payer,
      settledAt: "2026-07-25T00:00:03.000Z",
    };

    expect(revokeEvidenceAfterRefund(evidence, receipt, refund).status).toBe("REVOKED_REFUNDED");
  });
});
