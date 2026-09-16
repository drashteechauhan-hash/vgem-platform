"""Phase 2 lookup APIs (all NEW routes — nothing existing is touched):

- GET /restrictions                 list/filter restriction records
      ?type=BLACKLISTED|DEBARRED|SUSPENDED|OTHER_RESTRICTION
      ?status=active|inactive
      ?limit=  (default 100, max 500)
- GET /restrictions/search?query=   search by entity name OR identifier
- GET /restrictions/{id}            single restriction record
- GET /restrictions/lookup/{identifier}  active restriction for a GSTIN/PAN (or 404)
- GET /data-sources                 provenance metadata for data sources used
"""
from fastapi import APIRouter, HTTPException, Query

from database.connection import db
from database.models import restriction_public
from services import normalize as N
from services import blacklist_service

router = APIRouter()

VALID_TYPES = {"BLACKLISTED", "DEBARRED", "SUSPENDED", "OTHER_RESTRICTION"}


@router.get("/restrictions")
def list_restrictions(type: str = Query(None), status: str = Query(None),
                      limit: int = Query(100, ge=1, le=500)):
    q = "SELECT * FROM procurement_restrictions WHERE 1=1"
    args = []
    if type:
        t = type.strip().upper()
        if t not in VALID_TYPES:
            raise HTTPException(400, f"Invalid type. Use one of: {', '.join(sorted(VALID_TYPES))}")
        q += " AND restriction_type=?"
        args.append(t)
    if status:
        q += " AND status=?"
        args.append(status.strip().lower())
    q += " ORDER BY id DESC LIMIT ?"
    args.append(limit)
    conn = db()
    rows = conn.execute(q, args).fetchall()
    conn.close()
    return [restriction_public(r) for r in rows]


@router.get("/restrictions/search")
def search_restrictions(query: str = Query(..., min_length=1), limit: int = Query(50, ge=1, le=500)):
    nname = N.normalize_name(query)
    nident = N.normalize_identifier(query)
    conn = db()
    rows = conn.execute(
        "SELECT * FROM procurement_restrictions "
        "WHERE normalized_identifier LIKE ? OR normalized_name LIKE ? "
        "ORDER BY id DESC LIMIT ?",
        (f"%{nident}%", f"%{nname}%", limit),
    ).fetchall()
    conn.close()
    return [restriction_public(r) for r in rows]


@router.get("/restrictions/lookup/{identifier}")
def lookup_restriction(identifier: str):
    rec = blacklist_service.lookup(identifier)
    if not rec:
        raise HTTPException(404, "No active restriction found for this identifier")
    return rec


@router.get("/restrictions/{rid}")
def get_restriction(rid: int):
    conn = db()
    row = conn.execute("SELECT * FROM procurement_restrictions WHERE id=?", (rid,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Restriction not found")
    return restriction_public(row)


@router.get("/data-sources")
def list_data_sources():
    conn = db()
    rows = conn.execute("SELECT * FROM data_sources ORDER BY is_real DESC, id ASC").fetchall()
    conn.close()
    return [{
        "source_key": r["source_key"], "name": r["name"], "url": r["url"],
        "authority": r["authority"], "data_kind": r["data_kind"],
        "is_real": bool(r["is_real"]), "description": r["description"],
        "retrieved_at": r["retrieved_at"],
    } for r in rows]
