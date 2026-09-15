const P = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM14 3v5h5",
  users: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 20a6 6 0 0 1 12 0M16 3.5a4 4 0 0 1 0 7.5M21 20a6 6 0 0 0-4-5.6",
  inbox: "M3 12h5l2 3h4l2-3h5M3 12l3-7h12l3 7v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  check: "M5 12l4 4 10-10",
  clock: "M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  alert: "M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  x: "M6 6l12 12M18 6L6 18",
  chevron: "M9 6l6 6-6 6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3",
  building: "M3 21h18M6 21V7l6-4 6 4v14M10 9h4M10 13h4M10 17h4",
  rupee: "M7 4h10M7 8h10M13 4c3 0 4 4 0 4H9l6 8",
};

export function AIcon({ name, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] || P.grid} />
    </svg>
  );
}

export function Loader({ label = "Loading…" }) {
  return (
    <div className="ad-loader">
      <span className="ad-spin" /> {label}
    </div>
  );
}

export function Empty({ title, sub }) {
  return (
    <div className="ad-empty">
      <AIcon name="inbox" className="ad-empty-ic" />
      <strong>{title}</strong>
      <small>{sub}</small>
    </div>
  );
}

export const statusPill = (s) => {
  const v = (s || "").toLowerCase();
  if (["compliant", "verified", "completed", "passed", "qualified"].includes(v)) return "ok";
  if (["pending", "processing", "needs verification", "review", "under review", "submitted"].includes(v)) return "review";
  if (["missing", "non-compliant", "failed", "rejected", "expired"].includes(v)) return "warn";
  return "neutral";
};