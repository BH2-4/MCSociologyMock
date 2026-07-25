# P0 Definition of Done Evidence

Status date: 2026-07-25. `PASS` means reproducible code/test or inspected UI evidence exists. `BLOCKED` means the requirement needs external credentials, assets, or a runtime that was unavailable; it is not treated as complete.

| PRD 16.2 requirement | Status | Evidence |
|---|---|---|
| 24 heterogeneous consumers, one deterministic merchant, eight ticks | PASS | `packages/core/src/population.ts`, `runner.ts`; `runner.test.ts` |
| Preregistration card and immutable `protocol_hash` | PASS | `packages/core/src/protocol.ts`; canonical hash tests |
| Two branch wallets per logical consumer, equal balances, isolated addresses/nonces | PASS | deterministic address/ledger test passes; four distinct ignored local keys each hold 1 testnet USDC on chain 1439 and are mapped to branch-specific key refs |
| `branch_diff_report` permits only operations and `receipt_visibility` | PASS | `protocol.test.ts` rejects a hidden price difference |
| Two corresponding seeds buy the same product in both branches through real x402 | PASS (recording integration) / BLOCKED (real tx) | strict four-proof Fixture is replayed into branch wallets/events/Evidence; funded keys, merchant and Gas wallet are locally configured, but the real payment command has not run |
| Seed Claim author/body/Tick/channel/audience/content hash parity | PASS | paired runner Claim parity validation and test |
| Control hides Evidence; Treatment adds only bounded summary | PASS | leakage/omission validation, UI branch toggle, runner tests |
| `INSPECT_EVIDENCE`, `CHAT`, `POST`, `BUY`, `IDLE` legal events | PASS | fixed-threshold test and UI action coverage |
| Real `PAYMENT-REQUIRED` -> policy -> `PAYMENT-SIGNATURE` -> `PAYMENT-RESPONSE` | PASS (contract) / BLOCKED (settlement) | official middleware localhost 402 smoke; `payment-adapter.test.ts`; no real receipt yet |
| Four confirmed seed A2A testnet USDC payments with Blockscout links | BLOCKED | funded keys, merchant and facilitator are configured locally; `pnpm seed:testnet` has not run, so no hashes are claimed |
| Non-seed Mock threshold path reaches BUY -> SETTLED -> FULFILLED -> VERIFIED_PURCHASE | PASS | paired threshold run adopts four non-seeds in recorded demo; event-chain test/UI |
| Fulfilled purchases create bounded Evidence and Blockscout links | PASS (verifier) / BLOCKED (real links) | `evidence-verifier.test.ts`; real links require the four txs |
| Wallet Policy rejects over-budget/invalid requirement before signing | PASS | six Wallet Policy tests plus signer-not-called contract test |
| Non-testnet network and noncanonical USDC rejected before chain | PASS | Wallet Policy and facilitator boundary tests |
| Forced settlement failure returns no paid response and releases inventory | PASS | official `after-success` middleware contract plus route-wired `FulfillmentLedger`; failure and replay tests |
| Post-settlement fulfillment failure refunds then revokes Evidence | PASS (failure injection) | refund state and compensating receipt verifier tests; no extra real refund is sent |
| Evidence-blind difference is exactly zero; threshold direction restored | PASS | core paired-run tests; recorded values 0 and +4/22 respectively |
| Live Lab shows Claim -> Evidence -> exposure -> judgment -> propagation -> purchase | PASS | event lineage inspector navigates direct parents/children; production desktop/mobile Playwright evidence |
| Compare shows paired difference, funnel, baselines and failure checks | PASS | per-Seed rows juxtapose LLM/Evidence-blind/Fixed-threshold and report direction instability; UI/E2E |
| Replay calls no LLM, signer, or facilitator and rebuilds results | PASS | `replay.test.ts`, `pnpm replay:mock`, Replay API |
| Export includes protocol/config/events/metrics/payment index but no secrets/thought chain | PASS | `export.ts` and redaction test |
| Critical automated tests and one end-to-end Demo test | PASS | focused core/server tests pass; the final full gate remains required after the online LLM and real settlement run |

## External blockers

1. PostgreSQL 16 was pulled through the AWS Public ECR Docker Official Images mirror after Docker Hub returned `EOF`. The Compose database is healthy; migration, transactional save, pair/event read and Replay were verified through the running API with `pair-82471cbb2adaa2a0`. No database fallback was added.
2. The MiniMax Token Plan Base URL and `MiniMax-M2.7` model are configured, but `PROGRAM_E_AI_API_KEY` is intentionally blank until entered locally. The Adapter drives the paired Runner and a recorded OpenAI-compatible Fixture validates the structured action/event/payment path; an online model run remains unverified.
3. A 300-wallet local CSV was validated without exposing secrets: 300 unique registered wallets, zero private-key/mnemonic/address mismatches, 300 wallets with 0.002 testnet INJ, and five wallets with 1 testnet USDC. Four funded seed keys, a distinct facilitator key/service token and a distinct merchant address are configured only in the ignored `0600` `.env`.
4. The one-time real payment command has not run, so `fixtures/testnet-seed-receipts.json` does not exist and there are no Blockscout transaction links to report.
