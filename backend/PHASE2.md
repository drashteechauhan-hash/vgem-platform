# VGEM — Phase 2: Procurement / Compliance Data Foundation

Phase 2 moves procurement-restriction data out of a hardcoded Python dict into a
structured, normalized, database-backed model, adds an import pipeline, and
exposes lookup APIs — without changing the frontend or breaking Phase 1 routes.

> ML / LLM / OCR are **not** part of Phase 2. This layer only prepares clean,
> structured data that a Phase 3 model can later train on.

---

## 1. New / changed database schema

### Extended: `procurement_restrictions`
Phase 1 had 11 columns. Phase 2 adds the following (via safe `ALTER TABLE ADD
COLUMN` — no data is dropped):

`entity_type, identifier_type, identifier_value, restriction_type,
issuing_authority, order_reference, source_url, retrieved_at,
verification_status, normalized_name, normalized_identifier, dedup_key,
updated_at`

- `restriction_type` is one of: **BLACKLISTED, DEBARRED, SUSPENDED, OTHER_RESTRICTION**
- `normalized_name` / `normalized_identifier` make search and lookups reliable
- `dedup_key = normalized_identifier | restriction_type | order_reference` — used
  to prevent duplicate records on import

### New tables
| Table | Purpose |
|-------|---------|
| `companies` | Bidder/company **registry** data imported from public sources (legal_name, trade_name, gstin, pan, registration_number, organisation_type, incorporation_date, state, city, source, source_url, verification_status). Kept separate from `users` because `users` are login accounts, not procurement entities. |
| `tender_requirements` | One row per compliance requirement of a tender (requirement_type, mandatory, detail). Structured mirror of the `tenders.requirements` JSON the frontend still reads. |
| `data_sources` | Provenance metadata for every data source used (source_key, name, url, authority, data_kind, is_real, description, retrieved_at). |

### Extended: `tenders`
Added: `organisation, location, description, publication_date, source,
source_url, updated_at`. The existing tender API response is unchanged.

All types are plain/portable (TEXT dates, no SQLite-only features) so a later
move to PostgreSQL is straightforward.

---

## 2. Restriction types
- **BLACKLISTED** — entity barred from participation
- **DEBARRED** — barred by an authority for a defined period (e.g. contract default)
- **SUSPENDED** — temporarily suspended (e.g. GeM GFR Rule 144(xi) non-compliance)
- **OTHER_RESTRICTION** — any other procurement restriction/flag

Free-text labels are normalized to these enums by `services/normalize.py`.

---

## 3. Data sources

### Real public sources (documented; used as provenance metadata)
| Source | URL | Authority | Kind |
|--------|-----|-----------|------|
| GeM — Sellers Suspended under GFR Rule 144(xi) | https://gem.gov.in/ | Government e-Marketplace | restrictions |
| Central Public Procurement Portal (CPPP / eProcurement) | https://eprocure.gov.in/ | NIC / CPPP | tenders |
| Open Government Data (OGD) Platform India | https://data.gov.in/ | Government of India | datasets |

These are registered in the `data_sources` table with `is_real = 1`.

### Honest limitation — no real records auto-imported yet
The real sources above are **public HTML pages / PDFs**, not clean downloadable
CSV/JSON feeds, and this project must not aggressively scrape them. So **no real
government records have been auto-imported.** What Phase 2 delivers instead:
- the **schema + import pipeline** ready to receive that data, and
- a **small synthetic demo dataset** (clearly labelled) to make the flow testable.

To load real data: manually download/prepare a CSV from an official source, set
`source` and `source_url` on each row, drop it in `backend/data/raw/`, and run the
importer (below). Nothing else changes.

### Synthetic demo data
All demo records carry **`source = "demo-mock"`** and `(DEMO)` in the name. They
are **not** real government data. They exist only so the verification flow and the
four restriction types can be demonstrated. Files:
- `backend/data/raw/restrictions_demo.csv` (7 valid + 1 intentionally-invalid row)
- `backend/data/raw/tenders_demo.csv`

The same 6 core demo restrictions are also auto-seeded at startup (only if the
table is empty) so a fresh live deployment shows variety without running scripts.

---

## 4. Import pipeline

Location: `backend/scripts/` and `backend/data/`.

```
backend/
  data/raw/        # input CSVs (real or demo)
  data/processed/  # reserved for cleaned outputs
  scripts/
    import_restrictions.py
    import_tenders.py
  services/normalize.py   # shared name/identifier/type normalization
```

Pipeline per row: **read → validate → normalize → detect duplicates →
insert/update → report**. Invalid rows are **reported, never silently dropped**.

### How to run (from `backend/`)
```bash
python -m scripts.import_restrictions data/raw/restrictions_demo.csv
python -m scripts.import_tenders      data/raw/tenders_demo.csv
```
Re-running the same file updates existing records (via `dedup_key` / tender `ref`)
instead of creating duplicates. Each run prints inserted / updated / skipped /
invalid counts.

---

## 5. How verification queries the database
`services/blacklist_service.py`:
- `lookup(identifier)` — normalizes the GSTIN/PAN and returns the full active
  restriction record (or `None`).
- `check(identifier)` — Phase 1 compatible; returns just the reason string.

`services/verification_service.py` calls `lookup()` in `verify/bidder`. The
frontend-facing check keeps its exact shape (`portal / status / detail`) and now
**also** carries `restriction_type, issuing_authority, order_reference, source,
source_url, verification_status` as extra keys (ignored by the current UI, ready
for a future one). Verification remains **rule-based / deterministic** — no ML.

---

## 6. New lookup APIs (all additive)
```
GET /restrictions?type=BLACKLISTED|DEBARRED|SUSPENDED|OTHER_RESTRICTION&status=&limit=
GET /restrictions/search?query=<name or identifier>
GET /restrictions/lookup/<identifier>     # active restriction for a GSTIN/PAN, else 404
GET /restrictions/<id>
GET /data-sources                         # provenance metadata
GET /tenders/<id>/requirements            # structured requirements for a tender
```
No existing route or response was changed.

---

## 7. How this feeds Phase 3 (ML) — later
The database now holds the structured signals a model needs:
`procurement_restrictions` (labels + entities), `companies` (registry features),
`tenders` + `tender_requirements` (context), and `data_sources` (provenance).
Phase 3 would do feature engineering over these tables to build a training set —
**not implemented now.**

---

## 8. AI-assists-not-decides (unchanged principle)
Verification produces flags, scores and explanations only. No automatic
approve/reject. The procurement officer still makes the final decision.
