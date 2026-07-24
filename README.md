# AgoraSim

AgoraSim runs a paired synthetic-society experiment that tests whether a verified Injective x402 purchase receipt changes message credibility, propagation, and paid adoption. The P0 protocol uses 24 heterogeneous consumer Agents, one deterministic merchant, four communities, eight ticks, and one fixed 0.30 testnet-USDC offer.

**Research boundary:** this is a synthetic simulation, not a real-market forecast. A receipt proves purchase, amount, merchant, and time. It does not prove product quality, actual usage, review truth, or recommendation motive.

## Current status

The deterministic and LLM-driven Mock/recorded paths, Wallet Policy, x402 v2 contract, receipt verifier, PostgreSQL API, SSE event stream, Replay, navigable Live Evidence Lab, multi-mode Compare view, and desktop/mobile E2E are implemented. Verified seed receipt Fixtures are replayed into the paired Runner, including branch wallet addresses, tx hashes, Evidence and Blockscout links. Real Injective testnet settlement has not been executed because funded branch wallets, a facilitator Gas key, a merchant address, and service credentials are not configured. No transaction hash is claimed until `fixtures/testnet-seed-receipts.json` is created by the real payment command.

See [docs/DOD.md](./docs/DOD.md) for the PRD 16.2 evidence matrix.

## Requirements

- Node.js 20+
- pnpm 11.4+
- Docker with Compose for PostgreSQL 16
- Google Chrome for the local Playwright configuration

## Install and run Mock mode

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4100`
- Health: `http://localhost:4100/health`

The root `.env` is loaded by the Node entrypoints and is ignored by Git. `X402_MODE=mock` is the only development mode. The UI includes a deterministic recorded result so its read-only evidence chain remains inspectable if the API is stopped; an API failure is shown explicitly and never triggers another payment or storage fallback.

Create deterministic paired runs through the UI or API:

```bash
curl -X POST http://localhost:4100/v1/experiments/agorasim-p0/runs \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-seed-02:fixed-threshold' \
  -d '{"protocolSeed":"demo-seed-02","decisionMode":"fixed-threshold"}'
```

## Replay

```bash
pnpm replay:mock
curl -X POST http://localhost:4100/v1/pairs/PAIR_ID/replay
```

Replay recalculates metrics from recorded events. Its output records `llmCalls: 0`, `signatures: 0`, and `facilitatorCalls: 0`.

## OpenAI-compatible adapter

Set `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` in `.env`, then submit a run with `decisionMode: "llm"`. The single adapter uses `POST /chat/completions` with a strict JSON Schema, validates cited Claim/Evidence IDs against the observation, retries Schema failure twice, then records `IDLE`. Provider HTTP/network errors fail directly. The paired Runner records only explicit action summaries, visible references, model/request/response hashes, attempts and token usage; it never requests or stores hidden chain-of-thought. Online execution remains blocked until those three values are supplied; a recorded response Fixture drives a complete paired integration test without paid calls.

## Injective testnet mode

Only Injective EVM Testnet `eip155:1439` is accepted. The fixed asset is USDC at `0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d`; the offer amount is `300000` base units. `@injectivelabs/x402` is locked to `0.0.1`.

Prepare `.env` with:

- `MERCHANT_AGENT_ADDRESS`: unique merchant EOA.
- `FACILITATOR_PRIVATE_KEY`: Gas EOA with testnet INJ.
- `FACILITATOR_SERVICE_TOKEN`: random service credential shared only by Resource Server and facilitator.
- `FACILITATOR_ALLOWED_IPS`: Resource Server source IPs.
- Four `*_KEY_REF=env:...` references and their four unique private-key environment values.
- `X402_MODE=testnet`, `X402_FACILITATOR_URL`, and `PUBLIC_RESOURCE_BASE_URL`.

Fund each of the four seed branch wallets with at least 0.30 testnet USDC; 0.35 is recommended. Fund the facilitator with enough testnet INJ for four settlements. Do not use mainnet or assets with real value.

Start the independent services:

```bash
pnpm build
pnpm dev:facilitator
X402_MODE=testnet pnpm --filter @agorasim/server dev
pnpm --filter @agorasim/web dev
```

Execute the four required seed payments once:

```bash
pnpm seed:testnet
```

The command enforces Wallet Policy before `createPayment`, validates the confirmed USDC `Transfer` log with viem, creates bounded Evidence, and writes each completed payment immediately to `fixtures/testnet-seed-receipts.json`. Existing `(branch, logicalAgentId)` entries are strictly validated and skipped so reruns do not intentionally pay twice.

After all four payments finish, restart the API. Testnet experiment creation is rejected with `TESTNET_SEED_RECEIPTS_NOT_READY` until the complete Fixture is loaded. Once loaded, paired runs consume the four recorded receipts and never sign or settle them again.

## Verification

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

If port 3000 is already occupied, use a free test-server port, for example `PLAYWRIGHT_PORT=3010 pnpm test:e2e`.

Focused coverage includes keyed randomness, branch diffs, paired baselines, balance/supply conservation, Replay, Wallet Policy, x402 v2 headers, settlement/fulfillment failure injection, refund revocation, facilitator nonce locking, receipt reconciliation, export redaction, and one Playwright journey at desktop and mobile viewports.

## Deployment

Deploy `apps/web` and `apps/server` as separate Node.js 20+ processes, deploy `apps/server/dist/facilitator.js` as a private service, and use one PostgreSQL database. Expose only Web/API publicly; restrict facilitator `/verify` and `/settle` by network source and Bearer service identity. Set the API's `NEXT_PUBLIC_API_URL` at Web build time. Do not expose `.env`, payer keys, facilitator keys, signatures, database files, or logs.

There is no SQLite, in-memory runtime, RPC failover, second LLM SDK, local-model fallback, or mainnet mode.
