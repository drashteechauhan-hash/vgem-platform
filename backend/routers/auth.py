"""Auth routes: /auth/signup/bidder, /auth/signup/officer, /auth/login.

Logic and responses are identical to the original main.py.
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException

from database.connection import db
from database.models import user_public
from schemas.auth import SignupBidder, SignupOfficer, LoginBody
from utils.security import hash_pw

router = APIRouter()


@router.post("/auth/signup/bidder")
def signup_bidder(b: SignupBidder):
    conn = db()
    c = conn.cursor()
    if c.execute("SELECT 1 FROM users WHERE email=?", (b.email.lower(),)).fetchone():
        conn.close()
        raise HTTPException(400, "Email already registered")
    c.execute(
        "INSERT INTO users(role,company,email,password,phone,name,dept,designation,officer_id,created_at) VALUES('bidder',?,?,?,?,'','','','',?)",
        (b.company, b.email.lower(), hash_pw(b.password), b.phone, datetime.now().isoformat()))
    conn.commit()
    row = c.execute("SELECT * FROM users WHERE email=?", (b.email.lower(),)).fetchone()
    conn.close()
    return {"ok": True, "user": user_public(row)}


@router.post("/auth/signup/officer")
def signup_officer(b: SignupOfficer):
    conn = db()
    c = conn.cursor()
    if c.execute("SELECT 1 FROM users WHERE email=?", (b.email.lower(),)).fetchone():
        conn.close()
        raise HTTPException(400, "Email already registered")
    c.execute(
        "INSERT INTO users(role,name,email,password,phone,dept,designation,officer_id,company,created_at) VALUES('officer',?,?,?,?,?,?,?,'',?)",
        (b.name, b.email.lower(), hash_pw(b.password), b.phone, b.dept, b.designation, b.officer_id, datetime.now().isoformat()))
    conn.commit()
    row = c.execute("SELECT * FROM users WHERE email=?", (b.email.lower(),)).fetchone()
    conn.close()
    return {"ok": True, "user": user_public(row)}


@router.post("/auth/login")
def login(b: LoginBody):
    conn = db()
    c = conn.cursor()
    row = c.execute("SELECT * FROM users WHERE email=? AND role=?", (b.email.lower(), b.role)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "No account found")
    if row["password"] != hash_pw(b.password):
        raise HTTPException(401, "Incorrect password")
    return {"ok": True, "user": user_public(row)}
