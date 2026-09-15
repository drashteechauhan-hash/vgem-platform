import BidderApp from "../bidder/BidderApp";
import AdminApp from "../admin/AdminApp";

export default function Dashboard({ role, user, onLogout }) {
  if (role === "bidder") return <BidderApp user={user} onLogout={onLogout} />;
  return <AdminApp user={user} onLogout={onLogout} />;
}