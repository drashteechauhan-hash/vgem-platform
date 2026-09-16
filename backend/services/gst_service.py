"""Real government GST verification (gstinapi.in).

This is UNCHANGED in behaviour from the original main.py — same endpoint, same
headers, same response handling. The ONLY difference: the API key is now read
from the GST_API_KEY environment variable instead of being hardcoded in source.

Two callers, one implementation:
- gst_lookup(gstin)   -> (data|None, error|None)   used by verification pipeline
- verify_gstin(gstin) -> {"ok": ..., "data"/"error": ...}  used by GET /verify-gst
"""
import json
import os
import urllib.request
import urllib.error

# Read from environment. Never hardcode the key in source or commit it.
GST_API_KEY = os.environ.get("GST_API_KEY", "")
GST_URL = "https://www.gstinapi.in/v1/gstin/"


def _request(gstin: str):
    req_obj = urllib.request.Request(
        f"{GST_URL}{gstin}",
        headers={
            "x-api-key": GST_API_KEY,
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req_obj, timeout=10) as resp:
        return json.loads(resp.read().decode())


def gst_lookup(gstin: str):
    """Fetch real GST record. Returns (data, error) — same contract as before."""
    if not GST_API_KEY:
        return None, "GST_API_KEY not configured"
    try:
        return _request(gstin), None
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode())
            return None, body.get("error", f"HTTP {e.code}")
        except Exception:
            return None, f"HTTP {e.code}"
    except Exception as e:
        return None, str(e)


def verify_gstin(gstin: str):
    """Backing logic for GET /verify-gst/{gstin}. Same response shape as before."""
    if not GST_API_KEY:
        return {"ok": False, "error": "GST_API_KEY not configured"}
    try:
        data = _request(gstin)
        return {"ok": True, "data": data}
    except urllib.error.HTTPError as e:
        body = e.read().decode() if hasattr(e, "read") else str(e)
        return {"ok": False, "error": f"HTTP {e.code}", "detail": body}
    except Exception as e:
        return {"ok": False, "error": str(e)}
