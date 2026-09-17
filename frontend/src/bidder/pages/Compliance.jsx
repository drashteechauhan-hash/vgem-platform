import { useState } from "react";
import { verifyBidder } from "../../services/api";

const STATUS_META = {
  verified: { label: "Verified", cls: "ok", icon: "✓" },
  warn: { label: "Needs review", cls: "review", icon: "!" },
  invalid: { label: "Invalid", cls: "warn", icon: "✕" },
  missing: { label: "Not provided", cls: "warn", icon: "✕" },
};

const na = (x) => (x !== undefined && x !== null && String(x).trim() !== "" ? x : "Not available");

export default function Compliance({ profile }) {
  const [form, setForm] = useState({
    gstin: profile?.gstin || "",
    pan: profile?.pan || "",
    udyam: profile?.udyam || "",
    company: profile?.company || "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const run = async () => {
    setLoading(true); setError(false);
    const r = await verifyBidder(form);
    setLoading(false);
    if (r.ok) setResult(r.data);
    else { setError(true); setResult(null); }
  };

  // Restriction evidence comes straight from the /verify/bidder response.
  const restrictionCheck = (result?.checks || []).find((c) => c.portal === "Blacklist / Debarment");
  const restricted = restrictionCheck?.restriction_found === true;
  const flags = result?.flags || [];
  const attention = flags.length;

  return (
    <>
      <div className="cv-head-card card">
        <p className="sec-h">Compliance Verification</p>
        <p className="sec-p">Enter your registration details — we verify them against government records in real time.</p>

        <div className="cv-form">
          <div className="cv-inp">
            <label>GSTIN</label>
            <input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} placeholder="27AAACT2803M1ZW" />
          </div>
          <div className="cv-inp">
            <label>PAN</label>
            <input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} placeholder="AAACT2803M" />
          </div>
          <div className="cv-inp">
            <label>Udyam number</label>
            <input value={form.udyam} onChange={(e) => setForm({ ...form, udyam: e.target.value.toUpperCase() })} placeholder="UDYAM-MH-18-0001234" />
          </div>
          <div className="cv-inp">
            <label>Company name</label>
            <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Your company" />
          </div>
        </div>

        <button className="cv-run-btn" onClick={run} disabled={loading}>
          {loading ? "Verifying against government records…" : "Run compliance verification →"}
        </button>
      </div>

      {error && (
        <div className="cv-result card">
          <p className="cv-err">Unable to run verification right now.
            <button className="cv-retry" onClick={run}>Retry</button>
          </p>
        </div>
      )}

      {result && (
        <div className="cv-result card">
          <div className="cv-result-head">
            <div>
              <span className="cv-big-score">{result.score}%</span>
              <span className="cv-score-label">Verification score</span>
            </div>
            <span className={"cv-level-tag " + (result.level === "Low" ? "ok" : result.level === "Medium" ? "review" : "warn")}>
              {result.level} risk
            </span>
          </div>

          <div className="cv-bar"><span style={{ width: result.score + "%" }} /></div>

          {/* AI Verification Insights (explains results — does not decide) */}
          <div className="cv-ai">
            <span className="cv-ai-badge">AI VERIFICATION INSIGHTS</span>
            <ul className="cv-ai-list">
              <li>Automated verification checks completed — {result.checks.length} evaluated.</li>
              <li>{attention > 0 ? `${attention} item${attention > 1 ? "s" : ""} require officer attention.` : "No items flagged for attention."}</li>
              <li>{restricted ? "Restriction database match detected — see evidence below." : "No restriction database match found."}</li>
              <li>Risk level: {result.level} · Verification score {result.score}%.</li>
            </ul>
            <p className="cv-ai-foot">AI assists with verification and evidence analysis. The procurement officer makes the final decision.</p>
          </div>

          <div className="cv-portals">
            {result.checks.map((c, i) => {
              const m = STATUS_META[c.status] || STATUS_META.warn;
              return (
                <div key={i} className={"cv-portal " + m.cls}>
                  <span className="cv-portal-ic">{m.icon}</span>
                  <div className="cv-portal-txt">
                    <strong>{c.portal}</strong>
                    <small>{c.detail}</small>
                  </div>
                  <span className={"cv-portal-tag " + m.cls}>{m.label}</span>
                </div>
              );
            })}
          </div>

          {/* Restriction Evidence — from the Blacklist / Debarment check */}
          <div className="cv-ev-sec">
            <p className="cv-ev-title">Restriction Evidence</p>
            {restricted ? (
              <div className="cv-ev warn">
                <div className="cv-ev-top">
                  <span className="cv-ev-type">{na(restrictionCheck.restriction_type)}</span>
                  <span className="cv-ev-flag">Restriction match found</span>
                </div>
                <div className="cv-ev-grid">
                  <div className="cv-ev-item"><span>Entity / company</span><b>{na(restrictionCheck.entity_name)}</b></div>
                  <div className="cv-ev-item"><span>Issuing authority</span><b>{na(restrictionCheck.issuing_authority)}</b></div>
                  <div className="cv-ev-item wide"><span>Reason</span><b>{na(restrictionCheck.detail)}</b></div>
                  <div className="cv-ev-item"><span>Order / reference</span><b>{na(restrictionCheck.order_reference)}</b></div>
                  <div className="cv-ev-item"><span>Source</span><b>{na(restrictionCheck.source)}</b></div>
                  <div className="cv-ev-item"><span>Start date</span><b>{na(restrictionCheck.start_date)}</b></div>
                  <div className="cv-ev-item"><span>End date</span><b>{na(restrictionCheck.end_date)}</b></div>
                  <div className="cv-ev-item wide"><span>Source URL</span>
                    <b>{restrictionCheck.source_url
                      ? <a href={restrictionCheck.source_url} target="_blank" rel="noreferrer">{restrictionCheck.source_url}</a>
                      : "Not available"}</b>
                  </div>
                </div>
              </div>
            ) : (
              <div className="cv-ev-clear">✓ Clear — No restriction found</div>
            )}
          </div>

          {/* Flags / Attention */}
          <div className="cv-flags-box">
            <p className="cv-flags-title">Flags / Attention</p>
            {flags.length > 0 ? (
              flags.map((f, i) => (
                <div key={i} className={"cv-flag-item " + f.sev}>⚠ {f.issue}</div>
              ))
            ) : (
              <div className="cv-noflags">No issues flagged.</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}