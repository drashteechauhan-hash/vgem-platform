import BidderApp from "../bidder/BidderApp";

export default function Dashboard({ role, onLogout }) {
  if (role === "bidder") {
    return <BidderApp onLogout={onLogout} />;
  }

  // Officer dashboard — next step mein banayenge
  return (
    <div style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>Officer Console</h1>
      <p>Officer dashboard next step mein aayega.</p>
      <button onClick={() => onLogout && onLogout()}
        style={{ marginTop: 16, padding: "10px 18px", borderRadius: 10, border: "none",
          background: "#12B981", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
        Log out
      </button>
    </div>
  );
}