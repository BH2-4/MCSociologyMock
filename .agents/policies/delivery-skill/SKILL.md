---
name: publishing-data-delivery
description: Produce a small, traceable inventory from authorized local project sources; do not conduct external research.
---

# Publishing data inventory: first Delivery task

Follow the merged Work Order. This skill describes the first local inventory, not the full publishing research programme.

## Scope and evidence

- Read only the three source files named in the Work Order. Do not modify them.
- Use the source commit, collection time and source-file SHA-256 values supplied by the trusted preparation step in the Work Order. Do not invent timestamps or compute hashes by reasoning.
- Local documents are evidence of what the project says, not independent verification of the underlying claims. Source labels such as `A_OFFICIAL` do not themselves verify a web page.
- Keep documentary claims as `pending_verification`. Use `engineering_default` only for values directly present as code configuration or constants; it does not mean empirically calibrated.
- A recorded `PASS`, synthetic spend, testnet payment or historical reference is not a new test, real revenue or proven predictive accuracy.
- Do not browse, run shell commands, extract DOCX, run simulations, touch secrets, or request more tools. Missing external evidence is a gap, not a reason to fabricate a value.

## Five output files

Write UTF-8 files under `data/publishing-mvp/`, and nothing else. Use JSON `null` for unknown values, with the reason in `notes` or the batch README.

### README.md

Explain that this is a local-source inventory with no external verification. List the pinned input commit, three source paths, supplied collection time, file purposes and known limitations. Identify Japan/mobile/full-platform/Tokyo/character-revenue scope gaps; do not assert that the broader research has been completed. Distinguish checks not run by the Worker from later CI validation.

### sources.jsonl

One object per line, exactly one source record for each authorized file. Required fields:

`source_id`, `title`, `url`, `path`, `ref`, `publisher`, `source_class`, `published_at`, `collected_at`, `region`, `language`, `platform`, `access_status`, `usage_scope`, `method`, `content_hash`, `hash_scope`, `notes`.

- `path` is repository-relative, never a private local filesystem path. `ref` is the supplied full source commit.
- `url` can be the GitHub blob URL for that path at the pinned commit. It is not a newly retrieved external source.
- `source_class` is `local_project_document` or `local_code`; `access_status` is `local_snapshot`.
- `published_at` is null unless the original publication time is explicitly established; do not substitute the snapshot date or a document's status date.
- `collected_at` is the supplied preparation timestamp: it describes the trusted step's local snapshot collection, not the later Worker execution time or historical web collection.
- Copy the supplied source-file hash into `content_hash`; `hash_scope` is `source_file_bytes`. This is not a hash of an external webpage.
- Regions/platforms must reflect the material's scope. Use `mixed` or `not_applicable` where appropriate, rather than silently treating every record as Japan-mobile data.

### facts.jsonl

One object per line. Required fields:

`record_id`, `record_type`, `source_ids`, `content`, `region`, `platform`, `event_time`, `observation_time`, `unit`, `evidence_status`, `time_usage`, `notes`.

- `record_type` is `local_claim`; `source_ids` is a nonempty array of IDs present in sources.jsonl.
- Include at least one useful record from each source, without padding to a large quota. Each record should express one claim and identify its section/constant in `notes`.
- Allowed evidence states for this batch: `pending_verification`, `engineering_default`.
- `time_usage` is `unclassified` unless pre-release availability or retrospective status is actually supported. Do not equate an in-code collection date with independently verified historical availability.
- Unknown event/observation times and units are null. If supplied, dates must state their timezone or date-only granularity in notes; numerical claims must state units and their synthetic/estimated nature.

### gaps.csv

Header: `gap_id,topic,reason,next_action,related_record_ids`.

Use unique gap IDs. Separate related record IDs with semicolons; an empty value is allowed for a batch-wide gap. Include actionable gaps about external source verification and the scope limits above. Quote CSV fields containing commas, quotes or newlines.

### manifest.json

An object with `schema_version: 1`, `task_id`, `revision`, `source_commit`, `batch_type: "local_inventory_only"`, `external_verification: false`, `files`, and `counts`.

`files` lists the five output basenames. `counts` contains actual `sources`, `facts`, and `gaps` record counts, excluding the CSV header. Do not hash the manifest into itself or invent output-file checksums.

## Completion versus CI

The Worker completes the five files and checks their consistency with the file tools it has. It must not claim to have executed a validator or CI. Running `scripts/validate_publishing_data.py` is a separate trusted/CI step, not a shell requirement for Worker completion. Structural defects can still fail the Delivery PR's CI; semantic evidence boundaries remain subject to independent review.
