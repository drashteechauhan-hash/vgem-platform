import { useStore } from "../store";

export default function Profile() {
  const { profile } = useStore();
  const fields = [
    { label: "Seller ID", value: profile.sellerId },
    { label: "Enterprise type", value: profile.type },
    { label: "Email", value: profile.email },
    { label: "Phone", value: profile.phone },
    { label: "PAN", value: profile.pan },
    { label: "GSTIN", value: profile.gstin },
    { label: "Udyam registration", value: profile.udyam },
    { label: "CIN (MCA21)", value: profile.cin },
    { label: "Incorporated", value: profile.incorporated },
    { label: "Employees", value: profile.employees },
  ];

  return (
    <>
      <div className="card pf-head">
        <span className="pf-logo">{profile.initials}</span>
        <div>
          <h2>{profile.company}</h2>
          <p>{profile.location} · {profile.type}</p>
        </div>
      </div>
      <div className="pf-grid stagger">
        {fields.map((f) => (
          <div key={f.label} className="card pf-field">
            <small>{f.label}</small>
            <strong>{f.value}</strong>
          </div>
        ))}
        <div className="card pf-field full">
          <small>Registered address</small>
          <strong>14/2, Industrial Area Phase II, {profile.location} — 110020</strong>
        </div>
      </div>
    </>
  );
}