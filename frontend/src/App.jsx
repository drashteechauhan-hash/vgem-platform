import { useState } from "react";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { saveSession, getSession, clearSession } from "./auth";
import { SharedProvider } from "./sharedStore";

function App() {
  const [showHome, setShowHome] = useState(true);
  const [preRole, setPreRole] = useState("officer");
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(getSession());

  const doLogin = (role, u) => {
    setSession(role);
    if (u) { setUser(u); saveSession(u); }
    setShowHome(false);
  };
  const doLogout = () => {
    setSession(null); setUser(null); clearSession(); setShowHome(true);
  };

  return (
    <SharedProvider>
      {showHome ? (
        <HomePage onEnter={(role) => { setPreRole(role); setShowHome(false); }} />
      ) : !session ? (
        <Login initialRole={preRole} onBack={() => setShowHome(true)} onLogin={doLogin} />
      ) : (
        <Dashboard role={session} user={user} onLogout={doLogout} />
      )}
    </SharedProvider>
  );
}

export default App;