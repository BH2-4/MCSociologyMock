import { readFile } from "node:fs/promises";

import type { RecordedSeedPayment } from "@agorasim/core";
import { z } from "zod";

import {
  BLOCKSCOUT_TESTNET_URL,
  ECO_CUP_AMOUNT,
  ECO_CUP_SERVICE_ID,
  INJECTIVE_TESTNET_NETWORK,
  INJECTIVE_TESTNET_USDC,
} from "./x402-constants.js";
import { verifyPurchaseEvidence, type ReconciledReceipt } from "./evidence-verifier.js";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const transactionSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);
const evidenceSchema = z.object({
  id: z.string().min(1),
  subjectAgentId: z.enum(["consumer-01", "consumer-13"]),
  paymentId: z.string().min(1),
  productId: z.literal(ECO_CUP_SERVICE_ID),
  merchantId: z.literal("merchant-01"),
  amount: z.literal(ECO_CUP_AMOUNT),
  status: z.literal("VERIFIED"),
  proofScope: z.tuple([
    z.literal("PURCHASE_OCCURRED"),
    z.literal("AMOUNT"),
    z.literal("MERCHANT"),
    z.literal("TIME"),
  ]),
  doesNotProve: z.tuple([
    z.literal("PRODUCT_QUALITY"),
    z.literal("ACTUAL_USAGE"),
    z.literal("REVIEW_TRUTH"),
    z.literal("RECOMMENDATION_MOTIVE"),
  ]),
  verifiedAtTick: z.literal(1),
  txHash: transactionSchema,
  blockscoutUrl: z.string().url(),
  source: z.literal("INJECTIVE_TESTNET"),
}).strict();
const receiptSchema = z.object({
  success: z.literal(true),
  transaction: transactionSchema,
  network: z.literal(INJECTIVE_TESTNET_NETWORK),
  payer: addressSchema,
  payTo: addressSchema,
  asset: z.string().refine((value) => value.toLowerCase() === INJECTIVE_TESTNET_USDC.toLowerCase(), "INVALID_RECEIPT_ASSET"),
  amount: z.literal(ECO_CUP_AMOUNT),
  confirmations: z.number().int().min(1),
  settledAt: z.string().refine((value) => Number.isFinite(Date.parse(value)), "INVALID_SETTLED_AT"),
}).strict();

const seedProofSchema = z.object({
  branch: z.enum(["control", "treatment"]),
  logicalAgentId: z.enum(["consumer-01", "consumer-13"]),
  payer: addressSchema,
  fulfillmentId: z.string().min(1),
  transaction: transactionSchema,
  blockscoutUrl: z.string().url(),
  requestedAt: z.string().refine((value) => Number.isFinite(Date.parse(value)), "INVALID_REQUESTED_AT"),
  fulfilledAt: z.string().refine((value) => Number.isFinite(Date.parse(value)), "INVALID_FULFILLED_AT"),
  receipt: receiptSchema,
  evidence: evidenceSchema,
}).strict();

const seedFixtureSchema = z.object({
  schemaVersion: z.literal(1),
  network: z.literal(INJECTIVE_TESTNET_NETWORK),
  asset: z.string().refine((value) => value.toLowerCase() === INJECTIVE_TESTNET_USDC.toLowerCase(), "INVALID_FIXTURE_ASSET"),
  amount: z.literal(ECO_CUP_AMOUNT),
  merchantAddress: addressSchema,
  generatedAt: z.string().refine((value) => Number.isFinite(Date.parse(value)), "INVALID_GENERATED_AT"),
  payments: z.array(seedProofSchema).max(4),
}).strict();

export type SeedReceiptFixture = z.infer<typeof seedFixtureSchema>;
export type SeedProof = z.infer<typeof seedProofSchema>;

function parseFixture(
  input: unknown,
  requireComplete: boolean,
  expectedMerchantAddress?: `0x${string}`,
): { fixture: SeedReceiptFixture; recordings: RecordedSeedPayment[] } {
  const fixture = seedFixtureSchema.parse(input);
  if (expectedMerchantAddress && fixture.merchantAddress.toLowerCase() !== expectedMerchantAddress.toLowerCase()) {
    throw new Error("SEED_FIXTURE_MERCHANT_MISMATCH");
  }
  const expected = new Set([
    "control:consumer-01",
    "control:consumer-13",
    "treatment:consumer-01",
    "treatment:consumer-13",
  ]);
  const payers = new Set<string>();
  const transactions = new Set<string>();

  const recordings = fixture.payments.map((proof) => {
    const key = `${proof.branch}:${proof.logicalAgentId}`;
    if (!expected.delete(key)) throw new Error("SEED_FIXTURE_PAYMENT_SET_INVALID");
    if (proof.payer.toLowerCase() === fixture.merchantAddress.toLowerCase()) throw new Error("SEED_FIXTURE_PAYER_REUSES_MERCHANT");
    if (payers.has(proof.payer.toLowerCase())) throw new Error("SEED_FIXTURE_PAYER_REUSED");
    if (transactions.has(proof.transaction.toLowerCase())) throw new Error("SEED_FIXTURE_TRANSACTION_REUSED");
    payers.add(proof.payer.toLowerCase());
    transactions.add(proof.transaction.toLowerCase());

    const expectedUrl = `${BLOCKSCOUT_TESTNET_URL}/tx/${proof.transaction}`;
    const verifiedEvidence = verifyPurchaseEvidence({
      paymentId: `seed:${proof.branch}:${proof.logicalAgentId}`,
      payer: proof.payer as `0x${string}`,
      payerAgentId: proof.logicalAgentId,
      productId: ECO_CUP_SERVICE_ID,
      merchantId: "merchant-01",
      merchantAddress: fixture.merchantAddress as `0x${string}`,
      amount: ECO_CUP_AMOUNT,
      requestedAt: proof.requestedAt,
      fulfilledAt: proof.fulfilledAt,
      fulfilled: true,
      verifiedAtTick: 1,
    }, proof.receipt as ReconciledReceipt);
    if (
      proof.blockscoutUrl !== expectedUrl
      || proof.evidence.blockscoutUrl !== expectedUrl
      || proof.evidence.txHash.toLowerCase() !== proof.transaction.toLowerCase()
      || proof.evidence.subjectAgentId !== proof.logicalAgentId
      || proof.evidence.paymentId !== `seed:${proof.branch}:${proof.logicalAgentId}`
      || proof.evidence.id !== `evidence:${proof.evidence.paymentId}`
      || JSON.stringify(proof.evidence) !== JSON.stringify(verifiedEvidence)
    ) throw new Error("SEED_FIXTURE_EVIDENCE_MISMATCH");

    return {
      branchId: proof.branch,
      logicalAgentId: proof.logicalAgentId,
      payerAddress: proof.payer as `0x${string}`,
      fulfillmentId: proof.fulfillmentId,
      txHash: proof.transaction as `0x${string}`,
      evidence: {
        ...proof.evidence,
        txHash: proof.evidence.txHash as `0x${string}`,
      },
    };
  });
  if (requireComplete && expected.size > 0) throw new Error("SEED_FIXTURE_PAYMENT_SET_INCOMPLETE");
  return { fixture, recordings };
}

export function parseSeedReceiptFixture(input: unknown, expectedMerchantAddress?: `0x${string}`): RecordedSeedPayment[] {
  return parseFixture(input, true, expectedMerchantAddress).recordings;
}

export function parsePartialSeedReceiptFixture(input: unknown, expectedMerchantAddress?: `0x${string}`): SeedReceiptFixture {
  return parseFixture(input, false, expectedMerchantAddress).fixture;
}

export async function loadSeedReceiptFixture(
  path: string,
  expectedMerchantAddress?: `0x${string}`,
): Promise<RecordedSeedPayment[]> {
  return parseSeedReceiptFixture(JSON.parse(await readFile(path, "utf8")) as unknown, expectedMerchantAddress);
}
