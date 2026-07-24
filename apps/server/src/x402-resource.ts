import { injectivePaymentMiddleware } from "@injectivelabs/x402/middleware";
import type { Express, Request as ExpressRequest } from "express";
import { hashObject } from "@agorasim/core";

import {
  ECO_CUP_AMOUNT,
  ECO_CUP_ROUTE,
  INJECTIVE_TESTNET_NETWORK,
  INJECTIVE_TESTNET_USDC,
} from "./x402-constants.js";

export interface X402ResourceConfig {
  facilitatorUrl: string;
  facilitatorServiceToken: string;
  publicResourceBaseUrl: string;
  merchantAddress: `0x${string}`;
}

interface PaidRequest extends ExpressRequest {
  x402?: { payer?: `0x${string}` };
}

export function registerX402Resource(app: Express, config: X402ResourceConfig): void {
  installFacilitatorAuthentication(config.facilitatorUrl, config.facilitatorServiceToken);
  app.use(injectivePaymentMiddleware({
    [`POST ${ECO_CUP_ROUTE}`]: {
      description: "Purchase one simulated Eco Cup",
      mimeType: "application/json",
      accepts: [{
        network: INJECTIVE_TESTNET_NETWORK,
        asset: INJECTIVE_TESTNET_USDC,
        amount: ECO_CUP_AMOUNT,
        payTo: config.merchantAddress,
        maxTimeoutSeconds: 60,
      }],
    },
  }, {
    facilitatorUrl: config.facilitatorUrl,
    baseUrl: config.publicResourceBaseUrl,
    settlementPolicy: "after-success",
  }));

  app.post(ECO_CUP_ROUTE, (request: PaidRequest, response) => {
    const idempotencyKey = request.header("Idempotency-Key");
    if (!idempotencyKey) {
      response.status(400).json({ error: "IDEMPOTENCY_KEY_REQUIRED" });
      return;
    }
    response.status(200).json({
      offerId: "offer_eco_cup",
      fulfillmentId: `fulfillment:${hashObject({ idempotencyKey, payer: request.x402?.payer }).slice(0, 20)}`,
      status: "FULFILLED_ON_SETTLEMENT_RELEASE",
      disclaimer: "Test asset with no real value.",
    });
  });
}

let authenticatedFacilitator: { baseUrl: string; token: string } | null = null;
let nativeFetch: typeof fetch | null = null;

function installFacilitatorAuthentication(baseUrl: string, token: string): void {
  if (!token) throw new Error("Facilitator service token is required in testnet mode");
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
  if (authenticatedFacilitator) {
    if (authenticatedFacilitator.baseUrl !== normalizedBaseUrl || authenticatedFacilitator.token !== token) {
      throw new Error("Only one authenticated facilitator may be configured per resource process");
    }
    return;
  }
  nativeFetch = globalThis.fetch.bind(globalThis);
  authenticatedFacilitator = { baseUrl: normalizedBaseUrl, token };
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const isFacilitatorCall = url === `${normalizedBaseUrl}/verify` || url === `${normalizedBaseUrl}/settle`;
    if (!isFacilitatorCall) return nativeFetch!(input, init);
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return nativeFetch!(input, { ...init, headers });
  };
}
