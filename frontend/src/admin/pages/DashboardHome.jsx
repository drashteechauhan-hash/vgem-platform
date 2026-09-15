import { useEffect, useState } from "react";
import { AIcon, Loader } from "../ui";
import { getTenders, getBidders, getSubmissions } from "../../services/api";

export default function DashboardHome({ go }) {
  const [d, setD] = useState({ tenders: [], bidders: [], subs: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTenders(), getBidders(), getSubmissions()]).then(([t, b, s]) => {
      setD({
        tenders: t.ok ? t.data : [],
        bidders: b.ok ? b.data : [],
        subs: s.ok ? s.data : [],
      });
      setLoading(false);
    });
  }, []);

  if (loading) return <Loader label="Loading dashboard…" />;

  const active = d.tenders.filter((t) => (t.status || "").toLowerCase() === "active" || (t.status || "").toLowerCase() === "open").length;
  const pending = d.subs.filter((s) => ["submitted", "pending"].includes((s.status || "").toLowerCase())).length;
  const nonComp = d.subs.filter((s) => (s.status || "").toLowerCase().includes("non")).length;

  const cards = [
    { cls: "a", value: d.tenders.length, label: "Total Tenders" },
    { cls: "b", value: active, label: "Active Tenders" },
    { cls: "a", value: d.bidders.length, label: "Total Bidders" },
    { cls: "b", value: d.subs.length, label: "Submissions" },
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
          {d.subs.length === 0 ? (
            <div style={{ padding: 30, color: "#6A7873", fontSize: 14 }}>Koi submission nahi (backend se aayega).</div>
          ) : (
            <table className="ad-table">
              <thead><tr><th>Submission</th><th>Bid Amount</th><th>Status</th></tr></thead>
              <tbody>
                {d.subs.slice(0, 5).map((s, i) => (
                  <tr key={s.id || i} className="ad-row-anim" style={{ animationDelay: `${i * 60}ms` }}
                    onClick={() => go("compliance", { submissionId: s.id })}>
                    <td className="t-strong">{s.submission_number || `BID-SUB-${s.id}`}</td>
                    <td>{s.bid_amount ? `₹${s.bid_amount}` : "—"}</td>
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
              <AIcon name="chevron" className="" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}