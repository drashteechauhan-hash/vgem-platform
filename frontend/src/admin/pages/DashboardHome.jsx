import { useEffect, useState } from "react";
import { AIcon, Loader } from "../ui";
import { getTenders, getBidders, getSubmissions } from "../../services/api";

export default function DashboardHome({ go }) {
  const [d, setD] = useState({ tenders: [], bidders: [], subs: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([getTenders(), getBidders(), getSubmissions()])
      .then(([t, b, s]) => {
        setD({
          tenders: (t && t.ok && Array.isArray(t.data)) ? t.data : [],
          bidders: (b && b.ok && Array.isArray(b.data)) ? b.data : [],
          subs: (s && s.ok && Array.isArray(s.data)) ? s.data : [],
        });
        setLoading(false);
      })
      .catch((e) => { setErr(String(e)); setLoading(false); });
  }, []);

  if (loading) return <Loader label="Loading dashboard…" />;
  if (err) return <div style={{ padding: 40, color: "#C0402E" }}>Error: {err}</div>;

  const subs = Array.isArray(d.subs) ? d.subs : [];
  const tenders = Array.isArray(d.tenders) ? d.tenders : [];
  const bidders = Array.isArray(d.bidders) ? d.bidders : [];

  const active = tenders.filter((t) => ["active", "open", "published"].includes((t.status || "").toLowerCase())).length;
  const pending = subs.filter((s) => ["submitted", "pending"].includes((s.status || "").toLowerCase())).length;
  const nonComp = subs.filter((s) => (s.status || "").toLowerCase().includes("non") || (s.status || "") === "Rejected").length;

  const cards = [
    { cls: "a", value: tenders.length, label: "Total Tenders" },
    { cls: "b", value: active, label: "Active Tenders" },
    { cls: "a", value: bidders.length, label: "Total Bidders" },
    { cls: "b", value: subs.length, label: "Submissions" },
    { cls: "c", value: pending, label: "Pending Verification" },
    { cls: "d", value: nonComp, label: "Non-Compliant" },
  ];

  return (
    <>
      <div className="ad-stats">
        {cards.map((c, i) => (
          <div key={i} className={"ad-card ad-stat " + c.cls}>
            <b>{c.value}</b><p>{c.label}</p>
          </div>
        ))}
      </div>

      <div className="ad-grid2">
        <div className="ad-card ad-tablecard">
          <div className="ad-tablehead">
            <div><p className="ad-h">Recent submissions</p><p className="ad-sub">Latest bids awaiting review</p></div>
            <button className="ad-btn ghost" onClick={() => go("submissions")}>View all</button>
          </div>
          {subs.length === 0 ? (
            <div style={{ padding: 30, color: "#6A7873", fontSize: 14 }}>No submissions yet.</div>
          ) : (
            <table className="ad-table">
              <thead><tr><th>Submission</th><th>Bid Amount</th><th>Status</th></tr></thead>
              <tbody>
                {subs.slice(0, 5).map((s, i) => (
                  <tr key={s.id || i} className="ad-row-anim" style={{ animationDelay: `${i * 60}ms` }}
                    onClick={() => go("submissions")}>
                    <td className="t-strong">{s.bid_ref || s.submission_number || `BID-${s.id}`}</td>
                    <td>{s.amount || s.bid_amount || "—"}</td>
                    <td><span className="ad-pill review"><i />{s.status || "Submitted"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ad-card" style={{ padding: 22 }}>
          <p className="ad-h">Quick actions</p>
          <p className="ad-sub" style={{ marginBottom: 16 }}>Jump to a module</p>
          {[
            { k: "tenders", i: "file", t: "Manage Tenders" },
            { k: "bidders", i: "users", t: "View Bidders" },
            { k: "submissions", i: "inbox", t: "Review Submissions" },
            { k: "compliance", i: "shield", t: "Compliance Analysis" },
          ].map((q) => (
            <button key={q.k} className="ad-item" style={{ color: "#14201B", width: "100%", marginBottom: 6 }}
              onClick={() => go(q.k)}>
              <AIcon name={q.i} /><span>{q.t}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}