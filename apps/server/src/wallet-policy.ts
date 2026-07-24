import type { PaymentRequired, PaymentRequirements } from "@injectivelabs/x402";

import {
  ECO_CUP_AMOUNT,
  ECO_CUP_SERVICE_ID,
  INJECTIVE_TESTNET_NETWORK,
  INJECTIVE_TESTNET_USDC,
} from "./x402-constants.js";

export type WalletPolicyRejectionCode =
  | "INVALID_X402_VERSION"
  | "RESOURCE_MISMATCH"
  | "SERVICE_MISMATCH"
  | "NETWORK_NOT_ALLOWED"
  | "ASSET_NOT_ALLOWED"
  | "PAYEE_MISMATCH"
  | "AMOUNT_MISMATCH"
  | "TIMEOUT_TOO_LONG"
  | "SINGLE_PAYMENT_LIMIT"
  | "TICK_BUDGET_EXCEEDED"
  | "EXPERIMENT_BUDGET_EXCEEDED"
  | "NO_ACCEPTABLE_REQUIREMENT";

export class WalletPolicyRejection extends Error {
  constructor(readonly code: WalletPolicyRejectionCode) {
    super(code);
    this.name = "WalletPolicyRejection";
  }
}

export interface PaymentIntent {
  serviceId: typeof ECO_CUP_SERVICE_ID;
  url: string;
  expectedPayTo: `0x${string}`;
  maxAmount: string;
  tickSpent: string;
  tickLimit: string;
  experimentSpent: string;
  experimentLimit: string;
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function assertBudget(amount: bigint, intent: PaymentIntent): void {
  if (amount > BigInt(intent.maxAmount)) throw new WalletPolicyRejection("SINGLE_PAYMENT_LIMIT");
  if (BigInt(intent.tickSpent) + amount > BigInt(intent.tickLimit)) {
    throw new WalletPolicyRejection("TICK_BUDGET_EXCEEDED");
  }
  if (BigInt(intent.experimentSpent) + amount > BigInt(intent.experimentLimit)) {
    throw new WalletPolicyRejection("EXPERIMENT_BUDGET_EXCEEDED");
  }
}

function validateRequirement(intent: PaymentIntent, requirement: PaymentRequirements): WalletPolicyRejectionCode | null {
  if (requirement.scheme !== "exact" || requirement.network !== INJECTIVE_TESTNET_NETWORK) return "NETWORK_NOT_ALLOWED";
  if (!sameAddress(requirement.asset, INJECTIVE_TESTNET_USDC)) return "ASSET_NOT_ALLOWED";
  if (!sameAddress(requirement.payTo, intent.expectedPayTo)) return "PAYEE_MISMATCH";
  if (requirement.amount !== ECO_CUP_AMOUNT) return "AMOUNT_MISMATCH";
  if (requirement.maxTimeoutSeconds <= 0 || requirement.maxTimeoutSeconds > 60) return "TIMEOUT_TOO_LONG";
  try {
    assertBudget(BigInt(requirement.amount), intent);
  } catch (error) {
    if (error instanceof WalletPolicyRejection) return error.code;
    throw error;
  }
  return null;
}

export class FixedWalletPolicy {
  approve(intent: PaymentIntent, challenge: PaymentRequired): PaymentRequirements {
    if (challenge.x402Version !== 2) throw new WalletPolicyRejection("INVALID_X402_VERSION");
    if (challenge.resource.url !== intent.url) throw new WalletPolicyRejection("RESOURCE_MISMATCH");
    if (challenge.resource.serviceName && challenge.resource.serviceName !== intent.serviceId) {
      throw new WalletPolicyRejection("SERVICE_MISMATCH");
    }
    let firstRejection: WalletPolicyRejectionCode | null = null;
    for (const requirement of challenge.accepts) {
      const rejection = validateRequirement(intent, requirement);
      if (!rejection) return requirement;
      firstRejection ??= rejection;
    }
    throw new WalletPolicyRejection(firstRejection ?? "NO_ACCEPTABLE_REQUIREMENT");
  }
}
