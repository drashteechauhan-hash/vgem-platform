import { useState, useEffect } from "react";
import { useShared } from "../../sharedStore";
import { crossVerify, verifyBidder, getAudit } from "../../services/api";

const toneOf = (s) => s === "Approved" ? "ok" : s === "Rejected" ? "warn" : "review";

export default function Submissions({ go }) {
  const { bids, decide } = useShared();
  const [reviewId, setReviewId] = useState(null);
  const review = bids.find((b) => b.dbId === reviewId);

  return (
    <>
      <div className="ad-card ad-tablecard">
        <div className="ad-tablehead">
          <div><p className="ad-h">Bid Submissions</p><p className="ad-sub">Bids received from bidders · click Review to inspect</p></div>
        </div>
        {bids.length === 0 ? (
          <div style={{ padding: 30, color: "#747C76", fontSize: 14 }}>No bids submitted yet. Bidders' submissions will appear here.</div>
        ) : (
          <table className="ad-table">
            <thead><tr><th>Bid Ref</th><th>Tender</th><th>Bidder</th><th>Amount</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {bids.map((b, i) => (
                <tr key={b.dbId || i} className="ad-row-anim" style={{ animationDelay: `${i * 50}ms` }}>
                  <td className="t-strong">{b.id}</td>
                  <td>{b.tenderTitle}<div className="t-sub">{b.tenderId}</div></td>
                  <td>{b.bidder}</td>
                  <td className="t-strong">{b.amount || "—"}</td>
                  <td><span className={"ad-pill " + toneOf(b.status)}><i />{b.status}</span></td>
                  <td><button className="ad-btn" style={{ padding: "6px 14px" }} onClick={() => setReviewId(b.dbId)}>Review →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {review && (
        <BidReview bid={review} onClose={() => setReviewId(null)}
          onDecide={(status) => { decide(review.dbId, status); }} />
      )}
    </>
  );
}

const AI_STEPS = ["Reading documents", "Extracting entities", "Cross-checking government records", "Computing risk score", "Generating recommendation"];

function BidReview({ bid, onClose, onDecide }) {
  const [step, setStep] = useState(0);
  const [cvResult, setCvResult] = useState(null);
  const [vbResult, setVbResult] = useState(null);
  const [cvLoading, setCvLoading] = useState(false);
  const [audit, setAudit] = useState([]);
  const [decided, setDecided] = useState(bid.status !== "Submitted" ? bid.status : null);

  const runCV = async () => {
    setCvLoading(true);
    // Existing cross-verification stays the source of truth for confidence/flags.
    // /verify/bidder is the source of truth for Phase 2 restriction evidence.
    // Both are existing backend endpoints — no verification logic is duplicated here.
    const [cv, vb] = await Promise.all([
      crossVerify({ gstin: bid.gstin || "", company: bid.bidder || "", pan: "" }),
      verifyBidder({ gstin: bid.gstin || "", company: bid.bidder || "", pan: "", udyam: "" }),
    ]);
    setCvLoading(false);
    if (cv.ok) setCvResult(cv.data);
    if (vb.ok) setVbResult(vb.data);
  };

  // AI verification step animation
  useEffect(() => {
    if (step >= AI_STEPS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 700);
    return () => clearTimeout(t);
  }, [step]);

  // auto-run real cross-verification once steps finish
  useEffect(() => {
    if (step === AI_STEPS.length && !cvResult && !cvLoading) runCV();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // load audit trail
  useEffect(() => {
    getAudit(bid.dbId).then((r) => { if (r.ok) setAudit(r.data); });
  }, [bid.dbId, decided]);

  const docs = bid.documents || [];
  const level = cvResult ? cvResult.level : "—";
  const ready = step >= AI_STEPS.length;

  // Phase 2 restriction evidence comes straight from the /verify/bidder response.
  const na = (x) => (x !== undefined && x !== null && String(x).trim() !== "" ? x : "Not available");
  const restrictionCheck = (vbResult?.checks || []).find((c) => c.portal === "Blacklist / Debarment");
  const restricted = restrictionCheck?.restriction_found === true;

  const decide = (status) => { onDecide(status); setDecided(status); };

  return (
    <div className="bm-overlay">
      <div className="bm-card br-card" onClick={(e) => e.stopPropagation()}>
        <button className="bm-x" onClick={onClose}>×</button>
        <span className="bt-id">{bid.id}</span>
        <h3 className="bm-title" style={{ marginTop: 6 }}>{bid.tenderTitle}</h3>
        <p className="bm-body">{bid.bidder} · {bid.tenderId} · GSTIN: {bid.gstin || "—"}</p>

        {/* AI verification steps */}
        <div className="br-sec">
          <h4>AI Analysis</h4>
          <ul className="bm-steps">
            {AI_STEPS.map((s, i) => (
              <li key={s} className={i < step ? "done" : i === step ? "run" : "pend"}>
                <span className="bm-step-ic">{i < step ? "✓" : ""}</span>{s}
              </li>
            ))}
          </ul>
        </div>

        {ready && (
          <>
            {/* real confidence + recommendation */}
            <div className="br-grid">
              <div className="br-risk">
                <span className="br-risk-n">{cvResult ? cvResult.confidence + "%" : "…"}</span>
                <span className="br-risk-l">AI Confidence</span>
                <span className={"br-risk-tag " + (level === "Low" ? "ok" : level === "Medium" ? "review" : "warn")}>{level} risk</span>
              </div>
              <div className="br-reco">
                <span className="br-reco-tag">AI Recommendation</span>
                <p>{cvResult ? cvResult.recommendation : "Cross-checking government records…"}</p>
                <small>Final decision rests with the officer.</small>
              </div>
            </div>

            {/* real cross-verification detail */}
            <div className="br-sec">
              <h4>Government Cross-Verification <span className="br-real">LIVE GOV</span></h4>
              {cvLoading && <p className="bm-ai-live">Cross-checking bidder data against government records…</p>}
              {cvResult && (
                <>
                  {cvResult.checks.map((c, i) => (
                    <div key={i} className="cv-check">
                      <span className={"cv-ic " + c.status}>{c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "✕"}</span>
                      <span className="cv-name">{c.name}</span>
                      <span className="cv-detail">{c.detail}</span>
                    </div>
                  ))}
                  {cvResult.flags.length > 0 && (
                    <div className="cv-flags">
                      {cvResult.flags.map((f, i) => (
                        <div key={i} className={"cv-flag " + f.sev}>
                          <strong>⚠ {f.issue}</strong>
                          <p>{f.detail}</p>
                          <small>AI recommends: {f.rec}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Phase 2 restriction evidence — from /verify/bidder */}
            {vbResult && (
              <div className="br-sec">
                <h4>Evidence Summary <span className="br-real">RESTRICTION DB</span></h4>
                {restricted ? (
                  <div className="br-ev warn">
                    <div className="br-ev-top">
                      <span className="br-ev-type">{na(restrictionCheck.restriction_type)}</span>
                      <span className="br-ev-flag">Restriction match found — officer review required</span>
                    </div>
                    <div className="br-ev-grid">
                      <div className="br-ev-item"><span>Entity / company</span><b>{na(restrictionCheck.entity_name)}</b></div>
                      <div className="br-ev-item"><span>Issuing authority</span><b>{na(restrictionCheck.issuing_authority)}</b></div>
                      <div className="br-ev-item wide"><span>Reason</span><b>{na(restrictionCheck.detail)}</b></div>
                      <div className="br-ev-item"><span>Order / reference</span><b>{na(restrictionCheck.order_reference)}</b></div>
                      <div className="br-ev-item"><span>Source</span><b>{na(restrictionCheck.source)}</b></div>
                      <div className="br-ev-item"><span>Start date</span><b>{na(restrictionCheck.start_date)}</b></div>
                      <div className="br-ev-item"><span>End date</span><b>{na(restrictionCheck.end_date)}</b></div>
                      <div className="br-ev-item wide"><span>Source URL</span>
                        <b>{restrictionCheck.source_url
                          ? <a href={restrictionCheck.source_url} target="_blank" rel="noreferrer">{restrictionCheck.source_url}</a>
                          : "Not available"}</b>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="br-ev clear">✓ Clear — No restriction found</div>
                )}
              </div>
            )}

            {/* documents */}
            <div className="br-sec">
              <h4>Documents submitted</h4>
              {docs.map((d, i) => (
                <div key={i} className="bt-req">
                  <span className={"bt-req-ic " + (d.status === "verified" ? "ok" : "warn")}>{d.status === "verified" ? "✓" : "✕"}</span>
                  <span className="bt-req-l">{d.key?.toUpperCase() || "Document"}</span>
                  <span className="bt-req-s">{d.status === "verified" ? "Provided" : "Missing"}</span>
                </div>
              ))}
            </div>

            {/* officer decision */}
            {!decided ? (
              <div className="br-actions">
                <button className="ad-approve" onClick={() => decide("Approved")}>✓ Approve / Qualify</button>
                <button className="ad-reject" onClick={() => decide("Rejected")}>✕ Disqualify</button>
                <button className="ad-btn ghost" onClick={() => decide("Clarification Requested")}>Request clarification</button>
              </div>
            ) : (
              <div className={"ad-decided " + (decided === "Approved" ? "approve" : "reject")}>
                {decided === "Approved" ? "✓ Bid qualified by Procurement Officer." : decided === "Rejected" ? "✕ Bid disqualified by Procurement Officer." : "Clarification requested from bidder."}
              </div>
            )}

            {/* audit trail */}
            {audit.length > 0 && (
              <div className="br-sec">
                <h4>Audit trail</h4>
                {audit.map((a, i) => (
                  <div key={i} className="br-audit">
                    <span className="br-audit-dot" />
                    <span>{a.detail} · <b>{a.actor}</b></span>
                    <small>{new Date(a.at).toLocaleString()}</small>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}