import "./env.js";

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { createPayment } from "@injectivelabs/x402/client";
import { injectiveEvmTestnet } from "@injectivelabs/x402/networks";
import { createPublicClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { reconcileTransfer } from "./chain-reconciler.js";
import { verifyPurchaseEvidence } from "./evidence-verifier.js";
import { executeX402Payment } from "./payment-adapter.js";
import {
  parsePartialSeedReceiptFixture,
  parseSeedReceiptFixture,
  type SeedProof,
  type SeedReceiptFixture,
} from "./seed-receipt-fixture.js";
import { FixedWalletPolicy } from "./wallet-policy.js";
import {
  BLOCKSCOUT_TESTNET_URL,
  ECO_CUP_AMOUNT,
  ECO_CUP_SERVICE_ID,
  INJECTIVE_TESTNET_USDC,
} from "./x402-constants.js";

const fixturePath = resolve(process.env.TESTNET_RECEIPT_FIXTURE_PATH ?? "fixtures/testnet-seed-receipts.json");
const resourceUrl = requiredEnvironment("PUBLIC_RESOURCE_BASE_URL").replace(/\/$/, "") + "/x402/offers/eco-cup";
const merchantAddress = requiredEnvironment("MERCHANT_AGENT_ADDRESS") as `0x${string}`;
const rpcUrl = process.env.INJECTIVE_EVM_RPC_URL ?? "https://k8s.testnet.json-rpc.injective.network";
const publicClient = createPublicClient({ chain: injectiveEvmTestnet, transport: http(rpcUrl) });
const seeds = [
  { branch: "control", logicalAgentId: "consumer-01", keyRef: requiredEnvironment("CONTROL_SEED_01_KEY_REF") },
  { branch: "control", logicalAgentId: "consumer-13", keyRef: requiredEnvironment("CONTROL_SEED_02_KEY_REF") },
  { branch: "treatment", logicalAgentId: "consumer-01", keyRef: requiredEnvironment("TREATMENT_SEED_01_KEY_REF") },
  { branch: "treatment", logicalAgentId: "consumer-13", keyRef: requiredEnvironment("TREATMENT_SEED_02_KEY_REF") },
] as const;

const addresses = seeds.map((seed) => privateKeyToAccount(resolveEnvironmentKey(seed.keyRef)).address.toLowerCase());
if (new Set(addresses).size !== seeds.length) throw new Error("Seed branch wallets must use four unique EVM addresses");
if (addresses.includes(merchantAddress.toLowerCase())) throw new Error("Merchant address must not be reused as a seed payer");

const fixture: SeedReceiptFixture = existsSync(fixturePath)
  ? parsePartialSeedReceiptFixture(JSON.parse(await readFile(fixturePath, "utf8")) as unknown, merchantAddress)
  : {
      schemaVersion: 1,
      network: "eip155:1439",
      asset: INJECTIVE_TESTNET_USDC,
      amount: ECO_CUP_AMOUNT,
      merchantAddress,
      generatedAt: new Date().toISOString(),
      payments: [],
    };
if (
  fixture.network !== "eip155:1439"
  || fixture.asset.toLowerCase() !== INJECTIVE_TESTNET_USDC.toLowerCase()
  || fixture.amount !== ECO_CUP_AMOUNT
  || fixture.merchantAddress.toLowerCase() !== merchantAddress.toLowerCase()
) {
  throw new Error("Existing seed receipt fixture does not match the fixed P0 payment contract");
}

for (const seed of seeds) {
  const privateKey = resolveEnvironmentKey(seed.keyRef);
  const account = privateKeyToAccount(privateKey);
  const existing = fixture.payments.find((proof) => proof.branch === seed.branch && proof.logicalAgentId === seed.logicalAgentId);
  if (existing) {
    if (existing.payer.toLowerCase() !== account.address.toLowerCase()) {
      throw new Error(`Existing receipt payer does not match ${seed.branch}/${seed.logicalAgentId} key_ref`);
    }
    continue;
  }
  const requestedAt = new Date().toISOString();
  const payment = await executeX402Payment({
    intent: {
      serviceId: ECO_CUP_SERVICE_ID,
      url: resourceUrl,
      expectedPayTo: merchantAddress,
      maxAmount: ECO_CUP_AMOUNT,
      tickSpent: "0",
      tickLimit: ECO_CUP_AMOUNT,
      experimentSpent: "0",
      experimentLimit: "1200000",
    },
    policy: new FixedWalletPolicy(),
    signApprovedRequirement: (requirement) => createPayment({ privateKey }, requirement),
    fetchImplementation: (input, init) => fetch(input, {
      ...init,
      headers: { ...Object.fromEntries(new Headers(init?.headers)), "Idempotency-Key": `seed:${seed.branch}:${seed.logicalAgentId}` },
    }),
  });
  const fulfillment = await payment.response.json() as { fulfillmentId?: string };
  if (!fulfillment.fulfillmentId) throw new Error("Paid resource did not return a fulfillment ID");
  const receipt = await reconcileTransfer(publicClient, {
    transaction: payment.receipt.transaction,
    payer: account.address,
    payTo: merchantAddress,
    asset: INJECTIVE_TESTNET_USDC,
    amount: ECO_CUP_AMOUNT,
  });
  if (!receipt.success) throw new Error("Confirmed seed transaction produced an unsuccessful receipt");
  const fulfilledAt = new Date().toISOString();
  const evidence = verifyPurchaseEvidence({
    paymentId: `seed:${seed.branch}:${seed.logicalAgentId}`,
    payer: account.address,
    payerAgentId: seed.logicalAgentId,
    productId: ECO_CUP_SERVICE_ID,
    merchantId: "merchant-01",
    merchantAddress,
    amount: ECO_CUP_AMOUNT,
    requestedAt,
    fulfilledAt,
    fulfilled: true,
    verifiedAtTick: 1,
  }, receipt);
  if (evidence.status !== "VERIFIED" || evidence.source !== "INJECTIVE_TESTNET" || !evidence.txHash || !evidence.blockscoutUrl) {
    throw new Error("Verified testnet seed payment did not produce persistable Evidence");
  }
  fixture.payments.push({
    branch: seed.branch,
    logicalAgentId: seed.logicalAgentId,
    payer: account.address,
    fulfillmentId: fulfillment.fulfillmentId,
    transaction: receipt.transaction,
    blockscoutUrl: `${BLOCKSCOUT_TESTNET_URL}/tx/${receipt.transaction}`,
    requestedAt,
    fulfilledAt,
    receipt: receipt as SeedProof["receipt"],
    evidence: evidence as SeedProof["evidence"],
  });
  await persistFixture();
}

parseSeedReceiptFixture(fixture, merchantAddress);

console.log(JSON.stringify({
  fixturePath,
  transactions: fixture.payments.map(({ transaction, blockscoutUrl }) => ({ transaction, blockscoutUrl })),
}, null, 2));

async function persistFixture(): Promise<void> {
  await mkdir(dirname(fixturePath), { recursive: true });
  await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, { encoding: "utf8" });
}

function resolveEnvironmentKey(keyRef: string): Hex {
  if (!keyRef.startsWith("env:")) throw new Error("P0 seed key_ref must use the env:NAME local secret reference format");
  const environmentName = keyRef.slice(4);
  if (!/^[A-Z][A-Z0-9_]+$/.test(environmentName)) throw new Error("Invalid env key_ref name");
  const privateKey = process.env[environmentName];
  if (!privateKey || !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) throw new Error(`Missing or invalid secret for ${environmentName}`);
  return privateKey as Hex;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
