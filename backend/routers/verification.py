"""Verification routes:
- GET  /verify-gst/{gstin}  — real government GST lookup
- POST /ai/cross-verify     — rule-based cross-verification + real GST
- POST /verify/bidder       — full bidder verification (GST + PAN + Udyam + blacklist)

Thin routers: all logic lives in services/gst_service.py and
services/verification_service.py. Responses are identical to the original.
"""
from fastapi import APIRouter

from schemas.verification import VerifyBody, BidderVerifyBody
from services import gst_service, verification_service

router = APIRouter()


@router.get("/verify-gst/{gstin}")
def verify_gst(gstin: str):
    return gst_service.verify_gstin(gstin)


@router.post("/ai/cross-verify")
def cross_verify(b: VerifyBody):
    return verification_service.cross_verify(gstin=b.gstin, pan=b.pan, company=b.company)


@router.post("/verify/bidder")
def verify_bidder(b: BidderVerifyBody):
    return verification_service.verify_bidder(gstin=b.gstin, pan=b.pan, udyam=b.udyam, company=b.company)
