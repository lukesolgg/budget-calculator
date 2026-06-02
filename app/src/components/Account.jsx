import { useEffect, useState } from "react";
import { Button } from "./ui.jsx";
import { useSupabase } from "../lib/accounts.js";
import { useAuth } from "../lib/auth.jsx";

// Account bar (top-right) + sign-in modal. Progress auto-saves to the cloud
// while signed in (no manual Save button).
export default function Account({ openSignal, showBar = true, onLogout, onSignedIn, onCreateAccount }) {
  const { session, saveState, login, logout } = useAuth();
  const [modal, setModal] = useState(false);

  // Parent can request the sign-in modal (e.g. the welcome "sign in" button).
  useEffect(() => { if (openSignal) setModal(true); }, [openSignal]);

  return (
    <>
      {showBar && (
        <div className="mb-2.5 flex min-h-[36px] flex-wrap items-center justify-end gap-2.5">
          {session ? (
            <>
              <SaveStatus state={saveState} />
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold"><span className="h-2 w-2 rounded-full bg-good" />{session.username}</span>
              <Button variant="ghost" onClick={() => { logout(); onLogout?.(); }} className="px-3.5 py-2 text-[13px]">Log out</Button>
            </>
          ) : null}
        </div>
      )}

      {modal && (
        <SignInModal
          onClose={() => setModal(false)}
          onSignedIn={() => { setModal(false); onSignedIn?.(); }}
          onCreateAccount={() => { setModal(false); onCreateAccount?.(); }}
          login={login}
        />
      )}
    </>
  );
}

function SaveStatus({ state }) {
  if (state === "saving")
    return <span className="inline-flex items-center gap-1.5 text-[12px] text-muted"><span className="h-2 w-2 animate-pulse rounded-full bg-muted" />Saving…</span>;
  if (state === "error")
    return <span className="inline-flex items-center gap-1.5 text-[12px] text-warn"><span className="h-2 w-2 rounded-full bg-warn" />Save failed — retrying</span>;
  return <span className="inline-flex items-center gap-1.5 text-[12px] text-good"><span className="h-2 w-2 rounded-full bg-good" />All changes saved</span>;
}

function SignInModal({ onClose, onSignedIn, onCreateAccount, login }) {
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
      const res = await login(u, pin);
      if (!res.ok) return setErr(res.error);
      onSignedIn();
    } catch { setErr("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,7,12,.72)] p-5 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-[440px] rounded-[18px] border border-border bg-gradient-to-b from-panel to-panel2 p-[26px]">
        <button onClick={onClose} className="absolute right-4 top-3.5 text-[26px] leading-none text-muted hover:text-ink">×</button>
        <h3 className="mb-1 text-[21px] font-bold">Welcome back</h3>
        <p className="mb-5 text-sm text-muted">Sign in with the username &amp; PIN you set up. We'll take you straight to your dashboard.</p>

        <label className="mb-1.5 block text-[12px] uppercase tracking-[.06em] text-muted">Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} autoComplete="off"
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="mb-4 w-full rounded-[10px] border border-border bg-[#0c121d] px-3.5 py-3 text-base text-ink outline-none focus:border-accent" placeholder="e.g. luke_money" />
        <label className="mb-1.5 block text-[12px] uppercase tracking-[.06em] text-muted">PIN (4–6 digits)</label>
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} maxLength={6} inputMode="numeric" autoComplete="off"
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="mb-4 w-full rounded-[10px] border border-border bg-[#0c121d] px-3.5 py-3 text-base text-ink outline-none focus:border-accent" placeholder="••••" />

        <div className="mb-3.5 min-h-[16px] text-[13px] text-bad">{err}</div>
        <Button onClick={submit} disabled={busy} className="w-full">{busy ? "Please wait…" : "Sign in"}</Button>
        {onCreateAccount && (
          <div className="mt-4 border-t border-border pt-3.5 text-center text-[13px] text-muted">
            New to Orcl.?{" "}
            <button onClick={onCreateAccount} className="font-semibold text-accent hover:underline">Create an account</button>
          </div>
        )}
        <div className="mt-3 text-center text-[11px] text-muted">{useSupabase ? "Synced securely across devices." : "Demo mode: saved in this browser only."}</div>
      </div>
    </div>
  );
}
