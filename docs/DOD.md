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
| Critical automated tests and one end-to-end Demo test | PASS | workspace typecheck/build, 58 core/server tests, and the Playwright main flow on desktop/mobile pass |

## Remaining external input and environment notes

1. PostgreSQL 16 was pulled through the AWS Public ECR Docker Official Images mirror after Docker Hub returned `EOF`. The Compose database is healthy; migration, transactional save, pair/event read and Replay were verified through the running API with `pair-82471cbb2adaa2a0`. No database fallback was added.
2. The MiniMax Token Plan Base URL, `MiniMax-M2.7` model and a rotated subscription key are configured only in the ignored local environment. A full testnet-backed paired attempt with Seed `minimax-online-20260725-01` ran for 10 minutes 47 seconds before the provider returned HTTP `529`. The Adapter failed directly as required: it did not switch models, retry the whole Run, persist a partial pair, sign, call the facilitator, or submit another transaction. The recorded OpenAI-compatible Fixture still validates the structured action/event/payment path, but one successful online model Run remains unverified.
3. A 300-wallet local CSV was validated without exposing secrets: 300 unique registered wallets, zero private-key/mnemonic/address mismatches, and the initial audit found 0.002 testnet INJ on all wallets plus 1 testnet USDC on five wallets. Four seed keys, a distinct facilitator key/service token and a distinct merchant address are configured only in the ignored `0600` `.env`; settlement changed only the expected seed, merchant and facilitator balances.
4. Four real payments are complete. The RPC returned canonical blocks/logs but omitted single-hash receipt indexing for the first two transactions; the recovery path required exact chain ID, tx, payer, merchant, asset, amount, block and EIP-3009 calldata before atomically delivering the digital entitlement. No payment was repeated.
