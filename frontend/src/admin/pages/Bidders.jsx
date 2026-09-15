import { useEffect, useState } from "react";
import { Loader, Empty } from "../ui";
import { getBidders } from "../../services/api";

export default function Bidders() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    getBidders().then((r) => { setRows(r.ok ? r.data : []); setLoading(false); });
  }, []);

  if (loading) return <Loader label="Loading bidders…" />;

  const shown = rows.filter((b) =>
    (b.company || b.company_name || "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="ad-card ad-tablecard">
      <div className="ad-tablehead">
        <div><p className="ad-h">Bidder Management</p><p className="ad-sub">Registered vendors</p></div>
        <input placeholder="Search company…" value={q} onChange={(e) => setQ(e.target.value)}
          style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(19,33,25,.12)", fontSize: 13.5, outline: "none" }} />
      </div>
      {shown.length === 0 ? (
        <Empty title="No bidders" sub="Backend se registered bidders yahan aayenge." />
      ) : (
        <table className="ad-table">
          <thead><tr><th>Company</th><th>Bidder ID</th><th>PAN</th><th>GST</th><th>Status</th></tr></thead>
          <tbody>
            {shown.map((b, i) => (
              <tr key={b.id || i} className="ad-row-anim" style={{ animationDelay: `${i * 60}ms` }}>
                <td className="t-strong">{b.company || b.company_name || `Bidder ${b.id}`}</td>
                <td>{b.bidder_code || b.code || `BID-${b.id}`}</td>
                <td>{b.pan || "—"}</td>
                <td>{b.gstin || b.gst || "—"}</td>
                <td><span className="ad-pill ok"><i />{b.status || "Active"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}