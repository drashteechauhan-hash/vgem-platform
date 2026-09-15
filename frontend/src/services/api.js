export const API_BASE = "https://vgem-platform.onrender.com";

async function req(path, options = {}) {
  try {
    const res = await fetch(API_BASE + path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.detail || "Request failed" };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: "Cannot reach backend" };
  }
}

// ---- AUTH ----
export const signupBidder = (b) => req("/auth/signup/bidder", { method: "POST", body: JSON.stringify(b) });
export const signupOfficer = (b) => req("/auth/signup/officer", { method: "POST", body: JSON.stringify(b) });
export const loginUser = (b) => req("/auth/login", { method: "POST", body: JSON.stringify(b) });

// ---- TENDERS ----
export const getTenders = () => req("/tenders");
export const createTender = (b) => req("/tenders", { method: "POST", body: JSON.stringify(b) });

// ---- BIDS ----
export const getBids = (q = "") => req("/bids" + q);
export const createBid = (b) => req("/bids", { method: "POST", body: JSON.stringify(b) });
export const decideBid = (id, status) => req(`/bids/${id}/decision`, { method: "POST", body: JSON.stringify({ status }) });

// ---- DOCUMENTS ----
export const getDocuments = (email) => req(`/documents?bidder_email=${encodeURIComponent(email)}`);
export async function uploadDocument(email, docType, file) {
  const fd = new FormData();
  fd.append("bidder_email", email);
  fd.append("doc_type", docType);
  fd.append("file", file);
  try {
    const res = await fetch(API_BASE + "/documents/upload", { method: "POST", body: fd });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch { return { ok: false, error: "Upload failed" }; }
}

// ---- health ----
export const ping = () => req("/tenders");

// ---- compatibility aliases (officer pages use these names) ----
export const getBidders = () => req("/bidders");
export const getSubmissions = () => req("/bids");
export const getSubmission = (id) => req(`/bids?tender_id=${id}`);
export const getCompliance = (id) => req(`/bids`);
export const getBidderDocuments = (email) => getDocuments(email);
export const getBidderProfile = () => ({ ok: false });
export const getBidderCompliance = () => ({ ok: false });
export const getBidderBids = () => ({ ok: false });
export const extractDocument = () => ({ ok: false });

// ---- real GST verify + audit ----
export const verifyGST = (gstin) => req(`/verify-gst/${gstin}`);
export const getAudit = (bidId) => req(`/audit/${bidId}`);

export const crossVerify = (body) => req("/ai/cross-verify", { method: "POST", body: JSON.stringify(body) });

export const verifyBidder = (body) => req("/verify/bidder", { method: "POST", body: JSON.stringify(body) });