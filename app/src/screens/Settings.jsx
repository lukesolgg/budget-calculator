import { useEffect, useState } from "react";
import { Button, Card } from "../components/ui.jsx";
import { usePlanner, toStored, initialState } from "../state.jsx";
import { useAuth } from "../lib/auth.jsx";
import { SECTIONS } from "../data/sections.js";
import { bank } from "../lib/bank.js";
import { fmt } from "../lib/engine.js";

// Settings / profile: account, goals, data controls.
export default function Settings({ onEdit, onLogout }) {
  const { state, update, setState } = usePlanner();
  const { session, saveState, logout, changePin, wipeData } = useAuth();

  return (
    <div className="mx-auto max-w-[1000px]">
      <header className="mb-4">
        <h1 className="text-[22px] font-extrabold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage your account, goals and data. Everything saves automatically.</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <div className="flex flex-col gap-5">
          <AccountCard session={session} saveState={saveState} changePin={changePin} logout={logout} onLogout={onLogout} />
          <BankCard session={session} />
          <DetailsCard onEdit={onEdit} />
          <DataCard state={state} setState={setState} wipeData={wipeData} onLogout={onLogout} />
        </div>
        <GoalsCard state={state} update={update} />
      </div>

      <p className="mt-5 text-center text-[11px] text-muted">Orcl. is a pre-alpha preview. General guidance, not financial advice.</p>
    </div>
  );
}

function Section({ title, desc, children }) {
  return (
    <Card className="lg:p-5">
      <h2 className="text-[16px] font-bold">{title}</h2>
      {desc && <p className="mb-4 mt-0.5 text-[13px] text-muted">{desc}</p>}
      {children}
    </Card>
  );
}

function AccountCard({ session, saveState, changePin, logout, onLogout }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ old: "", neu: "", busy: false, msg: "", err: "" });
  const set = (p) => setF((s) => ({ ...s, ...p }));

  const submit = async () => {
    set({ err: "", msg: "" });
    if (!/^\d{4,6}$/.test(f.neu)) return set({ err: "New PIN must be 4–6 digits." });
    set({ busy: true });
    const res = await changePin(f.old, f.neu);
    set({ busy: false });
    if (!res.ok) return set({ err: res.error || "Couldn't change PIN." });
    set({ old: "", neu: "", msg: "PIN updated ✓" });
    setOpen(false);
  };

  const status = saveState === "saving" ? "Saving…" : saveState === "error" ? "Save failed — retrying" : "All changes saved";

  return (
    <Section title="Account" desc="Your anonymous username & PIN — no email attached.">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="text-[12px] uppercase tracking-[.06em] text-muted">Signed in as</div>
          <div className="text-[18px] font-bold">{session?.username || "—"}</div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[12px] text-good"><span className="h-2 w-2 rounded-full bg-good" />{status}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button variant="ghost" onClick={() => setOpen((o) => !o)} className="px-3.5 py-2 text-[13px]">{open ? "Cancel" : "Change PIN"}</Button>
        <Button variant="ghost" onClick={() => { logout(); onLogout?.(); }} className="px-3.5 py-2 text-[13px]">Sign out</Button>
        {f.msg && <span className="text-[12px] text-good">{f.msg}</span>}
      </div>

      {open && (
        <div className="mt-4 grid gap-3 rounded-xl border border-border bg-[#0c121d] p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Current PIN">
            <input value={f.old} onChange={(e) => set({ old: e.target.value.replace(/\D/g, "") })} maxLength={6} inputMode="numeric" type="password"
              className="w-full rounded-[10px] border border-border bg-[#0b0f17] px-3 py-2.5 text-ink outline-none focus:border-accent" />
          </Field>
          <Field label="New PIN (4–6 digits)">
            <input value={f.neu} onChange={(e) => set({ neu: e.target.value.replace(/\D/g, "") })} maxLength={6} inputMode="numeric" type="password"
              className="w-full rounded-[10px] border border-border bg-[#0b0f17] px-3 py-2.5 text-ink outline-none focus:border-accent" />
          </Field>
          <Button onClick={submit} disabled={f.busy} className="px-4 py-2.5 text-sm">{f.busy ? "Saving…" : "Update"}</Button>
          {f.err && <div className="text-[12px] text-bad sm:col-span-3">{f.err}</div>}
        </div>
      )}
    </Section>
  );
}

function GoalsCard({ state, update }) {
  const { primary, interests } = state.goals || { primary: "", interests: {} };
  const setPrimary = (key) => update((s) => ({ ...s, goals: { ...s.goals, primary: key } }));
  const toggle = (key) => update((s) => {
    const it = { ...s.goals.interests };
    if (it[key]) delete it[key]; else it[key] = true;
    return { ...s, goals: { ...s.goals, interests: it } };
  });

  return (
    <Section title="Your goals" desc="Your main focus leads the dashboard; ticked extras fill out your tabs.">
      <div className="mb-2 text-[12px] font-semibold uppercase tracking-[.05em] text-muted">Main focus</div>
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((sec) => (
          <button key={sec.key} onClick={() => setPrimary(sec.key)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${primary === sec.key ? "bg-gradient-to-b from-[#2fe6a6] to-[#12b886] text-[#04140d]" : "border border-border bg-[#0c121d] text-muted hover:text-ink"}`}>
            {sec.emoji} {sec.title}
          </button>
        ))}
      </div>

      <div className="mb-2 mt-5 text-[12px] font-semibold uppercase tracking-[.05em] text-muted">Also interested in</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SECTIONS.filter((s) => s.key !== primary).map((sec) => (
          <label key={sec.key} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-[#0c121d] px-3 py-2 text-[13px]">
            <input type="checkbox" checked={!!interests[sec.key]} onChange={() => toggle(sec.key)} className="h-4 w-4 accent-[#2fe6a6]" />
            <span>{sec.emoji} {sec.title}</span>
          </label>
        ))}
      </div>
    </Section>
  );
}

const BANK_CODE_KEY = "orcl_bank_code";

function BankCard({ session }) {
  const [view, setView] = useState("loading"); // loading | off | none | picker | connected | error
  const [msg, setMsg] = useState("");
  const [insts, setInsts] = useState([]);
  const [q, setQ] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [txns, setTxns] = useState([]);
  const [busy, setBusy] = useState(false);

  const showData = (r) => {
    if (r.accounts && r.accounts.length) { setAccounts(r.accounts); setTxns(r.transactions || []); setView("connected"); }
    else setView("none");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      let code = null; try { code = localStorage.getItem(BANK_CODE_KEY); } catch {}
      const r = code ? await bank.finish(session, code) : await bank.data(session);
      if (!alive) return;
      try { localStorage.removeItem(BANK_CODE_KEY); } catch {}
      if (r.status === 503 || r.error === "not_configured") return setView("off");
      if (!r.ok && r.error && r.error !== "no_code") { setMsg(friendly(r)); return setView(code ? "error" : "none"); }
      showData(r);
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line

  const connect = async () => {
    setBusy(true); setMsg("");
    const r = await bank.institutions(session);
    setBusy(false);
    if (r.status === 503) return setView("off");
    if (!r.ok) { setMsg(friendly(r)); return setView("error"); }
    setInsts(r.institutions || []); setView("picker");
  };

  const pick = async (inst) => {
    setBusy(true);
    const r = await bank.start(session, inst.name, inst.country);
    setBusy(false);
    if (!r.ok || !r.link) { setMsg(friendly(r)); return setView("error"); }
    window.location.href = r.link;
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect your bank? Orcl. will forget the imported data.")) return;
    await bank.disconnect(session);
    setAccounts([]); setTxns([]); setView("none");
  };

  return (
    <Section title="Connected banks" desc="Link your bank (read-only) to auto-import balances & spending.">
      <span className="mb-3 inline-block rounded-full border border-[#1e3a30] bg-[#0c1a15] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[.08em] text-accent">Beta</span>

      {view === "loading" && <p className="text-[13px] text-muted">Checking…</p>}

      {view === "off" && (
        <p className="rounded-lg border border-border bg-[#0c121d] px-3.5 py-2.5 text-[13px] text-muted">Bank linking isn't switched on yet — coming soon.</p>
      )}

      {view === "none" && (
        <>
          {msg && <p className="mb-2 text-[12px] text-warn">{msg}</p>}
          <p className="mb-3 text-[13px] text-muted">Securely connect through Open Banking — you log in at your bank, we only ever see balances & transactions (never your login).</p>
          <Button onClick={connect} disabled={busy} className="px-3.5 py-2 text-[13px]">{busy ? "Loading…" : "🔗 Connect a bank"}</Button>
        </>
      )}

      {view === "error" && (
        <>
          <p className="mb-2 text-[13px] text-bad">{msg || "Something went wrong."}</p>
          <Button variant="ghost" onClick={() => setView("none")} className="px-3.5 py-2 text-[13px]">Try again</Button>
        </>
      )}

      {view === "picker" && (() => {
        const ql = q.trim().toLowerCase();
        const matches = insts.filter((i) =>
          i.name.toLowerCase().includes(ql) || (i.country || "").toLowerCase().includes(ql));
        return (
          <div>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by bank or country (e.g. GB, Mock)…"
              className="mb-2 w-full rounded-[10px] border border-border bg-[#0b0f17] px-3 py-2.5 text-[14px] text-ink outline-none focus:border-accent" />
            <div className="max-h-[260px] overflow-y-auto thin-scroll">
              {matches.map((i) => (
                <button key={`${i.country}:${i.name}`} onClick={() => pick(i)} disabled={busy}
                  className="flex w-full items-center gap-3 border-b border-border/60 px-2 py-2.5 text-left text-sm last:border-0 hover:bg-[#0c1420]">
                  {i.logo ? <img src={i.logo} alt="" className="h-6 w-6 rounded" /> : <span className="h-6 w-6 rounded bg-[#0f241c]" />}
                  <span className="truncate">{i.name}</span>
                  {i.country && <span className="ml-auto shrink-0 rounded bg-[#0f241c] px-1.5 py-0.5 text-[10px] font-semibold text-muted">{i.country}</span>}
                </button>
              ))}
              {!insts.length && <p className="py-3 text-[13px] text-muted">No banks returned — re-deploy the function with the latest code.</p>}
              {!!insts.length && !matches.length && <p className="py-3 text-[13px] text-muted">No match for "{q}".</p>}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-muted">{insts.length} bank{insts.length === 1 ? "" : "s"} available</span>
              <button onClick={() => setView("none")} className="text-[12px] text-muted hover:text-ink">Cancel</button>
            </div>
          </div>
        );
      })()}

      {view === "connected" && (
        <div>
          <div className="mb-3 space-y-1.5">
            {accounts.map((a) => {
              const bal = a.balances?.[0];
              return (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-[#0c121d] px-3 py-2 text-sm">
                  <span className="truncate"><b>{a.name}</b>{a.iban ? <span className="ml-2 text-[11px] text-muted">···{a.iban.slice(-4)}</span> : ""}</span>
                  {bal && <span className="font-bold tabular-nums">{fmt(parseFloat(bal.amount) || 0)}</span>}
                </div>
              );
            })}
          </div>
          {txns.length > 0 && (
            <>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-[.05em] text-muted">Recent transactions</div>
              <div className="max-h-[180px] space-y-0.5 overflow-y-auto thin-scroll">
                {txns.slice(0, 25).map((t, i) => (
                  <div key={t.id || i} className="flex items-center justify-between gap-2 px-1 py-1 text-[12px]">
                    <span className="truncate text-muted">{t.name}</span>
                    <span className={`shrink-0 tabular-nums ${parseFloat(t.amount) < 0 ? "text-ink" : "text-good"}`}>{fmt(parseFloat(t.amount) || 0)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" onClick={connect} className="px-3 py-1.5 text-[12px]">Add another</Button>
            <button onClick={disconnect} className="rounded-xl border border-[#5a1f1f] bg-[#1a0f0f] px-3 py-1.5 text-[12px] font-semibold text-bad transition hover:brightness-125">Disconnect</button>
          </div>
        </div>
      )}
    </Section>
  );
}

function friendly(r) {
  if (r.error === "network") return "Couldn't reach the server. Try again.";
  if (r.error === "unauthorized") return "Session expired — sign in again.";
  if (r.error === "provider_error") return "The bank service had a problem. Try again shortly.";
  return r.message || "Something went wrong.";
}

function DetailsCard({ onEdit }) {
  return (
    <Section title="Your details" desc="Income, age, pay frequency, mortgage, car, pets and debts. (Edit your spending in the Budget tab.)">
      <Button variant="ghost" onClick={onEdit} className="px-3.5 py-2 text-[13px]">Edit my details</Button>
    </Section>
  );
}

function DataCard({ state, setState, wipeData, onLogout }) {
  const exportData = () => {
    const blob = new Blob([JSON.stringify(toStored(state), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "orcl-data.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const wipe = async () => {
    if (!window.confirm("Delete all your data and sign out? This clears your saved plan and can't be undone.")) return;
    await wipeData(toStored(initialState)); // blanks the cloud copy + signs out
    try { localStorage.removeItem("dfp_draft_react"); } catch {}
    setState(initialState);
    onLogout?.();
  };

  return (
    <Section title="Your data" desc="Anonymous and yours. Download a copy any time, or delete it.">
      <div className="flex flex-wrap gap-2.5">
        <Button variant="ghost" onClick={exportData} className="px-3.5 py-2 text-[13px]">⬇ Export my data (JSON)</Button>
        <button onClick={wipe} className="rounded-xl border border-[#5a1f1f] bg-[#1a0f0f] px-3.5 py-2 text-[13px] font-semibold text-bad transition hover:brightness-125">Delete my data</button>
      </div>
    </Section>
  );
}

function Field({ label, children }) {
  return <div><label className="mb-1.5 block text-[11px] uppercase tracking-[.06em] text-muted">{label}</label>{children}</div>;
}
