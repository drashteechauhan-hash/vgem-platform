"""Database schema (raw SQLite) and row -> API-dict serializers.

Phase 1 (unchanged): users, tenders, bids, audit, documents.
Phase 2 additions:
- procurement_restrictions is EXTENDED to a full, structured procurement-
  restriction model (BLACKLISTED / DEBARRED / SUSPENDED / OTHER_RESTRICTION,
  identifier + authority + order reference + source provenance + normalized
  fields for reliable search and duplicate detection).
- companies            — bidder/company registry data imported from public sources
- tender_requirements  — one row per compliance requirement of a tender
- data_sources         — provenance metadata for every data source used

Design notes:
- Kept in raw SQLite so it keeps working locally with zero setup.
- Column types are plain/portable so a later move to PostgreSQL is straightforward
  (TEXT dates, no SQLite-only features).
- Phase 1 frontend response shapes are preserved by the serializers below.
"""
import json

# ---------- canonical column list for the extended restrictions table ----------
# Used by the migration to add any missing column to an already-deployed
# Phase 1 database (which had the smaller 11-column version).
RESTRICTION_COLUMNS = {
    "entity_name": "TEXT",
    "entity_type": "TEXT",            # company | individual | firm | ...
    "identifier_type": "TEXT",        # GSTIN | PAN | UDYAM | REG_NO | UNKNOWN
    "identifier_value": "TEXT",       # the raw identifier
    "restriction_type": "TEXT",       # BLACKLISTED | DEBARRED | SUSPENDED | OTHER_RESTRICTION
    "issuing_authority": "TEXT",
    "order_reference": "TEXT",
    "reason": "TEXT",
    "start_date": "TEXT",
    "end_date": "TEXT",
    "status": "TEXT",                 # active | inactive | expired
    "source": "TEXT",                 # e.g. demo-mock | gem-gfr-144 | cppp | ...
    "source_url": "TEXT",
    "retrieved_at": "TEXT",
    "verification_status": "TEXT",    # verified | unverified
    "normalized_name": "TEXT",        # for reliable name search
    "normalized_identifier": "TEXT",  # for reliable identifier lookup
    "dedup_key": "TEXT",              # normalized_identifier|restriction_type|order_reference
    "created_at": "TEXT",
    "updated_at": "TEXT",
}

# Extra columns added to the existing tenders table (Phase 2).
TENDER_EXTRA_COLUMNS = {
    "organisation": "TEXT",
    "location": "TEXT",
    "description": "TEXT",
    "publication_date": "TEXT",
    "source": "TEXT",
    "source_url": "TEXT",
    "updated_at": "TEXT",
}

# ---------- table definitions (idempotent) ----------
SCHEMA = [
    # --- Phase 1 original 5 tables, columns UNCHANGED ---
    """CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT, company TEXT, name TEXT, email TEXT UNIQUE,
        password TEXT, phone TEXT, dept TEXT, designation TEXT,
        officer_id TEXT, created_at TEXT)""",
    """CREATE TABLE IF NOT EXISTS tenders(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ref TEXT, title TEXT, dept TEXT, category TEXT, value TEXT,
        closing TEXT, status TEXT, requirements TEXT, created_by TEXT, created_at TEXT)""",
    """CREATE TABLE IF NOT EXISTS bids(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bid_ref TEXT, tender_id INTEGER, tender_ref TEXT, tender_title TEXT,
        bidder_email TEXT, bidder_company TEXT, amount TEXT, delivery TEXT,
        status TEXT, documents TEXT, gstin TEXT, submitted_at TEXT)""",
    """CREATE TABLE IF NOT EXISTS audit(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bid_id INTEGER, action TEXT, detail TEXT, actor TEXT, at TEXT)""",
    """CREATE TABLE IF NOT EXISTS documents(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bidder_email TEXT, doc_type TEXT, filename TEXT, status TEXT, uploaded_at TEXT)""",

    # --- Phase 2: procurement restrictions (full structured model) ---
    # Fresh installs get the full schema here; already-deployed Phase 1 databases
    # are upgraded by the migration (adds the missing columns, keeps old data).
    """CREATE TABLE IF NOT EXISTS procurement_restrictions(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_name TEXT,
        entity_type TEXT,
        identifier_type TEXT,
        identifier_value TEXT,
        restriction_type TEXT,
        issuing_authority TEXT,
        order_reference TEXT,
        reason TEXT,
        start_date TEXT,
        end_date TEXT,
        status TEXT,
        source TEXT,
        source_url TEXT,
        retrieved_at TEXT,
        verification_status TEXT,
        normalized_name TEXT,
        normalized_identifier TEXT,
        dedup_key TEXT,
        created_at TEXT,
        updated_at TEXT)""",

    # --- Phase 2: company / bidder registry (imported from public sources) ---
    # Separate from `users` on purpose: `users` are login accounts (auth), while
    # `companies` are procurement ENTITIES with registry/verification data.
    """CREATE TABLE IF NOT EXISTS companies(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        legal_name TEXT,
        trade_name TEXT,
        gstin TEXT,
        pan TEXT,
        registration_number TEXT,
        organisation_type TEXT,
        incorporation_date TEXT,
        state TEXT,
        city TEXT,
        source TEXT,
        source_url TEXT,
        verification_status TEXT,
        normalized_name TEXT,
        normalized_gstin TEXT,
        created_at TEXT,
        updated_at TEXT)""",

    # --- Phase 2: structured tender compliance requirements ---
    # Kept ALONGSIDE tenders.requirements (JSON) which the frontend still reads.
    """CREATE TABLE IF NOT EXISTS tender_requirements(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tender_id INTEGER,
        requirement_type TEXT,
        mandatory INTEGER DEFAULT 1,
        detail TEXT,
        created_at TEXT)""",

    # --- Phase 2: provenance metadata for data sources used ---
    """CREATE TABLE IF NOT EXISTS data_sources(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_key TEXT UNIQUE,
        name TEXT,
        url TEXT,
        authority TEXT,
        data_kind TEXT,
        is_real INTEGER DEFAULT 0,
        description TEXT,
        retrieved_at TEXT,
        created_at TEXT)""",
]


# ---------- serializers (Phase 1 shapes preserved) ----------
def user_public(r):
    return {"id": r["id"], "role": r["role"], "company": r["company"], "name": r["name"],
            "email": r["email"], "phone": r["phone"], "dept": r["dept"],
            "designation": r["designation"], "officer_id": r["officer_id"]}


def tender_public(r):
    # Response shape kept identical to Phase 1 (frontend depends on these keys).
    return {"id": r["id"], "ref": r["ref"], "title": r["title"], "dept": r["dept"],
            "category": r["category"], "value": r["value"], "closing": r["closing"],
            "status": r["status"], "requirements": json.loads(r["requirements"] or "[]")}


def bid_public(r):
    return {"id": r["id"], "bid_ref": r["bid_ref"], "tender_id": r["tender_id"],
            "tender_ref": r["tender_ref"], "tender_title": r["tender_title"],
            "bidder_email": r["bidder_email"], "bidder_company": r["bidder_company"],
            "amount": r["amount"], "delivery": r["delivery"], "status": r["status"],
            "documents": json.loads(r["documents"] or "[]"),
            "gstin": r["gstin"] if "gstin" in r.keys() else "",
            "submitted_at": r["submitted_at"]}


# ---------- Phase 2 serializer for restriction records ----------
def restriction_public(r):
    """Full restriction record for the new /restrictions APIs."""
    k = r.keys()
    def g(col):
        return r[col] if col in k else None
    return {
        "id": g("id"),
        "entity_name": g("entity_name"),
        "entity_type": g("entity_type"),
        "identifier_type": g("identifier_type"),
        "identifier_value": g("identifier_value"),
        "restriction_type": g("restriction_type"),
        "issuing_authority": g("issuing_authority"),
        "order_reference": g("order_reference"),
        "reason": g("reason"),
        "start_date": g("start_date"),
        "end_date": g("end_date"),
        "status": g("status"),
        "source": g("source"),
        "source_url": g("source_url"),
        "retrieved_at": g("retrieved_at"),
        "verification_status": g("verification_status"),
    }
