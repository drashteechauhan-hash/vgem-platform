"""Auth request bodies — unchanged from original main.py."""
from pydantic import BaseModel


class SignupBidder(BaseModel):
    company: str
    email: str
    password: str
    phone: str = ""


class SignupOfficer(BaseModel):
    name: str
    email: str
    password: str
    phone: str = ""
    dept: str = ""
    designation: str = ""
    officer_id: str = ""


class LoginBody(BaseModel):
    email: str
    password: str
    role: str
