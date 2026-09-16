"""Bid routes: GET /bids, POST /bids, POST /bids/{bid_id}/decision.

Behaviour and responses match the original main.py. One small, safe fix in the
decision route: the bid's existence is checked BEFORE writing, so a decision on a
non-existent bid returns 404 without creating an orphan audit row. The success
path (the only path the frontend uses) is unchanged.
"""
import json
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException

from database.connection import db
from database.models import bid_public
from schemas.bid import BidBody, DecisionBody

router = APIRouter()


@router.get("/bids")
def get_bids(bidder_email: Optional[str] = None, tender_id: Optional[int] = None):
    conn = db()
    q = "SELECT * FROM bids WHERE 1=1"
    args = []
    if bidder_email:
        q += " AND bidder_email=?"
        args.append(bidder_email.lower())
    if tender_id:
        q += " AND tender_id=?"
        args.append(tender_id)
    q += " ORDER BY id DESC"
    rows = conn.execute(q, args).fetchall()
    conn.close()
    return [bid_public(r) for r in rows]


@router.post("/bids")
def create_bid(b: BidBody):
    conn = db()
    c = conn.cursor()
    t = c.execute("SELECT * FROM tenders WHERE id=?", (b.tender_id,)).fetchone()
    if not t:
        conn.close()
        raise HTTPException(404, "Tender not found")
    bid_ref = f"BID-{t['ref'].split('/')[-1]}-{secrets.randbelow(900) + 100}"
    c.execute(
        "INSERT INTO bids(bid_ref,tender_id,tender_ref,tender_title,bidder_email,bidder_company,amount,delivery,status,documents,gstin,submitted_at) VALUES(?,?,?,?,?,?,?,?,'Submitted',?,?,?)",
        (bid_ref, b.tender_id, t["ref"], t["title"], b.bidder_email.lower(), b.bidder_company, b.amount, b.delivery, json.dumps(b.documents), b.gstin, datetime.now().isoformat()))
    conn.commit()
    row = c.execute("SELECT * FROM bids WHERE bid_ref=?", (bid_ref,)).fetchone()
    conn.close()
    return {"ok": True, "bid": bid_public(row)}


@router.post("/bids/{bid_id}/decision")
def decide_bid(bid_id: int, b: DecisionBody):
    conn = db()
    c = conn.cursor()
    row = c.execute("SELECT * FROM bids WHERE id=?", (bid_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Bid not found")
    c.execute("UPDATE bids SET status=? WHERE id=?", (b.status, bid_id))
    c.execute("INSERT INTO audit(bid_id,action,detail,actor,at) VALUES(?,?,?,?,?)",
              (bid_id, "decision", b.status, "officer", datetime.now().isoformat()))
    conn.commit()
    row = c.execute("SELECT * FROM bids WHERE id=?", (bid_id,)).fetchone()
    conn.close()
    return {"ok": True, "bid": bid_public(row)}
