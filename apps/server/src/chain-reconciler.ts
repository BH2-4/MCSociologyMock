import {
  decodeEventLog,
  parseAbi,
  type Address,
  type Hash,
  type Hex,
} from "viem";

import type { ReconciledReceipt } from "./evidence-verifier.js";
import { INJECTIVE_TESTNET_NETWORK } from "./x402-constants.js";

const TRANSFER_ABI = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 value)"]);

export interface ReceiptReader {
  getTransactionReceipt(parameters: { hash: Hash }): Promise<{
    status: "success" | "reverted";
    blockNumber: bigint;
    logs: Array<{ address: Address; data: Hex; topics: [] | [signature: Hex, ...args: Hex[]] }>;
  }>;
  getBlockNumber(): Promise<bigint>;
  getBlock(parameters: { blockNumber: bigint }): Promise<{ timestamp: bigint }>;
}

export interface ExpectedTransfer {
  transaction: Hash;
  payer: Address;
  payTo: Address;
  asset: Address;
  amount: string;
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

export async function reconcileTransfer(
  reader: ReceiptReader,
  expected: ExpectedTransfer,
): Promise<ReconciledReceipt> {
  const receipt = await reader.getTransactionReceipt({ hash: expected.transaction });
  if (receipt.status !== "success") throw new Error("TRANSACTION_REVERTED");
  const transfer = receipt.logs.find((log) => {
    if (!sameAddress(log.address, expected.asset)) return false;
    try {
      const decoded = decodeEventLog({ abi: TRANSFER_ABI, eventName: "Transfer", data: log.data, topics: log.topics });
      return sameAddress(decoded.args.from, expected.payer)
        && sameAddress(decoded.args.to, expected.payTo)
        && decoded.args.value === BigInt(expected.amount);
    } catch {
      return false;
    }
  });
  if (!transfer) throw new Error("TRANSFER_LOG_MISMATCH");
  const [head, block] = await Promise.all([
    reader.getBlockNumber(),
    reader.getBlock({ blockNumber: receipt.blockNumber }),
  ]);
  const confirmations = Number(head - receipt.blockNumber + 1n);
  if (confirmations < 1) throw new Error("RECEIPT_NOT_CONFIRMED");
  return {
    success: true,
    transaction: expected.transaction,
    network: INJECTIVE_TESTNET_NETWORK,
    payer: expected.payer,
    payTo: expected.payTo,
    asset: expected.asset,
    amount: expected.amount,
    confirmations,
    settledAt: new Date(Number(block.timestamp) * 1000).toISOString(),
  };
}
