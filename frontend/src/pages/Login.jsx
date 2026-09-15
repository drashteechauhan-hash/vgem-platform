import { useState, useEffect, useRef } from "react";
import "./Login.css";
import { signupBidder, signupOfficer, loginUser } from "../services/api";
import VGEMLogo from "../VGEMLogo";

const ROLE_INFO = {
  officer: "Review submissions and make decisions.",
  bidder: "Manage documents, compliance and bids.",
};

function ScoreCounter({ from = 88, to = 92 }) {
  const [n, setN] = useState(from);
  useEffect(() => {
    const t0 = performance.now();
    const dur = 1400;
    let raf;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      setN(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  return <>{n}%</>;
}

export default function Login({ initialRole = "officer", onLogin, onBack }) {
  const [role, setRole] = useState(initialRole === "bidder" ? "bidder" : "officer");
  const [mode, setMode] = useState("signin");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [org, setOrg] = useState("");
    const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [officerId, setOfficerId] = useState("");
  const [err, setErr] = useState("");
  const [phase, setPhase] = useState("idle");
  const [shake, setShake] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const isOfficer = role === "officer";
    const isSignup = mode === "signup";

  const fail = (msg) => { setErr(msg); setShake(true); setTimeout(() => setShake(false), 500); };

     const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (isOfficer && isSignup) {
      if (!name.trim() || !email.trim() || !pw.trim() || !org) return fail("Please fill all fields.");
      if (pw.length < 4) return fail("Password must be at least 4 characters.");
      const res = await signupOfficer({ name, email, password: pw, phone, dept: org, designation, officer_id: officerId });
      if (!res.ok) return fail(res.error);
      return run(res.data.user);
    }
    if (isOfficer) {
      if (!email.trim() || !pw.trim() || !org) return fail("Please fill all fields.");
      const res = await loginUser({ email, password: pw, role: "officer" });
      if (!res.ok) return fail(res.error);
      return run(res.data.user);
    }
    if (isSignup) {
      if (!company.trim() || !email.trim() || !pw.trim() || !phone.trim()) return fail("Please fill all fields.");
      if (pw.length < 4) return fail("Password must be at least 4 characters.");
      const res = await signupBidder({ company, email, password: pw, phone });
      if (!res.ok) return fail(res.error);
      return run(res.data.user);
    }
    if (!email.trim() || !pw.trim()) return fail("Please enter email and password.");
    const res = await loginUser({ email, password: pw, role: "bidder" });
    if (!res.ok) return fail(res.error);
    run(res.data.user);
  };

  const run = (user) => { setPhase("verifying"); setTimeout(() => onLogin && onLogin(role, user), 2100); };

  return (
    <div className={"lx" + (mounted ? " is-mounted" : "")}>

      {/* LEFT — editorial verification-workspace composition */}
      <aside className="lx-side">
        <button className="lx-back" onClick={() => onBack && onBack()} type="button">← Back to home</button>

        <div className="lx-brand">
<span className="lx-logo"><VGEMLogo size={20} color="#4A6B54" /></span>
          <div><strong>VGEM</strong><small>Bid Compliance Platform</small></div>
        </div>

        <div className="lx-visual" aria-hidden="true">
          <div className="lx-doc-card">
            <span className="lx-doc-tag">GSTN <i>✓ Verified</i></span>
            <p className="lx-doc-title">Company document</p>
            <div className="lx-doc-row"><span>Registration no.</span><b>27AAT••••1Z1</b></div>
            <div className="lx-doc-row"><span>GSTIN</span><b className="ok">Verified</b></div>
            <div className="lx-doc-row"><span>UDYAM</span><b className="ok">Verified</b></div>
          </div>

          <div className="lx-evidence-line">
            <span className="lx-evidence-dot" />
          </div>

          <div className="lx-score-card">
            <span className="lx-score-n"><ScoreCounter /></span>
            <span className="lx-score-l">Compliance</span>
            <ul>
              <li className="ok">✓ GSTN</li>
              <li className="ok">✓ UDYAM</li>
              <li className="ok">✓ PAN</li>
              <li className="warn">⚠ ESIC</li>
            </ul>
          </div>

          <div className="lx-status-pill">
            <span className="lx-status-dot" />
            System status — all checks operational
          </div>
        </div>

        <div className="lx-headline">
          <p className="lx-eyebrow">Verify with confidence</p>
          <h2>From document<br />to decision.</h2>
          <p className="lx-sub-line">One workspace for documents, verification evidence and compliance decisions.</p>
        </div>
      </aside>

      {/* RIGHT — form */}
      <main className="lx-main">
        <div className={"lx-card" + (shake ? " shake" : "")}>

          <div className="lx-form-brand">
            <span className="lx-logo sm">◆</span>
            <div><strong>VGEM</strong><small>Bid Compliance Platform</small></div>
          </div>

          <h1>{isSignup ? "Create your account" : "Sign in to VGEM"}</h1>
          <p className="lx-sub">
            {isSignup ? "Register your enterprise to start tracking compliance." : "Continue to your verification workspace."}
          </p>

          <div className="lx-toggle" data-active={role}>
            <span className="lx-thumb" />
            <button type="button" className={isOfficer ? "on" : ""} onClick={() => { setRole("officer"); setErr(""); }}>Officer</button>
            <button type="button" className={!isOfficer ? "on" : ""} onClick={() => { setRole("bidder"); setErr(""); }}>Bidder</button>
          </div>
          <p className="lx-role-desc">{ROLE_INFO[role]}</p>

          <form onSubmit={submit} className="lx-form">
            {isOfficer && (
              <div className="lx-field">
                <label htmlFor="org">Organisation</label>
                <select id="org" value={org} onChange={(e) => setOrg(e.target.value)}>
                  <option value="" disabled>Select CPSE / Organisation</option>
                  <option>NTPC Limited</option>
                  <option>Oil & Natural Gas Corp (ONGC)</option>
                  <option>Bharat Heavy Electricals (BHEL)</option>
                  <option>Indian Oil Corporation (IOCL)</option>
                  <option>Steel Authority of India (SAIL)</option>
                </select>
              </div>
            )}
                        {isOfficer && isSignup && (
              <>
                <div className="lx-field">
                  <label htmlFor="name">Full name</label>
                  <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="lx-field">
                  <label htmlFor="desig">Designation</label>
                  <input id="desig" value={designation} onChange={(e) => setDesignation(e.target.value)} />
                </div>
                <div className="lx-field">
                  <label htmlFor="oid">Officer ID</label>
                  <input id="oid" value={officerId} onChange={(e) => setOfficerId(e.target.value)} />
                </div>
              </>
            )}

            {isSignup && (
              <div className="lx-field">
                <label htmlFor="company">Company / enterprise name</label>
                <input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>
            )}

            <div className="lx-field">
              <label htmlFor="email">{isOfficer ? "Official email / Officer ID" : "Work email"}</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            {isSignup && (
              <div className="lx-field">
                <label htmlFor="phone">Phone number</label>
                <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            )}

            <div className="lx-field">
              <label htmlFor="pw">Password</label>
              <div className="lx-pw-wrap">
                <input id="pw" type={showPw ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} />
                <button type="button" className="lx-pw-toggle" onClick={() => setShowPw((s) => !s)}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {err && <div className="lx-err" role="alert">{err}</div>}

            {!isSignup && (
              <div className="lx-row">
                <label className="lx-check"><input type="checkbox" /> <span>Remember me</span></label>
                <a href="#f" onClick={(e) => e.preventDefault()}>Forgot password?</a>
              </div>
            )}

            <button className="lx-submit" type="submit" disabled={phase === "verifying"}>
              {isOfficer ? "Sign in & verify" : isSignup ? "Create account" : "Sign in"} <span className="arr">→</span>
            </button>

                        <p className="lx-foot">
              {isSignup
                ? <>Already registered? <a href="#s" onClick={(e) => { e.preventDefault(); setMode("signin"); setErr(""); }}>Sign in</a></>
                : <>Don't have an account? <a href="#u" onClick={(e) => { e.preventDefault(); setMode("signup"); setErr(""); }}>Create account →</a></>}
            </p>
          </form>

          <div className="lx-secure"><span>🔒</span> 2FA-secured · GeM compliant · Audit-logged</div>
        </div>
      </main>

      {phase === "verifying" && (
        <div className="lx-verify">
          <div className="lx-ring">
            <svg viewBox="0 0 120 120"><circle className="t" cx="60" cy="60" r="50" /><circle className="s" cx="60" cy="60" r="50" /></svg>
            <span className="lx-ring-c">◆</span>
          </div>
          <h3>{isSignup ? "Setting up your portal" : "Signing you in"}</h3>
          <ul>
            <li style={{ "--d": "0s" }}>{isSignup ? "Creating secure account" : "Verifying credentials"}</li>
            <li style={{ "--d": ".6s" }}>Establishing secure session</li>
            <li style={{ "--d": "1.2s" }}>{isOfficer ? "Loading officer console" : "Loading your compliance data"}</li>
          </ul>
        </div>
      )}
    </div>
  );
}