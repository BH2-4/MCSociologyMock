"""Small first-batch checks, not a research, simulation, or full-project test suite."""

import csv
import hashlib
import json
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ORDER_PATH = ROOT / ".agents/work-orders/WO-DATA-INVENTORY-001-r1.json"
OUTPUT = ROOT / "data/publishing-mvp"
FILES = {"README.md", "sources.jsonl", "facts.jsonl", "gaps.csv", "manifest.json"}
SOURCE_FIELDS = {
    "source_id", "title", "url", "path", "ref", "publisher", "source_class",
    "published_at", "collected_at", "region", "language", "platform",
    "access_status", "usage_scope", "method", "content_hash", "hash_scope", "notes",
}
FACT_FIELDS = {
    "record_id", "record_type", "source_ids", "content", "region", "platform",
    "event_time", "observation_time", "unit", "evidence_status", "time_usage", "notes",
}
GAP_FIELDS = ["gap_id", "topic", "reason", "next_action", "related_record_ids"]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def jsonl(name, required_fields):
    records = []
    for line_number, line in enumerate((OUTPUT / name).read_text(encoding="utf-8").splitlines(), 1):
        require(bool(line.strip()), f"{name}:{line_number}: empty record")
        record = json.loads(line)
        require(isinstance(record, dict) and required_fields <= record.keys(),
                f"{name}:{line_number}: missing fields or non-object record")
        records.append(record)
    return records


def identifiers(records, key):
    values = [record[key] for record in records]
    require(all(isinstance(value, str) and value.strip() for value in values),
            f"{key}: IDs must be nonempty strings")
    require(len(values) == len(set(values)), f"{key}: duplicate IDs")
    return set(values)


def main():
    # CI checks JSON parsing for every committed Work Order. The installed Delivery
    # parser remains the authority for its complete version-1 contract.
    for path in sorted((ROOT / ".agents/work-orders").glob("*.json")):
        require(isinstance(json.loads(path.read_text(encoding="utf-8")), dict),
                f"{path.name}: Work Order must be a JSON object")
    order = json.loads(ORDER_PATH.read_text(encoding="utf-8"))
    if not OUTPUT.exists():
        print("Work Order JSON parsed; Plan stage only: no data batch was validated.")
        return
    require(OUTPUT.is_dir(), "data output path is not a directory")
    require({path.name for path in OUTPUT.iterdir()} == FILES,
            "first batch must contain exactly the five agreed files")
    require(all((OUTPUT / name).is_file() for name in FILES), "output must contain regular files")
    require(bool((OUTPUT / "README.md").read_text(encoding="utf-8").strip()), "README is empty")
    sources = jsonl("sources.jsonl", SOURCE_FIELDS)
    source_ids = identifiers(sources, "source_id")
    evidence = {entry["path"]: entry["ref"] for entry in order["review_evidence"]}
    require(len(sources) == len(evidence) and {row["path"] for row in sources} == set(evidence),
            "source registry must contain exactly the three authorized input files")
    for source in sources:
        require(source["ref"] == evidence[source["path"]], "source commit does not match pinned evidence")
        expected_hash = hashlib.sha256((ROOT / source["path"]).read_bytes()).hexdigest()
        require(source["hash_scope"] == "source_file_bytes" and source["content_hash"] == expected_hash,
                "source-file hash does not match checked-out bytes")
        timestamp = datetime.fromisoformat(source["collected_at"].replace("Z", "+00:00"))
        require(timestamp.tzinfo is not None, "collection time needs an explicit timezone")
        require(source["source_class"] in {"local_project_document", "local_code"}
                and source["access_status"] == "local_snapshot", "source must remain a local snapshot")
    facts = jsonl("facts.jsonl", FACT_FIELDS)
    fact_ids = identifiers(facts, "record_id")
    referenced = set()
    for fact in facts:
        refs = fact["source_ids"]
        require(isinstance(refs, list) and refs and all(ref in source_ids for ref in refs),
                "fact must reference existing source IDs")
        require(fact["record_type"] == "local_claim" and isinstance(fact["content"], str)
                and fact["content"].strip(), "fact must be a nonempty local claim")
        require(fact["evidence_status"] in {"pending_verification", "engineering_default"},
                "local inventory cannot claim external verification")
        referenced.update(refs)
    require(referenced == source_ids, "each source must have at least one useful claim")
    with (OUTPUT / "gaps.csv").open(encoding="utf-8", newline="") as stream:
        reader = csv.DictReader(stream)
        require(reader.fieldnames == GAP_FIELDS, "gap CSV header differs from agreed fields")
        gaps = list(reader)
    require(bool(gaps), "at least one actionable gap is required")
    identifiers(gaps, "gap_id")
    for gap in gaps:
        require(None not in gap and all(value is not None for value in gap.values())
                and all(gap.get(key) for key in GAP_FIELDS[:-1]), "incomplete gap row")
        refs = gap["related_record_ids"] or ""
        require(not refs or all(ref in fact_ids for ref in refs.split(";")), "gap references an unknown record")
    manifest = json.loads((OUTPUT / "manifest.json").read_text(encoding="utf-8"))
    require(manifest["schema_version"] == 1 and manifest["task_id"] == order["task_id"]
            and manifest["revision"] == order["revision"], "manifest task binding is invalid")
    require(set(evidence.values()) == {manifest["source_commit"]}, "manifest source commit differs")
    require(manifest["batch_type"] == "local_inventory_only" and manifest["external_verification"] is False,
            "manifest must describe an unverified local inventory")
    require(isinstance(manifest["files"], list) and len(manifest["files"]) == len(FILES)
            and set(manifest["files"]) == FILES, "manifest file list differs")
    counts = {"sources": len(sources), "facts": len(facts), "gaps": len(gaps)}
    require(manifest["counts"] == counts, "manifest counts differ from actual records")
    print(f"Structural data checks passed: {counts}; external facts and research quality were not verified.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError, AttributeError, csv.Error) as error:
        raise SystemExit(f"Data validation failed: {error}") from None
