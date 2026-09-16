"""Idempotent database initialisation, migration and demo seeding (Phase 2).

init_db():
  1. Creates all tables (Phase 1 + Phase 2) if they don't exist.
  2. Migrates an already-deployed Phase 1 database in place:
       - adds the new procurement_restrictions columns and backfills them
         from the old columns (entity_identifier -> identifier_value, etc.)
       - adds the new tenders columns
     All via ALTER TABLE ADD COLUMN — never drops a column, never wipes data.
  3. Syncs structured tender_requirements from each tender's requirements JSON.

seed():
  - Phase 1 demo tenders + bidders (only if empty) — unchanged.
  - data_sources provenance rows (real sources as metadata + demo-mock).
  - A SMALL synthetic restriction dataset (source='demo-mock') — only if empty.

Everything is safe to run on every startup and never overwrites live data.
"""
import json
from datetime import datetime

from database.connection import db
from database.models import SCHEMA, RESTRICTION_COLUMNS, TENDER_EXTRA_COLUMNS
from services import normalize as N
from utils.security import hash_pw


# ---------------------------------------------------------------- helpers ----
def _columns(conn, table):
    return {r["name"] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()}


def _add_missing_columns(conn, table, wanted: dict):
    existing = _columns(conn, table)
    added = []
    for col, coltype in wanted.items():
        if col not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {coltype}")
            added.append(col)
    return added


# ------------------------------------------------------------- migrations ----
def migrate_restrictions(conn):
    """Bring an old Phase 1 procurement_restrictions table up to the full schema."""
    _add_missing_columns(conn, "procurement_restrictions", RESTRICTION_COLUMNS)

    now = datetime.now().isoformat()
    rows = conn.execute("SELECT * FROM procurement_restrictions").fetchall()
    for r in rows:
        k = r.keys()

        def val(col):
            return r[col] if col in k and r[col] not in (None, "") else None

        identifier_value = val("identifier_value") or val("entity_identifier") or ""
        issuing_authority = val("issuing_authority") or val("authority") or ""
        entity_name = val("entity_name") or ""
        restriction_type = N.normalize_restriction_type(val("restriction_type") or "")
        entity_type = val("entity_type") or "company"
        identifier_type = val("identifier_type") or N.detect_identifier_type(identifier_value)
        status = val("status") or "active"
        source = val("source") or "demo-mock"
        verification_status = val("verification_status") or "unverified"
        order_reference = val("order_reference") or ""
        created_at = val("created_at") or now
        updated_at = val("updated_at") or created_at

        conn.execute(
            """UPDATE procurement_restrictions SET
                 entity_name=?, entity_type=?, identifier_type=?, identifier_value=?,
                 restriction_type=?, issuing_authority=?, order_reference=?, status=?,
                 source=?, verification_status=?, normalized_name=?, normalized_identifier=?,
                 dedup_key=?, created_at=?, updated_at=?
               WHERE id=?""",
            (entity_name, entity_type, identifier_type, identifier_value,
             restriction_type, issuing_authority, order_reference, status,
             source, verification_status,
             N.normalize_name(entity_name), N.normalize_identifier(identifier_value),
             N.make_dedup_key(identifier_value, restriction_type, order_reference),
             created_at, updated_at, r["id"]))


def migrate_tenders(conn):
    """Add Phase 2 tender columns and backfill provenance for existing rows."""
    _add_missing_columns(conn, "tenders", TENDER_EXTRA_COLUMNS)
    now = datetime.now().isoformat()
    rows = conn.execute("SELECT * FROM tenders").fetchall()
    for r in rows:
        k = r.keys()
        if ("source" in k) and r["source"]:
            continue  # already has provenance
        created_by = r["created_by"] if "created_by" in k else ""
        source = "demo-seed" if created_by == "system" else "vgem-manual"
        conn.execute(
            "UPDATE tenders SET organisation=?, source=?, updated_at=? WHERE id=?",
            (r["dept"] if "dept" in k else "", source,
             r["created_at"] if "created_at" in k else now, r["id"]))


def sync_tender_requirements(conn, tender_id, requirements):
    """Insert one tender_requirements row per requirement, if not already present."""
    have = conn.execute(
        "SELECT COUNT(*) FROM tender_requirements WHERE tender_id=?", (tender_id,)
    ).fetchone()[0]
    if have:
        return
    now = datetime.now().isoformat()
    for req in (requirements or []):
        conn.execute(
            "INSERT INTO tender_requirements(tender_id,requirement_type,mandatory,detail,created_at) VALUES(?,?,1,?,?)",
            (tender_id, str(req).strip().upper(), "", now))


def backfill_all_tender_requirements(conn):
    for t in conn.execute("SELECT id, requirements FROM tenders").fetchall():
        reqs = json.loads(t["requirements"] or "[]")
        sync_tender_requirements(conn, t["id"], reqs)


def init_db():
    conn = db()
    for stmt in SCHEMA:
        conn.execute(stmt)
    migrate_restrictions(conn)
    migrate_tenders(conn)
    backfill_all_tender_requirements(conn)
    conn.commit()
    conn.close()


# ------------------------------------------------------------------ seeds ----
DEMO_RESTRICTIONS = [
    ("Sharma Constructions (DEMO)", "27AABCS9999Z1Z5", "DEBARRED", "CPWD",
     "CPWD/DEBAR/2024/017", "Debarred by CPWD for 2 years (contract default)"),
    ("Forged Docs Traders (DEMO)", "07XXXXX0000X1Z9", "BLACKLISTED", "GeM",
     "GEM/BL/2024/003", "Blacklisted - submitted forged documents"),
    ("Nova Suspended Supplies (DEMO)", "29AAECN1234F1Z5", "SUSPENDED", "GeM",
     "GEM/SUSP/2024/GFR144", "Suspended for non-compliance with GFR Rule 144(xi)"),
    ("Kaveri Debarred Works (DEMO)", "33AAACK5678Q1ZP", "DEBARRED", "Ministry of Railways",
     "RLY/DEBAR/2025/004", "Debarred for repeated delivery default"),
    ("BlackMark Enterprises (DEMO)", "09AABCB4321R1Z2", "BLACKLISTED", "State PWD (UP)",
     "UPPWD/BL/2025/099", "Blacklisted for substandard supply"),
    ("Restricted Traders (DEMO)", "24AAOFR8765L1Z4", "OTHER_RESTRICTION", "GeM",
     "GEM/RES/2025/012", "Turnover/payment restriction flag"),
]

DATA_SOURCES = [
    ("demo-mock", "VGEM Synthetic Demo Data", "", "VGEM (synthetic)", "restrictions", 0,
     "Synthetic, clearly-labelled demo records for testing/presentation only."),
    ("gem-gfr-144", "GeM - Sellers Suspended under GFR Rule 144(xi)",
     "https://gem.gov.in/", "Government e-Marketplace (GeM)", "restrictions", 1,
     "Public GeM list of sellers/brands suspended for GFR Rule 144(xi) non-compliance."),
    ("cppp", "Central Public Procurement Portal (CPPP / eProcurement)",
     "https://eprocure.gov.in/", "NIC / CPPP", "tenders", 1,
     "Authoritative public record of central government tenders, awards and corrigenda."),
    ("data-gov-in", "Open Government Data (OGD) Platform India",
     "https://data.gov.in/", "Government of India", "datasets", 1,
     "Official open-data portal with downloadable procurement-related datasets."),
]


def seed():
    conn = db()
    c = conn.cursor()

    if c.execute("SELECT COUNT(*) FROM tenders").fetchone()[0] == 0:
        tenders = [
            ("GEM/2026/B/184291", "Supply of Desktop Computers", "Ministry of Education", "IT Hardware", "\u20b948,50,000", "15 Oct 2026", "Published", ["gst", "pan", "udyam", "bis"]),
            ("GEM/2026/B/184305", "Networking Equipment Procurement", "Department of Telecommunications", "Networking", "\u20b91,24,00,000", "12 Oct 2026", "Published", ["gst", "pan", "udyam"]),
            ("GEM/2026/B/184318", "Laboratory Equipment Supply", "Council of Scientific & Industrial Research", "Lab Equipment", "\u20b986,20,000", "05 Oct 2026", "Published", ["gst", "pan", "esic"]),
            ("GEM/2026/B/184347", "Office Furniture Procurement", "Central Public Works Department", "Furniture", "\u20b942,50,000", "18 Oct 2026", "Published", ["gst", "pan", "udyam", "bis"]),
            ("GEM/2026/B/184362", "CCTV Surveillance System", "Ministry of Home Affairs", "Security", "\u20b968,90,000", "08 Oct 2026", "Published", ["gst", "pan", "bis"]),
            ("GEM/2026/B/184379", "Solar Power Panels Installation", "Ministry of New & Renewable Energy", "Renewable Energy", "\u20b93,10,00,000", "28 Oct 2026", "Published", ["gst", "pan", "udyam", "makeinindia"]),
            ("GEM/2026/B/184388", "Medical Equipment Supply", "Ministry of Health & Family Welfare", "Medical", "\u20b91,56,00,000", "25 Oct 2026", "Published", ["gst", "pan", "udyam", "bis"]),
            ("GEM/2026/B/184401", "Annual IT Maintenance Services", "National Informatics Centre", "Services", "\u20b932,00,000", "22 Oct 2026", "Published", ["gst", "pan"]),
        ]
        for t in tenders:
            c.execute(
                "INSERT INTO tenders(ref,title,dept,category,value,closing,status,requirements,created_by,created_at,organisation,source,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (t[0], t[1], t[2], t[3], t[4], t[5], t[6], json.dumps(t[7]), "system",
                 datetime.now().isoformat(), t[2], "demo-seed", datetime.now().isoformat()))

    if c.execute("SELECT COUNT(*) FROM users WHERE role='bidder'").fetchone()[0] == 0:
        bidders = [
            ("Sharma Traders Pvt Ltd", "sharma@bidder.in", "+91 98110 42213"),
            ("TechVision Solutions Pvt Ltd", "techvision@bidder.in", "+91 99872 55401"),
            ("Nova Infra Systems Ltd", "nova@bidder.in", "+91 90045 88123"),
            ("Kaveri Enterprises", "kaveri@bidder.in", "+91 94488 90012"),
        ]
        for b in bidders:
            c.execute(
                "INSERT INTO users(role,company,email,password,phone,name,dept,designation,officer_id,created_at) VALUES('bidder',?,?,?,?,'','','','',?)",
                (b[0], b[1], hash_pw("demo1234"), b[2], datetime.now().isoformat()))

    if c.execute("SELECT COUNT(*) FROM data_sources").fetchone()[0] == 0:
        now = datetime.now().isoformat()
        for s in DATA_SOURCES:
            c.execute(
                "INSERT OR IGNORE INTO data_sources(source_key,name,url,authority,data_kind,is_real,description,retrieved_at,created_at) VALUES(?,?,?,?,?,?,?,?,?)",
                (s[0], s[1], s[2], s[3], s[4], s[5], s[6], now if s[5] else "", now))

    if c.execute("SELECT COUNT(*) FROM procurement_restrictions").fetchone()[0] == 0:
        now = datetime.now().isoformat()
        for (name, gstin, rtype, authority, order_ref, reason) in DEMO_RESTRICTIONS:
            rtype = N.normalize_restriction_type(rtype)
            c.execute(
                """INSERT INTO procurement_restrictions(
                     entity_name, entity_type, identifier_type, identifier_value,
                     restriction_type, issuing_authority, order_reference, reason,
                     start_date, end_date, status, source, source_url, retrieved_at,
                     verification_status, normalized_name, normalized_identifier,
                     dedup_key, created_at, updated_at)
                   VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (name, "company", N.detect_identifier_type(gstin), gstin,
                 rtype, authority, order_ref, reason,
                 "", "", "active", "demo-mock", "", "",
                 "unverified", N.normalize_name(name), N.normalize_identifier(gstin),
                 N.make_dedup_key(gstin, rtype, order_ref), now, now))

    # structured requirements for any tenders that don't have them yet
    # (covers demo tenders seeded above on a fresh database)
    backfill_all_tender_requirements(conn)

    conn.commit()
    conn.close()
