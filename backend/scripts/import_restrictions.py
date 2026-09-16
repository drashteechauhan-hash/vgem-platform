"""Import procurement-restriction records from a CSV file into the database.

Usage (from the backend/ directory):
    python -m scripts.import_restrictions data/raw/restrictions_demo.csv

Pipeline:
    read -> validate -> normalize -> detect duplicates -> insert/update -> report

- Required fields: entity_name, identifier_value, restriction_type.
- restriction_type is normalized to BLACKLISTED / DEBARRED / SUSPENDED / OTHER_RESTRICTION.
- Duplicate detection uses dedup_key = normalized_identifier|restriction_type|order_reference.
  A matching record is UPDATED (not duplicated). Bad rows are REPORTED, not silently dropped.

IMPORTANT: this script only loads whatever the CSV contains. If you load the demo
file, every record is synthetic (source='demo-mock'). To load REAL data, prepare a
CSV from an official public source (see PHASE2.md) with source/source_url set.
"""
import csv
import os
import sys
from datetime import datetime

# allow running as `python -m scripts.import_restrictions` or `python scripts/import_restrictions.py`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import db          # noqa: E402
from database.init_db import init_db        # noqa: E402
from services import normalize as N          # noqa: E402

REQUIRED = ["entity_name", "identifier_value", "restriction_type"]


def _clean(row):
    return {(k or "").strip(): (v or "").strip() for k, v in row.items()}


def import_restrictions(path: str):
    if not os.path.exists(path):
        print(f"ERROR: file not found: {path}")
        return 1

    init_db()  # make sure tables/columns exist
    conn = db()
    c = conn.cursor()

    inserted = updated = skipped = invalid = 0
    invalid_rows = []
    now = datetime.now().isoformat()

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for lineno, raw in enumerate(reader, start=2):  # header is line 1
            row = _clean(raw)

            # ---- validate ----
            missing = [fld for fld in REQUIRED if not row.get(fld)]
            if missing:
                invalid += 1
                invalid_rows.append((lineno, f"missing {', '.join(missing)}"))
                continue

            # ---- normalize ----
            identifier_value = row["identifier_value"]
            rtype = N.normalize_restriction_type(row["restriction_type"])
            order_ref = row.get("order_reference", "")
            entity_name = row["entity_name"]
            identifier_type = row.get("identifier_type") or N.detect_identifier_type(identifier_value)
            dedup_key = N.make_dedup_key(identifier_value, rtype, order_ref)

            record = (
                entity_name, row.get("entity_type", "company"), identifier_type,
                identifier_value, rtype, row.get("issuing_authority", ""), order_ref,
                row.get("reason", ""), row.get("start_date", ""), row.get("end_date", ""),
                row.get("status", "active").lower() or "active",
                row.get("source", "demo-mock"), row.get("source_url", ""),
                now if row.get("source", "") and row.get("source") != "demo-mock" else "",
                row.get("verification_status", "unverified"),
                N.normalize_name(entity_name), N.normalize_identifier(identifier_value),
                dedup_key,
            )

            # ---- duplicate detection ----
            existing = c.execute(
                "SELECT id FROM procurement_restrictions WHERE dedup_key=?", (dedup_key,)
            ).fetchone()

            if existing:
                c.execute(
                    """UPDATE procurement_restrictions SET
                         entity_name=?, entity_type=?, identifier_type=?, identifier_value=?,
                         restriction_type=?, issuing_authority=?, order_reference=?, reason=?,
                         start_date=?, end_date=?, status=?, source=?, source_url=?,
                         retrieved_at=?, verification_status=?, normalized_name=?,
                         normalized_identifier=?, dedup_key=?, updated_at=?
                       WHERE id=?""",
                    (*record, now, existing["id"]))
                updated += 1
            else:
                c.execute(
                    """INSERT INTO procurement_restrictions(
                         entity_name, entity_type, identifier_type, identifier_value,
                         restriction_type, issuing_authority, order_reference, reason,
                         start_date, end_date, status, source, source_url, retrieved_at,
                         verification_status, normalized_name, normalized_identifier,
                         dedup_key, created_at, updated_at)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (*record, now, now))
                inserted += 1

    conn.commit()
    conn.close()

    print("---- import_restrictions report ----")
    print(f"file:     {path}")
    print(f"inserted: {inserted}")
    print(f"updated:  {updated}")
    print(f"skipped:  {skipped}")
    print(f"invalid:  {invalid}")
    for ln, why in invalid_rows:
        print(f"  - line {ln}: {why}")
    return 0


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "data/raw/restrictions_demo.csv"
    sys.exit(import_restrictions(target))
