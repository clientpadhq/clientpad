import { useState, useEffect, useCallback } from "react";

export function useSession() {
  const [session, setSession] = useState<import("../types").Session | null>(() => {
    const saved = localStorage.getItem("clientpad.cloud.session");
    return saved ? (JSON.parse(saved) as import("../types").Session) : null;
  });

  const login = useCallback((s: import("../types").Session) => {
    localStorage.setItem("clientpad.cloud.session", JSON.stringify(s));
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("clientpad.cloud.session");
    setSession(null);
  }, []);

  return { session, login, logout };
}
