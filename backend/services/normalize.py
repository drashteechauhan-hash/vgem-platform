"""Normalization helpers — shared by the verification service and the import
scripts so that lookups and duplicate-detection behave consistently.

Kept dependency-free (pure Python) and deterministic.
"""
import re

# Canonical restriction types.
BLACKLISTED = "BLACKLISTED"
DEBARRED = "DEBARRED"
SUSPENDED = "SUSPENDED"
OTHER_RESTRICTION = "OTHER_RESTRICTION"
RESTRICTION_TYPES = {BLACKLISTED, DEBARRED, SUSPENDED, OTHER_RESTRICTION}

# Company-name noise words removed before comparison (kept small to avoid
# collapsing genuinely different entities together).
_NAME_NOISE = {"PVT", "PRIVATE", "LTD", "LIMITED", "LLP", "AND", "THE", "CO", "COMPANY"}

_GSTIN_RE = re.compile(r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$")
_PAN_RE = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
_UDYAM_RE = re.compile(r"^UDYAM-[A-Z]{2}-[0-9]{2}-[0-9]{7}$")


def normalize_identifier(value: str) -> str:
    """Uppercase and strip all whitespace. Hyphens (Udyam) are preserved."""
    if not value:
        return ""
    return re.sub(r"\s+", "", str(value)).upper()


def normalize_name(value: str) -> str:
    """Uppercase, drop punctuation and common suffix noise, collapse spaces."""
    if not value:
        return ""
    s = re.sub(r"[^A-Za-z0-9 ]+", " ", str(value)).upper()
    tokens = [t for t in s.split() if t and t not in _NAME_NOISE]
    return " ".join(tokens).strip()


def detect_identifier_type(value: str) -> str:
    """Best-effort classification of an identifier string."""
    v = normalize_identifier(value)
    if not v:
        return "UNKNOWN"
    if _GSTIN_RE.match(v):
        return "GSTIN"
    if _UDYAM_RE.match(v):
        return "UDYAM"
    if _PAN_RE.match(v):
        return "PAN"
    return "UNKNOWN"


def normalize_restriction_type(value: str) -> str:
    """Map any free-text restriction label to one of the canonical enums."""
    v = (value or "").strip().upper().replace("-", "_").replace(" ", "_")
    if not v:
        return OTHER_RESTRICTION
    if v in RESTRICTION_TYPES:
        return v
    if "BLACKLIST" in v or "BLACK_LIST" in v or "BANNED" in v or "BAN" == v:
        return BLACKLISTED
    if "DEBAR" in v:
        return DEBARRED
    if "SUSPEN" in v:
        return SUSPENDED
    return OTHER_RESTRICTION


def make_dedup_key(identifier_value: str, restriction_type: str, order_reference: str = "") -> str:
    """Stable key used to detect the same entity+order across imports."""
    ident = normalize_identifier(identifier_value)
    rtype = normalize_restriction_type(restriction_type)
    ref = normalize_identifier(order_reference)
    return f"{ident}|{rtype}|{ref}"
