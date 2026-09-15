import { useState, useEffect } from "react";
import { Icon, ScoreRing, CountUp } from "../ui";
import { actions } from "../data";
import { useStore } from "../store";

export default function Overview({ go }) {
  const { profile, derived, activity, submitEsic, verifyItr, linkBis } = useStore();
  const [modal, setModal] = useState(null);

  const stats = [
    { key: "docs", label: "Documents verified", value: derived.dVerified, total: derived.dTotal, icon: "doc", page: "documents" },
    { key: "portals", label: "Portals linked", value: derived.pVerified, total: derived.pTotal, icon: "link", page: "compliance" },
    { key: "bids", label: "Active bids", value: 4, total: null, icon: "bids", page: "bids" },
    { key: "actions", label: "Actions needed", value: derived.openActions, total: null, icon: "alert", page: "compliance" },
  ];

  const openIssue = (key) => setModal(key); // "esic" | "itr" | "bis"

  return (
    <>
      <div className="ov-top">
        <div className="card ov-hero">
          <div className="ov-hero-in">
            <button className="ov-ring-btn" onClick={() => setModal("score")} title="Why this score?">
              <ScoreRing value={derived.score} size={140} />
            </button>
            <div>
              <p className="ov-welcome">Welcome back</p>
              <h2>{profile.company}</h2>
              <p className="ov-desc">Your compliance is {derived.score >= 80 ? "strong" : "in progress"}. Clear the flagged items below to reach full readiness.</p>
              <span className="ov-risk"><i /> {derived.risk} risk</span>
            </div>
          </div>
        </div>

        <div className="card ov-actions">
          <div className="ov-actions-h">
            <div><p className="sec-h">Action needed</p><p className="sec-p">AI-flagged items to resolve</p></div>
            <span className="pill-tag warn"><i /> {derived.openActions}</span>
          </div>
          {actions.map((a) => {
            const k = a.title.includes("ESIC") ? "esic" : a.title.includes("ITR") ? "itr" : "bis";
            return (
              <div key={a.title} className={"act-row " + a.level}>
                <div className="act-row-head" onClick={() => openIssue(k)}>
                  <span className="act-dot"><Icon name="alert" /></span>
                  <div className="act-row-main"><strong>{a.title}</strong><small>{a.desc}</small></div>
                  <button className="act-why" onClick={(e) => { e.stopPropagation(); setModal("why-" + k); }}>Why?</button>
                  <Icon name="chevron" className="act-caret" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tender readiness card */}
      <div className="card ov-readiness">
        <div className="rd-head">
          <div><p className="sec-h">Tender readiness</p><p className="sec-p">Based on your compliance and required documents</p></div>
          <span className="rd-pct"><CountUp value={derived.readiness} />%</span>
        </div>
        <div className="rd-bar"><span style={{ width: derived.readiness + "%" }} /></div>
        <div className="rd-cols">
          <div>
            <span className="rd-label ok">Ready</span>
            <ul>{["GST","PAN","Udyam"].map((x) => <li key={x}><i className="ok">✓</i>{x}</li>)}</ul>
          </div>
          <div>
            <span className="rd-label warn">Needs attention</span>
            <ul>{derived.issues.map((x) => <li key={x.key}><i className="warn">!</i>{x.label.split(" ")[0]}</li>)}</ul>
          </div>
        </div>
        <div className="rd-foot">
          <small>{derived.issues.length} requirement{derived.issues.length !== 1 ? "s" : ""} may block submission</small>
          <button className="rd-btn" onClick={() => setModal("readiness")}>View readiness →</button>
        </div>
      </div>

      <div className="stat-grid stagger">
        {stats.map((s) => (
          <div key={s.key} className="card stat-tile" onClick={() => go(s.page)} style={{ cursor: "pointer" }}>
            <span className="st-ico"><Icon name={s.icon} /></span>
            <b><CountUp value={s.value} />{s.total ? <em> / {s.total}</em> : null}</b>
            <p>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card ov-activity">
        <p className="sec-h">Recent activity</p>
        <div className="timeline">
          {activity.map((a, i) => (
            <div key={i} className="tl-item">
              <span className={"tl-ico " + a.tone}><Icon name={a.icon} /></span>
              <div><strong>{a.text}</strong><small>{a.time}</small></div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Copilot */}
      <Copilot derived={derived} />

      {/* MODALS */}
      {modal === "esic" && <VerifyModal onClose={() => setModal(null)} onDone={(f) => submitEsic(f)} />}
      {modal === "itr" && <Shell title="ITR under review" status="Under review · AY 2025-26" onClose={() => setModal(null)}>
        <p className="bm-body">Your Income Tax Return for AY 2025-26 is awaiting verification. Confirm to complete this check.</p>
        <button className="bm-cta" onClick={() => { verifyItr(); setModal(null); }}>Verify ITR</button>
      </Shell>}
      {modal === "bis" && <BisModal onClose={() => setModal(null)} onSubmit={(c) => { linkBis(c); setModal(null); }} />}

      {modal === "score" && <ScoreModal derived={derived} onClose={() => setModal(null)} onPlan={() => { setModal(null); }} />}
      {modal === "readiness" && <ReadinessModal derived={derived} onClose={() => setModal(null)} onResolve={() => setModal("esic")} />}

      {modal && modal.startsWith("why-") && <WhyModal which={modal.slice(4)} onClose={() => setModal(null)} onResolve={() => setModal(modal.slice(4))} />}
    </>
  );
}

/* ---------- shell ---------- */
function Shell({ title, status, children, onClose }) {
  return (
    <div className="bm-overlay" onClick={onClose}>
      <div className="bm-card" onClick={(e) => e.stopPropagation()}>
        <button className="bm-x" onClick={onClose}>×</button>
        <h3 className="bm-title">{title}</h3>
        {status && <span className="bm-status">{status}</span>}
        {children}
      </div>
    </div>
  );
}

/* ---------- AI verification (multi-step) ---------- */
const STEPS = ["Reading document", "Extracting compliance details", "Validating document information", "Cross-checking bidder details", "Completing verification"];
function VerifyModal({ onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState(-1); // -1 = pick, 0..4 running, 99 done

  useEffect(() => {
    if (step < 0 || step >= STEPS.length) return;
    const t = setTimeout(() => setStep((s) => s + 1), 750);
    return () => clearTimeout(t);
  }, [step]);

  useEffect(() => {
    if (step === STEPS.length) {
      const t = setTimeout(() => {
        onDone(`${file.name.split(".").pop().toUpperCase()} · ${Math.round(file.size/1024)} KB`);
        setStep(99);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [step]);

  const start = () => setStep(0);

  return (
    <div className="bm-overlay" onClick={step < 0 ? onClose : undefined}>
      <div className="bm-card" onClick={(e) => e.stopPropagation()}>
        {step < 0 && <button className="bm-x" onClick={onClose}>×</button>}
        <h3 className="bm-title">AI Verification</h3>

        {step < 0 && (
          <>
            <span className="bm-status">ESIC · Missing</span>
            <p className="bm-body">Upload your latest ESIC compliance proof. AI will validate it against your records.</p>
            <label className="bm-file">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
              {file ? <span className="bm-file-name">📄 {file.name}</span> : <span className="bm-file-ph">Choose file…</span>}
            </label>
            <button className="bm-cta" disabled={!file} onClick={start}>Verify with AI</button>
          </>
        )}

        {step >= 0 && step < 99 && (
          <>
            <span className="bm-status">📄 {file.name}</span>
            <p className="bm-ai-live">AI is validating this document…</p>
            <ul className="bm-steps">
              {STEPS.map((s, i) => (
                <li key={s} className={i < step ? "done" : i === step ? "run" : "pend"}>
                  <span className="bm-step-ic">{i < step ? "✓" : i === step ? "" : ""}</span>{s}
                </li>
              ))}
            </ul>
          </>
        )}

        {step === 99 && (
          <div className="bm-done">
            <span className="bm-done-tick">✓</span>
            <h4>Verification complete</h4>
            <p>ESIC compliance document successfully verified.</p>
            <button className="bm-cta" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

function BisModal({ onClose, onSubmit }) {
  const [cert, setCert] = useState("");
  return (
    <Shell title="BIS certification" status="Not linked" onClose={onClose}>
      <p className="bm-body">Link your BIS certification for applicable product categories.</p>
      <div className="bm-field"><label>Applicable category</label><input value="Electronics & IT goods" readOnly /></div>
      <div className="bm-field"><label>Certification number</label><input value={cert} onChange={(e) => setCert(e.target.value)} placeholder="e.g. BIS-R-41028976" /></div>
      <button className="bm-cta" disabled={!cert.trim()} onClick={() => onSubmit(cert.trim())}>Link certification</button>
    </Shell>
  );
}

function ScoreModal({ derived, onClose, onPlan }) {
  return (
    <Shell title={`Why is my score ${derived.score}%?`} onClose={onClose}>
      <div className="bm-checks">
        <span className="rd-label ok">Verified</span>
        <ul className="bm-list">{["GST","Udyam","PAN","Company registration"].map((x) => <li key={x}><i className="ok">✓</i>{x}</li>)}</ul>
        <span className="rd-label warn">Needs attention</span>
        <ul className="bm-list">{derived.issues.map((x) => <li key={x.key}><i className="warn">!</i>{x.label} — {x.state}</li>)}</ul>
      </div>
      <div className="bm-ai-box">
        <span className="bm-ai-tag">AI assessment</span>
        <p>{derived.issues.length ? `Your score is limited by ${derived.issues.length} unresolved check${derived.issues.length>1?"s":""}. Resolving the ${derived.issues[0].label.split(" ")[0]} requirement is the fastest way to improve readiness.` : "All checks verified — your compliance is complete."}</p>
      </div>
      <button className="bm-cta" onClick={onPlan}>View action plan</button>
    </Shell>
  );
}

function ReadinessModal({ derived, onClose, onResolve }) {
  const req = [
    { l: "Business registration", ok: true }, { l: "GST", ok: true },
    { l: "ESIC compliance", ok: !derived.issues.find((i) => i.key === "esic") },
    { l: "BIS certification", ok: !derived.issues.find((i) => i.key === "bis") },
  ];
  return (
    <Shell title="Tender readiness" status={`${derived.readiness}% ready`} onClose={onClose}>
      <div className="bm-checks">
        <span className="rd-label ok">Compliance checks</span>
        <ul className="bm-list">
          <li><i className="ok">✓</i>GST verified</li>
          <li><i className="ok">✓</i>PAN verified</li>
          <li><i className="ok">✓</i>Udyam verified</li>
          {derived.issues.map((x) => <li key={x.key}><i className="warn">!</i>{x.label} — {x.state}</li>)}
        </ul>
        <span className="rd-label ok">Tender requirements</span>
        <ul className="bm-list">{req.map((r) => <li key={r.l}><i className={r.ok?"ok":"warn"}>{r.ok?"✓":"✕"}</i>{r.l}</li>)}</ul>
      </div>
      {derived.issues.length > 0 && (
        <div className="bm-ai-box">
          <span className="bm-ai-tag">Recommended next action</span>
          <p>Upload {derived.issues[0].label} proof.</p>
        </div>
      )}
      {derived.issues.length > 0 && <button className="bm-cta" onClick={onResolve}>Resolve now</button>}
    </Shell>
  );
}

function WhyModal({ which, onClose, onResolve }) {
  const map = {
    esic: { t: "ESIC compliance document", reason: "Your uploaded bidder records do not contain a valid ESIC compliance document for the current verification period.", action: "Upload the latest ESIC compliance proof." },
    itr: { t: "ITR", reason: "The submitted Income Tax Return is pending confirmation for AY 2025-26.", action: "Confirm the uploaded return to complete verification." },
    bis: { t: "BIS certification", reason: "No BIS certification is linked for your applicable product categories.", action: "Link a valid BIS certification number." },
  }[which] || {};
  return (
    <Shell title="Why was this flagged?" onClose={onClose}>
      <p className="bm-body">{map.reason}</p>
      <span className="rd-label ok" style={{ marginBottom: 8 }}>Evidence checked</span>
      <ul className="bm-list">{["Uploaded documents","Document validity","Bidder entity details"].map((x) => <li key={x}><i className="ok">•</i>{x}</li>)}</ul>
      <div className="bm-ai-box"><span className="bm-ai-tag">Recommended action</span><p>{map.action}</p></div>
      <button className="bm-cta" onClick={onResolve}>Resolve now</button>
    </Shell>
  );
}

/* ---------- AI Copilot ---------- */
function Copilot({ derived }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(null);

  const ask = (q) => {
    const iss = derived.issues;
    if (q === "block") {
      setMsg(iss.length
        ? `${iss.length} item${iss.length>1?"s":""} currently limit your compliance:\n\n` + iss.map((x, i) => `${i+1}. ${x.label} — ${x.state}`).join("\n") + `\n\nRecommended first step: resolve ${iss[0].label.split(" ")[0]}.`
        : "Nothing is blocking you — all checks are verified.");
    } else if (q === "first") {
      setMsg(iss.length ? `Start with ${iss[0].label}. It is the highest-priority unresolved requirement and will improve your readiness the most.` : "You're all set — no pending items.");
    } else if (q === "risk") {
      setMsg(`Current risk: ${derived.risk}\n\nYour score (${derived.score}%) is affected by ${iss.length} unresolved check${iss.length!==1?"s":""}. Resolving them will reduce compliance risk.`);
    } else {
      setMsg(`Tender readiness: ${derived.readiness}%\n\n${iss.length ? `${iss.length} requirement${iss.length>1?"s":""} may block submission — ${iss.map(x=>x.label.split(" ")[0]).join(", ")}.` : "You meet all requirements for submission."}`);
    }
  };

  return (
    <>
      <button className={"cp-fab" + (open ? " open" : "")} onClick={() => setOpen((o) => !o)} aria-label="Compliance Copilot">
        {open ? "×" : "AI"}
      </button>
      {open && (
        <div className="cp-panel">
          <div className="cp-head">
            <div><strong>Compliance Copilot</strong><small>Your AI compliance assistant</small></div>
            <span className="cp-tag">AI</span>
          </div>
          <div className="cp-insight">Your compliance is at {derived.score}%. {derived.issues.length} check{derived.issues.length!==1?"s":""} need attention.</div>
          {msg && <div className="cp-msg">{msg}</div>}
          <div className="cp-actions">
            <button onClick={() => ask("block")}>What is blocking me?</button>
            <button onClick={() => ask("first")}>What should I fix first?</button>
            <button onClick={() => ask("risk")}>Explain my risk</button>
            <button onClick={() => ask("ready")}>Check tender readiness</button>
          </div>
          <small className="cp-foot">Based on current compliance data</small>
        </div>
      )}
    </>
  );
}