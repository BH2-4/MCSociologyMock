import type { SettleResponse, VerifyRequest } from "@injectivelabs/x402";
import { encodeAbiParameters, encodeEventTopics, type Hex } from "viem";
import { describe, expect, it, vi } from "vitest";

import type { ReceiptReader } from "./chain-reconciler.js";
import { settleWithReceiptReconciliation } from "./settlement-recovery.js";
import { ECO_CUP_AMOUNT, INJECTIVE_TESTNET_NETWORK, INJECTIVE_TESTNET_USDC } from "./x402-constants.js";

const payer = "0x1111111111111111111111111111111111111111" as const;
const merchant = "0x2222222222222222222222222222222222222222" as const;
const transaction = `0x${"a".repeat(64)}` as `0x${string}`;

function request(): VerifyRequest {
  const requirements = {
    scheme: "exact" as const,
    network: INJECTIVE_TESTNET_NETWORK,
    amount: ECO_CUP_AMOUNT,
    asset: INJECTIVE_TESTNET_USDC,
    payTo: merchant,
    maxTimeoutSeconds: 60,
    extra: { version: "2" },
  };
  return {
    paymentRequirements: requirements,
    paymentPayload: {
      x402Version: 2,
      accepted: requirements,
      payload: {
        signature: `0x${"c".repeat(130)}`,
        authorization: {
          from: payer,
          to: merchant,
          value: ECO_CUP_AMOUNT,
          validAfter: "0",
          validBefore: "9999999999",
          nonce: `0x${"b".repeat(64)}`,
        },
      },
    },
  };
}

function reader(): ReceiptReader {
  const topics = encodeEventTopics({
    abi: [{ type: "event", name: "Transfer", inputs: [
      { type: "address", name: "from", indexed: true },
      { type: "address", name: "to", indexed: true },
      { type: "uint256", name: "value", indexed: false },
    ] }],
    eventName: "Transfer",
    args: { from: payer, to: merchant },
  });
  return {
    async getChainId() { return 1_439; },
    async getTransactionReceipt() { throw new Error("receipt index unavailable"); },
    async getBlockNumber() { return 102n; },
    async getBlock() { return { timestamp: 1_753_401_600n }; },
    async getLogs() {
      return [{
        address: INJECTIVE_TESTNET_USDC,
        blockNumber: 100n,
        transactionHash: transaction,
        topics: topics as [Hex, ...Hex[]],
        data: encodeAbiParameters([{ type: "uint256" }], [BigInt(ECO_CUP_AMOUNT)]),
      }];
    },
  };
}

describe("ambiguous settlement recovery", () => {
  it("recovers only a timed-out transaction with a matching confirmed transfer", async () => {
    const failed: SettleResponse = {
      success: false,
      transaction: "",
      network: INJECTIVE_TESTNET_NETWORK,
      payer,
      errorReason: "settlement_failed",
      errorMessage: `Timed out while waiting for transaction with hash "${transaction}" to be confirmed.`,
    };
    const settle = vi.fn(async () => failed);

    const result = await settleWithReceiptReconciliation({ settle }, reader(), request());

    expect(result).toMatchObject({ success: true, transaction, amount: ECO_CUP_AMOUNT });
    expect(result.extra).toMatchObject({ recoveredFrom: "RPC_TRANSACTION_RECEIPT_INDEX_TIMEOUT" });
  });

  it("preserves unrelated settlement failures", async () => {
    const failed: SettleResponse = {
      success: false,
      transaction: "",
      network: INJECTIVE_TESTNET_NETWORK,
      payer,
      errorReason: "fixture_failure",
    };

    expect(await settleWithReceiptReconciliation({ settle: async () => failed }, reader(), request())).toBe(failed);
  });
});
