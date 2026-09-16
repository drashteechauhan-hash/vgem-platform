"""Bidders route: GET /bidders. Identical response to original main.py."""
from fastapi import APIRouter

from database.connection import db

router = APIRouter()


@router.get("/bidders")
def get_bidders():
    conn = db()
    rows = conn.execute("SELECT * FROM users WHERE role='bidder'").fetchall()
    conn.close()
    return [{"id": r["id"], "company": r["company"], "email": r["email"], "phone": r["phone"]} for r in rows]
