"""Verification request bodies — unchanged from original main.py."""
from pydantic import BaseModel


class VerifyBody(BaseModel):
    gstin: str = ""
    pan: str = ""
    company: str = ""


class BidderVerifyBody(BaseModel):
    gstin: str = ""
    pan: str = ""
    udyam: str = ""
    company: str = ""
