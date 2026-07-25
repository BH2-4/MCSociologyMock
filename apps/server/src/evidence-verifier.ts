import type { Evidence } from "@gesellschaft/core";

import {
  BLOCKSCOUT_TESTNET_URL,
  ECO_CUP_AMOUNT,
  ECO_CUP_SERVICE_ID,
  INJECTIVE_TESTNET_NETWORK,
  INJECTIVE_TESTNET_USDC,
} from "./x402-constants.js";

export interface ExpectedPurchase {
  paymentId: string;
  payer: `0x${string}`;
  payerAgentId: string;
  productId: typeof ECO_CUP_SERVICE_ID;
  merchantId: string;
  merchantAddress: `0x${string}`;
  amount: typeof ECO_CUP_AMOUNT;
  requestedAt: string;
  fulfilledAt: string;
  fulfilled: boolean;
  verifiedAtTick: number;
}

export interface ReconciledReceipt {
  success: boolean;
  transaction: `0x${string}`;
  network: string;
  payer: `0x${string}`;
  payTo: `0x${string}`;
  asset: `0x${string}`;
  amount: string;
  confirmations: number;
  settledAt: string;
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function assertRealTransactionHash(transaction: string): asserts transaction is `0x${string}` {
  if (!/^0x[a-fA-F0-9]{64}$/.test(transaction)) throw new Error("INVALID_TRANSACTION_HASH");
}

export function verifyPurchaseEvidence(expected: ExpectedPurchase, receipt: ReconciledReceipt): Evidence {
  if (!receipt.success || receipt.confirmations < 1) throw new Error("RECEIPT_NOT_CONFIRMED");
  assertRealTransactionHash(receipt.transaction);
  if (receipt.network !== INJECTIVE_TESTNET_NETWORK) throw new Error("NETWORK_MISMATCH");
  if (!sameAddress(receipt.asset, INJECTIVE_TESTNET_USDC)) throw new Error("ASSET_MISMATCH");
  if (!sameAddress(receipt.payer, expected.payer)) throw new Error("PAYER_MISMATCH");
  if (!sameAddress(receipt.payTo, expected.merchantAddress)) throw new Error("MERCHANT_MISMATCH");
  if (receipt.amount !== expected.amount || receipt.amount !== ECO_CUP_AMOUNT) throw new Error("AMOUNT_MISMATCH");
  if (expected.productId !== ECO_CUP_SERVICE_ID) throw new Error("PRODUCT_MISMATCH");
  if (!expected.fulfilled) throw new Error("PURCHASE_NOT_FULFILLED");
  const requestedAt = Date.parse(expected.requestedAt);
  const settledAt = Date.parse(receipt.settledAt);
  const fulfilledAt = Date.parse(expected.fulfilledAt);
  if (![requestedAt, settledAt, fulfilledAt].every(Number.isFinite) || settledAt < requestedAt || fulfilledAt < settledAt) {
    throw new Error("TIMELINE_MISMATCH");
  }
  return {
    id: `evidence:${expected.paymentId}`,
    subjectAgentId: expected.payerAgentId,
    paymentId: expected.paymentId,
    productId: expected.productId,
    merchantId: expected.merchantId,
    amount: expected.amount,
    status: "VERIFIED",
    proofScope: ["PURCHASE_OCCURRED", "AMOUNT", "MERCHANT", "TIME"],
    doesNotProve: ["PRODUCT_QUALITY", "ACTUAL_USAGE", "REVIEW_TRUTH", "RECOMMENDATION_MOTIVE"],
    verifiedAtTick: expected.verifiedAtTick,
    txHash: receipt.transaction,
    blockscoutUrl: `${BLOCKSCOUT_TESTNET_URL}/tx/${receipt.transaction}`,
    source: "INJECTIVE_TESTNET",
  };
}

export function revokeEvidenceAfterRefund(
  evidence: Evidence,
  original: ReconciledReceipt,
  refund: ReconciledReceipt,
): Evidence {
  if (evidence.status !== "VERIFIED" || evidence.txHash !== original.transaction) throw new Error("ORIGINAL_EVIDENCE_MISMATCH");
  if (!refund.success || refund.confirmations < 1) throw new Error("REFUND_NOT_CONFIRMED");
  assertRealTransactionHash(refund.transaction);
  if (refund.transaction === original.transaction) throw new Error("REFUND_MUST_BE_COMPENSATING_TRANSACTION");
  if (refund.network !== original.network) throw new Error("REFUND_NETWORK_MISMATCH");
  if (!sameAddress(refund.payer, original.payTo) || !sameAddress(refund.payTo, original.payer)) throw new Error("REFUND_PARTIES_MISMATCH");
  if (!sameAddress(refund.asset, original.asset) || refund.amount !== original.amount) throw new Error("REFUND_VALUE_MISMATCH");
  return { ...evidence, status: "REVOKED_REFUNDED" };
}
