"""Tender request body — unchanged from original main.py."""
from typing import List
from pydantic import BaseModel


class TenderBody(BaseModel):
    title: str
    dept: str
    category: str = "General"
    value: str
    closing: str = ""
    requirements: List[str] = []
