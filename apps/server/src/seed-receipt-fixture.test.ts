import { describe, expect, it } from "vitest";

import { parsePartialSeedReceiptFixture, parseSeedReceiptFixture } from "./seed-receipt-fixture.js";
import {
  BLOCKSCOUT_TESTNET_URL,
  ECO_CUP_AMOUNT,
  INJECTIVE_TESTNET_NETWORK,
  INJECTIVE_TESTNET_USDC,
} from "./x402-constants.js";

function fixture() {
  const merchantAddress = "0x9999999999999999999999999999999999999999";
  const pairs = [
    ["control", "consumer-01"],
    ["control", "consumer-13"],
    ["treatment", "consumer-01"],
    ["treatment", "consumer-13"],
  ] as const;
  return {
    schemaVersion: 1,
    network: INJECTIVE_TESTNET_NETWORK,
    asset: INJECTIVE_TESTNET_USDC,
    amount: ECO_CUP_AMOUNT,
    merchantAddress,
    generatedAt: "2026-07-25T00:00:00.000Z",
    payments: pairs.map(([branch, logicalAgentId], index) => {
      const digit = String(index + 1);
      const transaction = `0x${digit.repeat(64)}`;
      const paymentId = `seed:${branch}:${logicalAgentId}`;
      const blockscoutUrl = `${BLOCKSCOUT_TESTNET_URL}/tx/${transaction}`;
      return {
        branch,
        logicalAgentId,
        payer: `0x${digit.repeat(40)}`,
        fulfillmentId: `fulfillment:${branch}:${logicalAgentId}`,
        fulfillmentMode: "LIVE_RESPONSE" as const,
        transaction,
        blockscoutUrl,
        requestedAt: "2026-07-25T00:00:00.000Z",
        requestedAtSource: "CLIENT_CLOCK" as const,
        fulfilledAt: "2026-07-25T00:00:02.000Z",
        receipt: {
          success: true,
          transaction,
          network: INJECTIVE_TESTNET_NETWORK,
          payer: `0x${digit.repeat(40)}`,
          payTo: merchantAddress,
          asset: INJECTIVE_TESTNET_USDC,
          amount: ECO_CUP_AMOUNT,
          confirmations: 1,
          settledAt: "2026-07-25T00:00:01.000Z",
        },
        evidence: {
          id: `evidence:${paymentId}`,
          subjectAgentId: logicalAgentId,
          paymentId,
          productId: "offer_eco_cup",
          merchantId: "merchant-01",
          amount: ECO_CUP_AMOUNT,
          status: "VERIFIED",
          proofScope: ["PURCHASE_OCCURRED", "AMOUNT", "MERCHANT", "TIME"],
          doesNotProve: ["PRODUCT_QUALITY", "ACTUAL_USAGE", "REVIEW_TRUTH", "RECOMMENDATION_MOTIVE"],
          verifiedAtTick: 1,
          txHash: transaction,
          blockscoutUrl,
          source: "INJECTIVE_TESTNET",
        },
      };
    }),
  };
}

describe("testnet seed receipt fixture", () => {
  it("accepts exactly four unique, fully bounded seed proofs", () => {
    const recordings = parseSeedReceiptFixture(fixture());

    expect(recordings).toHaveLength(4);
    expect(recordings.map((recording) => `${recording.branchId}:${recording.logicalAgentId}`)).toEqual([
      "control:consumer-01",
      "control:consumer-13",
      "treatment:consumer-01",
      "treatment:consumer-13",
    ]);
  });

  it("rejects reused transactions and mismatched Evidence", () => {
    const duplicate = fixture();
    duplicate.payments[1]!.transaction = duplicate.payments[0]!.transaction;
    expect(() => parseSeedReceiptFixture(duplicate)).toThrow("SEED_FIXTURE_TRANSACTION_REUSED");

    const mismatched = fixture();
    mismatched.payments[0]!.evidence.subjectAgentId = "consumer-13";
    expect(() => parseSeedReceiptFixture(mismatched)).toThrow("SEED_FIXTURE_EVIDENCE_MISMATCH");
  });

  it("validates a partial resume file but does not accept it as complete", () => {
    const partial = fixture();
    partial.payments = partial.payments.slice(0, 2);

    expect(parsePartialSeedReceiptFixture(partial).payments).toHaveLength(2);
    expect(() => parseSeedReceiptFixture(partial)).toThrow("SEED_FIXTURE_PAYMENT_SET_INCOMPLETE");
  });
});
