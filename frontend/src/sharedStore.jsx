import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getTenders, createTender, getBids, createBid, decideBid } from "./services/api";

const Ctx = createContext(null);
export const useShared = () => useContext(Ctx);

export const REQ_LABEL = {
  gst: "GST Registration", pan: "PAN", udyam: "Udyam Registration",
  esic: "ESIC Compliance", bis: "BIS Certification", epfo: "EPFO",
};

export function SharedProvider({ children }) {
  const [tenders, setTenders] = useState([]);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);

  // load tenders + bids from backend on start
     const refresh = useCallback(async () => {
    const t = await getTenders();
    if (t.ok) setTenders(t.data.map(mapTender));
    const b = await getBids();
    if (b.ok) setBids(b.data.map(mapBid));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // officer publishes a tender -> save to backend
  const publishTender = useCallback(async (t) => {
    const res = await createTender({
      title: t.title, dept: t.dept, category: t.cat || t.category || "General",
      value: t.value, closing: t.closing || "",
      requirements: (t.requirements || []).map((r) => r.key || r),
    });
    if (res.ok) {
      setTenders((ts) => [mapTender(res.data.tender), ...ts]);
      return res.data.tender.ref;
    }
    return null;
  }, []);

  // bidder submits a bid -> save to backend
     const submitBid = useCallback(async (bid) => {
    const res = await createBid({
      tender_id: bid.tenderDbId || bid.tender_id,
      bidder_email: bid.bidderId || bid.bidder_email,
      bidder_company: bid.bidder || bid.bidder_company,
      amount: bid.amount || "", delivery: bid.delivery || "",
      gstin: bid.gstin || "",
      documents: bid.documents || [],
    });
    if (res.ok) setBids((bs) => [mapBid(res.data.bid), ...bs]);
    return res.ok;
  }, []);

  // officer decision on a bid
  const decide = useCallback(async (bidId, status) => {
    const res = await decideBid(bidId, status);
    if (res.ok) setBids((bs) => bs.map((b) => (b.dbId === bidId ? { ...b, status } : b)));
    return res.ok;
  }, []);

  const bidsForTender = useCallback((tenderRef) => bids.filter((b) => b.tenderId === tenderRef), [bids]);

  const value = { tenders, bids, loading, publishTender, submitBid, decide, bidsForTender, refresh };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// map backend shape -> frontend shape
function mapTender(t) {
  return {
    dbId: t.id, id: t.ref, title: t.title, dept: t.dept, cat: t.category,
    value: t.value, closing: t.closing, status: t.status,
    requirements: (t.requirements || []).map((k) => ({ key: k, mandatory: true })),
  };
}
function mapBid(b) {
  return {
    dbId: b.id, id: b.bid_ref, tenderId: b.tender_ref, tenderDbId: b.tender_id,
    tenderTitle: b.tender_title, bidder: b.bidder_company, bidderId: b.bidder_email,
    amount: b.amount, delivery: b.delivery, status: b.status,
    deadline: "", documents: b.documents || [],
  };
}