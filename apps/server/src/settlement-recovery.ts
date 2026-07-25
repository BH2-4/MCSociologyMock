import type { SettleResponse, VerifyRequest } from "@injectivelabs/x402";

import { reconcileTransfer, type ReceiptReader } from "./chain-reconciler.js";

export interface SettlementOperations {
  settle(request: VerifyRequest): Promise<SettleResponse>;
}

export async function settleWithReceiptReconciliation(
  operations: SettlementOperations,
  reader: ReceiptReader,
  request: VerifyRequest,
): Promise<SettleResponse> {
  const result = await operations.settle(request);
  if (result.success || result.errorReason !== "settlement_failed") return result;
  const match = result.errorMessage?.match(/Timed out while waiting for transaction with hash [\\"]?(0x[a-fA-F0-9]{64})/);
  if (!match) return result;
  const transaction = match[1] as `0x${string}`;
  const authorization = request.paymentPayload.payload.authorization;
  try {
    const receipt = await reconcileTransfer(reader, {
      network: request.paymentRequirements.network,
      transaction,
      payer: authorization.from,
      payTo: request.paymentRequirements.payTo,
      asset: request.paymentRequirements.asset,
      amount: request.paymentRequirements.amount,
    });
    return {
      success: true,
      payer: authorization.from,
      transaction,
      network: receipt.network,
      amount: request.paymentRequirements.amount,
      extra: {
        recoveredFrom: "RPC_TRANSACTION_RECEIPT_INDEX_TIMEOUT",
        confirmations: receipt.confirmations,
      },
    };
  } catch {
    return result;
  }
}
