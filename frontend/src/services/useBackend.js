import { useState, useEffect } from "react";
import { ping } from "./api";

export function useBackendStatus() {
  const [status, setStatus] = useState("checking"); // checking | online | offline
  useEffect(() => {
    let alive = true;
    ping().then((r) => { if (alive) setStatus(r.ok ? "online" : "offline"); });
    return () => { alive = false; };
  }, []);
  return status;
}