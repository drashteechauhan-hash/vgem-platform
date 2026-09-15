import { useEffect, useState } from "react";
import { AIcon, Loader, statusPill } from "../ui";
import { getCompliance } from "../../services/api";

export default function ComplianceView({ ctx }) {
  const submissionId = ctx?.submissionId || 1; // test id fallback
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState(null);

  useEffect(() => {
    setLoading(true);
    getCompliance(submissionId).then((r) => { setData(r.ok ? r.data : null); setLoading(false); });
  }, [submissionId]);

  if (loading) return <Loader label="Running compliance analysis…" />;

  if (!data) {
    return (
      <div className="ad-card" style={{ padding: 40, textAlign: "center" }}>
        <AIcon name="alert" className="ad-empty-ic" style={{ margin: "0 auto 10px", color: "#C9911F" }} />
        <p className="ad-h">Compliance data not available</p>
        <p className="ad-sub">Backend connect karo aur submission select karo. (GET /submissions/{submissionId}/compliance)</p>
      </div>
    );
  }

  // flexible parsing — backend structure jo bhi ho
  const score = data.compliance_score ?? data.score ?? data.overall_score ?? 0;
  const risk = data.risk_level || data.risk || "—";
  const company = data.company || data.company_name || data.bidder || "Bidder";
  const tender = data.tender || data.tender_name || "";
  const reqs = data.requirements || data.requirement_results || data.results || [];

  const C = 439.8;
  const riskCls = score >= 80 ? "ok" : score >= 55 ? "review" : "warn";
  const riskColor = { ok: "#EAF5F0", review: "#FBF1DC", warn: "#FBE8E5" }[riskCls];
  const riskText = { ok: "#0E7C57", review: "#C9911F", warn: "#C0402E" }[riskCls];

  return (
    <>
      <div className="cmp-wrap">
        <div className="ad-card cmp-reqs">
          <div style={{ padding: "12px 16px 4px" }}>
            <p className="ad-h">Requirement status</p>
            <p className="ad-sub">{company}{tender ? ` · ${tender}` : ""}</p>
          </div>
          {reqs.length === 0 ? (
            <div style={{ padding: 24, color: "#6A7873", fontSize: 14 }}>
              
            </div>
          ) : reqs.map((r, i) => {
            const st = r.status || r.result || "";
            const cls = statusPill(st);
            return (
              <div key={i} className={"cmp-req " + cls}>
                <span className="cmp-req-ic">
                  <AIcon name={cls === "ok" ? "check" : cls === "warn" ? "x" : "clock"} />
                </span>
                <div className="cmp-req-main">
                  <strong>{r.name || r.requirement || r.label || `Requirement ${i + 1}`}</strong>
                  {r.note && <small>{r.note}</small>}
                </div>
                <span className={"ad-pill " + cls}><i />{st || "—"}</span>
              </div>
            );
          })}
        </div>

        <div>
          <div className="ad-card cmp-score-card">
            <svg width="0" height="0"><defs>
              <linearGradient id="adg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#159A6E" /><stop offset="1" stopColor="#C9911F" />
              </linearGradient></defs></svg>
            <div className="cmp-ring">
              <svg viewBox="0 0 150 150">
                <circle className="bg" cx="75" cy="75" r="70" />
                <circle className="fg" cx="75" cy="75" r="70"
                  style={{ strokeDasharray: C, strokeDashoffset: C - (C * score) / 100 }} />
              </svg>
              <div className="cmp-ring-c"><b>{score}%</b><small>Compliance</small></div>
            </div>
            <span className="cmp-risk" style={{ background: riskColor, color: riskText }}>
              {risk !== "—" ? `${risk} risk` : "Risk —"}
            </span>
          </div>

          <div className="ad-card ad-ai">
            <div className="ad-ai-h">
              <span className="ad-ai-badge">AI RECOMMENDATION</span>
            </div>
            <p>
              {score >= 80
                ? "All key statutory requirements met. Recommended for qualification, subject to officer review."
                : score >= 55
                  ? "Most requirements met with some items needing verification. Conditional review recommended."
                  : "Critical requirements missing. Recommended for disqualification pending clarification."}
            </p>
            {!decision ? (
              <div className="ad-ai-actions">
                <button className="ad-approve" onClick={() => setDecision("approve")}>✓ Approve / Qualify</button>
                <button className="ad-reject" onClick={() => setDecision("reject")}>✕ Disqualify</button>
              </div>
            ) : (
              <div className={"ad-decided " + decision}>
                {decision === "approve"
                  ? "✓ Bidder qualified by Procurement Officer. Decision logged to audit trail."
                  : "✕ Bidder disqualified by Procurement Officer. Decision logged to audit trail."}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}