import {
  decodeEventLog,
  parseAbi,
  type Address,
  type Hash,
  type Hex,
} from "viem";

import type { ReconciledReceipt } from "./evidence-verifier.js";
import { INJECTIVE_TESTNET_CHAIN_ID, INJECTIVE_TESTNET_NETWORK } from "./x402-constants.js";

const TRANSFER_ABI = parseAbi(["event Transfer(address indexed from, address indexed to, uint256 value)"]);

export interface ReceiptReader {
  getChainId(): Promise<number>;
  getTransactionReceipt(parameters: { hash: Hash }): Promise<{
    status: "success" | "reverted";
    blockNumber: bigint;
    logs: Array<{ address: Address; data: Hex; topics: [] | [signature: Hex, ...args: Hex[]] }>;
  }>;
  getBlockNumber(): Promise<bigint>;
  getBlock(parameters: { blockNumber: bigint }): Promise<{ timestamp: bigint }>;
  getLogs?(parameters: {
    address: Address;
    fromBlock: bigint;
    toBlock: bigint | "latest";
  }): Promise<Array<{
    address: Address;
    blockNumber: bigint | null;
    transactionHash: Hash | null;
    data: Hex;
    topics: [] | [signature: Hex, ...args: Hex[]];
  }>>;
}

export interface ExpectedTransfer {
  network: string;
  transaction: Hash;
  payer: Address;
  payTo: Address;
  asset: Address;
  amount: string;
  searchFromBlock?: bigint;
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

export async function reconcileTransfer(
  reader: ReceiptReader,
  expected: ExpectedTransfer,
): Promise<ReconciledReceipt> {
  if (expected.network !== INJECTIVE_TESTNET_NETWORK) throw new Error("NETWORK_MISMATCH");
  if (await reader.getChainId() !== INJECTIVE_TESTNET_CHAIN_ID) throw new Error("RPC_CHAIN_ID_MISMATCH");
  let blockNumber: bigint;
  let logs: Array<{ address: Address; data: Hex; topics: [] | [signature: Hex, ...args: Hex[]] }>;
  try {
    const receipt = await reader.getTransactionReceipt({ hash: expected.transaction });
    if (receipt.status !== "success") throw new Error("TRANSACTION_REVERTED");
    blockNumber = receipt.blockNumber;
    logs = receipt.logs;
  } catch (error) {
    if (!reader.getLogs || (error instanceof Error && error.message === "TRANSACTION_REVERTED")) throw error;
    const head = await reader.getBlockNumber();
    const candidateLogs = await reader.getLogs({
      address: expected.asset,
      fromBlock: expected.searchFromBlock ?? (head > 2_048n ? head - 2_048n : 0n),
      toBlock: "latest",
    });
    const transactionLogs = candidateLogs.filter((log) =>
      log.transactionHash?.toLowerCase() === expected.transaction.toLowerCase()
      && log.blockNumber !== null
    );
    if (transactionLogs.length === 0) throw error;
    blockNumber = transactionLogs[0]!.blockNumber!;
    logs = transactionLogs;
  }
  const transfer = logs.find((log) => {
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
    reader.getBlock({ blockNumber }),
  ]);
  const confirmations = Number(head - blockNumber + 1n);
  if (confirmations < 1) throw new Error("RECEIPT_NOT_CONFIRMED");
  return {
    success: true,
    transaction: expected.transaction,
    network: expected.network,
    payer: expected.payer,
    payTo: expected.payTo,
    asset: expected.asset,
    amount: expected.amount,
    confirmations,
    settledAt: new Date(Number(block.timestamp) * 1000).toISOString(),
  };
}
