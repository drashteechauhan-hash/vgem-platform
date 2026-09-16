"""Document routes: POST /documents/upload, GET /documents.

Behaviour preserved from original main.py, INCLUDING the existing upload status
of 'verified'. NOTE (flagged for Phase 2): marking a document 'verified' on
upload is not real verification — no OCR/validation happens. Left unchanged here
because Phase 1 is refactor-only and must not alter existing behaviour.
"""
import os
import secrets
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form

from database.connection import db

router = APIRouter()


@router.post("/documents/upload")
async def upload_doc(bidder_email: str = Form(...), doc_type: str = Form(...), file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)
    path = f"uploads/{secrets.token_hex(4)}_{file.filename}"
    with open(path, "wb") as f:
        f.write(await file.read())
    conn = db()
    c = conn.cursor()
    c.execute("INSERT INTO documents(bidder_email,doc_type,filename,status,uploaded_at) VALUES(?,?,?,'verified',?)",
              (bidder_email.lower(), doc_type, file.filename, datetime.now().isoformat()))
    conn.commit()
    conn.close()
    return {"ok": True, "filename": file.filename, "status": "verified"}


@router.get("/documents")
def get_docs(bidder_email: str):
    conn = db()
    rows = conn.execute("SELECT * FROM documents WHERE bidder_email=?", (bidder_email.lower(),)).fetchall()
    conn.close()
    return [{"doc_type": r["doc_type"], "filename": r["filename"], "status": r["status"]} for r in rows]
