"""Import tender records from a CSV file into the database.

Usage (from the backend/ directory):
    python -m scripts.import_tenders data/raw/tenders_demo.csv

- Required fields: ref, title.
- requirements column is a '|'-separated list (e.g. "gst|pan|udyam").
- Duplicate detection is by tender ref: an existing ref is UPDATED, not duplicated.
- Structured tender_requirements rows are (re)synced for each imported tender.
- Bad rows are REPORTED, not silently dropped.

Existing manually-created / seeded tenders and the frontend tender APIs are
unaffected — this only inserts/updates rows in the same tenders table.
"""
import csv
import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import db          # noqa: E402
from database.init_db import init_db        # noqa: E402

REQUIRED = ["ref", "title"]


def _clean(row):
    return {(k or "").strip(): (v or "").strip() for k, v in row.items()}


def _parse_requirements(s: str):
    if not s:
        return []
    return [p.strip().lower() for p in s.replace(",", "|").split("|") if p.strip()]


def import_tenders(path: str):
    if not os.path.exists(path):
        print(f"ERROR: file not found: {path}")
        return 1

    init_db()
    conn = db()
    c = conn.cursor()

    inserted = updated = invalid = 0
    invalid_rows = []
    now = datetime.now().isoformat()

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for lineno, raw in enumerate(reader, start=2):
            row = _clean(raw)
            missing = [fld for fld in REQUIRED if not row.get(fld)]
            if missing:
                invalid += 1
                invalid_rows.append((lineno, f"missing {', '.join(missing)}"))
                continue

            reqs = _parse_requirements(row.get("requirements", ""))
            reqs_json = json.dumps(reqs)
            ref = row["ref"]
            org = row.get("organisation", "") or row.get("dept", "")
            dept = row.get("dept", "") or org

            existing = c.execute("SELECT id FROM tenders WHERE ref=?", (ref,)).fetchone()
            if existing:
                c.execute(
                    """UPDATE tenders SET title=?, dept=?, category=?, value=?, closing=?,
                         status=?, requirements=?, organisation=?, location=?, description=?,
                         publication_date=?, source=?, source_url=?, updated_at=?
                       WHERE ref=?""",
                    (row["title"], dept, row.get("category", "General"), row.get("value", ""),
                     row.get("closing", ""), row.get("status", "Published"), reqs_json, org,
                     row.get("location", ""), row.get("description", ""),
                     row.get("publication_date", ""), row.get("source", "import"),
                     row.get("source_url", ""), now, ref))
                tid = existing["id"]
                updated += 1
            else:
                c.execute(
                    """INSERT INTO tenders(ref,title,dept,category,value,closing,status,
                         requirements,created_by,created_at,organisation,location,description,
                         publication_date,source,source_url,updated_at)
                       VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                    (ref, row["title"], dept, row.get("category", "General"), row.get("value", ""),
                     row.get("closing", ""), row.get("status", "Published"), reqs_json, "import",
                     now, org, row.get("location", ""), row.get("description", ""),
                     row.get("publication_date", ""), row.get("source", "import"),
                     row.get("source_url", ""), now))
                tid = c.execute("SELECT id FROM tenders WHERE ref=?", (ref,)).fetchone()["id"]
                inserted += 1

            # resync structured requirements for this tender
            c.execute("DELETE FROM tender_requirements WHERE tender_id=?", (tid,))
            for rq in reqs:
                c.execute(
                    "INSERT INTO tender_requirements(tender_id,requirement_type,mandatory,detail,created_at) VALUES(?,?,1,'',?)",
                    (tid, rq.upper(), now))

    conn.commit()
    conn.close()

    print("---- import_tenders report ----")
    print(f"file:     {path}")
    print(f"inserted: {inserted}")
    print(f"updated:  {updated}")
    print(f"invalid:  {invalid}")
    for ln, why in invalid_rows:
        print(f"  - line {ln}: {why}")
    return 0


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "data/raw/tenders_demo.csv"
    sys.exit(import_tenders(target))
