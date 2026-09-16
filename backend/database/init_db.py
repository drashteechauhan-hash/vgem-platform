"""Idempotent database initialisation and demo seeding.

- init_db(): creates tables if they don't exist. Safe to run every startup;
  never drops or wipes existing data.
- seed(): inserts demo tenders / bidders / restriction records ONLY when the
  relevant table is empty, so live data is never overwritten on restart.

The demo tenders and bidders are IDENTICAL to the original main.py seed.
The restriction records are the SAME two entries that were previously hardcoded
in the Python BLACKLIST dict — no new fake government records are invented.
"""
import json
from datetime import datetime

from database.connection import db
from database.models import SCHEMA
from utils.security import hash_pw


def init_db():
    conn = db()
    c = conn.cursor()
    for stmt in SCHEMA:
        c.execute(stmt)
    conn.commit()
    conn.close()


def seed():
    conn = db()
    c = conn.cursor()

    # ---- seed tenders (only if none exist) ----
    n = c.execute("SELECT COUNT(*) FROM tenders").fetchone()[0]
    if n == 0:
        tenders = [
            ("GEM/2026/B/184291", "Supply of Desktop Computers", "Ministry of Education", "IT Hardware", "₹48,50,000", "15 Oct 2026", "Published", ["gst", "pan", "udyam", "bis"]),
            ("GEM/2026/B/184305", "Networking Equipment Procurement", "Department of Telecommunications", "Networking", "₹1,24,00,000", "12 Oct 2026", "Published", ["gst", "pan", "udyam"]),
            ("GEM/2026/B/184318", "Laboratory Equipment Supply", "Council of Scientific & Industrial Research", "Lab Equipment", "₹86,20,000", "05 Oct 2026", "Published", ["gst", "pan", "esic"]),
            ("GEM/2026/B/184347", "Office Furniture Procurement", "Central Public Works Department", "Furniture", "₹42,50,000", "18 Oct 2026", "Published", ["gst", "pan", "udyam", "bis"]),
            ("GEM/2026/B/184362", "CCTV Surveillance System", "Ministry of Home Affairs", "Security", "₹68,90,000", "08 Oct 2026", "Published", ["gst", "pan", "bis"]),
            ("GEM/2026/B/184379", "Solar Power Panels Installation", "Ministry of New & Renewable Energy", "Renewable Energy", "₹3,10,00,000", "28 Oct 2026", "Published", ["gst", "pan", "udyam", "makeinindia"]),
            ("GEM/2026/B/184388", "Medical Equipment Supply", "Ministry of Health & Family Welfare", "Medical", "₹1,56,00,000", "25 Oct 2026", "Published", ["gst", "pan", "udyam", "bis"]),
            ("GEM/2026/B/184401", "Annual IT Maintenance Services", "National Informatics Centre", "Services", "₹32,00,000", "22 Oct 2026", "Published", ["gst", "pan"]),
        ]
        for t in tenders:
            c.execute(
                "INSERT INTO tenders(ref,title,dept,category,value,closing,status,requirements,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                (t[0], t[1], t[2], t[3], t[4], t[5], t[6], json.dumps(t[7]), "system", datetime.now().isoformat()))

    # ---- seed sample bidders (only if none exist) ----
    m = c.execute("SELECT COUNT(*) FROM users WHERE role='bidder'").fetchone()[0]
    if m == 0:
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

    # ---- seed procurement restrictions (only if none exist) ----
    # These are the SAME two demo records that were hardcoded before, now stored
    # in the DB. source='demo-mock' so they are never misrepresented as real
    # government data. Real debarment lists can be imported into this table later.
    r = c.execute("SELECT COUNT(*) FROM procurement_restrictions").fetchone()[0]
    if r == 0:
        restrictions = [
            ("(demo) Debarred Entity", "27AABCS9999Z1Z5", "debarment",
             "CPWD", "Debarred by CPWD for 2 years (contract default)", "", "", "demo-mock", "active"),
            ("(demo) Blacklisted Entity", "07XXXXX0000X1Z9", "blacklist",
             "GeM", "Blacklisted — submitted forged documents", "", "", "demo-mock", "active"),
        ]
        for x in restrictions:
            c.execute(
                "INSERT INTO procurement_restrictions(entity_name,entity_identifier,restriction_type,authority,reason,start_date,end_date,source,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                (*x, datetime.now().isoformat()))

    conn.commit()
    conn.close()
