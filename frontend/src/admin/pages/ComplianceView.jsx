import { useEffect, useState } from "react";
import { AIcon, Loader } from "../ui";
import { getRestrictions, searchRestrictions, getDataSources } from "../../services/api";

// Filters map to the restriction_type values the backend actually returns.
const FILTERS = [
  { k: "All", type: "" },
  { k: "Blacklisted", type: "BLACKLISTED" },
  { k: "Debarred", type: "DEBARRED" },
  { k: "Suspended", type: "SUSPENDED" },
];
const TYPE_LABEL = {
  BLACKLISTED: "Blacklisted", DEBARRED: "Debarred",
  SUSPENDED: "Suspended", OTHER_RESTRICTION: "Other restriction",
};
const TYPE_TONE = {
  BLACKLISTED: "warn", DEBARRED: "warn", SUSPENDED: "review", OTHER_RESTRICTION: "neutral",
};
const label = (t) => TYPE_LABEL[t] || t || "Restriction";
const tone = (t) => TYPE_TONE[t] || "neutral";
const na = (x) => (x !== undefined && x !== null && String(x).trim() !== "" ? x : "Not available");
const isDemo = (r) => (r?.source || "").toLowerCase() === "demo-mock";

export default function ComplianceView() {
  const [rows, setRows] = useState([]);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeType, setActiveType] = useState("");
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchType = async (type) => {
    setLoading(true); setError(false); setSearching(false);
    const r = await getRestrictions(type ? `?type=${type}` : "");
    if (r.ok) setRows(r.data); else setError(true);
    setLoading(false);
  };

  const selectType = (type) => { setActiveType(type); setQ(""); fetchType(type); };

  const runSearch = async () => {
    const query = q.trim();
    if (!query) { fetchType(activeType); return; }
    setLoading(true); setError(false); setSearching(true);
    const r = await searchRestrictions(query);
    if (r.ok) setRows(r.data); else setError(true);
    setLoading(false);
  };

  const retry = () => (searching ? runSearch() : fetchType(activeType));

  useEffect(() => {
    fetchType("");
    getDataSources().then((r) => { if (r.ok) setSources(r.data); });
  }, []);

  return (
    <>
      <div className="ad-card ad-tablecard">
        <div className="ad-tablehead">
          <div>
            <p className="ad-h">Compliance Intelligence</p>
            <p className="ad-sub">Procurement restriction evidence · the officer makes the final decision</p>
          </div>
        </div>

        <div className="cmpi-tools" style={{ padding: "14px 20px" }}>
          <div className="cmpi-filters">
            {FILTERS.map((f) => (
              <button key={f.k}
                className={"fchip2" + (!searching && activeType === f.type ? " on" : "")}
                onClick={() => selectType(f.type)}>{f.k}</button>
            ))}
          </div>
          <div className="cmpi-search">
            <div className="tn-search">
              <AIcon name="search" className="tn-search-ic" />
              <input placeholder="Search company / GSTIN / PAN…" value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()} />
            </div>
            <button className="ad-btn ghost" style={{ marginLeft: 8 }} onClick={runSearch}>Search</button>
          </div>
        </div>

        {searching && !loading && (
          <div className="cmpi-note">
            Search results for “{q.trim()}” · <button className="cmpi-link" onClick={() => selectType(activeType)}>Show all</button>
          </div>
        )}

        {loading ? (
          <Loader label="Loading compliance data…" />
        ) : error ? (
          <div className="cmpi-err">
            <strong>Unable to load compliance data.</strong>
            <button className="ad-btn ghost" onClick={retry}>Retry</button>
          </div>
        ) : rows.length === 0 ? (
          <div className="cmpi-err">
            <strong>No procurement restrictions found.</strong>
            <span>Try a different filter or search term.</span>
          </div>
        ) : (
          <div className="cmpi-list">
            {rows.map((r) => (
              <div key={r.id} className="cmpi-row" onClick={() => setSelected(r)}>
                <div className="cmpi-main">
                  <strong>{na(r.entity_name)}</strong>
                  <div className="cmpi-sub">
                    <span>{na(r.identifier_value)}</span>
                    <span>· {na(r.issuing_authority)}</span>
                    {isDemo(r) && <span className="cmpi-demo">Demo</span>}
                  </div>
                </div>
                <div className="cmpi-right">
                  <span className={"ad-pill " + tone(r.restriction_type)}><i />{label(r.restriction_type)}</span>
                  <AIcon name="chevron" className="cmpi-chev" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data sources & provenance */}
      <div className="ad-card ad-tablecard" style={{ marginTop: 20 }}>
        <div className="ad-tablehead">
          <div>
            <p className="ad-h">Data Sources &amp; Provenance</p>
            <p className="ad-sub">Where restriction data comes from</p>
          </div>
        </div>
        {sources.length === 0 ? (
          <div className="cmpi-err"><span>No data sources registered.</span></div>
        ) : (
          <div className="cmpi-src">
            {sources.map((s) => (
              <div key={s.source_key} className="cmpi-src-row">
                <div className="cmpi-src-l">
                  <div className="cmpi-src-name">{na(s.name)}</div>
                  <div className="cmpi-src-meta">
                    {na(s.authority)}{s.retrieved_at ? ` · updated ${new Date(s.retrieved_at).toLocaleDateString()}` : ""}
                  </div>
                  {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.url}</a> : <span className="cmpi-src-meta">URL not available</span>}
                </div>
                <span className={"cmpi-real " + (s.is_real ? "yes" : "no")}>{s.is_real ? "Official source" : "Demo / synthetic"}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restriction evidence detail */}
      {selected && (
        <div className="bm-overlay" onClick={() => setSelected(null)}>
          <div className="bm-card" onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)" }}>
            <button className="bm-x" onClick={() => setSelected(null)}>×</button>
            <h3 className="bm-title">Restriction Evidence</h3>
            <div className="cmpi-detail-type">
              <span className={"ad-pill " + tone(selected.restriction_type)}><i />{label(selected.restriction_type)}</span>
              {isDemo(selected) && <span className="cmpi-demo" style={{ marginLeft: 8 }}>Demo record</span>}
            </div>
            <div className="br-ev-grid" style={{ marginTop: 14 }}>
              <div className="br-ev-item"><span>Entity / company</span><b>{na(selected.entity_name)}</b></div>
              <div className="br-ev-item"><span>Identifier ({na(selected.identifier_type)})</span><b>{na(selected.identifier_value)}</b></div>
              <div className="br-ev-item"><span>Issuing authority</span><b>{na(selected.issuing_authority)}</b></div>
              <div className="br-ev-item"><span>Order / reference</span><b>{na(selected.order_reference)}</b></div>
              <div className="br-ev-item wide"><span>Reason</span><b>{na(selected.reason)}</b></div>
              <div className="br-ev-item"><span>Start date</span><b>{na(selected.start_date)}</b></div>
              <div className="br-ev-item"><span>End date</span><b>{na(selected.end_date)}</b></div>
              <div className="br-ev-item"><span>Verification status</span><b>{na(selected.verification_status)}</b></div>
              <div className="br-ev-item"><span>Source</span><b>{na(selected.source)}</b></div>
              <div className="br-ev-item wide"><span>Source URL</span>
                <b>{selected.source_url
                  ? <a href={selected.source_url} target="_blank" rel="noreferrer">{selected.source_url}</a>
                  : "Not available"}</b>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}