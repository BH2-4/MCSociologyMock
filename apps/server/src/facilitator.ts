import "./env.js";

import { InjectiveFacilitator } from "@injectivelabs/x402/facilitator";
import { injectiveEvmTestnet } from "@injectivelabs/x402/networks";
import { createPublicClient, http } from "viem";

import { createFacilitatorApp } from "./facilitator-app.js";
import { settleWithReceiptReconciliation } from "./settlement-recovery.js";
import { INJECTIVE_TESTNET_CHAIN_ID, INJECTIVE_TESTNET_USDC } from "./x402-constants.js";

const privateKey = requiredEnvironment("FACILITATOR_PRIVATE_KEY") as `0x${string}`;
const serviceToken = requiredEnvironment("FACILITATOR_SERVICE_TOKEN");
const merchantAddress = requiredEnvironment("MERCHANT_AGENT_ADDRESS") as `0x${string}`;
const allowedIps = requiredEnvironment("FACILITATOR_ALLOWED_IPS").split(",").map((value) => value.trim()).filter(Boolean);
const port = Number(process.env.FACILITATOR_PORT ?? 4020);
const rpcUrl = process.env.INJECTIVE_EVM_RPC_URL;
const facilitator = new InjectiveFacilitator({
  privateKey,
  rpcUrl,
  confirmations: 1,
  allowedAssets: [INJECTIVE_TESTNET_USDC.toLowerCase()],
  minPaymentPerAsset: { [INJECTIVE_TESTNET_USDC.toLowerCase()]: "1000" },
});
const publicClient = createPublicClient({ chain: injectiveEvmTestnet, transport: http(rpcUrl) });
if (await publicClient.getChainId() !== INJECTIVE_TESTNET_CHAIN_ID) {
  throw new Error(`Injective testnet RPC must report chain ID ${INJECTIVE_TESTNET_CHAIN_ID}`);
}
const operations = {
  verify: facilitator.verify.bind(facilitator),
  settle: (request: Parameters<typeof facilitator.settle>[0]) =>
    settleWithReceiptReconciliation(facilitator, publicClient, request),
};

createFacilitatorApp({ operations, serviceToken, allowedIps, merchantAddress }).listen(port, (error?: Error) => {
  if (error) throw error;
  console.log(`Gesellschaft facilitator listening on port ${port}`);
});

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
