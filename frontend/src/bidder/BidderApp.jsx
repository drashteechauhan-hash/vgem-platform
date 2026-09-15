import { useState, useRef, useEffect } from "react";
import "./BidderApp.css";
import { Icon } from "./ui";
import { deriveProfile } from "../auth";
import { StoreProvider, useStore } from "./store";
import Overview from "./pages/Overview";
import Compliance from "./pages/Compliance";
import Documents from "./pages/Documents";
import Bids from "./pages/Bids";
import Profile from "./pages/Profile";
import VGEMLogo from "../VGEMLogo";
import BidderTenders from "./pages/Tenders";

function ToastHost() {
  const { toast } = useStore();
  if (!toast) return null;
  return <div className="bm-toast">✓ {toast}</div>;
}
const PAGES = [
  { key: "overview", label: "Overview", icon: "grid", C: Overview },
  { key: "tenders", label: "Tenders", icon: "bids", C: BidderTenders },
  { key: "compliance", label: "Compliance", icon: "shield", C: Compliance },
  { key: "documents", label: "Documents", icon: "doc", C: Documents },
  { key: "bids", label: "My Bids", icon: "bids", C: Bids },
  { key: "profile", label: "Company", icon: "user", C: Profile },
];

const FALLBACK = { company: "Demo Enterprise", email: "demo@bidder.in", phone: "+91 90000 00000" };

export default function BidderApp({ user, onLogout }) {
  const profile = deriveProfile(user || FALLBACK);
  const [page, setPage] = useState("overview");
  const [hovered, setHovered] = useState(false);
  const [menu, setMenu] = useState(false);
  const navRef = useRef(null);
  const menuRef = useRef(null);
  const [ind, setInd] = useState({ top: 0, height: 0 });

  useEffect(() => {
    const el = navRef.current?.querySelector(`[data-tab="${page}"]`);
    if (el) setInd({ top: el.offsetTop, height: el.offsetHeight });
  }, [page, hovered]);

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const current = PAGES.find((p) => p.key === page);
  const Current = current.C;
  const go = (k) => setPage(k);

  return (
    <StoreProvider profile={profile}>
      <div className={"bidder" + (hovered ? " expanded" : "")}>
        <aside className="side"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}>
          <div className="side-top">
            <div className="side-brand">
<span className="side-mark"><VGEMLogo size={18} color="#fff" /></span>
<div className="side-brand-txt"><strong>VGEM</strong><small>Bidder Portal</small></div>
            </div>
          </div>

          <nav className="side-nav" ref={navRef}>
            <span className="side-ind" style={{ top: ind.top, height: ind.height }} />
            {PAGES.map((p) => (
              <button key={p.key} data-tab={p.key}
                className={"side-item" + (page === p.key ? " on" : "")} onClick={() => go(p.key)}
                title={p.label}>
                <Icon name={p.icon} className="side-ico" />
                <span className="side-label">{p.label}</span>
              </button>
            ))}
          </nav>

          <div className="side-foot">
            <div className="side-user">
              <span className="side-avatar">{profile.initials}</span>
              <div className="side-user-txt">
                <strong>{profile.company}</strong>
                <small>{profile.type}</small>
              </div>
            </div>
            <button className="side-logout" onClick={() => onLogout && onLogout()} title="Log out">
              <Icon name="logout" className="side-ico" /> <span className="side-label">Log out</span>
            </button>
          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div>
              <p className="crumb">Bidder Portal</p>
              <h1>{current.label}</h1>
            </div>
            <div className="topbar-right">
              <div className="search">
                <Icon name="search" className="search-ico" />
                <input placeholder="Search tenders, documents…" />
              </div>
              <button className="icon-btn" aria-label="Notifications">
                <Icon name="bell" /><span className="dot" />
              </button>

              <div className="profile-wrap" ref={menuRef}>
                <button className="top-avatar" onClick={() => setMenu((m) => !m)}>{profile.initials}</button>
                {menu && (
                  <div className="profile-menu">
                    <div className="pm-head">
                      <span className="pm-avatar">{profile.initials}</span>
                      <div>
                        <strong>{profile.company}</strong>
                        <small>{profile.email}</small>
                      </div>
                    </div>
                    <div className="pm-body">
                      <div className="pm-row"><span>Seller ID</span><b>{profile.sellerId}</b></div>
                      <div className="pm-row"><span>GSTIN</span><b>{profile.gstin}</b></div>
                      <div className="pm-row"><span>Type</span><b>{profile.type}</b></div>
                    </div>
                    <button className="pm-item" onClick={() => { setMenu(false); go("profile"); }}>
                      <Icon name="user" /> View full profile
                    </button>
                    <button className="pm-item danger" onClick={() => onLogout && onLogout()}>
                      <Icon name="logout" /> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <section className="page">
            <Current go={go} />
          </section>
          <ToastHost />
        </main>
      </div>
    </StoreProvider>
  );
}