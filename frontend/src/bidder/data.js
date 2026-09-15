export const stats = (p) => [
  { key: "docs", label: "Documents verified", value: 6, total: 8, icon: "doc" },
  { key: "portals", label: "Portals linked", value: 8, total: 11, icon: "link" },
  { key: "bids", label: "Active bids", value: 4, total: null, icon: "bids" },
  { key: "actions", label: "Actions needed", value: 3, total: null, icon: "alert" },
];

export const portals = [
  { key: "udyam", label: "Udyam / MSME", status: "verified", ref: "", note: "Micro enterprise, valid.", updated: "2 days ago" },
  { key: "gstn", label: "GSTN", status: "verified", ref: "GSTR-3B · 12/12 filed", note: "All returns filed on time.", updated: "2 hours ago" },
  { key: "pan", label: "PAN / Income Tax", status: "verified", ref: "", note: "PAN active, linked to GSTIN.", updated: "1 day ago" },
  { key: "mca", label: "MCA21", status: "verified", ref: "", note: "Company status: Active.", updated: "5 days ago" },
  { key: "epfo", label: "EPFO", status: "verified", ref: "48 employees covered", note: "Contributions up to date.", updated: "3 days ago" },
  { key: "esic", label: "ESIC", status: "action", ref: "Document missing", note: "Upload latest ESIC compliance proof.", updated: "—" },
  { key: "digilocker", label: "DigiLocker", status: "verified", ref: "3 documents authenticated", note: "Issued documents verified.", updated: "1 day ago" },
  { key: "startup", label: "Startup India", status: "pending", ref: "Verification in progress", note: "DPIIT recognition under review.", updated: "6 hours ago" },
  { key: "nsic", label: "NSIC", status: "pending", ref: "Application submitted", note: "Awaiting NSIC confirmation.", updated: "1 day ago" },
  { key: "makeinindia", label: "Make in India", status: "verified", ref: "Local content: 62%", note: "Meets local content norms.", updated: "4 days ago" },
  { key: "bis", label: "BIS / DPIIT", status: "action", ref: "Not linked", note: "Link BIS certification for applicable items.", updated: "—" },
];

export const documents = [
  { id: "d1", label: "Udyam Registration Certificate", req: true, status: "verified", size: "PDF · 240 KB" },
  { id: "d2", label: "GST Returns (GSTR-3B)", req: true, status: "verified", size: "PDF · 1.1 MB" },
  { id: "d3", label: "PAN Card", req: true, status: "verified", size: "PDF · 180 KB" },
  { id: "d4", label: "Income Tax Return (AY 2025-26)", req: true, status: "review", size: "PDF · 620 KB" },
  { id: "d5", label: "EPFO / ESIC Compliance Proof", req: true, status: "missing", size: "" },
  { id: "d6", label: "Company Incorporation (MCA)", req: true, status: "verified", size: "PDF · 410 KB" },
  { id: "d7", label: "Local Content Declaration", req: false, status: "review", size: "PDF · 95 KB" },
  { id: "d8", label: "Bank Solvency Certificate", req: false, status: "missing", size: "" },
];

export const bids = [
  { id: "GEM/2026/4521", title: "Supply of Office Furniture", dept: "CPWD", value: "₹42.5 L", deadline: "12 Sep 2026", stage: 2, score: 87, status: "Under review" },
  { id: "GEM/2026/4498", title: "IT Hardware Procurement", dept: "NIC", value: "₹1.2 Cr", deadline: "08 Sep 2026", stage: 3, score: 92, status: "Qualified" },
  { id: "GEM/2026/4471", title: "Housekeeping Services", dept: "AIIMS Delhi", value: "₹68 L", deadline: "18 Sep 2026", stage: 1, score: 78, status: "Submitted" },
  { id: "GEM/2026/4460", title: "Solar Panel Installation", dept: "MNRE", value: "₹3.1 Cr", deadline: "05 Sep 2026", stage: 1, score: 64, status: "Action needed" },
];

export const actions = [
  { level: "high", title: "ESIC compliance document missing", desc: "Upload your latest ESIC compliance proof to clear this check.", page: "documents" },
  { level: "med", title: "ITR under review", desc: "Ensure the uploaded return is for AY 2025-26 to avoid a mismatch.", page: "documents" },
  { level: "med", title: "BIS certification not linked", desc: "Link BIS certification for applicable product categories.", page: "compliance" },
];

export const activity = [
  { icon: "check", text: "GST return (GSTR-3B) verified", time: "2 hours ago", tone: "ok" },
  { icon: "shield", text: "Udyam certificate re-validated", time: "1 day ago", tone: "ok" },
  { icon: "bids", text: "Applied to tender GEM/2026/4521", time: "2 days ago", tone: "info" },
  { icon: "alert", text: "ESIC compliance flagged by AI engine", time: "3 days ago", tone: "warn" },
];