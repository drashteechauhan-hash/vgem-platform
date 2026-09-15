import { useState, useEffect, useRef } from "react";

const PATHS = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  doc: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5",
  bids: "M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8zM8 8V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20a8 8 0 0 1 16 0",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  upload: "M12 15V3M8 7l4-4 4 4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  check: "M5 12l4 4 10-10",
  clock: "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  download: "M12 3v12M8 11l4 4 4-4M4 21h16",
  link: "M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1",
  chevron: "M9 6l6 6-6 6",
    chevronLeft: "M15 18l-6-6 6-6",
  trending: "M3 17l6-6 4 4 8-8M15 7h6v6",
  building: "M3 21h18M6 21V7l6-4 6 4v14M10 9h4M10 13h4M10 17h4",
  calendar: "M8 3v4M16 3v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  plus: "M12 5v14M5 12h14",
  mail: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 7l9 6 9-6",
};

export function Icon({ name, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name] || PATHS.grid} />
    </svg>
  );
}

export function CountUp({ value, dur = 1200, className }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return; io.disconnect();
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        setN(Math.round((1 - Math.pow(1 - p, 3)) * value));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el); return () => io.disconnect();
  }, [value, dur]);
  return <span ref={ref} className={className}>{n}</span>;
}

export function ScoreRing({ value, size = 140, stroke = 12 }) {
  const [v, setV] = useState(0);
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  useEffect(() => {
    let raf; const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / 1300, 1);
      setV((1 - Math.pow(1 - p, 3)) * value);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#12B981" />
            <stop offset="1" stopColor="#C9911F" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EDEAE1" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ring-grad)"
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (C * v) / 100} />
      </svg>
      <div className="ring-center">
        <strong>{Math.round(v)}<span>%</span></strong>
        <small>Compliance</small>
      </div>
    </div>
  );
}

export function useReveal() {
  const ref = useRef(null);
  const [inV, setInV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setInV(true), io.disconnect()),
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inV];
}

export const statusMeta = {
  verified: { label: "Verified", cls: "ok" },
  review: { label: "Under review", cls: "review" },
  pending: { label: "Pending", cls: "review" },
  action: { label: "Action needed", cls: "warn" },
  missing: { label: "Not uploaded", cls: "warn" },
};