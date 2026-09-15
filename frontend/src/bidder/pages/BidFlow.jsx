import { useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../ui";
import { REQ_LABEL } from "../../sharedStore";

const STEPS = ["Eligibility", "Documents", "Bid Details", "Review", "Submit"];

export default function BidFlow({ tender, verified, profile, onClose, onSubmit }) {
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState({ amount: "", delivery: "", tech: "", notes: "", gstin: "" });  const [done, setDone] = useState(false);

  const reqs = tender.requirements || [];
  const allVerified = reqs.every((r) => verified[r.key]);
  const detailsOk = details.amount.trim() && details.delivery.trim() && details.gstin.trim();
  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

      const submit = async () => {
    const bid = {
      tenderDbId: tender.dbId,
      tender_id: tender.dbId,
      tenderTitle: tender.title,
      bidder: profile.company,
      bidderId: profile.email,
      amount: details.amount,
      delivery: details.delivery,
      gstin: details.gstin,
      documents: reqs.map((r) => ({ key: r.key, status: verified[r.key] ? "verified" : "missing" })),
    };
    await onSubmit(bid);
    setDone(true);
  };

    if (done) {
    return createPortal(
      <div className="bm-overlay">
        <div className="bm-card" onClick={(e) => e.stopPropagation()} style={{ width: "min(460px,100%)", textAlign: "center" }}>
          <span className="bm-done-tick">✓</span>
          <h3 className="bm-title" style={{ margin: "8px 0" }}>Bid submitted successfully</h3>
          <p className="bm-body">Tender ID: <b>{tender.id}</b></p>
          <p className="bm-body" style={{ marginTop: -4 }}>Submitted: {new Date().toLocaleString()}</p>
          <button className="bm-cta" onClick={onClose}>View My Bids →</button>
                </div>
      </div>,
      document.body
    );
  }

    return createPortal(
    <div className="bm-overlay">
      <div className="bm-card bf-card" onClick={(e) => e.stopPropagation()}>
        <button className="bm-x" onClick={onClose}>×</button>
        <span className="bt-id">{tender.id}</span>
        <h3 className="bm-title" style={{ marginTop: 6 }}>{tender.title}</h3>

        {/* stepper */}
        <div className="bf-steps">
          {STEPS.map((s, i) => (
            <div key={s} className={"bf-step" + (i === step ? " on" : "") + (i < step ? " done" : "")}>
              <span className="bf-step-n">{i < step ? "✓" : i + 1}</span>
              <span className="bf-step-l">{s}</span>
            </div>
          ))}
        </div>

        <div className="bf-body">
          {step === 0 && (
            <>
              <h4 className="bf-h">Eligibility check</h4>
              {reqs.map((r) => (
                <div key={r.key} className="bt-req">
                  <span className={"bt-req-ic " + (verified[r.key] ? "ok" : "warn")}>{verified[r.key] ? "✓" : "✕"}</span>
                  <span className="bt-req-l">{REQ_LABEL[r.key] || r.key}</span>
                  <span className="bt-req-s">{verified[r.key] ? "Met" : "Not met"}</span>
                </div>
              ))}
              <div className={"bt-elig " + (allVerified ? "ok" : "warn")}>
                {allVerified ? "✓ You are eligible to bid on this tender." : "Resolve missing requirements before submitting."}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h4 className="bf-h">Required documents</h4>
              {reqs.map((r) => (
                <div key={r.key} className="bt-req">
                  <span className={"bt-req-ic " + (verified[r.key] ? "ok" : "warn")}>{verified[r.key] ? "✓" : "✕"}</span>
                  <span className="bt-req-l">{REQ_LABEL[r.key] || r.key}</span>
                  <span className="bt-req-s">{verified[r.key] ? "Verified" : "Missing"}</span>
                </div>
              ))}
            </>
          )}

                    {step === 2 && (
            <>
              <h4 className="bf-h">Bid details</h4>
              <div className="bm-field"><label>Your GSTIN * (will be verified against government records)</label><input value={details.gstin} onChange={(e) => setDetails({ ...details, gstin: e.target.value.toUpperCase() })} placeholder="e.g. 27AAACT2803M1ZW" /></div>
              <div className="bm-field"><label>Quoted amount *</label><input value={details.amount} onChange={(e) => setDetails({ ...details, amount: e.target.value })} placeholder="e.g. ₹45,00,000" /></div>
              <div className="bm-field"><label>Delivery timeline *</label><input value={details.delivery} onChange={(e) => setDetails({ ...details, delivery: e.target.value })} placeholder="e.g. 60 days" /></div>
              <div className="bm-field"><label>Technical response</label><input value={details.tech} onChange={(e) => setDetails({ ...details, tech: e.target.value })} placeholder="Brief technical summary" /></div>
            </>
          )}

          {step === 3 && (
            <>
              <h4 className="bf-h">Review your bid</h4>
              <div className="bt-row"><span>Tender</span><b>{tender.id}</b></div>
              <div className="bt-row"><span>Bidder</span><b>{profile.company}</b></div>
              <div className="bt-row"><span>Eligibility</span><b>{allVerified ? "✓ Eligible" : "⚠ Issues"}</b></div>
              <div className="bt-row"><span>Documents</span><b>{reqs.filter((r) => verified[r.key]).length}/{reqs.length} verified</b></div>
              <div className="bt-row"><span>Quoted amount</span><b>{details.amount || "—"}</b></div>
              <div className="bt-row"><span>Delivery</span><b>{details.delivery || "—"}</b></div>
            </>
          )}

          {step === 4 && (
            <>
              <h4 className="bf-h">Submit bid</h4>
              <p className="bm-body">You're about to submit your bid for <b>{tender.title}</b>. Confirm the details are correct.</p>
              <div className="bt-row"><span>Tender ID</span><b>{tender.id}</b></div>
              <div className="bt-row"><span>Deadline</span><b>{tender.closing}</b></div>
            </>
          )}
        </div>

        {/* nav */}
        <div className="bf-nav">
          {step > 0 && <button className="bf-back" onClick={back}>← Back</button>}
          <div style={{ flex: 1 }} />
          {step < 4 ? (
            <button className="bm-cta" style={{ width: "auto", padding: "12px 24px" }}
              disabled={(step === 0 && !allVerified) || (step === 1 && !allVerified) || (step === 2 && !detailsOk)}
              onClick={next}>Next →</button>
          ) : (
            <button className="bm-cta" style={{ width: "auto", padding: "12px 24px" }} onClick={submit}>Submit Bid</button>
          )}
               </div>
      </div>
    </div>,
    document.body
  );
}