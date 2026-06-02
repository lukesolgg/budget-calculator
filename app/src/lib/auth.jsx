// Centralized anonymous-account session + auto-save.
// Lives inside PlannerProvider so it can read/replace planner state.
// Exposes: session, saveState, signup(), login(), logout().
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { backend } from "./accounts.js";
import { usePlanner, toStored, fromStored } from "../state.jsx";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

const SESSION_KEY = "dfp_session";

export function AuthProvider({ children }) {
  const { state, setState } = usePlanner();
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
  });
  // "saved" | "saving" | "error"
  const [saveState, setSaveState] = useState("saved");

  const persist = (s) => {
    setSession(s);
    if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(SESSION_KEY);
  };

  // Auto-save (debounced) to the cloud whenever a signed-in user's data changes.
  const timer = useRef(null);
  const skipNext = useRef(true); // don't save on first render / right after load
  useEffect(() => {
    if (!session) return;
    if (skipNext.current) { skipNext.current = false; return; }
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const res = await backend.save(session.username, session.pin, toStored(state));
      setSaveState(res.ok ? "saved" : "error");
    }, 800);
    return () => clearTimeout(timer.current);
  }, [state, session]);

  const signup = async (username, pin) => {
    const res = await backend.signup(username, pin, toStored(state));
    if (res.ok) { skipNext.current = true; persist({ username, pin }); }
    return res;
  };

  const login = async (username, pin) => {
    const res = await backend.login(username, pin);
    if (res.ok) {
      skipNext.current = true;
      persist({ username, pin });
      if (res.data) setState(fromStored(res.data));
      setSaveState("saved");
    }
    return res;
  };

  const logout = () => { persist(null); setSaveState("saved"); };

  const changePin = async (oldPin, newPin) => {
    if (!session) return { ok: false, error: "Not signed in." };
    const res = await backend.changePin(session.username, oldPin, newPin);
    if (res.ok) { skipNext.current = true; persist({ username: session.username, pin: newPin }); }
    return res;
  };

  // Best-effort wipe: blank the cloud record (no account-delete RPC) + sign out.
  const wipeData = async (blankStored) => {
    if (session) { try { await backend.save(session.username, session.pin, blankStored); } catch {} }
    persist(null);
    setSaveState("saved");
  };

  return (
    <AuthCtx.Provider value={{ session, saveState, signup, login, logout, changePin, wipeData }}>
      {children}
    </AuthCtx.Provider>
  );
}
