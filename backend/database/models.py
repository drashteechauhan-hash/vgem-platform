"""Database schema (raw SQLite) and row -> API-dict serializers.

The 5 original tables are UNCHANGED (users, tenders, bids, audit, documents).
One new table is added: procurement_restrictions — this replaces the hardcoded
Python BLACKLIST dict so blacklist/debarment data lives in the database and real
government/public-procurement records can be imported later (Phase 2+).

Serializers below produce the EXACT same JSON the original endpoints returned,
so the deployed frontend keeps working without changes.
"""
import json

# ---------- table definitions (idempotent) ----------
SCHEMA = [
    # --- original 5 tables, columns unchanged ---
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
    # --- new: blacklist / debarment / procurement restrictions ---
    # Generic structure so real CPWD/GeM/ministry debarment lists can be imported later.
    # entity_identifier holds the GSTIN/PAN/Udyam the restriction is keyed on.
    """CREATE TABLE IF NOT EXISTS procurement_restrictions(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_name TEXT,
        entity_identifier TEXT,
        restriction_type TEXT,
        authority TEXT,
        reason TEXT,
        start_date TEXT,
        end_date TEXT,
        source TEXT,
        status TEXT,
        created_at TEXT)""",
]


# ---------- serializers (identical output to original main.py) ----------
def user_public(r):
    return {"id": r["id"], "role": r["role"], "company": r["company"], "name": r["name"],
            "email": r["email"], "phone": r["phone"], "dept": r["dept"],
            "designation": r["designation"], "officer_id": r["officer_id"]}


def tender_public(r):
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
