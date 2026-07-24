import { injectivePaymentMiddleware } from "@injectivelabs/x402/middleware";
import type { Express, Request } from "express";
import { hashObject } from "@agorasim/core";

import {
  ECO_CUP_AMOUNT,
  ECO_CUP_ROUTE,
  INJECTIVE_TESTNET_NETWORK,
  INJECTIVE_TESTNET_USDC,
} from "./x402-constants.js";

export interface X402ResourceConfig {
  facilitatorUrl: string;
  publicResourceBaseUrl: string;
  merchantAddress: `0x${string}`;
}

interface PaidRequest extends Request {
  x402?: { payer?: `0x${string}` };
}

export function registerX402Resource(app: Express, config: X402ResourceConfig): void {
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
      status: "PENDING_RECONCILIATION",
      disclaimer: "Test asset with no real value.",
    });
  });
}
