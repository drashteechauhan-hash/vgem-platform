import { useState } from "react";
import { verifyBidder } from "../../services/api";

const STATUS_META = {
  verified: { label: "Verified", cls: "ok", icon: "✓" },
  warn: { label: "Needs review", cls: "review", icon: "!" },
  invalid: { label: "Invalid", cls: "warn", icon: "✕" },
  missing: { label: "Not provided", cls: "warn", icon: "✕" },
};

export default function Compliance({ profile }) {
  const [form, setForm] = useState({
    gstin: profile?.gstin || "",
    pan: profile?.pan || "",
    udyam: profile?.udyam || "",
    company: profile?.company || "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const r = await verifyBidder(form);
    setLoading(false);
    if (r.ok) setResult(r.data);
  };

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

      {result && (
        <div className="cv-result card">
          <div className="cv-result-head">
            <div>
              <span className="cv-big-score">{result.score}%</span>
              <span className="cv-score-label">Compliance score</span>
            </div>
            <span className={"cv-level-tag " + (result.level === "Low" ? "ok" : result.level === "Medium" ? "review" : "warn")}>
              {result.level} risk
            </span>
          </div>

          <div className="cv-bar"><span style={{ width: result.score + "%" }} /></div>

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

          {result.flags.length > 0 && (
            <div className="cv-flags-box">
              <p className="cv-flags-title">AI-flagged issues</p>
              {result.flags.map((f, i) => (
                <div key={i} className={"cv-flag-item " + f.sev}>⚠ {f.issue}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}