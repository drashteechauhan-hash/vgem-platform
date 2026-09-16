"""Tender routes: GET /tenders, POST /tenders. Identical behaviour to original."""
import json
import secrets
from datetime import datetime

from fastapi import APIRouter

from database.connection import db
from database.models import tender_public
from database.init_db import sync_tender_requirements
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
    now = datetime.now().isoformat()
    c.execute(
        "INSERT INTO tenders(ref,title,dept,category,value,closing,status,requirements,created_by,created_at,organisation,source,updated_at) VALUES(?,?,?,?,?,?,'Published',?,?,?,?,?,?)",
        (ref, b.title, b.dept, b.category, b.value, b.closing, json.dumps(b.requirements),
         "officer", now, b.dept, "vgem-manual", now))
    conn.commit()
    row = c.execute("SELECT * FROM tenders WHERE ref=?", (ref,)).fetchone()
    # keep the structured tender_requirements table in sync (Phase 2)
    sync_tender_requirements(c, row["id"], b.requirements)
    conn.commit()
    conn.close()
    return {"ok": True, "tender": tender_public(row)}


@router.get("/tenders/{tender_id}/requirements")
def get_tender_requirements(tender_id: int):
    """Structured compliance requirements for a tender (Phase 2)."""
    conn = db()
    rows = conn.execute(
        "SELECT requirement_type, mandatory, detail FROM tender_requirements WHERE tender_id=? ORDER BY id",
        (tender_id,),
    ).fetchall()
    conn.close()
    return [{"requirement_type": r["requirement_type"],
             "mandatory": bool(r["mandatory"]),
             "detail": r["detail"] or ""} for r in rows]
