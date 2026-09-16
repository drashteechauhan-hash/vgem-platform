"""Bid request bodies — unchanged from original main.py."""
from pydantic import BaseModel


class BidBody(BaseModel):
    tender_id: int
    bidder_email: str
    bidder_company: str
    amount: str = ""
    delivery: str = ""
    documents: list = []
    gstin: str = ""


class DecisionBody(BaseModel):
    status: str  # Approved / Rejected / Clarification Requested
