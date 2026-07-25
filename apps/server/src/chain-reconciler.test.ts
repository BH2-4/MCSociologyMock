import { encodeAbiParameters, encodeEventTopics, type Address, type Hex } from "viem";
import { describe, expect, it } from "vitest";

import { reconcileTransfer, type ReceiptReader } from "./chain-reconciler.js";
import { ECO_CUP_AMOUNT, INJECTIVE_TESTNET_NETWORK, INJECTIVE_TESTNET_USDC } from "./x402-constants.js";

const payer = "0x1111111111111111111111111111111111111111" as const;
const merchant = "0x2222222222222222222222222222222222222222" as const;
const transaction = `0x${"a".repeat(64)}` as const;

function reader(to: Address = merchant): ReceiptReader {
  const topics = encodeEventTopics({
    abi: [{ type: "event", name: "Transfer", inputs: [
      { type: "address", name: "from", indexed: true },
      { type: "address", name: "to", indexed: true },
      { type: "uint256", name: "value", indexed: false },
    ] }],
    eventName: "Transfer",
    args: { from: payer, to },
  });
  return {
    async getChainId() { return 1_439; },
    async getTransactionReceipt() {
      return {
        status: "success",
        blockNumber: 100n,
        logs: [{
          address: INJECTIVE_TESTNET_USDC,
          topics: topics as [Hex, ...Hex[]],
          data: encodeAbiParameters([{ type: "uint256" }], [BigInt(ECO_CUP_AMOUNT)]),
        }],
      };
    },
    async getBlockNumber() { return 102n; },
    async getBlock() { return { timestamp: 1_753_401_600n }; },
  };
}

describe("Injective receipt reconciler", () => {
  it("matches confirmed USDC Transfer fields and block time", async () => {
    const reconciled = await reconcileTransfer(reader(), {
      network: INJECTIVE_TESTNET_NETWORK,
      transaction,
      payer,
      payTo: merchant,
      asset: INJECTIVE_TESTNET_USDC,
      amount: ECO_CUP_AMOUNT,
    });

    expect(reconciled.confirmations).toBe(3);
    expect(reconciled.transaction).toBe(transaction);
    expect(reconciled.settledAt).toBe("2025-07-25T00:00:00.000Z");
  });

  it("rejects a transfer to a different merchant", async () => {
    await expect(reconcileTransfer(reader(payer), {
      network: INJECTIVE_TESTNET_NETWORK,
      transaction,
      payer,
      payTo: merchant,
      asset: INJECTIVE_TESTNET_USDC,
      amount: ECO_CUP_AMOUNT,
    })).rejects.toThrow("TRANSFER_LOG_MISMATCH");
  });

  it("rejects receipt data from an RPC on another chain", async () => {
    await expect(reconcileTransfer({ ...reader(), getChainId: async () => 1 }, {
      network: INJECTIVE_TESTNET_NETWORK,
      transaction,
      payer,
      payTo: merchant,
      asset: INJECTIVE_TESTNET_USDC,
      amount: ECO_CUP_AMOUNT,
    })).rejects.toThrow("RPC_CHAIN_ID_MISMATCH");
  });
});
