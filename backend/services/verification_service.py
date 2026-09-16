"""Deterministic verification pipeline (rule-based, no ML).

This is the SAME logic that was inside main.py, moved out unchanged. It combines:
- format validation (GSTIN / PAN / Udyam regex)   -> deterministic
- real GST lookup (via gst_service)               -> real government API
- PAN <-> GSTIN consistency check                 -> deterministic
- company-name match                              -> deterministic business rule
- blacklist / debarment lookup (via DB service)   -> database lookup

No machine-learning model is used. The functions return the EXACT same response
shapes the original /ai/cross-verify and /verify/bidder endpoints returned, so
the frontend is unaffected.
"""
import re

from services import gst_service, blacklist_service

GSTIN_RE = r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$"
PAN_RE = r"^[A-Z]{5}[0-9]{4}[A-Z]$"
UDYAM_RE = r"^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$"


def cross_verify(gstin: str = "", pan: str = "", company: str = ""):
    """Rule-based cross-verification: real GST lookup + anomaly flags."""
    flags = []
    checks = []
    confidence = 100
    gst_data = None

    # ---- 1. GSTIN format check ----
    g = (gstin or "").strip().upper()
    gstin_ok = bool(re.match(GSTIN_RE, g))
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
        gst_data, err = gst_service.gst_lookup(g)
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

            # ---- 4. Name cross-match ----
            if legal and company:
                lc = legal.lower().replace(".", "").replace(",", "")
                cc = company.lower().replace(".", "").replace(",", "").replace("pvt", "").replace("ltd", "").replace("limited", "").strip()
                first_word = cc.split()[0] if cc.split() else cc
                if first_word and first_word in lc:
                    checks.append({"name": "Company name match", "status": "pass", "detail": f"'{company}' matches GST record"})
                else:
                    checks.append({"name": "Company name match", "status": "warn", "detail": f"Bidder: '{company}' vs GST: '{legal}'"})
                    flags.append({"sev": "high", "issue": "Company name mismatch", "detail": f"Bidder claims '{company}' but GST record shows '{legal}'.", "rec": "Possible identity mismatch — request clarification."})
                    confidence -= 25

            # ---- 5. PAN cross-check (PAN is embedded in GSTIN chars 3-12) ----
            if pan:
                pan_in_gstin = g[2:12]
                if pan.strip().upper() == pan_in_gstin:
                    checks.append({"name": "PAN–GSTIN link", "status": "pass", "detail": "PAN matches GSTIN"})
                else:
                    checks.append({"name": "PAN–GSTIN link", "status": "fail", "detail": f"PAN {pan} ≠ GSTIN-embedded {pan_in_gstin}"})
                    flags.append({"sev": "high", "issue": "PAN–GSTIN mismatch", "detail": f"Provided PAN {pan} doesn't match the PAN inside the GSTIN.", "rec": "Documents may be inconsistent — investigate."})
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


def verify_bidder(gstin: str = "", pan: str = "", udyam: str = "", company: str = ""):
    """Full bidder verification: GSTIN (govt), PAN format, Udyam format, blacklist."""
    checks = []
    flags = []
    score = 0
    max_score = 0

    # ---- GSTIN: real government verification ----
    g = (gstin or "").strip().upper()
    max_score += 40
    if not g:
        checks.append({"portal": "GSTN", "status": "missing", "detail": "No GSTIN provided"})
        flags.append({"sev": "high", "issue": "GSTIN missing"})
    elif not re.match(GSTIN_RE, g):
        checks.append({"portal": "GSTN", "status": "invalid", "detail": "Invalid GSTIN format"})
        flags.append({"sev": "high", "issue": "Invalid GSTIN format"})
    else:
        gst_data, err = gst_service.gst_lookup(g)
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
    p = (pan or "").strip().upper()
    max_score += 20
    if not p:
        checks.append({"portal": "PAN / Income Tax", "status": "missing", "detail": "No PAN provided"})
        flags.append({"sev": "medium", "issue": "PAN missing"})
    elif re.match(PAN_RE, p):
        checks.append({"portal": "PAN / Income Tax", "status": "verified", "detail": "Valid PAN format"})
        score += 20
        # cross-check PAN against GSTIN (PAN is chars 3-12 of GSTIN)
        if g and len(g) == 15 and g[2:12] != p:
            flags.append({"sev": "high", "issue": "PAN does not match GSTIN"})
    else:
        checks.append({"portal": "PAN / Income Tax", "status": "invalid", "detail": "Invalid PAN format"})
        flags.append({"sev": "medium", "issue": "Invalid PAN format"})

    # ---- Udyam: format validation ----
    u = (udyam or "").strip().upper()
    max_score += 20
    if not u:
        checks.append({"portal": "Udyam / MSME", "status": "missing", "detail": "No Udyam number provided"})
        flags.append({"sev": "low", "issue": "Udyam missing"})
    elif re.match(UDYAM_RE, u):
        checks.append({"portal": "Udyam / MSME", "status": "verified", "detail": "Valid Udyam format"})
        score += 20
    else:
        checks.append({"portal": "Udyam / MSME", "status": "invalid", "detail": "Invalid Udyam format"})
        flags.append({"sev": "low", "issue": "Invalid Udyam format"})

    # ---- Blacklist / debarment / suspension check (DB-backed) ----
    # Frontend reads portal/status/detail (kept identical). The full restriction
    # record is attached as extra keys — unknown keys are ignored by the UI.
    max_score += 20
    rec = blacklist_service.lookup(g)
    if rec:
        check = {"portal": "Blacklist / Debarment", "status": "invalid", "detail": rec["reason"]}
        check.update({
            "restriction_found": True,
            "restriction_type": rec["restriction_type"],
            "entity_name": rec["entity_name"],
            "issuing_authority": rec["issuing_authority"],
            "order_reference": rec["order_reference"],
            "start_date": rec["start_date"],
            "end_date": rec["end_date"],
            "source": rec["source"],
            "source_url": rec["source_url"],
            "verification_status": rec["verification_status"],
        })
        checks.append(check)
        flags.append({"sev": "high", "issue": "Bidder is blacklisted/debarred"})
    else:
        checks.append({"portal": "Blacklist / Debarment", "status": "verified",
                       "detail": "No debarment record found", "restriction_found": False})
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
