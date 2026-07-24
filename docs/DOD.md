# P0 Definition of Done Evidence

Status date: 2026-07-25. `PASS` means reproducible code/test or inspected UI evidence exists. `BLOCKED` means the requirement needs external credentials, assets, or a runtime that was unavailable; it is not treated as complete.

| PRD 16.2 requirement | Status | Evidence |
|---|---|---|
| 24 heterogeneous consumers, one deterministic merchant, eight ticks | PASS | `packages/core/src/population.ts`, `runner.ts`; `runner.test.ts` |
| Preregistration card and immutable `protocol_hash` | PASS | `packages/core/src/protocol.ts`; canonical hash tests |
| Two branch wallets per logical consumer, equal balances, isolated addresses/nonces | PASS (Mock) / BLOCKED (funding) | deterministic address/ledger test passes; four funded real seed wallets are not configured |
| `branch_diff_report` permits only operations and `receipt_visibility` | PASS | `protocol.test.ts` rejects a hidden price difference |
| Two corresponding seeds buy the same product in both branches through real x402 | BLOCKED | `seed-payments.ts` is ready; four wallet key refs, testnet USDC, merchant and Gas wallet are missing |
| Seed Claim author/body/Tick/channel/audience/content hash parity | PASS | paired runner Claim parity validation and test |
| Control hides Evidence; Treatment adds only bounded summary | PASS | leakage/omission validation, UI branch toggle, runner tests |
| `INSPECT_EVIDENCE`, `CHAT`, `POST`, `BUY`, `IDLE` legal events | PASS | fixed-threshold test and UI action coverage |
| Real `PAYMENT-REQUIRED` -> policy -> `PAYMENT-SIGNATURE` -> `PAYMENT-RESPONSE` | PASS (contract) / BLOCKED (settlement) | official middleware localhost 402 smoke; `payment-adapter.test.ts`; no real receipt yet |
| Four confirmed seed A2A testnet USDC payments with Blockscout links | BLOCKED | no funded keys/assets; no hashes claimed |
| Non-seed Mock threshold path reaches BUY -> SETTLED -> FULFILLED -> VERIFIED_PURCHASE | PASS | paired threshold run adopts four non-seeds in recorded demo; event-chain test/UI |
| Fulfilled purchases create bounded Evidence and Blockscout links | PASS (verifier) / BLOCKED (real links) | `evidence-verifier.test.ts`; real links require the four txs |
| Wallet Policy rejects over-budget/invalid requirement before signing | PASS | six Wallet Policy tests plus signer-not-called contract test |
| Non-testnet network and noncanonical USDC rejected before chain | PASS | Wallet Policy and facilitator boundary tests |
| Forced settlement failure returns no paid response and releases inventory | PASS | deterministic `payment-state.test.ts` |
| Post-settlement fulfillment failure refunds then revokes Evidence | PASS (failure injection) | refund state and compensating receipt verifier tests; no extra real refund is sent |
| Evidence-blind difference is exactly zero; threshold direction restored | PASS | core paired-run tests; recorded values 0 and +4/22 respectively |
| Live Lab shows Claim -> Evidence -> exposure -> judgment -> propagation -> purchase | PASS | `experiment-console.tsx`; production desktop/mobile screenshots inspected locally |
| Compare shows paired difference, funnel, baselines and failure checks | PASS | UI and Playwright main-flow test |
| Replay calls no LLM, signer, or facilitator and rebuilds results | PASS | `replay.test.ts`, `pnpm replay:mock`, Replay API |
| Export includes protocol/config/events/metrics/payment index but no secrets/thought chain | PASS | `export.ts` and redaction test |
| Critical automated tests and one end-to-end Demo test | PASS | 36 unit/contract tests currently expected plus one scenario across desktop/mobile Playwright projects |

## External blockers

1. Docker Desktop's credential helper stalled while pulling `postgres:16-alpine`; a temporary credential-free Docker config bypassed it, but Docker Hub then returned `EOF` for the public manifest. PostgreSQL migration/save/read was therefore not integration-tested in this environment. No database fallback was added.
2. No LLM endpoint/key/model is configured, so only recorded fixtures validate the OpenAI-compatible structured output path.
3. No merchant address, facilitator Gas key/service token, or four unique funded seed wallet key refs are configured. Each seed wallet needs at least 0.30 testnet USDC (0.35 recommended); the facilitator needs testnet INJ for four settlements.
4. Because item 3 is unresolved, `fixtures/testnet-seed-receipts.json` does not exist and there are no Blockscout transaction links to report.
