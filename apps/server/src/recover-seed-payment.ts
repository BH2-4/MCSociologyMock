import { existsSync } from "node:fs";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { EIP3009_ABI } from "@injectivelabs/x402/eip3009";
import { injectiveEvmTestnet } from "@injectivelabs/x402/networks";
import { hashObject } from "@agorasim/core";
import { createPublicClient, decodeFunctionData, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { reconcileTransfer } from "./chain-reconciler.js";
import { resolveWorkspacePath } from "./env.js";
import { verifyPurchaseEvidence } from "./evidence-verifier.js";
import { parsePartialSeedReceiptFixture, type SeedProof, type SeedReceiptFixture } from "./seed-receipt-fixture.js";
import {
  BLOCKSCOUT_TESTNET_URL,
  ECO_CUP_AMOUNT,
  ECO_CUP_SERVICE_ID,
  INJECTIVE_TESTNET_CHAIN_ID,
  INJECTIVE_TESTNET_NETWORK,
  INJECTIVE_TESTNET_USDC,
} from "./x402-constants.js";

const branch = requiredEnvironment("RECOVERY_SEED_BRANCH");
const logicalAgentId = requiredEnvironment("RECOVERY_SEED_AGENT_ID");
const transaction = requiredEnvironment("RECOVERY_SEED_TX_HASH") as `0x${string}`;
if (!/^0x[a-fA-F0-9]{64}$/.test(transaction)) throw new Error("RECOVERY_SEED_TX_HASH is invalid");
const transactionBlock = BigInt(requiredEnvironment("RECOVERY_SEED_BLOCK_NUMBER"));
if (transactionBlock < 1n) throw new Error("RECOVERY_SEED_BLOCK_NUMBER is invalid");
const keyName = ({
  "control:consumer-01": "CONTROL_SEED_01_PRIVATE_KEY",
  "control:consumer-13": "CONTROL_SEED_02_PRIVATE_KEY",
  "treatment:consumer-01": "TREATMENT_SEED_01_PRIVATE_KEY",
  "treatment:consumer-13": "TREATMENT_SEED_02_PRIVATE_KEY",
} as const)[`${branch}:${logicalAgentId}` as "control:consumer-01"];
if (!keyName) throw new Error("Recovery target is not a fixed P0 seed");
const privateKey = requiredEnvironment(keyName) as Hex;
const payer = privateKeyToAccount(privateKey).address;
const merchantAddress = requiredEnvironment("MERCHANT_AGENT_ADDRESS") as `0x${string}`;
const rpcUrl = process.env.INJECTIVE_EVM_RPC_URL;
const client = createPublicClient({ chain: injectiveEvmTestnet, transport: http(rpcUrl) });
if (await client.getChainId() !== INJECTIVE_TESTNET_CHAIN_ID) {
  throw new Error(`Injective testnet RPC must report chain ID ${INJECTIVE_TESTNET_CHAIN_ID}`);
}
const receipt = await reconcileTransfer(client, {
  network: INJECTIVE_TESTNET_NETWORK,
  transaction,
  payer,
  payTo: merchantAddress,
  asset: INJECTIVE_TESTNET_USDC,
  amount: ECO_CUP_AMOUNT,
  searchFromBlock: transactionBlock,
});
const logs = await client.getLogs({
  address: INJECTIVE_TESTNET_USDC,
  fromBlock: transactionBlock,
  toBlock: transactionBlock,
});
const paymentLog = logs.find((log) => log.transactionHash?.toLowerCase() === transaction.toLowerCase());
if (!paymentLog?.blockNumber) throw new Error("Recovered transaction log has no block");
if (paymentLog.blockNumber !== transactionBlock) throw new Error("Recovered transaction block does not match the supplied block");
const block = await client.getBlock({ blockNumber: paymentLog.blockNumber, includeTransactions: true });
const chainTransaction = block.transactions.find((item) => typeof item !== "string" && item.hash.toLowerCase() === transaction.toLowerCase());
if (!chainTransaction || typeof chainTransaction === "string") throw new Error("Recovered transaction is absent from its block");
const decoded = decodeFunctionData({ abi: EIP3009_ABI, data: chainTransaction.input });
if (decoded.functionName !== "transferWithAuthorization") throw new Error("Recovered transaction is not EIP-3009");
const [from, to, value, , , nonce] = decoded.args;
if (
  String(from).toLowerCase() !== payer.toLowerCase()
  || String(to).toLowerCase() !== merchantAddress.toLowerCase()
  || String(value) !== ECO_CUP_AMOUNT
  || !/^0x[a-fA-F0-9]{64}$/.test(String(nonce))
) throw new Error("Recovered EIP-3009 authorization does not match the seed payment");

const idempotencyKey = `seed:${branch}:${logicalAgentId}`;
const paymentId = `payment:${hashObject({
  network: INJECTIVE_TESTNET_NETWORK,
  asset: INJECTIVE_TESTNET_USDC.toLowerCase(),
  payer: payer.toLowerCase(),
  nonce: String(nonce).toLowerCase(),
})}`;
const fulfillmentId = `fulfillment:${hashObject({ idempotencyKey, paymentId }).slice(0, 20)}`;
const requestedAt = receipt.settledAt;
// Persisting this digital entitlement is the explicit recovery fulfillment.
// The original request time was not durable, so block time remains labelled as
// its upper bound instead of being presented as the original client timestamp.
const fulfilledAt = new Date().toISOString();
const evidence = verifyPurchaseEvidence({
  paymentId: `seed:${branch}:${logicalAgentId}`,
  payer,
  payerAgentId: logicalAgentId,
  productId: ECO_CUP_SERVICE_ID,
  merchantId: "merchant-01",
  merchantAddress,
  amount: ECO_CUP_AMOUNT,
  requestedAt,
  fulfilledAt,
  fulfilled: true,
  verifiedAtTick: 1,
}, receipt);
const fixturePath = resolveWorkspacePath(process.env.TESTNET_RECEIPT_FIXTURE_PATH ?? "fixtures/testnet-seed-receipts.json");
await mkdir(dirname(fixturePath), { recursive: true });
const lockPath = `${fixturePath}.lock`;
const temporaryPath = `${fixturePath}.${process.pid}.tmp`;
const lock = await open(lockPath, "wx", 0o600);
try {
  const fixture: SeedReceiptFixture = existsSync(fixturePath)
    ? parsePartialSeedReceiptFixture(JSON.parse(await readFile(fixturePath, "utf8")) as unknown, merchantAddress)
    : {
        schemaVersion: 1,
        network: INJECTIVE_TESTNET_NETWORK,
        asset: INJECTIVE_TESTNET_USDC,
        amount: ECO_CUP_AMOUNT,
        merchantAddress,
        generatedAt: new Date().toISOString(),
        payments: [],
      };
  if (fixture.payments.some((item) => item.branch === branch && item.logicalAgentId === logicalAgentId)) {
    throw new Error("Recovery target already exists in the Fixture");
  }
  if (fixture.payments.some((item) => item.transaction.toLowerCase() === transaction.toLowerCase())) {
    throw new Error("Recovered transaction already exists in the Fixture");
  }
  fixture.payments.push({
    branch: branch as "control" | "treatment",
    logicalAgentId: logicalAgentId as "consumer-01" | "consumer-13",
    payer,
    fulfillmentId,
    fulfillmentMode: "RECOVERED_CONFIRMED_SETTLEMENT",
    transaction,
    blockscoutUrl: `${BLOCKSCOUT_TESTNET_URL}/tx/${transaction}`,
    requestedAt,
    requestedAtSource: "SETTLEMENT_BLOCK_TIME_UPPER_BOUND",
    fulfilledAt,
    receipt: receipt as SeedProof["receipt"],
    evidence: evidence as SeedProof["evidence"],
  });
  const validated = parsePartialSeedReceiptFixture(fixture, merchantAddress);
  await writeFile(temporaryPath, `${JSON.stringify(validated, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(temporaryPath, fixturePath);
} finally {
  await lock.close();
  await unlink(temporaryPath).catch(() => undefined);
  await unlink(lockPath).catch(() => undefined);
}
console.log(JSON.stringify({ fixturePath, branch, logicalAgentId, transaction, fulfillmentId }, null, 2));

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
