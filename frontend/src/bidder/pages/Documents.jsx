import { useRef, useState } from "react";
import { Icon, statusMeta } from "../ui";
import { useStore } from "../store";

export default function Documents() {
  const { documents, derived, uploadDoc } = useStore();
  const [progress, setProgress] = useState({});
  const fileInputs = useRef({});

  const pickFile = (id) => fileInputs.current[id]?.click();

  const onFile = (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const kb = Math.max(1, Math.round(file.size / 1024));
    const sizeLabel = `${file.name.split(".").pop().toUpperCase()} · ${kb} KB`;

    // real progress bar based on a short simulated read
    setProgress((p) => ({ ...p, [id]: 0 }));
    const iv = setInterval(() => {
      setProgress((p) => {
        const next = Math.min((p[id] ?? 0) + 10, 100);
        if (next >= 100) {
          clearInterval(iv);
          uploadDoc(id, sizeLabel); // -> review -> verified in store
          setTimeout(() => setProgress((pp) => { const c = { ...pp }; delete c[id]; return c; }), 200);
        }
        return { ...p, [id]: next };
      });
    }, 110);
    e.target.value = "";
  };

  return (
    <>
      <div className="doc-drop" onClick={() => pickFile(documents.find((d) => d.status === "missing")?.id || "d5")}>
        <span className="dd-ico"><Icon name="upload" /></span>
        <h3>Click to upload documents to verify</h3>
        <p>{derived.dVerified} of {derived.dTotal} verified · PDF, JPG or PNG up to 10 MB</p>
      </div>

      <div className="doc-grid stagger">
        {documents.map((d) => {
          const p = progress[d.id];
          const meta = statusMeta[d.status];
          return (
            <div key={d.id} className={"card doc-card " + (d.status === "verified" ? "verified" : "")}>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" hidden
                ref={(el) => (fileInputs.current[d.id] = el)}
                onChange={(e) => onFile(d.id, e)} />
              <span className="doc-ic"><Icon name="doc" /></span>
              <div className="doc-info">
                <strong>{d.label}</strong>
                <small>
                  {d.req && <span className="req">Required · </span>}
                  {d.size || "Not uploaded yet"}
                </small>
              </div>

              {p != null && p < 100 ? (
                <div className="doc-prog"><span style={{ width: p + "%" }} /></div>
              ) : d.status === "review" ? (
                <span className="doc-review"><span className="shim" /> Verifying…</span>
              ) : d.status === "verified" ? (
                <span className="pill-tag ok"><i /> {meta.label}</span>
              ) : (
                <button className="doc-up" onClick={() => pickFile(d.id)}>
                  <Icon name="upload" /> Upload
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}