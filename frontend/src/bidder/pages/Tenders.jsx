import { useShared, REQ_LABEL } from "../../sharedStore";
import { createPortal } from "react-dom";
import { useStore } from "../store";
import BidFlow from "./BidFlow";
import { useState, useMemo } from "react";

export default function BidderTenders({ go }) {
  const { tenders, submitBid } = useShared();
  const { derived, profile } = useStore();
  const [openId, setOpenId] = useState(null);
  const [bidId, setBidId] = useState(null);

  const available = tenders.filter((t) => t.status === "Published");

  const verified = useMemo(() => ({
    gst: true, pan: true, udyam: true,
    esic: !derived.issues.find((i) => i.key === "esic"),
    bis: !derived.issues.find((i) => i.key === "bis"),
    epfo: true,
  }), [derived.issues]);

  const eligibility = (t) => {
    const reqs = t.requirements || [];
    const met = reqs.filter((r) => verified[r.key]).length;
    const pct = reqs.length ? Math.round((met / reqs.length) * 100) : 100;
    const missing = reqs.filter((r) => !verified[r.key]);
    return { pct, missing, total: reqs.length, met };
  };

  const openTender = available.find((t) => t.id === openId);
  const bidTender = available.find((t) => t.id === bidId);

  return (
    <>
      <div className="bt-head">
        <p className="sec-h">Available tenders</p>
        <p className="sec-p">Published tenders you can bid on</p>
      </div>

      <div className="bt-grid stagger">
        {available.map((t) => {
          const el = eligibility(t);
          return (
            <div key={t.id} className="card bt-card">
              <div className="bt-top">
                <span className="bt-id">{t.id}</span>
                <span className={"pill-tag " + (el.missing.length === 0 ? "ok" : "review")}><i /> {el.pct}% ready</span>
              </div>
              <h3 className="bt-title">{t.title}</h3>
              <p className="bt-dept">{t.dept} · {t.cat}</p>
              <div className="bt-meta">
                <div><small>Value</small><strong>{t.value}</strong></div>
                <div><small>Closing</small><strong>{t.closing}</strong></div>
                <div><small>Requirements</small><strong>{el.total}</strong></div>
              </div>
              <button className="bt-view" onClick={() => setOpenId(t.id)}>View tender →</button>
            </div>
          );
        })}
        {available.length === 0 && (
          <div className="card" style={{ padding: 30, color: "#747C76" }}>
            No published tenders yet. Publish one from the Officer Console.
          </div>
        )}
      </div>

      {openTender && (
        <TenderDetail t={openTender} verified={verified} eligibility={eligibility(openTender)}
          onClose={() => setOpenId(null)}
          onStart={() => { setBidId(openTender.id); setOpenId(null); }}
          onResolve={() => { setOpenId(null); go("overview"); }} />
      )}

      {bidTender && (
        <BidFlow tender={bidTender} verified={verified} profile={profile}
          onClose={() => { setBidId(null); go("bids"); }}
          onSubmit={(bid) => submitBid(bid)} />
      )}
    </>
  );
}

function TenderDetail({ t, verified, eligibility, onClose, onStart, onResolve }) {
  return createPortal(
    <div className="bm-overlay">
      <div className="bm-card bt-detail" onClick={(e) => e.stopPropagation()}>
        <button className="bm-x" onClick={onClose}>×</button>
        <span className="bt-id">{t.id}</span>
        <h3 className="bm-title" style={{ marginTop: 6 }}>{t.title}</h3>
        <p className="bm-body">{t.dept} · {t.cat} · Closing {t.closing}</p>

        <div className="bt-sec">
          <h4>Financial details</h4>
          <div className="bt-row"><span>Estimated value</span><b>{t.value}</b></div>
          <div className="bt-row"><span>Submission deadline</span><b>{t.closing}</b></div>
        </div>

        <div className="bt-sec">
          <h4>Eligibility requirements</h4>
          {(t.requirements || []).map((r) => (
            <div key={r.key} className="bt-req">
              <span className={"bt-req-ic " + (verified[r.key] ? "ok" : "warn")}>{verified[r.key] ? "✓" : "✕"}</span>
              <span className="bt-req-l">{REQ_LABEL[r.key] || r.key}</span>
              <span className="bt-req-s">{verified[r.key] ? "Verified" : "Missing"}</span>
            </div>
          ))}
        </div>

        <div className={"bt-elig " + (eligibility.missing.length === 0 ? "ok" : "warn")}>
          {eligibility.missing.length === 0
            ? "✓ You meet all eligibility requirements for this tender."
            : `${eligibility.missing.length} mandatory requirement${eligibility.missing.length > 1 ? "s" : ""} unresolved: ${eligibility.missing.map((m) => REQ_LABEL[m.key]).join(", ")}`}
        </div>

        {eligibility.missing.length === 0 ? (
          <button className="bm-cta" onClick={onStart}>Start bid</button>
        ) : (
          <button className="bm-cta" onClick={onResolve}>Resolve requirements →</button>
                )}
      </div>
    </div>,
    document.body
  );
}