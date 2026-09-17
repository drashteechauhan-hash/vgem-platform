import { useEffect, useState } from "react";
import { AIcon, Loader } from "../ui";
import { getTenders, getBidders, getSubmissions, getRestrictions } from "../../services/api";

export default function DashboardHome({ go }) {
  const [d, setD] = useState({ tenders: [], bidders: [], subs: [], restrictions: [] });
  const [loading, setLoading] = useState(true);
  const [compError, setCompError] = useState(false);

  useEffect(() => {
    Promise.all([getTenders(), getBidders(), getSubmissions(), getRestrictions()]).then(([t, b, s, r]) => {
      setD({
        tenders: t.ok ? t.data : [],
        bidders: b.ok ? b.data : [],
        subs: s.ok ? s.data : [],
        restrictions: r.ok ? r.data : [],
      });
      setCompError(!r.ok);   // existing stats still render even if this fails
      setLoading(false);
    });
  }, []);

  if (loading) return <Loader label="Loading dashboard…" />;

  const active = d.tenders.filter((t) => (t.status || "").toLowerCase() === "active" || (t.status || "").toLowerCase() === "open").length;
  const pending = d.subs.filter((s) => ["submitted", "pending"].includes((s.status || "").toLowerCase())).length;
  const nonComp = d.subs.filter((s) => (s.status || "").toLowerCase().includes("non")).length;

  // AI Compliance Overview — every number below is counted from real API data.
  const rt = (t) => d.restrictions.filter((r) => (r.restriction_type || "") === t).length;
  const comp = {
    total: d.restrictions.length,
    blacklisted: rt("BLACKLISTED"),
    debarred: rt("DEBARRED"),
    suspended: rt("SUSPENDED"),
    review: pending, // submissions awaiting officer review (real, from /bids)
  };

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

      {/* AI Compliance Overview — real counts from /restrictions + /bids */}
      <div className="ad-card ac-card">
        <div className="ac-head">
          <div>
            <p className="ad-h">AI Compliance Overview</p>
            <p className="ad-sub">AI-assisted compliance intelligence for procurement review</p>
          </div>
          <button className="ad-btn ghost" onClick={() => go("compliance")}>Open Compliance</button>
        </div>
        {compError ? (
          <p className="ac-fallback">Compliance intelligence not available right now.</p>
        ) : (
          <div className="ac-metrics">
            <div className="ac-metric"><b>{comp.total}</b><span>Total restrictions</span></div>
            <div className="ac-metric warn"><b>{comp.blacklisted}</b><span>Blacklisted</span></div>
            <div className="ac-metric warn"><b>{comp.debarred}</b><span>Debarred</span></div>
            <div className="ac-metric review"><b>{comp.suspended}</b><span>Suspended</span></div>
            <div className="ac-metric"><b>{comp.review}</b><span>Records requiring review</span></div>
          </div>
        )}
        <p className="ac-foot">AI assists verification and surfaces evidence — the procurement officer makes the final decision.</p>
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
                    <td className="t-strong">{s.bid_ref || `BID-SUB-${s.id}`}</td>
                    <td>{s.amount || "—"}</td>
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