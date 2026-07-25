import {
  encodePaymentSignatureHeader,
  parsePaymentRequired,
  parsePaymentResponseHeader,
} from "@injectivelabs/x402/client";
import type { PaymentPayload, PaymentRequirements } from "@injectivelabs/x402";
import { hashObject } from "@gesellschaft/core";

import type { FixedWalletPolicy, PaymentIntent } from "./wallet-policy.js";

export interface PaymentExecution {
  response: Response;
  receipt: NonNullable<ReturnType<typeof parsePaymentResponseHeader>>;
  approvedRequirement: PaymentRequirements;
  signatureHash: string;
}

export interface ExecutePaymentOptions {
  intent: PaymentIntent;
  policy: FixedWalletPolicy;
  signApprovedRequirement: (requirement: PaymentRequirements) => Promise<PaymentPayload>;
  fetchImplementation?: typeof fetch;
}

export async function executeX402Payment(options: ExecutePaymentOptions): Promise<PaymentExecution> {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  const initial = await fetchImplementation(options.intent.url, { method: "POST" });
  if (initial.status !== 402) throw new Error(`Expected x402 challenge, received ${initial.status}`);
  const requiredHeader = initial.headers.get("PAYMENT-REQUIRED");
  if (!requiredHeader) throw new Error("Missing PAYMENT-REQUIRED header");
  const challenge = parsePaymentRequired(requiredHeader);
  const approvedRequirement = options.policy.approve(options.intent, challenge);

  // This is the first point at which signing is allowed.
  const payload = await options.signApprovedRequirement(approvedRequirement);
  const signatureHeader = encodePaymentSignatureHeader(payload);
  const response = await fetchImplementation(options.intent.url, {
    method: "POST",
    headers: { "PAYMENT-SIGNATURE": signatureHeader },
  });
  if (!response.ok) throw new Error(`x402 paid request failed with ${response.status}`);
  const receipt = parsePaymentResponseHeader(response);
  if (!receipt?.success) throw new Error("Missing successful PAYMENT-RESPONSE receipt");
  return {
    response,
    receipt,
    approvedRequirement,
    signatureHash: hashObject(signatureHeader),
  };
}
