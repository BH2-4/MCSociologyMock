import type { PaymentRequired } from "@injectivelabs/x402";
import { describe, expect, it } from "vitest";

import { FixedWalletPolicy, type PaymentIntent, WalletPolicyRejection } from "./wallet-policy.js";
import {
  ECO_CUP_AMOUNT,
  ECO_CUP_SERVICE_ID,
  INJECTIVE_TESTNET_NETWORK,
  INJECTIVE_TESTNET_USDC,
} from "./x402-constants.js";

const merchant = "0x1111111111111111111111111111111111111111" as const;
const url = "http://localhost:4100/x402/offers/eco-cup";

const intent: PaymentIntent = {
  serviceId: ECO_CUP_SERVICE_ID,
  url,
  expectedPayTo: merchant,
  maxAmount: ECO_CUP_AMOUNT,
  tickSpent: "0",
  tickLimit: "300000",
  experimentSpent: "0",
  experimentLimit: "1200000",
};

function challenge(overrides: Partial<PaymentRequired["accepts"][number]> = {}): PaymentRequired {
  return {
    x402Version: 2,
    resource: { url, serviceName: ECO_CUP_SERVICE_ID },
    accepts: [{
      scheme: "exact",
      network: INJECTIVE_TESTNET_NETWORK,
      asset: INJECTIVE_TESTNET_USDC,
      amount: ECO_CUP_AMOUNT,
      payTo: merchant,
      maxTimeoutSeconds: 60,
      extra: { version: "2", assetTransferMethod: "eip3009" },
      ...overrides,
    }],
  };
}

describe("Wallet Policy", () => {
  const policy = new FixedWalletPolicy();

  it("approves only the fixed testnet offer", () => {
    expect(policy.approve(intent, challenge())).toMatchObject({
      network: INJECTIVE_TESTNET_NETWORK,
      asset: INJECTIVE_TESTNET_USDC,
      amount: ECO_CUP_AMOUNT,
      payTo: merchant,
    });
  });

  it.each([
    ["NETWORK_NOT_ALLOWED", { network: "eip155:1776" }],
    ["ASSET_NOT_ALLOWED", { asset: "0x2222222222222222222222222222222222222222" }],
    ["PAYEE_MISMATCH", { payTo: "0x3333333333333333333333333333333333333333" }],
    ["AMOUNT_MISMATCH", { amount: "300001" }],
  ] as const)("rejects %s before signing", (code, overrides) => {
    expect(() => policy.approve(intent, challenge(overrides))).toThrowError(
      expect.objectContaining<Partial<WalletPolicyRejection>>({ code }),
    );
  });

  it("rejects a request over the experiment budget", () => {
    const overBudget = { ...intent, experimentSpent: "1000000", experimentLimit: "1200000" };
    expect(() => policy.approve(overBudget, challenge())).toThrowError(
      expect.objectContaining<Partial<WalletPolicyRejection>>({ code: "EXPERIMENT_BUDGET_EXCEEDED" }),
    );
  });
});
