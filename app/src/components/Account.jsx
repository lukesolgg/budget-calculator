import { useEffect, useState } from "react";
import { Button } from "./ui.jsx";
import { backend, useSupabase } from "../lib/accounts.js";
import { usePlanner, toStored, fromStored } from "../state.jsx";

// Account bar (top-right) + auth modal. Handles signup/login/save and syncs
// the planner state to the cloud.
export default function Account({ openSignal, showBar = true, onLogout }) {
  const { state, setState } = usePlanner();
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("dfp_session") || "null"); } catch { return null; }
  });
  const [modal, setModal] = useState(null); // null | "login" | "signup"
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("");

  // Mark dirty whenever state changes while signed in.
  useEffect(() => { if (session) setDirty(true); }, [state]); // eslint-disable-line

  // Parent can request the modal (e.g. the welcome "sign in" button).
  useEffect(() => { if (openSignal) setModal("login"); }, [openSignal]);

  const persistSession = (s) => {
    setSession(s);
    if (s) sessionStorage.setItem("dfp_session", JSON.stringify(s));
    else sessionStorage.removeItem("dfp_session");
  };

  const flash = (msg) => { setStatus(msg); setTimeout(() => setStatus(""), 2600); };

  const doSave = async () => {
    if (!session) return;
    const res = await backend.save(session.username, session.pin, toStored(state));
    if (res.ok) { setDirty(false); flash("Saved ✓"); }
    else flash(res.error || "Save failed");
  };

  return (
    <>
      {showBar && (
      <div className="mb-2.5 flex min-h-[36px] flex-wrap items-center justify-end gap-2.5">
        {status && <span className="text-[12px] text-good">{status}</span>}
        {session ? (
          <>
            {dirty
              ? <span className="inline-flex items-center gap-1.5 text-[12px] text-warn"><span className="h-2 w-2 rounded-full bg-warn shadow-[0_0_0_3px_rgba(240,184,106,.18)]" />Unsaved changes</span>
              : <span className="inline-flex items-center gap-1.5 text-[12px] text-good"><span className="h-2 w-2 rounded-full bg-good" />All changes saved</span>}
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-good" />{session.username}</span>
            <Button onClick={doSave} className={`px-3.5 py-2 text-[13px] ${dirty ? "shadow-[0_0_0_2px_rgba(240,184,106,.5),0_6px_18px_rgba(18,184,134,.35)]" : ""}`}>Save progress</Button>
            <Button variant="ghost" onClick={() => { persistSession(null); flash("Logged out"); onLogout?.(); }} className="px-3.5 py-2 text-[13px]">Log out</Button>
          </>
        ) : (
          <Button variant="ghost" onClick={() => onLogout?.()} className="px-3.5 py-2 text-[13px]">Log out</Button>
        )}
      </div>
      )}

      {modal && (
        <AuthModal
          mode={modal}
          onClose={() => setModal(null)}
          onSwitch={(m) => setModal(m)}
          onAuthed={(username, pin, data) => {
            persistSession({ username, pin });
            if (data) setState(fromStored(data));
            setDirty(false);
            setModal(null);
            flash(data ? "Signed in — plan loaded ✓" : "Account created ✓");
          }}
          getState={() => toStored(state)}
        />
      )}
    </>
  );
}

function AuthModal({ mode, onClose, onSwitch, onAuthed, getState }) {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const u = username.trim().toLowerCase();
    setErr("");
    if (!/^[a-z0-9_]{3,24}$/.test(u)) return setErr("Username: 3–24 letters, numbers or underscores.");
    if (!/^\d{4,6}$/.test(pin)) return setErr("PIN must be 4–6 digits.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await backend.signup(u, pin, getState());
        if (!res.ok) return setErr(res.error);
        onAuthed(u, pin, null);
      } else {
        const res = await backend.login(u, pin);
        if (!res.ok) return setErr(res.error);
        onAuthed(u, pin, res.data);
      }
    } catch { setErr("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,7,12,.72)] p-5 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[440px] rounded-[18px] border border-border bg-gradient-to-b from-panel to-panel2 p-[26px]">
        <button onClick={onClose} className="absolute right-4 top-3.5 text-[26px] leading-none text-muted hover:text-ink">×</button>
        <h3 className="mb-1 text-[21px] font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h3>
        <p className="mb-5 text-sm text-muted">Anonymous accounts — just a username &amp; PIN. Save your plan and pick up on any device.</p>

        <div className="mb-5 flex gap-1.5 rounded-xl border border-border bg-[#0c121d] p-1">
          {["login", "signup"].map((m) => (
            <button key={m} onClick={() => onSwitch(m)}
              className={`flex-1 rounded-[9px] py-2.5 text-sm font-semibold ${mode === m ? "bg-[#1c2738] text-ink" : "text-muted"}`}>
              {m === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <label className="mb-1.5 block text-[12px] uppercase tracking-[.06em] text-muted">Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} autoComplete="off"
          className="mb-4 w-full rounded-[10px] border border-border bg-[#0c121d] px-3.5 py-3 text-base text-ink outline-none focus:border-accent" placeholder="e.g. luke_money" />
        <label className="mb-1.5 block text-[12px] uppercase tracking-[.06em] text-muted">PIN (4–6 digits)</label>
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} maxLength={6} inputMode="numeric" autoComplete="off"
          className="mb-4 w-full rounded-[10px] border border-border bg-[#0c121d] px-3.5 py-3 text-base text-ink outline-none focus:border-accent" placeholder="••••" />

        <div className="mb-3.5 min-h-[16px] text-[13px] text-bad">{err}</div>
        <Button onClick={submit} disabled={busy} className="w-full">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account & save"}</Button>
        <div className="mt-3.5 text-center text-[11px] text-muted">{useSupabase ? "Synced securely across devices." : "Demo mode: saved in this browser only."}</div>
      </div>
    </div>
  );
}
