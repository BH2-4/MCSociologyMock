# P0 Definition of Done Evidence

Status date: 2026-07-25. `PASS` means reproducible code/test or inspected UI evidence exists. `BLOCKED` means the requirement needs external credentials, assets, or a runtime that was unavailable; it is not treated as complete.

| PRD 16.2 requirement | Status | Evidence |
|---|---|---|
| 24 heterogeneous consumers, one deterministic merchant, eight ticks | PASS | `packages/core/src/population.ts`, `runner.ts`; `runner.test.ts` |
| Preregistration card and immutable `protocol_hash` | PASS | `packages/core/src/protocol.ts`; canonical hash tests |
| Two branch wallets per logical consumer, equal balances, isolated addresses/nonces | PASS | four distinct ignored local keys are mapped to branch-specific key refs; each moved from 1.00 to 0.70 testnet USDC after one unique payment |
| `branch_diff_report` permits only operations and `receipt_visibility` | PASS | `protocol.test.ts` rejects a hidden price difference |
| Two corresponding seeds buy the same product in both branches through real x402 | PASS | four strict testnet proofs are replayed into branch wallets/events/Evidence; every branch/seed pair has a unique payer and tx |
| Seed Claim author/body/Tick/channel/audience/content hash parity | PASS | paired runner Claim parity validation and test |
| Control hides Evidence; Treatment adds only bounded summary | PASS | leakage/omission validation, UI branch toggle, runner tests |
| `INSPECT_EVIDENCE`, `CHAT`, `POST`, `BUY`, `IDLE` legal events | PASS | fixed-threshold test and UI action coverage |
| Real `PAYMENT-REQUIRED` -> policy -> `PAYMENT-SIGNATURE` -> `PAYMENT-RESPONSE` | PASS | live `exact`/EIP-3009 flow completed through the pinned SDK; the final two paid HTTP requests returned valid receipts and resource JSON |
| Four confirmed seed A2A testnet USDC payments with Blockscout links | PASS | `fixtures/testnet-seed-receipts.json`; txs `0xbafe...b211`, `0xf18a...48f2`, `0xfcb3...be1b`, `0xf80c...844f` |
| Non-seed Mock threshold path reaches BUY -> SETTLED -> FULFILLED -> VERIFIED_PURCHASE | PASS | paired threshold run adopts four non-seeds in recorded demo; event-chain test/UI |
| Fulfilled purchases create bounded Evidence and Blockscout links | PASS | all four Fixture entries revalidate receipt/payer/product/merchant/amount/timeline and expose bounded Blockscout links |
| Wallet Policy rejects over-budget/invalid requirement before signing | PASS | six Wallet Policy tests plus signer-not-called contract test |
| Non-testnet network and noncanonical USDC rejected before chain | PASS | Wallet Policy and facilitator boundary tests |
| Forced settlement failure returns no paid response and releases inventory | PASS | official `after-success` middleware contract plus route-wired `FulfillmentLedger`; failure and replay tests |
| Post-settlement fulfillment failure refunds then revokes Evidence | PASS (failure injection) | refund state and compensating receipt verifier tests; no extra real refund is sent |
| Evidence-blind difference is exactly zero; threshold direction restored | PASS | testnet-backed `testnet-seed-01`: `pair-fd5d7a07f7f8b65c` = 0; `pair-cdb31bee52562e1f` = +4/22 |
| Live Lab shows Claim -> Evidence -> exposure -> judgment -> propagation -> purchase | PASS | event lineage inspector navigates direct parents/children; live UI verified Injective testnet mode, four receipts and a Blockscout link |
| Compare shows paired difference, funnel, baselines and failure checks | PASS | live `ui-testnet-01` row plus per-Seed LLM/Evidence-blind/Fixed-threshold rows; desktop/mobile E2E |
| Replay calls no LLM, signer, or facilitator and rebuilds results | PASS | testnet-backed Replay event hash `f11fc...1fb`; side effects are `llmCalls=0`, `signatures=0`, `facilitatorCalls=0` |
| Export includes protocol/config/events/metrics/payment index but no secrets/thought chain | PASS | `export.ts` and redaction test |
| Critical automated tests and one end-to-end Demo test | PASS | workspace typecheck/build, 61 core/server tests, and the Playwright main flow on desktop/mobile pass |

## Remaining external input and environment notes

1. PostgreSQL 16 was pulled through the AWS Public ECR Docker Official Images mirror after Docker Hub returned `EOF`. The Compose database is healthy; migration, transactional save, pair/event read and Replay were verified through the running API with `pair-82471cbb2adaa2a0`. No database fallback was added.
2. The MiniMax Token Plan Base URL, `MiniMax-M2.7` model and a rotated subscription key are configured only in the ignored local environment. Client concurrency remained one and the Runner completed Control before Treatment. Two initial full attempts failed directly on provider HTTP `529` and a later transport failure; neither persisted a partial pair. A one-Agent diagnostic exposed repeated 500-token truncation, after which the Adapter was aligned with MiniMax's documented tool-call response and `max_completion_tokens`. The final diagnostic passed, followed by the complete online Pair `pair-ccdd15dc5e91285c`: 24 Agents, eight Ticks, zero final Schema failures, Claim parity, zero Control Evidence leakage, zero Treatment omission, isolated wallets, payment parity and both conservation checks. Its unmodified result was negative (`-4/22`): Control `18.18%`, Treatment `0%`. Replay event hash `3dcfab7a...e21` rebuilt the result with zero LLM/signature/facilitator calls. Redacted evidence is in `fixtures/online-mini-validation.json` and `fixtures/online-llm-run-audit.json`.
3. A 300-wallet local CSV was validated without exposing secrets: 300 unique registered wallets, zero private-key/mnemonic/address mismatches, and the initial audit found 0.002 testnet INJ on all wallets plus 1 testnet USDC on five wallets. Four seed keys, a distinct facilitator key/service token and a distinct merchant address are configured only in the ignored `0600` `.env`; settlement changed only the expected seed, merchant and facilitator balances.
4. Four real payments are complete. The RPC returned canonical blocks/logs but omitted single-hash receipt indexing for the first two transactions; the recovery path required exact chain ID, tx, payer, merchant, asset, amount, block and EIP-3009 calldata before atomically delivering the digital entitlement. No payment was repeated.

## P1 Definition of Done Evidence

Status date: 2026-07-25. P1 is implemented through the pre-launch waiting state; no post-launch public data is claimed before the real release window.

| PRD 16.3 requirement | Status | Evidence |
|---|---|---|
| Four-workspace P1 workflow | PASS | `apps/web/app/p1/page.tsx`, `publishing-console.tsx`; Market Fit, Audience Map, Strategy Lab and Outcome & Calibration are reachable from the P1 navigation. |
| R14-R17 Public Source Bundle with hashes and provenance | PASS | `packages/core/src/publishing-data.ts`, `publishing-data.test.ts`; source tier, timestamps, platform scope, methodology, license status and content hashes are checked. |
| Immutable 3.1 Japan Snapshot | PASS | `createPublishingSnapshot()` locks version, market, Remiel, release, cutoff, bundle hash, confounders and waiting status; nested arrays are frozen. |
| Market Fit platform and revenue boundary | PASS | `MARKET_FIT_SNAPSHOT` distinguishes Japan mobile proxies from PlayStation/PC gaps and rejects all-platform revenue claims. |
| Four historical analog cards | PASS | Game-i ordinal windows for Miyabi, Astra, Yixuan and Yuzuha with non-comparable factors and rough-estimate labels. |
| Audience Map provenance | PASS | `createPublishingPopulation()` emits six Japan-internal segments, platform/activity/affinity/budget states and field-level provenance. |
| Preregistered single treatment | PASS | `lockPublishingProtocol()` hashes the prompt, 72-hour window, primary metric, alternatives and failure criteria. |
| Localization Gate and branch diff | PASS | `validateLocalizationGate()` and `validatePublishingBranchDiff()` reject fact, material, exposure, population or network changes; tampering test passes. |
| 24-agent paired Seed and required actions | PASS | `runPublishingPair("zzz-jp-seed-01")` completes eight ticks; action coverage includes all ten P1 action types. |
| Synthetic Spend Ledger | PASS | Ledger separates opening currency, normalized free reward, planned pull, simulated top-up and zero other-banner spend; conservation test passes. |
| Publishing Report | PASS | `createPublishingReport()` emits paired difference, funnel, segment effects, checks, bounded recommendation and limitations. |
| Pre-launch waiting state | PASS | Snapshot, pair result, report and UI remain `AWAITING_POSTLAUNCH_OBSERVATION` with an empty observation list. |
| Post-launch observation gate | PASS (pre-launch implementation) | Core rejects early/future observations; `PublishingRunRegistry` appends immutable hashed records; protected POST and public GET report routes are wired; the pre-launch UI keeps submission disabled. No real post-launch value is claimed. |
| Disclaimer and attribution boundary | PASS | UI footer, report disclaimer and README state that synthetic units and mobile proxies do not represent Japan all-platform or single-character revenue. |
| Replay and export path | PASS | P1 Replay reads the completed pair recorded in the current API session, returns identical metrics with zero network/LLM/ledger side effects, and the UI exports durable report/result JSON. |
| OpenAI-compatible P1 decision path | PASS | `runPublishingPairWithDecisionAdapter` runs Control then Treatment serially; the shared Adapter validates/retries action and visible references, records request/response hashes and attempt usage, requires a separate run token, permits one active pair, and bounds Replay memory. |
| Automated verification | PASS (pre-launch) | 27 core tests, 55 server tests, Web typecheck, Next production build, and four P0/P1 Playwright journeys across desktop/mobile pass on a clean test port. |

### P1 remaining gate

The P1 implementation cannot be marked fully complete until the actual Version 3.1 release has occurred and the real public observations at `T_release`, `T+24h`, and `T+72h` have been collected and independently reviewed. No fixture or synthetic value satisfies that gate.
