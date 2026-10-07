# First Delivery task: a local publishing-data inventory

This project consumes an existing Agent Delivery Loop installation. It does not vendor or extend the executor. This onboarding Plan PR adds a Skill, one small Work Order and mechanical CI; it does not produce the research data.

## Task and status

- Work Order: `WO-DATA-INVENTORY-001-r1`, under `.agents/work-orders/`.
- Skill: `.agents/policies/delivery-skill/SKILL.md`.
- Inputs: README.md, docs/DOD.md, packages/core/src/publishing-data.ts at `c25948a8732c948f27c3c070b3ae0414f1a10b25` (29,699 bytes in total).
- Input bytes and SHA-256 values were actually read during preparation on `2026-10-07T02:04:34Z`; these describe local snapshot collection, not historical web retrieval.
- Outputs: only the five files specified in the Work Order under `data/publishing-mvp/`.
- No real Worker has run as part of this onboarding change. No external claims have been verified.

The original six-category research brief remains a later research programme. This first task only inventories local statements and gaps; it does not promise current market observations, Tokyo-specific data, character revenue or predictive accuracy.

## Before merging the Plan PR

1. Inspect the Work Order, Skill and CI. Review the Plan PR's exact head; CI must also correspond to that head.
2. Preserve existing uncommitted work. Untracked reports and DOCX are not automatically available in an isolated Worker worktree, and must not be bulk-published without checking publication/privacy constraints.
3. Use an identity that is authorized for `BH2-4/MCSociologyMock`. Success in the tool repository does not prove permissions in this target repository. Do not give GitHub credentials to the Claude model subprocess.
4. Merge only after the plan has been reviewed. Keep this first learning run manual; no automatic merge is requested.

## Before starting the Worker

Use the currently installed Delivery CLI, with `--repo-path` pointing to this project. Do not reinstall or alter CC Switch merely because a different project is the target. Confirm the installed executable/provenance and credentials in the actual launch environment.

Validate the task with the installed CLI:

```sh
/path/to/delivery/.venv/bin/agent-delivery validate \
  /path/to/MCSociologyMock/.agents/work-orders/WO-DATA-INVENTORY-001-r1.json
```

The operator must check that the three inputs in the Plan merge are unchanged from their pinned source commit:

```sh
git diff --exit-code c25948a8732c948f27c3c070b3ae0414f1a10b25 <PLAN_MERGE_SHA> \
  -- README.md docs/DOD.md packages/core/src/publishing-data.ts
```

An empty diff and exit 0 are expected. A mismatch is a reason to revise the task/evidence before launch, not let the Worker silently use drifting inputs.

After confirming the merged Plan reference and target-repository access, prepare one explicit `agent-delivery deliver` invocation using its current `--help`: the real Plan PR URL, Work Order path, target repo path, valid install receipt/source/wheel hashes, a target-scoped credential, separate review bundle directory, and fixed Worker model/endpoint/effort. Initially use Claude Code `glm-5.3`, BigModel's compatible Coding Plan endpoint and `max` effort. Do **not** pass `--auto-merge`. Endpoint connection and quota semantics still require the real run; the CLI dollar budget is not a verified provider billing cap.

Do not launch from placeholders or an unmerged Plan. This document does not authorize a second attempt, model switch, broader tools or permission changes after failure.

## Worker, review and CI have different jobs

- Worker: produce the five files with restricted file tools. It is not asked to execute shell checks.
- Independent review: inspect the exact candidate against the Work Order, sources and evidence boundaries. The reviewer is not a second data-collection Worker.
- CI: compile the Python checker; parse each Work Order JSON; when the first data batch exists, check required fields, IDs, references, source-file hashes and manifest counts. CI does not verify external facts, theory validity or the entire application's tests.
- Human: examine the first Delivery PR and decide whether to merge it after review and CI pass.

On the onboarding Plan PR, the data directory is absent: CI explicitly reports **Plan stage only**, not successful validation of data that does not exist. The installed CLI's `validate` remains the full Work Order parser; the target CI's Work Order check covers JSON parsing only.

For a local structural check after data exists:

```sh
python3 scripts/validate_publishing_data.py
```

The checker is read-only and uses only the Python standard library. A failure stops acceptance; do not fabricate a passed check or silently expand the Work Order. Keep actual failed run records unchanged and decide the next step separately.

## Later phases

Only after the first small Delivery PR succeeds should a new Work Order consider additional local materials or external collection. DOCX parsing, browsing and raw-material publication need explicit input/capability choices; they are not assumed features of the currently restricted Worker.
