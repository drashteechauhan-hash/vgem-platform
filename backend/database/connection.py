"""SQLite connection helper.

Keeps the SAME database file ("vgem.db", resolved from the backend/ working
directory) as the original single-file backend, so existing data is reused and
nothing is wiped. The path can be overridden with the VGEM_DB_PATH env var.
"""
import os
import sqlite3

from dotenv import load_dotenv

# Load .env if present (local dev). On Render, real env vars are used instead.
load_dotenv()

# Same relative path the original main.py used ("vgem.db").
DB_PATH = os.environ.get("VGEM_DB_PATH", "vgem.db")


def db():
    """Return a new SQLite connection with row access by column name."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
