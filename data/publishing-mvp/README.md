# Publishing MVP · Batch 1 — Local Source Inventory (WO-DATA-INVENTORY-001, revision 1)

## What this batch is

This directory holds a five-file inventory produced under Work Order WO-DATA-INVENTORY-001
(revision 1). `manifest.json` records `batch_type: local_inventory_only` and
`external_verification: false`: every record below was derived **only** from three
authorized files already committed in this repository. No web browsing, external
retrieval, DOCX extraction, simulation, database import or raw-material archiving was
performed, and **the full publishing research programme has not been carried out or
completed by this batch** — this is only its first, local traceability step.

Local documents are evidence of what the project *says*, not independent verification of
the underlying real-world claims. Labels such as `A_OFFICIAL`, recorded `PASS` entries,
testnet payments, ranking histories, third-party estimates and synthetic results are
indexed here as claims only; none of them becomes a new test, real revenue, or proven
predictive accuracy by being listed.

## Pinned inputs (local snapshot)

- **Source commit** (supplied by the trusted preparation step):
  `c25948a8732c948f27c3c070b3ae0414f1a10b25`
- **Snapshot collection time** (supplied): `2026-10-07T02:04:34Z` (UTC). This is when the
  trusted preparation step collected the local snapshot of the three files. It is *not*
  the Worker execution time and *not* a historical web-collection time.
- The three authorized read-only inputs, with the SHA-256 values supplied by the
  preparation step (`hash_scope: source_file_bytes`):

| Path | Supplied SHA-256 | Role in this batch |
| --- | --- | --- |
| `README.md` | `147ad09cabd2b0306054c0e73114b8a3ec4dae8c0f7ffeca9572914a9a6d4570` | Project overview; recorded P0/P1 results and evidence boundaries |
| `docs/DOD.md` | `40bb0f8a0bd5a92b45e09f7790b19229917b97e45f577ad91df91b108cdd6f93` | P0/P1 acceptance evidence tables with recorded PASS/BLOCKED statuses |
| `packages/core/src/publishing-data.ts` | `68405031a32bc7ed4a1844d36b032fd4850688afc722dec0c1cdee799534b80f` | P1 source-bundle, historical-analog and market-fit constants; snapshot builders |

The Worker did not run git or hashing commands in this restricted session; the commit
identity, digests and no-drift status rest on the trusted preparation step and the
operator confirmation required by the Work Order. Follow-up re-verification in CI is
recorded as gap G08.

## Files in this batch

- `sources.jsonl` — 3 records, exactly one per authorized input. `url` is null for all
  three: no repository remote was read in this restricted session, so sources are
  identified by `path` plus the pinned `ref`. `published_at` is null because none of the
  files states an original publication time (the DOD "status date" is explicitly not used
  as one).
- `facts.jsonl` — 14 `local_claim` records (at least one useful claim per source), each
  citing existing `source_ids`.
- `gaps.csv` — 8 gap rows (plus header) covering external verification and scope limits.
- `manifest.json` — file list and actual record counts for this batch.
- `README.md` — this file.

## Evidence rules used

- Documentary claims are `pending_verification`; `engineering_default` is used **only**
  for values directly present as code constants in `publishing-data.ts` — it means
  "present in code", never "empirically calibrated" or externally confirmed.
- Every `time_usage` is `unclassified`: no pre-release availability or retrospective
  status was independently established, and in-code collection dates are not treated as
  verified historical availability. Dates that appear in records are annotated in `notes`
  as date-only or with their explicit `+09:00` (JST) offset.
- Synthetic Spend Units, paired-adoption differences, testnet USDC amounts, ordinal ranks
  and Game-i rough-estimate labels are recorded with units and synthetic/estimated nature
  stated; they are not JPY, revenue, or financial forecasts.

## Known scope limitations (details in gaps.csv)

- **External sources unverified (G01):** the R14–R17 pages registered in code (HoYoverse
  JP official pages; Game-i) were not retrieved, hashed or inspected.
- **Japan mobile depth (G02):** only iOS ordinal ranks / lagged Android ranks as code
  constants plus named official interactions; no verified mobile revenue.
- **Full platform (G03):** no PlayStation/PC signal; all-platform revenue cannot be
  composed from mobile estimates.
- **Tokyo (G04):** no sub-national Japan data of any kind in these sources.
- **Character revenue (G05):** no official single-character revenue disclosure; Game-i
  monthly labels are third-party rough estimates and must never become revenue claims.
- **Post-launch gate (G06):** `T_release` / `T+24h` / `T+72h` public observations are not
  collected or independently reviewed; P1 remains `AWAITING_POSTLAUNCH_OBSERVATION`.
- **Local timing (G07)** and **snapshot attestation (G08)** as described above.

## Checks run by the Worker vs. later validation

The Worker checked consistency among the five files (required fields present, record IDs
cross-referenced, counts matching `manifest.json`) using file tools only. The Worker did
**not** run any shell command, did **not** execute `scripts/validate_publishing_data.py`,
and did **not** run any CI. Mechanical validation of this batch is performed later, in the
Delivery PR's CI, as a separate trusted step; semantic evidence boundaries remain subject
to independent review.

---

## 中文说明（摘要）

本目录是 Work Order WO-DATA-INVENTORY-001（r1）产出的五文件本地盘点：
`batch_type` 为 `local_inventory_only`，**未开展任何外部核验**（`external_verification:
false`）。全部内容仅来自固定提交 `c25948a8…` 下的三份已授权文件，采集时间为可信准备步骤
提供的 `2026-10-07T02:04:34Z`（UTC）。本地文档只证明"项目如此记载"，不构成对现实事实的
验证；`PASS`、测试网支付、合成单位、榜单与第三方粗估均按声明登记。完整外部调研尚未开展。
Worker 仅用文件工具做了产出间一致性检查，未运行 shell、`scripts/validate_publishing_data.py`
或 CI；机械校验将在 Delivery PR 的 CI 阶段另行执行。
