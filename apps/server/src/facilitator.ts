import "./env.js";

import { InjectiveFacilitator } from "@injectivelabs/x402/facilitator";

import { createFacilitatorApp } from "./facilitator-app.js";
import { INJECTIVE_TESTNET_USDC } from "./x402-constants.js";

const privateKey = requiredEnvironment("FACILITATOR_PRIVATE_KEY") as `0x${string}`;
const serviceToken = requiredEnvironment("FACILITATOR_SERVICE_TOKEN");
const allowedIps = requiredEnvironment("FACILITATOR_ALLOWED_IPS").split(",").map((value) => value.trim()).filter(Boolean);
const port = Number(process.env.FACILITATOR_PORT ?? 4020);
const facilitator = new InjectiveFacilitator({
  privateKey,
  rpcUrl: process.env.INJECTIVE_EVM_RPC_URL,
  confirmations: 1,
  allowedAssets: [INJECTIVE_TESTNET_USDC.toLowerCase()],
  minPaymentPerAsset: { [INJECTIVE_TESTNET_USDC.toLowerCase()]: "1000" },
});

createFacilitatorApp({ operations: facilitator, serviceToken, allowedIps }).listen(port, (error?: Error) => {
  if (error) throw error;
  console.log(`AgoraSim facilitator listening on port ${port}`);
});

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
