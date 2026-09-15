const KEY = "verifygem_bidders";
const SESSION = "verifygem_session";

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch { return {}; }
}
function write(obj) { localStorage.setItem(KEY, JSON.stringify(obj)); }

export function signup({ company, email, password, phone }) {
  const users = read();
  const id = email.trim().toLowerCase();
  if (users[id]) return { ok: false, error: "This email is already registered. Please sign in." };
  users[id] = {
    company: company.trim(),
    email: id,
    password,
    phone: phone.trim(),
    createdAt: Date.now(),
  };
  write(users);
  return { ok: true, user: publicUser(users[id]) };
}

export function login({ email, password }) {
  const users = read();
  const id = email.trim().toLowerCase();
  const u = users[id];
  if (!u) return { ok: false, error: "No account found with this email. Please sign up first." };
  if (u.password !== password) return { ok: false, error: "Incorrect password. Please try again." };
  return { ok: true, user: publicUser(u) };
}

function publicUser(u) {
  return { company: u.company, email: u.email, phone: u.phone, createdAt: u.createdAt };
}

export function saveSession(user) { localStorage.setItem(SESSION, JSON.stringify(user)); }
export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION)); } catch { return null; }
}
export function clearSession() { localStorage.removeItem(SESSION); }

// derive realistic profile from real signup + mock compliance
export function deriveProfile(user) {
  const initials = user.company.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "BD";
  return {
    ...user,
    initials,
    sellerId: "GEM-SELLER-" + hash(user.email).slice(0, 6).toUpperCase(),
    type: "Micro Enterprise (MSME)",
    score: 87,
    risk: "Low",
    location: "New Delhi, India",
    pan: "AABCS" + hash(user.email).slice(0, 4).toUpperCase() + "K",
    gstin: "07AABCS" + hash(user.email).slice(0, 4).toUpperCase() + "1Z5",
    udyam: "UDYAM-DL-03-00" + hash(user.email).slice(0, 5),
    cin: "U51909DL2016PTC3021" + hash(user.email).slice(0, 2),
    incorporated: "2016",
    employees: 48,
  };
}
function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(36).padStart(6, "0");
}