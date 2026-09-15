import { createContext, useContext, useMemo, useState, useEffect } from "react";
import { portals as portalSeed, documents as docSeed, bids as bidSeed, activity as actSeed } from "./data";

const Ctx = createContext(null);
export const useStore = () => useContext(Ctx);
const BIDDER_ID = 1;

export function StoreProvider({ profile, children }) {
  const [portals, setPortals] = useState(portalSeed);
  const [documents, setDocuments] = useState(docSeed);
  const [bids, setBids] = useState(bidSeed);
  const [activity, setActivity] = useState(actSeed);
  const [toast, setToast] = useState(null);

 

    const derived = useMemo(() => {
    const pVerified = portals.filter((p) => p.status === "verified").length;
    const pTotal = portals.length;
    const dVerified = documents.filter((d) => d.status === "verified").length;
    const dTotal = documents.length;
    const openActions =
      portals.filter((p) => p.status === "action").length +
      documents.filter((d) => d.status === "missing" || d.status === "review").length;
    const score = Math.round((pVerified / pTotal) * 70 + (dVerified / dTotal) * 30);
    const risk = score >= 90 ? "Low" : "Medium";
    const portalPct = Math.round((pVerified / pTotal) * 100);

    const issues = [];
    if (portals.find((p) => p.key === "esic")?.status !== "verified")
      issues.push({ key: "esic", label: "ESIC compliance document", state: "Missing", page: "esic" });
    if (documents.find((d) => d.id === "d4")?.status !== "verified")
      issues.push({ key: "itr", label: "ITR (AY 2025-26)", state: "Under review", page: "itr" });
    if (portals.find((p) => p.key === "bis")?.status !== "verified")
      issues.push({ key: "bis", label: "BIS certification", state: "Not linked", page: "bis" });

    const readiness = Math.min(100, 78 + (issues.length === 0 ? 22 : (3 - issues.length) * 7));

    return { pVerified, pTotal, dVerified, dTotal, openActions, score, risk, portalPct, issues, readiness };
  }, [portals, documents]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  const logActivity = (text) =>
    setActivity((a) => [{ icon: "check", text, time: "just now", tone: "ok" }, ...a]);

  // upload / resolve helpers
  const uploadDoc = (id, fileName) => {
    setDocuments((docs) => docs.map((d) => (d.id === id ? { ...d, status: "review", size: fileName } : d)));
    setTimeout(() => {
      setDocuments((docs) => docs.map((d) => (d.id === id ? { ...d, status: "verified" } : d)));
      const doc = docSeed.find((d) => d.id === id);
      logActivity(`${doc ? doc.label : "Document"} verified`);
      if (id === "d5") resolveEsic(true);
    }, 1700);
  };

  // ESIC: missing -> under review (after upload) -> verified
  const resolveEsic = (silent) => {
    setPortals((ps) => ps.map((p) => (p.key === "esic"
      ? { ...p, status: "verified", ref: "Compliance proof uploaded", note: "ESIC compliance verified.", updated: "just now" } : p)));
    if (!silent) { logActivity("ESIC compliance verified"); showToast("ESIC compliance verified"); }
  };
  const submitEsic = (fileName) => {
    setPortals((ps) => ps.map((p) => (p.key === "esic"
      ? { ...p, status: "pending", ref: fileName, note: "Under review.", updated: "just now" } : p)));
    setDocuments((docs) => docs.map((d) => (d.id === "d5" ? { ...d, status: "review", size: fileName } : d)));
    showToast("Document uploaded — under review");
    setTimeout(() => resolveEsic(false), 1800);
  };

  const verifyItr = () => {
    setDocuments((docs) => docs.map((d) => (d.id === "d4" ? { ...d, status: "verified" } : d)));
    logActivity("ITR (AY 2025-26) verified");
    showToast("ITR verified");
  };

  const linkBis = (certNo) => {
    setPortals((ps) => ps.map((p) => (p.key === "bis"
      ? { ...p, status: "verified", ref: certNo || "BIS linked", note: "BIS certification linked.", updated: "just now" } : p)));
    logActivity("BIS certification linked");
    showToast("BIS certification linked");
  };

  const value = { profile, portals, documents, bids, activity, derived, toast,
    uploadDoc, submitEsic, verifyItr, linkBis, showToast };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function mapStatus(s) {
  const v = (s || "").toLowerCase();
  if (["verified", "compliant", "passed", "completed"].includes(v)) return "verified";
  if (["action", "missing", "non-compliant", "failed"].includes(v)) return "action";
  return "pending";
}