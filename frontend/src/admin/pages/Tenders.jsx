import { useState, useMemo } from "react";
import { AIcon } from "../ui";
import { useShared } from "../../sharedStore";

const STATUS = ["All", "Published", "Draft", "Closed"];
const cls = (s) => ({ "Published": "ok", "Under Evaluation": "review", "Closing Soon": "warn", "Draft": "neutral", "Closed": "neutral" }[s] || "neutral");

export default function Tenders({ go }) {
  const { tenders, publishTender, bidsForTender } = useShared();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState(null);

  const summary = useMemo(() => ({
    Published: tenders.filter((r) => r.status === "Published").length,
    Draft: tenders.filter((r) => r.status === "Draft").length,
    "Under Evaluation": tenders.filter((r) => r.status === "Under Evaluation").length,
  }), [tenders]);

  const shown = tenders.filter((r) => {
    const m = (r.id + r.title + r.dept + r.cat).toLowerCase().includes(q.toLowerCase());
    const f = filter === "All" || r.status === filter;
    return m && f;
  });

    const publish = async (t) => {
    await publishTender(t);
    setModal(false);
    setToast("Tender published — now visible to bidders");
    setTimeout(() => setToast(null), 2800);
  };

  return (
    <>
      <div className="tn-summary">
        {Object.entries(summary).map(([k, v]) => (
          <button key={k} className={"tn-sum" + (filter === k ? " on" : "")} onClick={() => setFilter(k)}>
            <b>{v}</b><span>{k}</span>
          </button>
        ))}
      </div>

      <div className="ad-card ad-tablecard">
        <div className="ad-tablehead tn-head">
          <div><p className="ad-h">Tender Management</p><p className="ad-sub">All tenders · <span className="tn-demo">Demo data</span></p></div>
          <div className="tn-tools">
            <div className="tn-search">
              <AIcon name="search" className="tn-search-ic" />
              <input placeholder="Search tender ID, title, department…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button className="ad-btn" onClick={() => setModal(true)}>+ Create Tender</button>
          </div>
        </div>

        <div className="tn-filters">
          {STATUS.map((s) => (
            <button key={s} className={"fchip2" + (filter === s ? " on" : "")} onClick={() => setFilter(s)}>{s}</button>
          ))}
        </div>

        <div className="tn-scroll">
          <table className="ad-table tn-table">
            <thead><tr><th>Tender ID</th><th>Title</th><th>Department</th><th>Category</th><th>Value</th><th>Closing</th><th>Bids</th><th>Status</th></tr></thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={r.id} className="ad-row-anim" style={{ animationDelay: `${i * 40}ms`, cursor: "pointer" }}
                  onClick={() => go && go("submissions", { tenderId: r.id })}>
                  <td className="t-strong">{r.id}</td>
                  <td>{r.title}</td>
                  <td className="t-sub">{r.dept}</td>
                  <td>{r.cat}</td>
                  <td className="t-strong">{r.value}</td>
                  <td>{r.closing}</td>
                  <td><b>{bidsForTender(r.id).length}</b></td>
                  <td><span className={"ad-pill " + cls(r.status)}><i />{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <CreateModal onClose={() => setModal(false)} onPublish={publish} />}
      {toast && <div className="bm-toast" style={{ position: "fixed" }}>✓ {toast}</div>}
    </>
  );
}

function CreateModal({ onClose, onPublish }) {
  const REQS = [
    { key: "gst", label: "GST Registration" }, { key: "pan", label: "PAN" },
    { key: "udyam", label: "Udyam Registration" }, { key: "esic", label: "ESIC Compliance" },
    { key: "bis", label: "BIS Certification" },
  ];
  const [t, setT] = useState({ title: "", dept: "", cat: "IT Hardware", value: "", closing: "" });
  const [reqs, setReqs] = useState(["gst", "pan", "udyam"]);
  const ok = t.title.trim() && t.dept.trim() && t.value.trim();
  const toggle = (k) => setReqs((r) => r.includes(k) ? r.filter((x) => x !== k) : [...r, k]);

  return (
    <div className="bm-overlay" onClick={onClose}>
      <div className="bm-card" onClick={(e) => e.stopPropagation()} style={{ width: "min(540px,100%)" }}>
        <button className="bm-x" onClick={onClose}>×</button>
        <h3 className="bm-title">Create Tender</h3>
        <span className="bm-status">Reference auto-generated on publish</span>
        <div className="bm-field"><label>Tender title *</label><input value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} placeholder="e.g. Supply of Desktop Computers" /></div>
        <div className="bm-field"><label>Procuring department *</label><input value={t.dept} onChange={(e) => setT({ ...t, dept: e.target.value })} placeholder="e.g. Department of Education" /></div>
        <div className="bm-field"><label>Estimated value *</label><input value={t.value} onChange={(e) => setT({ ...t, value: e.target.value })} placeholder="e.g. ₹48,50,000" /></div>
        <div className="bm-field"><label>Closing date</label><input value={t.closing} onChange={(e) => setT({ ...t, closing: e.target.value })} placeholder="e.g. 15 Sep 2026" /></div>
        <div className="bm-field">
          <label>Eligibility requirements (mandatory)</label>
          <div className="tn-req-chips">
            {REQS.map((r) => (
              <button key={r.key} type="button" className={"tn-req-chip" + (reqs.includes(r.key) ? " on" : "")} onClick={() => toggle(r.key)}>
                {reqs.includes(r.key) ? "✓ " : ""}{r.label}
              </button>
            ))}
          </div>
        </div>
        <button className="bm-cta" disabled={!ok}
          onClick={() => onPublish({ ...t, cat: t.cat, requirements: reqs.map((k) => ({ key: k, mandatory: true })) })}>
          Publish Tender
        </button>
      </div>
    </div>
  );
}