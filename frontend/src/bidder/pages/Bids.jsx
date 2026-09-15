import { Icon } from "../ui";
import { useShared } from "../../sharedStore";

const STAGES = ["Submitted", "Under review", "Verified", "Qualified"];
const toneOf = (s) => s === "Qualified" || s === "Accepted" ? "ok" : s === "Action needed" || s === "Rejected" ? "warn" : "review";

const mockBids = [
  { id: "BID-4498-201", tenderId: "GEM/2026/B/184305", tenderTitle: "Networking Equipment", status: "Under review", amount: "₹1,18,00,000", deadline: "12 Sep 2026" },
  { id: "BID-4471-118", tenderId: "GEM/2026/B/184318", tenderTitle: "Laboratory Equipment", status: "Qualified", amount: "₹82,00,000", deadline: "05 Sep 2026" },
];

export default function Bids() {
  const { bids } = useShared();
  const all = [...bids, ...mockBids];

  return (
    <>
      <div className="bt-head">
        <p className="sec-h">My bids</p>
        <p className="sec-p">Tenders you have applied to</p>
      </div>

      {all.length === 0 ? (
        <div className="card" style={{ padding: 30, color: "#747C76" }}>
          No bids yet. Go to Tenders to apply.
        </div>
      ) : (
        <div className="bid-grid stagger">
          {all.map((b) => (
            <div key={b.id} className="card bid-card">
              <div className="bid-top">
                <div>
                  <span className="bid-id">{b.id}</span>
                  <h3>{b.tenderTitle}</h3>
                  <span className="bid-dept">{b.tenderId}</span>
                </div>
                <span className={"pill-tag " + toneOf(b.status)}><i /> {b.status}</span>
              </div>
              <div className="bid-meta">
                <div><small>Quoted</small><strong>{b.amount || "—"}</strong></div>
                <div><small>Deadline</small><strong>{b.deadline}</strong></div>
              </div>
              <div className="bid-stages">
                {STAGES.map((_, i) => {
                  const active = ["Submitted","Under review","Verified","Qualified","Accepted"].indexOf(b.status);
                  return <div key={i} className={"bid-stage" + (i <= active ? " done" : "")}><span /></div>;
                })}
              </div>
              <div className="bid-foot">
                <span className="bid-score">Stage: <b>{b.status}</b></span>
                <Icon name="chevron" className="cmp-caret" />
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}