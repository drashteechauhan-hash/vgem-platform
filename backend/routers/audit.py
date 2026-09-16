"""Audit route: GET /audit/{bid_id}. Identical response to original main.py."""
from fastapi import APIRouter

from database.connection import db

router = APIRouter()


@router.get("/audit/{bid_id}")
def get_audit(bid_id: int):
    conn = db()
    rows = conn.execute("SELECT * FROM audit WHERE bid_id=? ORDER BY id DESC", (bid_id,)).fetchall()
    conn.close()
    return [{"action": r["action"], "detail": r["detail"], "actor": r["actor"], "at": r["at"]} for r in rows]
