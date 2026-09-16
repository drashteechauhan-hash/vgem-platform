"""VGEM API — application entry point.

The backend was refactored from one large file into modular packages:
  database/  — connection, schema/serializers, init + seed
  routers/   — one file per resource (auth, tenders, bids, bidders,
               documents, verification, audit)
  services/  — gst_service, verification_service, blacklist_service
  schemas/   — Pydantic request bodies
  utils/     — security (password hashing)

All existing API routes and response shapes are preserved, so the deployed
frontend keeps working unchanged.
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database.init_db import init_db, seed
from routers import (
    auth,
    tenders,
    bids,
    bidders,
    documents,
    verification,
    audit,
    restrictions,
)

load_dotenv()

app = FastAPI(title="VGEM API")

# Allow the frontend (Vite / Vercel) to call this backend.
# Defaults to "*" (same as before). Can be locked down via CORS_ORIGINS env
# (comma-separated) without any code change.
_origins = os.environ.get("CORS_ORIGINS", "*")
allow_origins = ["*"] if _origins.strip() == "*" else [o.strip() for o in _origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables (idempotent) and seed demo data (only if empty).
# Same timing as the original main.py — runs once at import / server start.
# Never drops or wipes existing data.
init_db()
seed()

# Register routes.
app.include_router(auth.router)
app.include_router(tenders.router)
app.include_router(bids.router)
app.include_router(bidders.router)
app.include_router(documents.router)
app.include_router(verification.router)
app.include_router(audit.router)
app.include_router(restrictions.router)


@app.get("/")
def home():
    return {"message": "VGEM API running", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
