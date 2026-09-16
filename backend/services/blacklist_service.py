"""Blacklist / debarment / suspension lookup (DB-backed).

Queries the procurement_restrictions table by NORMALIZED identifier so that
GSTIN/PAN lookups are reliable regardless of spacing/case. Only 'active'
restrictions count.

Two entry points:
- check(identifier)      -> reason string or None   (Phase 1 compatible)
- lookup(identifier)     -> full record dict or None (Phase 2, richer)

Keeping this in one place means real government/public procurement debarment
data imported into the table is picked up automatically by verification.
"""
from database.connection import db
from database.models import restriction_public
from services import normalize as N


def lookup(identifier: str):
    """Return the full active restriction record for an identifier, or None."""
    ident = N.normalize_identifier(identifier)
    if not ident:
        return None
    conn = db()
    row = conn.execute(
        "SELECT * FROM procurement_restrictions "
        "WHERE normalized_identifier=? AND status='active' "
        "ORDER BY id DESC LIMIT 1",
        (ident,),
    ).fetchone()
    conn.close()
    if not row:
        return None
    return restriction_public(row)


def check(identifier: str):
    """Phase 1 compatible: return the restriction reason string, or None."""
    rec = lookup(identifier)
    return rec["reason"] if rec else None
