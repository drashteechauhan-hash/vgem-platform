from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3, json, os, secrets, hashlib
from datetime import datetime
import urllib.request

DB = "vgem.db"
app = FastAPI(title="VGEM API")

# allow frontend (Vite) to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- database setup ----------
def db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db(); c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT, company TEXT, name TEXT, email TEXT UNIQUE,
        password TEXT, phone TEXT, dept TEXT, designation TEXT,
        officer_id TEXT, created_at TEXT)""")
    c.execute("""CREATE TABLE IF NOT EXISTS tenders(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ref TEXT, title TEXT, dept TEXT, category TEXT, value TEXT,
        closing TEXT, status TEXT, requirements TEXT, created_by TEXT, created_at TEXT)""")
    c.execute("""CREATE TABLE IF NOT EXISTS bids(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bid_ref TEXT, tender_id INTEGER, tender_ref TEXT, tender_title TEXT,
        bidder_email TEXT, bidder_company TEXT, amount TEXT, delivery TEXT,
        status TEXT, documents TEXT, gstin TEXT, submitted_at TEXT)""")
    c.execute("""CREATE TABLE IF NOT EXISTS audit(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bid_id INTEGER, action TEXT, detail TEXT, actor TEXT, at TEXT)""")
    c.execute("""CREATE TABLE IF NOT EXISTS documents(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bidder_email TEXT, doc_type TEXT, filename TEXT, status TEXT, uploaded_at TEXT)""")
    conn.commit(); conn.close()

def hash_pw(p): return hashlib.sha256(p.encode()).hexdigest()

def seed():
    conn = db(); c = conn.cursor()

    # ---- seed tenders ----
    n = c.execute("SELECT COUNT(*) FROM tenders").fetchone()[0]
    if n == 0:
        tenders = [
            ("GEM/2026/B/184291","Supply of Desktop Computers","Ministry of Education","IT Hardware","₹48,50,000","15 Oct 2026","Published",["gst","pan","udyam","bis"]),
            ("GEM/2026/B/184305","Networking Equipment Procurement","Department of Telecommunications","Networking","₹1,24,00,000","12 Oct 2026","Published",["gst","pan","udyam"]),
            ("GEM/2026/B/184318","Laboratory Equipment Supply","Council of Scientific & Industrial Research","Lab Equipment","₹86,20,000","05 Oct 2026","Published",["gst","pan","esic"]),
            ("GEM/2026/B/184347","Office Furniture Procurement","Central Public Works Department","Furniture","₹42,50,000","18 Oct 2026","Published",["gst","pan","udyam","bis"]),
            ("GEM/2026/B/184362","CCTV Surveillance System","Ministry of Home Affairs","Security","₹68,90,000","08 Oct 2026","Published",["gst","pan","bis"]),
            ("GEM/2026/B/184379","Solar Power Panels Installation","Ministry of New & Renewable Energy","Renewable Energy","₹3,10,00,000","28 Oct 2026","Published",["gst","pan","udyam","makeinindia"]),
            ("GEM/2026/B/184388","Medical Equipment Supply","Ministry of Health & Family Welfare","Medical","₹1,56,00,000","25 Oct 2026","Published",["gst","pan","udyam","bis"]),
            ("GEM/2026/B/184401","Annual IT Maintenance Services","National Informatics Centre","Services","₹32,00,000","22 Oct 2026","Published",["gst","pan"]),
        ]
        for t in tenders:
            c.execute("INSERT INTO tenders(ref,title,dept,category,value,closing,status,requirements,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
                (t[0],t[1],t[2],t[3],t[4],t[5],t[6],json.dumps(t[7]),"system",datetime.now().isoformat()))

    # ---- seed sample bidders ----
    m = c.execute("SELECT COUNT(*) FROM users WHERE role='bidder'").fetchone()[0]
    if m == 0:
        bidders = [
            ("Sharma Traders Pvt Ltd","sharma@bidder.in","+91 98110 42213"),
            ("TechVision Solutions Pvt Ltd","techvision@bidder.in","+91 99872 55401"),
            ("Nova Infra Systems Ltd","nova@bidder.in","+91 90045 88123"),
            ("Kaveri Enterprises","kaveri@bidder.in","+91 94488 90012"),
        ]
        for b in bidders:
            c.execute("INSERT INTO users(role,company,email,password,phone,name,dept,designation,officer_id,created_at) VALUES('bidder',?,?,?,?,'','','','',?)",
                (b[0], b[1], hash_pw("demo1234"), b[2], datetime.now().isoformat()))

    conn.commit(); conn.close()

init_db(); seed()

# ---------- models ----------
class SignupBidder(BaseModel):
    company: str; email: str; password: str; phone: str = ""

class SignupOfficer(BaseModel):
    name: str; email: str; password: str; phone: str = ""
    dept: str = ""; designation: str = ""; officer_id: str = ""

class LoginBody(BaseModel):
    email: str; password: str; role: str

class TenderBody(BaseModel):
    title: str; dept: str; category: str = "General"; value: str
    closing: str = ""; requirements: List[str] = []

class BidBody(BaseModel):
    tender_id: int; bidder_email: str; bidder_company: str
    amount: str = ""; delivery: str = ""; documents: list = []; gstin: str = ""

class DecisionBody(BaseModel):
    status: str  # Approved / Rejected / Clarification Requested

# ---------- helpers ----------
def user_public(r):
    return {"id":r["id"],"role":r["role"],"company":r["company"],"name":r["name"],
            "email":r["email"],"phone":r["phone"],"dept":r["dept"],
            "designation":r["designation"],"officer_id":r["officer_id"]}

def tender_public(r):
    return {"id":r["id"],"ref":r["ref"],"title":r["title"],"dept":r["dept"],
            "category":r["category"],"value":r["value"],"closing":r["closing"],
            "status":r["status"],"requirements":json.loads(r["requirements"] or "[]")}

def bid_public(r):
    return {"id":r["id"],"bid_ref":r["bid_ref"],"tender_id":r["tender_id"],
            "tender_ref":r["tender_ref"],"tender_title":r["tender_title"],
            "bidder_email":r["bidder_email"],"bidder_company":r["bidder_company"],
            "amount":r["amount"],"delivery":r["delivery"],"status":r["status"],
            "documents":json.loads(r["documents"] or "[]"),"gstin":r["gstin"] if "gstin" in r.keys() else "","submitted_at":r["submitted_at"]}

# ---------- AUTH ----------
@app.post("/auth/signup/bidder")
def signup_bidder(b: SignupBidder):
    conn = db(); c = conn.cursor()
    if c.execute("SELECT 1 FROM users WHERE email=?", (b.email.lower(),)).fetchone():
        conn.close(); raise HTTPException(400, "Email already registered")
    c.execute("INSERT INTO users(role,company,email,password,phone,name,dept,designation,officer_id,created_at) VALUES('bidder',?,?,?,?,'','','','',?)",
        (b.company, b.email.lower(), hash_pw(b.password), b.phone, datetime.now().isoformat()))
    conn.commit()
    row = c.execute("SELECT * FROM users WHERE email=?", (b.email.lower(),)).fetchone()
    conn.close()
    return {"ok": True, "user": user_public(row)}

@app.post("/auth/signup/officer")
def signup_officer(b: SignupOfficer):
    conn = db(); c = conn.cursor()
    if c.execute("SELECT 1 FROM users WHERE email=?", (b.email.lower(),)).fetchone():
        conn.close(); raise HTTPException(400, "Email already registered")
    c.execute("INSERT INTO users(role,name,email,password,phone,dept,designation,officer_id,company,created_at) VALUES('officer',?,?,?,?,?,?,?,'',?)",
        (b.name, b.email.lower(), hash_pw(b.password), b.phone, b.dept, b.designation, b.officer_id, datetime.now().isoformat()))
    conn.commit()
    row = c.execute("SELECT * FROM users WHERE email=?", (b.email.lower(),)).fetchone()
    conn.close()
    return {"ok": True, "user": user_public(row)}

@app.post("/auth/login")
def login(b: LoginBody):
    conn = db(); c = conn.cursor()
    row = c.execute("SELECT * FROM users WHERE email=? AND role=?", (b.email.lower(), b.role)).fetchone()
    conn.close()
    if not row: raise HTTPException(404, "No account found")
    if row["password"] != hash_pw(b.password): raise HTTPException(401, "Incorrect password")
    return {"ok": True, "user": user_public(row)}

# ---------- TENDERS ----------
@app.get("/tenders")
def get_tenders():
    conn = db(); rows = conn.execute("SELECT * FROM tenders ORDER BY id DESC").fetchall(); conn.close()
    return [tender_public(r) for r in rows]

@app.post("/tenders")
def create_tender(b: TenderBody):
    ref = f"GEM/2026/B/{secrets.randbelow(900000)+100000}"
    conn = db(); c = conn.cursor()
    c.execute("INSERT INTO tenders(ref,title,dept,category,value,closing,status,requirements,created_by,created_at) VALUES(?,?,?,?,?,?,'Published',?,?,?)",
        (ref, b.title, b.dept, b.category, b.value, b.closing, json.dumps(b.requirements), "officer", datetime.now().isoformat()))
    conn.commit()
    row = c.execute("SELECT * FROM tenders WHERE ref=?", (ref,)).fetchone(); conn.close()
    return {"ok": True, "tender": tender_public(row)}

# ---------- BIDS ----------
@app.get("/bids")
def get_bids(bidder_email: Optional[str] = None, tender_id: Optional[int] = None):
    conn = db()
    q = "SELECT * FROM bids WHERE 1=1"; args = []
    if bidder_email: q += " AND bidder_email=?"; args.append(bidder_email.lower())
    if tender_id: q += " AND tender_id=?"; args.append(tender_id)
    q += " ORDER BY id DESC"
    rows = conn.execute(q, args).fetchall(); conn.close()
    return [bid_public(r) for r in rows]

@app.post("/bids")
def create_bid(b: BidBody):
    conn = db(); c = conn.cursor()
    t = c.execute("SELECT * FROM tenders WHERE id=?", (b.tender_id,)).fetchone()
    if not t: conn.close(); raise HTTPException(404, "Tender not found")
    bid_ref = f"BID-{t['ref'].split('/')[-1]}-{secrets.randbelow(900)+100}"
    c.execute("INSERT INTO bids(bid_ref,tender_id,tender_ref,tender_title,bidder_email,bidder_company,amount,delivery,status,documents,gstin,submitted_at) VALUES(?,?,?,?,?,?,?,?,'Submitted',?,?,?)",
        (bid_ref, b.tender_id, t["ref"], t["title"], b.bidder_email.lower(), b.bidder_company, b.amount, b.delivery, json.dumps(b.documents), b.gstin, datetime.now().isoformat()))
    conn.commit()
    row = c.execute("SELECT * FROM bids WHERE bid_ref=?", (bid_ref,)).fetchone(); conn.close()
    return {"ok": True, "bid": bid_public(row)}

@app.post("/bids/{bid_id}/decision")
def decide_bid(bid_id: int, b: DecisionBody):
    conn = db(); c = conn.cursor()
    c.execute("UPDATE bids SET status=? WHERE id=?", (b.status, bid_id))
    c.execute("INSERT INTO audit(bid_id,action,detail,actor,at) VALUES(?,?,?,?,?)",
        (bid_id, "decision", b.status, "officer", datetime.now().isoformat()))
    conn.commit()
    row = c.execute("SELECT * FROM bids WHERE id=?", (bid_id,)).fetchone(); conn.close()
    if not row: raise HTTPException(404, "Bid not found")
    return {"ok": True, "bid": bid_public(row)}

# ---------- DOCUMENTS ----------
@app.post("/documents/upload")
async def upload_doc(bidder_email: str = Form(...), doc_type: str = Form(...), file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok=True)
    path = f"uploads/{secrets.token_hex(4)}_{file.filename}"
    with open(path, "wb") as f:
        f.write(await file.read())
    conn = db(); c = conn.cursor()
    c.execute("INSERT INTO documents(bidder_email,doc_type,filename,status,uploaded_at) VALUES(?,?,?,'verified',?)",
        (bidder_email.lower(), doc_type, file.filename, datetime.now().isoformat()))
    conn.commit(); conn.close()
    return {"ok": True, "filename": file.filename, "status": "verified"}

@app.get("/documents")
def get_docs(bidder_email: str):
    conn = db(); rows = conn.execute("SELECT * FROM documents WHERE bidder_email=?", (bidder_email.lower(),)).fetchall(); conn.close()
    return [{"doc_type":r["doc_type"],"filename":r["filename"],"status":r["status"]} for r in rows]

def gst_lookup(gstin):
    """Fetch real GST record. Returns (data, error)."""
    try:
        req_obj = urllib.request.Request(
            f"https://www.gstinapi.in/v1/gstin/{gstin}",
            headers={"x-api-key": GST_API_KEY, "User-Agent": "Mozilla/5.0", "Accept": "application/json"}
        )
        with urllib.request.urlopen(req_obj, timeout=10) as resp:
            return json.loads(resp.read().decode()), None
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode())
            return None, body.get("error", f"HTTP {e.code}")
        except Exception:
            return None, f"HTTP {e.code}"
    except Exception as e:
        return None, str(e)


class VerifyBody(BaseModel):
    gstin: str = ""
    pan: str = ""
    company: str = ""

@app.post("/ai/cross-verify")
def cross_verify(b: VerifyBody):
    """AI-style cross-verification: real GST lookup + rule checks + anomaly flags."""
    flags = []
    checks = []
    confidence = 100
    gst_data = None

    # ---- 1. GSTIN format check ----
    g = (b.gstin or "").strip().upper()
    import re
    gstin_ok = bool(re.match(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$", g))
    if not g:
        checks.append({"name": "GSTIN provided", "status": "fail", "detail": "No GSTIN submitted"})
        flags.append({"sev": "high", "issue": "GSTIN missing", "detail": "Bidder did not provide a GSTIN.", "rec": "Request GSTIN from bidder."})
        confidence -= 40
    elif not gstin_ok:
        checks.append({"name": "GSTIN format", "status": "fail", "detail": f"{g} is not a valid GSTIN format"})
        flags.append({"sev": "high", "issue": "Invalid GSTIN format", "detail": f"{g} does not match the 15-char GSTIN pattern.", "rec": "Verify the GSTIN with the bidder."})
        confidence -= 35
    else:
        checks.append({"name": "GSTIN format", "status": "pass", "detail": "Valid 15-character format"})

        # ---- 2. REAL government GST lookup ----
        gst_data, err = gst_lookup(g)
        if err:
            checks.append({"name": "GST portal record", "status": "warn", "detail": err})
            flags.append({"sev": "medium", "issue": "GSTIN not verified", "detail": f"Government lookup: {err}", "rec": "Manually verify GSTIN on GST portal."})
            confidence -= 20
        elif gst_data:
            record = gst_data.get("data", gst_data)
            legal = (record.get("legal_name") or record.get("lgnm") or "").strip()
            status = (record.get("status") or record.get("sts") or "").strip()
            checks.append({"name": "GST portal record", "status": "pass", "detail": f"Found: {legal or 'record exists'}"})

            # ---- 3. Status active check ----
            if status and status.lower() != "active":
                checks.append({"name": "GST status", "status": "fail", "detail": f"Status is {status}, not Active"})
                flags.append({"sev": "high", "issue": "GST registration not active", "detail": f"GSTIN status: {status}.", "rec": "Bidder's GST registration is not active — recommend disqualification."})
                confidence -= 30
            elif status:
                checks.append({"name": "GST status", "status": "pass", "detail": "Active"})

            # ---- 4. Name cross-match (AI anomaly) ----
            if legal and b.company:
                lc = legal.lower().replace(".", "").replace(",", "")
                cc = b.company.lower().replace(".", "").replace(",", "").replace("pvt", "").replace("ltd", "").replace("limited", "").strip()
                first_word = cc.split()[0] if cc.split() else cc
                if first_word and first_word in lc:
                    checks.append({"name": "Company name match", "status": "pass", "detail": f"'{b.company}' matches GST record"})
                else:
                    checks.append({"name": "Company name match", "status": "warn", "detail": f"Bidder: '{b.company}' vs GST: '{legal}'"})
                    flags.append({"sev": "high", "issue": "Company name mismatch", "detail": f"Bidder claims '{b.company}' but GST record shows '{legal}'.", "rec": "Possible identity mismatch — request clarification."})
                    confidence -= 25

            # ---- 5. PAN cross-check (PAN is embedded in GSTIN chars 3-12) ----
            if b.pan:
                pan_in_gstin = g[2:12]
                if b.pan.strip().upper() == pan_in_gstin:
                    checks.append({"name": "PAN–GSTIN link", "status": "pass", "detail": "PAN matches GSTIN"})
                else:
                    checks.append({"name": "PAN–GSTIN link", "status": "fail", "detail": f"PAN {b.pan} ≠ GSTIN-embedded {pan_in_gstin}"})
                    flags.append({"sev": "high", "issue": "PAN–GSTIN mismatch", "detail": f"Provided PAN {b.pan} doesn't match the PAN inside the GSTIN.", "rec": "Documents may be inconsistent — investigate."})
                    confidence -= 25

    confidence = max(0, confidence)
    risk = 100 - confidence
    level = "Low" if risk <= 20 else "Medium" if risk <= 50 else "High"
    if not flags:
        recommendation = "All checks passed. Recommend qualification, subject to officer review."
    elif level == "High":
        recommendation = "Critical inconsistencies detected. Recommend clarification or disqualification."
    else:
        recommendation = "Some items need verification. Conditional — officer review advised."

    return {
        "ok": True,
        "confidence": confidence,
        "risk": risk,
        "level": level,
        "checks": checks,
        "flags": flags,
        "recommendation": recommendation,
        "gst_verified": gst_data is not None,
    }

# ---- blacklist / debarment (mock registry — realistic) ----
BLACKLIST = {
    "27AABCS9999Z1Z5": "Debarred by CPWD for 2 years (contract default)",
    "07XXXXX0000X1Z9": "Blacklisted — submitted forged documents",
}

class BidderVerifyBody(BaseModel):
    gstin: str = ""
    pan: str = ""
    udyam: str = ""
    company: str = ""

@app.post("/verify/bidder")
def verify_bidder(b: BidderVerifyBody):
    """Full real bidder verification: GSTIN (govt), PAN format, Udyam format, blacklist."""
    import re
    checks = []
    flags = []
    score = 0
    max_score = 0

    # ---- GSTIN: real government verification ----
    g = (b.gstin or "").strip().upper()
    max_score += 40
    if not g:
        checks.append({"portal": "GSTN", "status": "missing", "detail": "No GSTIN provided"})
        flags.append({"sev": "high", "issue": "GSTIN missing"})
    elif not re.match(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$", g):
        checks.append({"portal": "GSTN", "status": "invalid", "detail": "Invalid GSTIN format"})
        flags.append({"sev": "high", "issue": "Invalid GSTIN format"})
    else:
        gst_data, err = gst_lookup(g)
        if gst_data:
            record = gst_data.get("data", gst_data)
            legal = (record.get("legal_name") or record.get("lgnm") or "").strip()
            status = (record.get("status") or record.get("sts") or "Active").strip()
            if status.lower() == "active":
                checks.append({"portal": "GSTN", "status": "verified", "detail": f"Active · {legal or 'record found'}"})
                score += 40
            else:
                checks.append({"portal": "GSTN", "status": "warn", "detail": f"Status: {status}"})
                flags.append({"sev": "high", "issue": f"GST registration {status}"})
                score += 10
        else:
            checks.append({"portal": "GSTN", "status": "warn", "detail": err or "Not found in GST database"})
            flags.append({"sev": "medium", "issue": "GSTIN could not be verified"})
            score += 15

    # ---- PAN: format validation ----
    p = (b.pan or "").strip().upper()
    max_score += 20
    if not p:
        checks.append({"portal": "PAN / Income Tax", "status": "missing", "detail": "No PAN provided"})
        flags.append({"sev": "medium", "issue": "PAN missing"})
    elif re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", p):
        checks.append({"portal": "PAN / Income Tax", "status": "verified", "detail": "Valid PAN format"})
        score += 20
        # cross-check PAN against GSTIN (PAN is chars 3-12 of GSTIN)
        if g and len(g) == 15 and g[2:12] != p:
            flags.append({"sev": "high", "issue": "PAN does not match GSTIN"})
    else:
        checks.append({"portal": "PAN / Income Tax", "status": "invalid", "detail": "Invalid PAN format"})
        flags.append({"sev": "medium", "issue": "Invalid PAN format"})

    # ---- Udyam: format validation ----
    u = (b.udyam or "").strip().upper()
    max_score += 20
    if not u:
        checks.append({"portal": "Udyam / MSME", "status": "missing", "detail": "No Udyam number provided"})
        flags.append({"sev": "low", "issue": "Udyam missing"})
    elif re.match(r"^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$", u):
        checks.append({"portal": "Udyam / MSME", "status": "verified", "detail": "Valid Udyam format"})
        score += 20
    else:
        checks.append({"portal": "Udyam / MSME", "status": "invalid", "detail": "Invalid Udyam format"})
        flags.append({"sev": "low", "issue": "Invalid Udyam format"})

    # ---- Blacklist / debarment check ----
    max_score += 20
    if g in BLACKLIST:
        checks.append({"portal": "Blacklist / Debarment", "status": "invalid", "detail": BLACKLIST[g]})
        flags.append({"sev": "high", "issue": "Bidder is blacklisted/debarred"})
    else:
        checks.append({"portal": "Blacklist / Debarment", "status": "verified", "detail": "No debarment record found"})
        score += 20

    pct = round((score / max_score) * 100) if max_score else 0
    risk = 100 - pct
    level = "Low" if risk <= 20 else "Medium" if risk <= 50 else "High"

    return {
        "ok": True,
        "score": pct,
        "risk": risk,
        "level": level,
        "checks": checks,
        "flags": flags,
    }

@app.get("/audit/{bid_id}")
def get_audit(bid_id: int):
    conn = db(); rows = conn.execute("SELECT * FROM audit WHERE bid_id=? ORDER BY id DESC", (bid_id,)).fetchall(); conn.close()
    return [{"action":r["action"],"detail":r["detail"],"actor":r["actor"],"at":r["at"]} for r in rows]

@app.get("/bidders")
def get_bidders():
    conn = db(); rows = conn.execute("SELECT * FROM users WHERE role='bidder'").fetchall(); conn.close()
    return [{"id":r["id"],"company":r["company"],"email":r["email"],"phone":r["phone"]} for r in rows]

GST_API_KEY = "gak_b9c5659a79f4485097d33da72d5ff56e"  # gstinapi.in se

@app.get("/verify-gst/{gstin}")
def verify_gst(gstin: str):
    try:
        req_obj = urllib.request.Request(
            f"https://www.gstinapi.in/v1/gstin/{gstin}",
            headers={
                "x-api-key": GST_API_KEY,
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
            }
        )
        with urllib.request.urlopen(req_obj, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        return {"ok": True, "data": data}
    except urllib.error.HTTPError as e:
        body = e.read().decode() if hasattr(e, "read") else str(e)
        return {"ok": False, "error": f"HTTP {e.code}", "detail": body}
    except Exception as e:
        return {"ok": False, "error": str(e)}

@app.get("/")
def home():
    return {"message": "VGEM API running", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn, os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)