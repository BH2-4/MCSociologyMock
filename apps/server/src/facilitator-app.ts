import type { SettleResponse, VerifyRequest, VerifyResponse } from "@injectivelabs/x402";
import { normalizeFacilitatorRequest } from "@injectivelabs/x402/protocol";
import express from "express";

import { INJECTIVE_TESTNET_NETWORK, INJECTIVE_TESTNET_USDC } from "./x402-constants.js";

export interface FacilitatorOperations {
  verify(request: VerifyRequest): Promise<VerifyResponse>;
  settle(request: VerifyRequest): Promise<SettleResponse>;
}

export interface FacilitatorAppConfig {
  operations: FacilitatorOperations;
  serviceToken: string;
  allowedIps: string[];
}

function normalizedIp(value: string | undefined): string {
  return (value ?? "").replace(/^::ffff:/, "");
}

function replayKey(request: VerifyRequest): string {
  const authorization = request.paymentPayload.payload.authorization;
  return [
    request.paymentRequirements.network,
    request.paymentRequirements.asset.toLowerCase(),
    authorization.from.toLowerCase(),
    authorization.nonce.toLowerCase(),
  ].join(":");
}

export function validateFacilitatorBoundary(request: VerifyRequest): void {
  const requirement = request.paymentRequirements;
  if (requirement.scheme !== "exact") throw new Error("SCHEME_NOT_ALLOWED");
  if (requirement.network !== INJECTIVE_TESTNET_NETWORK) throw new Error("NETWORK_NOT_ALLOWED");
  if (requirement.asset.toLowerCase() !== INJECTIVE_TESTNET_USDC.toLowerCase()) throw new Error("ASSET_NOT_ALLOWED");
}

export class SettlementReplayGate {
  readonly #settled = new Map<string, SettleResponse>();
  readonly #settling = new Map<string, Promise<SettleResponse>>();

  async settle(request: VerifyRequest, operation: () => Promise<SettleResponse>): Promise<SettleResponse> {
    const key = replayKey(request);
    const cached = this.#settled.get(key);
    if (cached) return cached;
    let pending = this.#settling.get(key);
    if (!pending) {
      pending = operation();
      this.#settling.set(key, pending);
    }
    try {
      const result = await pending;
      if (result.success) this.#settled.set(key, result);
      return result;
    } finally {
      this.#settling.delete(key);
    }
  }
}

export function createFacilitatorApp(config: FacilitatorAppConfig) {
  if (!config.serviceToken) throw new Error("Facilitator service token is required");
  if (config.allowedIps.length === 0) throw new Error("At least one facilitator source IP is required");
  const app = express();
  const replayGate = new SettlementReplayGate();
  const allowedIps = new Set(config.allowedIps.map(normalizedIp));
  app.use(express.json({ limit: "32kb" }));
  app.use((request, response, next) => {
    const sourceIp = normalizedIp(request.ip ?? request.socket.remoteAddress);
    if (!allowedIps.has(sourceIp)) {
      response.status(403).json({ error: "SOURCE_NOT_ALLOWED" });
      return;
    }
    if (request.header("Authorization") !== `Bearer ${config.serviceToken}`) {
      response.status(401).json({ error: "SERVICE_AUTH_REQUIRED" });
      return;
    }
    next();
  });

  app.post("/verify", async (request, response) => {
    try {
      const normalized = normalizeFacilitatorRequest(request.body);
      validateFacilitatorBoundary(normalized.inner);
      response.json(await config.operations.verify(normalized.inner));
    } catch {
      response.status(400).json({ error: "INVALID_X402_REQUEST" });
    }
  });

  app.post("/settle", async (request, response) => {
    try {
      const normalized = normalizeFacilitatorRequest(request.body);
      validateFacilitatorBoundary(normalized.inner);
      const result = await replayGate.settle(normalized.inner, () => config.operations.settle(normalized.inner));
      response.json(result);
    } catch {
      response.status(400).json({ error: "INVALID_X402_REQUEST" });
    }
  });

  return app;
}
