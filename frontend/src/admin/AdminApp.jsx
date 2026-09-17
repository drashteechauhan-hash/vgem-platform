import { useState, useRef, useEffect } from "react";
import "./AdminApp.css";
import { AIcon } from "./ui";
import { useBackendStatus } from "../services/useBackend";
import DashboardHome from "./pages/DashboardHome";
import Tenders from "./pages/Tenders";
import Bidders from "./pages/Bidders";
import Submissions from "./pages/Submissions";
import ComplianceView from "./pages/ComplianceView";
import VGEMLogo from "../VGEMLogo";

const PAGES = [
  { key: "dashboard", label: "Dashboard", icon: "grid", C: DashboardHome },
  { key: "tenders", label: "Tenders", icon: "file", C: Tenders },
  { key: "bidders", label: "Bidders", icon: "users", C: Bidders },
  { key: "submissions", label: "Submissions", icon: "inbox", C: Submissions },
  { key: "compliance", label: "Compliance", icon: "shield", C: ComplianceView },
];

export default function AdminApp({ user, onLogout }) {
  const [page, setPage] = useState("dashboard");
  const [ctx, setCtx] = useState({});
  const [hovered, setHovered] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const status = useBackendStatus();
  const navRef = useRef(null);
  const [ind, setInd] = useState({ top: 0, height: 0 });

  useEffect(() => {
    const el = navRef.current?.querySelector(`[data-tab="${page}"]`);
    if (el) setInd({ top: el.offsetTop, height: el.offsetHeight });
  }, [page, hovered]);

  // lock body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = drawer ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawer]);

  const current = PAGES.find((p) => p.key === page);
  const Current = current.C;
  const go = (k, data = {}) => { setPage(k); setCtx(data); setDrawer(false); };
  const org = (user && user.org) || "Government e-Marketplace";

  return (
    <div className={"admin" + (hovered ? " expanded" : "") + (drawer ? " drawer-open" : "")}>
      <button className="ad-scrim" aria-label="Close menu" onClick={() => setDrawer(false)} />

      <aside className="ad-side"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}>
        <div className="ad-brand">
<span className="ad-mark"><VGEMLogo size={18} color="#fff" /></span>
          <div className="ad-brand-txt"><strong>VGEM</strong><small>Officer Console</small></div>
          <button className="ad-drawer-close" aria-label="Close menu" onClick={() => setDrawer(false)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <nav className="ad-nav" ref={navRef}>
          <span className="ad-ind" style={{ top: ind.top, height: ind.height }} />
          {PAGES.map((p) => (
            <button key={p.key} data-tab={p.key}
              className={"ad-item" + (page === p.key ? " on" : "")}
              onClick={() => go(p.key)} title={p.label}>
              <AIcon name={p.icon} /><span className="ad-label">{p.label}</span>
            </button>
          ))}
        </nav>

        <div className="ad-foot">
          <div className="ad-user">
            <span className="ad-avatar">OF</span>
            <div className="ad-user-txt"><strong>Procurement Officer</strong><small>{org}</small></div>
          </div>
          <button className="ad-logout" onClick={() => onLogout && onLogout()} title="Log out">
            <AIcon name="logout" /> <span className="ad-label">Log out</span>
          </button>
        </div>
      </aside>

      <main className="ad-main">
        <header className="ad-top">
          <div className="ad-top-left">
            <button className="ad-burger" aria-label="Open menu" onClick={() => setDrawer(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <p className="ad-crumb">Officer Console</p>
              <h1>{current.label}</h1>
            </div>
          </div>
          <div className="ad-top-right">
            <span className="ad-top-avatar">OF</span>
          </div>
        </header>

        <section className="ad-page" key={page}>
          <Current go={go} ctx={ctx} status={status} />
        </section>
      </main>
    </div>
  );
}