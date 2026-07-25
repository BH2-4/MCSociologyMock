# AgoraSim

AgoraSim runs a paired synthetic-society experiment that tests whether a verified Injective x402 purchase receipt changes message credibility, propagation, and paid adoption. The P0 protocol uses 24 heterogeneous consumer Agents, one deterministic merchant, four communities, eight ticks, and one fixed 0.30 testnet-USDC offer.

**Research boundary:** this is a synthetic simulation, not a real-market forecast. A receipt proves purchase, amount, merchant, and time. It does not prove product quality, actual usage, review truth, or recommendation motive.

## Current status

The deterministic and LLM-driven Mock/recorded paths, Wallet Policy, x402 v2 contract, receipt verifier, PostgreSQL API, SSE event stream, Replay, navigable Live Evidence Lab, multi-mode Compare view, and desktop/mobile E2E are implemented. Verified seed receipt Fixtures are replayed into the paired Runner, including branch wallet addresses, tx hashes, Evidence and Blockscout links.

A local, ignored 300-wallet Injective testnet bundle was structurally and cryptographically verified. Chain audit on `eip155:1439` found all 300 wallets funded with 0.002 testnet INJ and five wallets funded with 1 testnet USDC. Four funded wallets are configured as branch-isolated seeds, a fifth as the facilitator, and a distinct sixth address as merchant; no secret is committed. All four seed payments are confirmed in `fixtures/testnet-seed-receipts.json`: every seed now holds 0.70 testnet USDC, the merchant received 1.20 testnet USDC, and all four bounded Evidence records validate. A testnet-backed paired run restored Evidence-blind `0` and Fixed-threshold `+4/22`. PostgreSQL migration/save/read/Replay has also been exercised against the Compose database. The Token Plan key is configured only in the ignored local environment. After two provider-level failures, a supplemental one-Agent validation identified and verified the MiniMax Tool Schema/completion-budget fix. The subsequent full 24-Agent online Run `pair-ccdd15dc5e91285c` completed with a legitimate negative effect of `-4/22`: Control adoption was `18.18%`, Treatment adoption was `0%`. No Prompt tuning followed. Both branches finished eight Ticks with zero final Schema failures, branch isolation passed, all four testnet Evidence records were present, Replay had zero side effects, and the export was redacted. Public audit reports are in `fixtures/online-mini-validation.json` and `fixtures/online-llm-run-audit.json`.

See [docs/DOD.md](./docs/DOD.md) for the PRD 16.2 evidence matrix.

## P1: ZZZ 3.1 Japan publishing lab

The pre-launch P1 case is available at `http://localhost:3000/p1` after `pnpm dev`. It is fixed to Japan, Zenless Zone Zero Ver.3.1, and Remiel (`レミエール`). The four workspaces are Market Fit, Audience Map, Strategy Lab, and Outcome & Calibration.

P1 loads the public Source Bundle R14-R17, freezes a version Snapshot, builds four historical Japan iOS analog cards, and runs two paired message-positioning branches over the same 24-agent population and keyed random field:

- `COMBAT_VALUE_FIRST` (Control)
- `CHARACTER_AFFINITY_FIRST` (Treatment)

P1 uses only a Synthetic Spend Ledger. Its normalized units are not yen, Polychromes, pulls, USDC, or revenue. The initial state is `AWAITING_POSTLAUNCH_OBSERVATION`; the UI does not fabricate the 2026-07-29, `T+24h`, or `T+72h` public observations. P1 API endpoints are:

```bash
curl -X POST http://localhost:4100/v1/experiments/zzz-3.1-jp/runs \
  -H 'Content-Type: application/json' \
  -d '{"protocolSeed":"zzz-jp-seed-01","agentCount":24}'

curl -X POST http://localhost:4100/v1/experiments/zzz-3.1-jp/replay \
  -H 'Content-Type: application/json' \
  -d '{"protocolSeed":"zzz-jp-seed-01","agentCount":24}'
```

The API runs the deterministic core on the server, and the web bundle imports only P1 types. Replay has zero network, LLM, and ledger-write side effects inside the recorded calculation. After the real version launch, append only public Japanese mobile ranking or official-interaction observations through the validated observation contract; never overwrite the Snapshot or preregistration.

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

The root `.env` is loaded by the Node entrypoints and is ignored by Git. `X402_MODE=mock` is the default development mode. The UI includes a deterministic recorded result so its read-only evidence chain remains inspectable if the API is stopped; an API failure is shown explicitly and never triggers another payment or storage fallback.

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

Set `PROGRAM_E_AI_BASE_URL`, `PROGRAM_E_AI_API_KEY`, and `PROGRAM_E_AI_MODEL` in `.env`, then submit a run with `decisionMode: "llm"`. For the MiniMax China Token Plan, use `https://api.minimaxi.com/v1`, a Token Plan subscription key, and `MiniMax-M2.7`. The subscription key is not interchangeable with a pay-as-you-go API key. The single adapter uses `POST /chat/completions`, enforces a strict JSON Schema locally, validates cited Claim/Evidence IDs against the observation, retries invalid output twice, then records `IDLE`. Each attempt records its request/explicit-response hash, separate Schema/reference result, failure code and Token usage; usage is aggregated across retries. Provider HTTP/network errors fail directly.

The Prompt never requests chain-of-thought. MiniMax documents that M2.x thinking cannot be disabled, so the adapter requests `reasoning_split` only to keep provider-generated reasoning outside the explicit action. MiniMax does not document native `response_format: json_schema` support, but does document `tools`, `tool_choice` and JSON-encoded `message.tool_calls[].function.arguments`; the Adapter therefore uses one forced action tool and `max_completion_tokens: 2048` for MiniMax. It parses and hashes only the function arguments. Provider `content`, `reasoning_content` and `reasoning_details` are immediately discarded, never hashed, persisted, exported, or shown. Only explicit decision summaries, visible references, reason codes and confidence enter the experiment record. A recorded response Fixture drives a complete paired integration test without paid calls.

Official configuration sources: [Token Plan: other tools](https://platform.minimaxi.com/docs/token-plan/other-tools) and [OpenAI SDK](https://platform.minimaxi.com/docs/api-reference/text-openai-api).

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

### Inputs required in a fresh checkout

The current local instance satisfies these inputs through ignored `0600` files; they are intentionally absent from GitHub. Every fresh checkout must provide its own:

- Provide one unique merchant address plus a dedicated facilitator private key and service token.
- Provide four independent seed-wallet private-key references; fund each resolved wallet with 0.35 Injective testnet USDC.
- Fund the facilitator wallet with Injective testnet INJ for Gas.

Keep all private keys and service tokens only in the ignored local `.env` or an equivalent secret store. Never paste them into issues, commits, prompts, logs, or the browser.

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

The repository Fixture contains these confirmed testnet transactions:

- [`0xbafe527a9daaf3bec84c2be4fffee113caaedfa52097e464082604f5ac51b211`](https://testnet.blockscout.injective.network/tx/0xbafe527a9daaf3bec84c2be4fffee113caaedfa52097e464082604f5ac51b211)
- [`0xf18a81c0fb7392133e34a21d8ead8fbaf6c0b59cf3b15cd7ff44bac0734248f2`](https://testnet.blockscout.injective.network/tx/0xf18a81c0fb7392133e34a21d8ead8fbaf6c0b59cf3b15cd7ff44bac0734248f2)
- [`0xfcb322d243e650fb9dd682775539e97ad3ea2452a329923954cf2778a7e2be1b`](https://testnet.blockscout.injective.network/tx/0xfcb322d243e650fb9dd682775539e97ad3ea2452a329923954cf2778a7e2be1b)
- [`0xf80c90265e1ae0a01a5bf9675e3d7f733eacd3e89db864dc61525d97d2c4844f`](https://testnet.blockscout.injective.network/tx/0xf80c90265e1ae0a01a5bf9675e3d7f733eacd3e89db864dc61525d97d2c4844f)

The first two transfers encountered the testnet RPC's missing single-hash receipt index. They were reconciled against the exact chain ID, transaction hash, USDC contract, payer, merchant, amount, block and `Transfer` log before their simulated ownership credentials were delivered. The Fixture labels recovered fulfillment and reconstructed timestamp provenance explicitly. No transaction was repeated.

After all four payments finish, restart the API. Testnet experiment creation is rejected with `TESTNET_SEED_RECEIPTS_NOT_READY` until the complete Fixture is loaded. Once loaded, paired runs consume the four recorded receipts and never sign or settle them again.

Official references:

- [x402](https://docs.injective.network/developers-ai/x402), Injective Docs, updated 2026-06-01.
- [EVM Network Information](https://docs.injective.network/developers-evm/network-information), Injective Docs, publication time not stated; retrieved 2026-07-25.
- [USDC on Injective](https://docs.injective.network/developers-defi/usdc-stablecoin), Injective Docs, publication time not stated; retrieved 2026-07-25.

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
