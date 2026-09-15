import { useState, useEffect, useRef, useCallback } from "react";
import "./HomePage.css";
import VGEMLogo from "../VGEMLogo";

const IMG = (id, w = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const HERO_IMG = IMG("photo-1554224155-6726b3ff858f");

const heroCards = [
  { tick: "✓", top: "GSTN validated", sub: "12 / 12 returns filed" },
  { tick: "✓", top: "Udyam verified", sub: "Registration active" },
  { tick: "✓", top: "PAN matched", sub: "Entity confirmed" },
  { tick: "✓", top: "EPFO checked", sub: "Compliance current" },
];

const portals = ["Udyam","GSTN","PAN","MCA21","EPFO","ESIC","DigiLocker","Startup India","NSIC","BIS","Make in India"];
const manual = ["Portal hopping","Document matching","Repeated checks","Human errors","No unified audit trail"];
const vgem = ["One workspace","AI extraction","Cross-verification","Compliance score","Evidence + audit trail"];

const stages = [
  { n: "01", t: "Submit", d: "The bidder uploads documents and registrations into a single workspace.", badge: "Documents received", img: IMG("photo-1450101499163-c8848c66ca85", 1100) },
  { n: "02", t: "Verify", d: "AI extracts the data, cross-checks it against portal records, and flags any gaps.", badge: "AI cross-checking", img: IMG("photo-1554224155-6726b3ff858f", 1100) },
  { n: "03", t: "Score", d: "A compliance score and a clear risk level are generated, backed by evidence.", badge: "Score generated", img: IMG("photo-1551288049-bebda4e38f71", 1100) },
  { n: "04", t: "Decide", d: "The officer reviews the evidence and makes the final qualification decision.", badge: "Ready for review", img: IMG("photo-1521791136064-7986c2920216", 1100) },
];

const aiFlow = ["Document", "AI extraction", "Cross-check", "Evidence", "Officer decision"];

const impact = [
  { v: 80, s: "%", l: "Less verification effort" },
  { v: 11, s: "+", l: "Portals in one window" },
  { v: 3, s: "×", l: "Faster tender evaluation" },
  { v: 100, s: "%", l: "Auditable & traceable" },
];

function Reveal({ children, as: Tag = "div", d = 0, className = "" }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setOn(true), io.disconnect()), { threshold: 0.16 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`rv ${on ? "on" : ""} ${className}`} style={{ transitionDelay: `${d}ms` }}>{children}</Tag>;
}

function Counter({ value, suffix }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now();
      const tick = (t) => { const p = Math.min((t - t0) / 1600, 1);
        setN(Math.round((1 - Math.pow(1 - p, 3)) * value)); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el); return () => io.disconnect();
  }, [value]);
  return <span ref={ref}>{n}{suffix}</span>;
}

/* HOW IT WORKS — self-contained auto-playing showcase */
function HowItWorks() {
  const DURATION = 4500;
  const [stage, setStage] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false;
  }, []);

  useEffect(() => {
    const el = sectionRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = inView && !paused && !reducedMotionRef.current;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setStage((s) => (s + 1) % stages.length), DURATION);
    return () => clearTimeout(t);
  }, [stage, running]);

  return (
    <section className="hw" id="how" ref={sectionRef}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="hw-grid">
        <div className="hw-left">
          <p className="hw-eyebrow">How it works</p>
          <h2 className="hw-title">From document<br />to decision.</h2>
          <div className="hw-stage">
            {stages.map((s, i) => (
              <div key={s.n} className={"hw-stage-panel" + (i === stage ? " on" : "")} aria-hidden={i !== stage}>
                <span className="hw-n">{s.n}</span>
                <b className="hw-stage-t">{s.t}</b>
                <p className="hw-stage-d">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="hw-indicators">
            {stages.map((s, i) => (
              <button key={s.n} type="button" className={"hw-ind" + (i === stage ? " on" : "")}
                onClick={() => setStage(i)} aria-label={`Show ${s.t}`}>
                <span className="hw-ind-label">{s.n} {s.t}</span>
                <span className="hw-ind-track">
                  {i === stage && (
                    <span key={`bar-${stage}`} className="hw-ind-fill"
                      style={{ animationDuration: `${DURATION}ms`, animationPlayState: running ? "running" : "paused" }} />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="hw-right">
          <div className="hw-img-frame">
            {stages.map((s, i) => (
              <div key={s.n} className={"hw-img" + (i === stage ? " on" : "")}
                style={{ backgroundImage: `url(${s.img})` }} aria-hidden={i !== stage} />
            ))}
            <div className="hw-badge"><span className="hw-badge-dot" />{stages[stage].badge}</div>
          </div>
        </div>
      </div>
      <div className="hw-strip">
        {stages.map((s, i) => (
          <span key={s.n} className={i === stage ? "on" : ""}>{s.n} {s.t}</span>
        ))}
      </div>
    </section>
  );
}

export default function HomePage({ onEnter }) {
  const [scrolled, setScrolled] = useState(false);
  const [heroCard, setHeroCard] = useState(0);
  const heroImgRef = useRef(null);
  const stripRef = useRef(null);
  const cursorRef = useRef(null);
  const heroMediaRef = useRef(null);

  // header compact on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // rotating hero card
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setHeroCard((c) => (c + 1) % heroCards.length), 3200);
    return () => clearInterval(t);
  }, []);

  // subtle hero parallax + strip drift
  useEffect(() => {
    let raf;
    const onScroll = () => {
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        if (heroImgRef.current) heroImgRef.current.style.transform = `translateY(${y * 0.06}px) scale(1.02)`;
        if (stripRef.current) {
          const wrap = stripRef.current.parentElement;
          const rect = wrap.getBoundingClientRect();
          const p = 1 - Math.max(0, Math.min(1, rect.top / window.innerHeight));
          stripRef.current.style.transform = `translateX(${-p * 260}px)`;
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  // custom cursor (desktop only)
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const dot = cursorRef.current; if (!dot) return;
    let x = 0, y = 0, cx = 0, cy = 0, raf;
    const move = (e) => { x = e.clientX; y = e.clientY; };
    const loop = () => {
      cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
      dot.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(loop);
    };
    const over = (e) => {
      const t = e.target.closest("button, a, .ed-btn, .hw-ind, .ed-strip-i");
      dot.classList.toggle("big", !!t);
      const hero = e.target.closest(".ed-hero-media");
      dot.classList.toggle("explore", !!hero);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseover", over);
    raf = requestAnimationFrame(loop);
    document.body.classList.add("has-cursor");
    return () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", over);
      cancelAnimationFrame(raf);
      document.body.classList.remove("has-cursor");
    };
  }, []);

  // hero cursor-responsive parallax
  useEffect(() => {
    const el = heroMediaRef.current; if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    let raf;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      raf = requestAnimationFrame(() => {
        const img = el.querySelector(".ed-hero-img");
        const f1 = el.querySelector(".ed-f1");
        const f2 = el.querySelector(".ed-f2");
        if (img) img.style.transform = `translate(${dx * 8}px, ${dy * 8}px) scale(1.03)`;
        if (f1) f1.style.transform = `translate(${dx * -14}px, ${dy * -10}px)`;
        if (f2) f2.style.transform = `translate(${dx * 14}px, ${dy * 12}px)`;
      });
    };
    const reset = () => {
      const img = el.querySelector(".ed-hero-img");
      const f1 = el.querySelector(".ed-f1");
      const f2 = el.querySelector(".ed-f2");
      if (img) img.style.transform = "";
      if (f1) f1.style.transform = "";
      if (f2) f2.style.transform = "";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", reset);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", reset); cancelAnimationFrame(raf); };
  }, []);

  const c = heroCards[heroCard];

  return (
    <div className="ed">
      <div className="ed-cursor" ref={cursorRef} aria-hidden="true"><span>EXPLORE</span></div>

      {/* HEADER */}
      <header className={"ed-nav" + (scrolled ? " small" : "")}>
        <a className="ed-brand" href="#top">
          <span className="ed-logo"><VGEMLogo size={20} color="#fff" /></span>
          <span className="ed-brand-txt"><b>VGEM</b><i>Bid Compliance Platform</i></span>
        </a>
        <nav className="ed-links">
          <a href="#problem">Capabilities</a>
          <a href="#how">How it works</a>
          <a href="#impact">Impact</a>
        </nav>
        <div className="ed-nav-cta">
          <button className="ed-btn ghost" onClick={() => onEnter("bidder")}>Bidder Portal</button>
          <button className="ed-btn solid" onClick={() => onEnter("officer")}>Officer Console</button>
        </div>
      </header>

      {/* 01 HERO */}
      <section className="ed-hero" id="top">
        <div className="ed-hero-copy">
          <p className="ed-eyebrow rv on">Government e-Marketplace · AI Verification</p>
          <h1 className="ed-hero-h">
            <span className="ln ln1">Bid compliance,</span>
            <span className="ln ln2">verified in minutes.</span>
          </h1>
          <p className="ed-hero-d rv-hero d1">Every bidder cross-checked across Udyam, GSTN, PAN, EPFO and DigiLocker — with evidence attached to each result.</p>
          <div className="ed-hero-btns rv-hero d2">
            <button className="ed-btn solid lg" onClick={() => onEnter("officer")}>Launch Officer Console →</button>
            <button className="ed-btn line lg" onClick={() => onEnter("bidder")}>I'm a Bidder</button>
          </div>
        </div>
        <div className="ed-hero-media" ref={heroMediaRef}>
          <div className="ed-hero-img-wrap">
            <div className="ed-hero-img" ref={heroImgRef} style={{ backgroundImage: `url(${HERO_IMG})` }} />
          </div>
          <div className="ed-float ed-f1" key={heroCard}>
            <span className="ed-f-tick">{c.tick}</span>
            <div><b>{c.top}</b><small>{c.sub}</small></div>
          </div>
          <div className="ed-float ed-f2">
            <span className="ed-f-ring"><i>92%</i></span>
            <div><b>Compliance verified</b><small>Evidence attached</small></div>
          </div>
        </div>
      </section>

      {/* 02 PROBLEM */}
      <section className="ed-problem" id="problem">
        <Reveal className="ed-problem-in">
          <p className="ed-statement">
            <span>One bidder.</span>
            <span className="ed-huge"><Counter value={11} suffix="+" /></span>
            <span>verification sources.</span>
            <span className="ed-dim">Too many places to check.</span>
          </p>
        </Reveal>
        <div className="ed-strip-wrap">
          <div className="ed-strip" ref={stripRef}>
            {[...portals, ...portals].map((p, i) => (
              <span key={i} className="ed-strip-i">{p}<em>·</em></span>
            ))}
          </div>
        </div>
      </section>

      {/* 03 BEFORE / AFTER */}
      <section className="ed-transform">
        <div className="ed-tf-line" />
        <Reveal className="ed-tf-side manual">
          <span className="ed-tf-label">Manual verification</span>
          <ul>{manual.map((m) => <li key={m}>{m}</li>)}</ul>
        </Reveal>
        <Reveal className="ed-tf-side vgem" d={120}>
          <span className="ed-tf-label accent">VGEM</span>
          <ul>{vgem.map((m) => <li key={m}><i>✓</i>{m}</li>)}</ul>
        </Reveal>
      </section>

      {/* 04 HOW */}
      <HowItWorks />

      {/* 05 PRODUCT */}
      <section className="ed-product">
        <Reveal className="ed-product-head">
          <h2>Everything a bidder needs.<br /><span className="ed-dim">One workspace.</span></h2>
        </Reveal>
        <Reveal className="ed-product-frame" d={100}>
          <div className="ed-mock">
            <div className="ed-mock-side">
              <span className="ed-mock-logo"><VGEMLogo size={18} color="#fff" /></span>
              {["Overview","Compliance","Documents","My Bids","Company"].map((x, i) => (
                <span key={x} className={"ed-mock-nav" + (i === 0 ? " on" : "")}>{x}</span>
              ))}
            </div>
            <div className="ed-mock-main">
              <div className="ed-mock-hero">
                <div className="ed-mock-ring"><i>60%</i></div>
                <div className="ed-mock-hero-txt"><b>Welcome back</b><small>Compliance in progress</small></div>
              </div>
              <div className="ed-mock-stats">
                {["4/8 Documents","7/11 Portals","4 Active bids","6 Actions"].map((x) => (
                  <div key={x} className="ed-mock-stat">{x}</div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal className="ed-product-labels" d={200}>
          {["Compliance","Documents","My Bids","Company"].map((x) => <span key={x}>{x}</span>)}
        </Reveal>
      </section>

      {/* 06 AI */}
      <section className="ed-ai">
        <Reveal className="ed-ai-head">
          <h2>AI checks the evidence.<br /><span className="ed-dim">Officers make the decision.</span></h2>
        </Reveal>
        <div className="ed-ai-flow">
          {aiFlow.map((step, i) => (
            <Reveal key={step} className="ed-ai-node" d={i * 120}>
              <span className="ed-ai-dot" />
              <b>{step}</b>
              {i < aiFlow.length - 1 && <span className="ed-ai-line" />}
            </Reveal>
          ))}
        </div>
        <Reveal className="ed-ai-note" d={200}>
          Portal integration uses realistic mocked data behind an adapter — live government APIs are restricted. The verification engine, scoring and audit flow are real.
        </Reveal>
      </section>

      {/* 07 USERS */}
      <section className="ed-users">
        <Reveal className="ed-user-side bidders">
          <span className="ed-user-label">For bidders</span>
          <ul>{["Upload documents","Track compliance","Monitor bids","Resolve issues"].map((x) => <li key={x}>{x}</li>)}</ul>
          <button className="ed-btn line lg" onClick={() => onEnter("bidder")}>Enter Bidder Portal →</button>
        </Reveal>
        <Reveal className="ed-user-side officers" d={120}>
          <span className="ed-user-label">For officers</span>
          <ul>{["Review submissions","See compliance score","Inspect evidence","Approve / Disqualify"].map((x) => <li key={x}>{x}</li>)}</ul>
          <button className="ed-btn solid lg" onClick={() => onEnter("officer")}>Open Officer Console →</button>
        </Reveal>
      </section>

      {/* 08 IMPACT */}
      <section className="ed-impact" id="impact">
        {impact.map((st, i) => (
          <Reveal key={st.l} className="ed-impact-row" d={i * 80}>
            <span className="ed-impact-n"><Counter value={st.v} suffix={st.s} /></span>
            <span className="ed-impact-l">{st.l}</span>
          </Reveal>
        ))}
      </section>

      {/* 09 CTA */}
      <section className="ed-cta">
        <Reveal>
          <h2 className="ed-cta-h">From portal hopping<br />to one verified decision.</h2>
          <p className="ed-cta-d">Speed for officers. Clarity for bidders. A single, auditable trail.</p>
          <div className="ed-hero-btns center">
            <button className="ed-btn solid lg" onClick={() => onEnter("officer")}>Launch Officer Console →</button>
            <button className="ed-btn line lg" onClick={() => onEnter("bidder")}>I'm a Bidder →</button>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="ed-foot">
        <div className="ed-brand">
          <span className="ed-logo"><VGEMLogo size={20} color="#fff" /></span>
          <span className="ed-brand-txt"><b>VGEM</b><i>AI Bid Compliance Platform</i></span>
        </div>
        <nav className="ed-foot-links">
          <button onClick={() => onEnter("bidder")}>Bidder Portal</button>
          <button onClick={() => onEnter("officer")}>Officer Console</button>
          <a href="#problem">Capabilities</a>
          <a href="#how">How it works</a>
          <a href="#impact">Impact</a>
        </nav>
      </footer>
    </div>
  );
}