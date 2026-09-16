"""Tender routes: GET /tenders, POST /tenders. Identical behaviour to original."""
import json
import secrets
from datetime import datetime

from fastapi import APIRouter

from database.connection import db
from database.models import tender_public
from schemas.tender import TenderBody

router = APIRouter()


@router.get("/tenders")
def get_tenders():
    conn = db()
    rows = conn.execute("SELECT * FROM tenders ORDER BY id DESC").fetchall()
    conn.close()
    return [tender_public(r) for r in rows]


@router.post("/tenders")
def create_tender(b: TenderBody):
    ref = f"GEM/2026/B/{secrets.randbelow(900000) + 100000}"
    conn = db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO tenders(ref,title,dept,category,value,closing,status,requirements,created_by,created_at) VALUES(?,?,?,?,?,?,'Published',?,?,?)",
        (ref, b.title, b.dept, b.category, b.value, b.closing, json.dumps(b.requirements), "officer", datetime.now().isoformat()))
    conn.commit()
    row = c.execute("SELECT * FROM tenders WHERE ref=?", (ref,)).fetchone()
    conn.close()
    return {"ok": True, "tender": tender_public(row)}
