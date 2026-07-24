import type { SettleResponse, VerifyRequest } from "@injectivelabs/x402";
import { describe, expect, it, vi } from "vitest";

import { SettlementReplayGate, validateFacilitatorBoundary } from "./facilitator-app.js";
import {
  ECO_CUP_AMOUNT,
  INJECTIVE_TESTNET_NETWORK,
  INJECTIVE_TESTNET_USDC,
} from "./x402-constants.js";

const payer = "0x1111111111111111111111111111111111111111" as const;
const merchant = "0x2222222222222222222222222222222222222222" as const;

function request(network: string = INJECTIVE_TESTNET_NETWORK): VerifyRequest {
  const requirements = {
    scheme: "exact" as const,
    network,
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
        signature: `0x${"a".repeat(130)}`,
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

const success: SettleResponse = {
  success: true,
  transaction: `0x${"c".repeat(64)}`,
  network: INJECTIVE_TESTNET_NETWORK,
  payer,
};

describe("facilitator boundary and replay gate", () => {
  it("rejects mainnet before facilitator operations", () => {
    expect(() => validateFacilitatorBoundary(request("eip155:1776"), merchant)).toThrow("NETWORK_NOT_ALLOWED");
  });

  it("rejects a noncanonical amount or merchant before facilitator operations", () => {
    const wrongAmount = request();
    wrongAmount.paymentRequirements.amount = "300001";
    wrongAmount.paymentPayload.accepted.amount = "300001";
    wrongAmount.paymentPayload.payload.authorization.value = "300001";
    expect(() => validateFacilitatorBoundary(wrongAmount, merchant)).toThrow("AMOUNT_NOT_ALLOWED");

    expect(() => validateFacilitatorBoundary(request(), payer)).toThrow("PAYEE_NOT_ALLOWED");
  });

  it("coalesces concurrent settlement and caches only success", async () => {
    const gate = new SettlementReplayGate();
    const operation = vi.fn(async () => success);

    const [first, second] = await Promise.all([
      gate.settle(request(), operation),
      gate.settle(request(), operation),
    ]);
    const third = await gate.settle(request(), operation);

    expect(first).toBe(success);
    expect(second).toBe(success);
    expect(third).toBe(success);
    expect(operation).toHaveBeenCalledOnce();
  });

  it("does not cache a failed settlement", async () => {
    const gate = new SettlementReplayGate();
    const failed: SettleResponse = {
      success: false,
      transaction: "",
      network: INJECTIVE_TESTNET_NETWORK,
      payer,
      errorReason: "fixture_failure",
    };
    const operation = vi.fn(async () => failed);

    await gate.settle(request(), operation);
    await gate.settle(request(), operation);

    expect(operation).toHaveBeenCalledTimes(2);
  });
});
