import type { PaymentPayload, PaymentRequired } from "@injectivelabs/x402";
import { describe, expect, it, vi } from "vitest";

import { executeX402Payment } from "./payment-adapter.js";
import { FixedWalletPolicy, type PaymentIntent } from "./wallet-policy.js";
import {
  ECO_CUP_AMOUNT,
  ECO_CUP_SERVICE_ID,
  INJECTIVE_TESTNET_NETWORK,
  INJECTIVE_TESTNET_USDC,
} from "./x402-constants.js";

const merchant = "0x1111111111111111111111111111111111111111" as const;
const payer = "0x2222222222222222222222222222222222222222" as const;
const transaction = `0x${"a".repeat(64)}` as const;
const url = "http://localhost:4100/x402/offers/eco-cup";

const requirement = {
  scheme: "exact",
  network: INJECTIVE_TESTNET_NETWORK,
  asset: INJECTIVE_TESTNET_USDC,
  amount: ECO_CUP_AMOUNT,
  payTo: merchant,
  maxTimeoutSeconds: 60,
  extra: { version: "2", assetTransferMethod: "eip3009" },
} as const;

const challenge: PaymentRequired = {
  x402Version: 2,
  resource: { url, serviceName: ECO_CUP_SERVICE_ID },
  accepts: [requirement],
};

const intent: PaymentIntent = {
  serviceId: ECO_CUP_SERVICE_ID,
  url,
  expectedPayTo: merchant,
  maxAmount: ECO_CUP_AMOUNT,
  tickSpent: "0",
  tickLimit: ECO_CUP_AMOUNT,
  experimentSpent: "0",
  experimentLimit: "1200000",
};

const payload: PaymentPayload = {
  x402Version: 2,
  resource: challenge.resource,
  accepted: requirement,
  payload: {
    signature: `0x${"b".repeat(130)}`,
    authorization: {
      from: payer,
      to: merchant,
      value: ECO_CUP_AMOUNT,
      validAfter: "0",
      validBefore: "9999999999",
      nonce: `0x${"c".repeat(64)}`,
    },
  },
};

function encoded(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

describe("x402 payment protocol adapter", () => {
  it("uses only the v2 PAYMENT headers and signs after policy approval", async () => {
    const fetchFixture = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(challenge), {
        status: 402,
        headers: { "PAYMENT-REQUIRED": encoded(challenge) },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ fulfillmentId: "fulfillment-01" }), {
        status: 200,
        headers: {
          "PAYMENT-RESPONSE": encoded({ success: true, transaction, network: INJECTIVE_TESTNET_NETWORK, payer }),
        },
      }));
    const signer = vi.fn(async () => payload);

    const result = await executeX402Payment({
      intent,
      policy: new FixedWalletPolicy(),
      signApprovedRequirement: signer,
      fetchImplementation: fetchFixture,
    });

    expect(signer).toHaveBeenCalledOnce();
    expect(signer).toHaveBeenCalledWith(requirement);
    const paidHeaders = new Headers(fetchFixture.mock.calls[1]?.[1]?.headers);
    expect(paidHeaders.has("PAYMENT-SIGNATURE")).toBe(true);
    expect(paidHeaders.has("X-PAYMENT")).toBe(false);
    expect(result.receipt).toEqual({ success: true, transaction, network: INJECTIVE_TESTNET_NETWORK, payer });
    expect(result.signatureHash).toHaveLength(64);
  });

  it("never invokes the signer when policy rejects the challenge", async () => {
    const invalid = { ...challenge, accepts: [{ ...requirement, network: "eip155:1776" }] };
    const fetchFixture = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(invalid), {
      status: 402,
      headers: { "PAYMENT-REQUIRED": encoded(invalid) },
    }));
    const signer = vi.fn(async () => payload);

    await expect(executeX402Payment({
      intent,
      policy: new FixedWalletPolicy(),
      signApprovedRequirement: signer,
      fetchImplementation: fetchFixture,
    })).rejects.toThrow("NETWORK_NOT_ALLOWED");
    expect(signer).not.toHaveBeenCalled();
  });
});
