import { injectivePaymentMiddleware } from "@injectivelabs/x402/middleware";
import { decodePaymentSignatureHeader } from "@injectivelabs/x402/client";
import type { Express, Request as ExpressRequest } from "express";
import { hashObject } from "@agorasim/core";

import {
  ECO_CUP_AMOUNT,
  ECO_CUP_ROUTE,
  INJECTIVE_TESTNET_NETWORK,
  INJECTIVE_TESTNET_USDC,
} from "./x402-constants.js";
import { FulfillmentLedger } from "./payment-state.js";

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
  const fulfillmentLedger = new FulfillmentLedger(24);
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
    const paymentHeader = request.header("PAYMENT-SIGNATURE") ?? request.header("X-PAYMENT");
    if (!paymentHeader) {
      response.status(400).json({ error: "PAYMENT_SIGNATURE_REQUIRED" });
      return;
    }
    const authorization = decodePaymentSignatureHeader(paymentHeader).payload.authorization;
    const paymentId = `payment:${hashObject({
      network: INJECTIVE_TESTNET_NETWORK,
      asset: INJECTIVE_TESTNET_USDC.toLowerCase(),
      payer: authorization.from.toLowerCase(),
      nonce: authorization.nonce.toLowerCase(),
    })}`;
    let fulfillment;
    try {
      fulfillment = fulfillmentLedger.reserve(idempotencyKey, paymentId);
    } catch (error) {
      response.status(409).json({ error: error instanceof Error ? error.message : "FULFILLMENT_RESERVATION_FAILED" });
      return;
    }
    response.once("finish", () => finalizeFulfillmentFromHttpOutcome(
      fulfillmentLedger,
      idempotencyKey,
      response.statusCode,
      response.getHeader("PAYMENT-RESPONSE"),
    ));
    const body = JSON.stringify({
      offerId: "offer_eco_cup",
      fulfillmentId: fulfillment.fulfillmentId,
      status: "FULFILLED_ON_SETTLEMENT_RELEASE",
      disclaimer: "Test asset with no real value.",
    });
    response.status(200).type("application/json");
    // x402 0.0.1 only replays a valid status line after settlement when the
    // handler explicitly records writeHead before ending the buffered body.
    response.writeHead(200);
    response.end(body);
  });
}

export function finalizeFulfillmentFromHttpOutcome(
  ledger: FulfillmentLedger,
  idempotencyKey: string,
  statusCode: number,
  paymentResponseHeader: number | string | string[] | undefined,
): void {
  if (statusCode >= 200 && statusCode < 300 && successfulPaymentResponse(paymentResponseHeader)) {
    ledger.settled(idempotencyKey);
    ledger.fulfilled(idempotencyKey);
    return;
  }
  ledger.settlementFailed(idempotencyKey);
}

function successfulPaymentResponse(header: number | string | string[] | undefined): boolean {
  if (typeof header !== "string") return false;
  try {
    const parsed = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as { success?: unknown };
    return parsed.success === true;
  } catch {
    return false;
  }
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
