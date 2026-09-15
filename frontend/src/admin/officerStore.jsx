import { createContext, useContext, useMemo, useState } from "react";
import { officerStats, seedBids, seedActivity } from "./officerData";

const Ctx = createContext(null);
export const useOfficer = () => useContext(Ctx);

export function OfficerProvider({ children }) {
  const [bids, setBids] = useState(seedBids);
  const [activity, setActivity] = useState(seedActivity);
  const [toast, setToast] = useState(null);

  const stats = useMemo(() => {
    const pending = bids.filter((b) => b.status === "Awaiting Review").length;
    const flagged = bids.filter((b) => b.flags.length > 0 && b.status === "Awaiting Review").length;
    const highRisk = bids.filter((b) => b.level === "high" && b.status === "Awaiting Review").length;
    const approved = bids.filter((b) => b.status === "Approved").length;
    const rejected = bids.filter((b) => b.status === "Rejected").length;
    return { ...officerStats, pending, flagged, highRisk, approved, rejected };
  }, [bids]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };
  const logActivity = (text) => setActivity((a) => [{ text, time: "just now" }, ...a]);

  const decide = (id, decision) => {
    setBids((bs) => bs.map((b) => (b.id === id ? { ...b, status: decision } : b)));
    const b = bids.find((x) => x.id === id);
    if (decision === "Approved") { logActivity(`Bid #${id} approved`); showToast("Bid approved"); }
    else if (decision === "Rejected") { logActivity(`Bid #${id} rejected`); showToast("Bid rejected"); }
    else { logActivity(`Clarification requested from ${b?.bidder || id}`); showToast("Clarification requested"); }
  };

  const value = { bids, activity, stats, toast, decide, showToast };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}