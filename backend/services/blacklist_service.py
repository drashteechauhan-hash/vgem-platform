"""Blacklist / debarment lookup.

Replaces the old hardcoded Python `BLACKLIST` dict with a database lookup against
the procurement_restrictions table. Behaviour for the verification pipeline is
preserved: given a GSTIN, return the restriction reason string if an active
record exists, else None.

Keeping this in one place means real government/public procurement debarment
data can be imported into the table later without touching verification code.
"""
from database.connection import db


def check(identifier: str):
    """Return the restriction reason for an identifier (e.g. GSTIN), or None.

    Only 'active' restrictions count. Matching is case-insensitive on the
    identifier to be safe.
    """
    ident = (identifier or "").strip().upper()
    if not ident:
        return None
    conn = db()
    row = conn.execute(
        "SELECT * FROM procurement_restrictions "
        "WHERE UPPER(entity_identifier)=? AND status='active' LIMIT 1",
        (ident,),
    ).fetchone()
    conn.close()
    if not row:
        return None
    return row["reason"]
