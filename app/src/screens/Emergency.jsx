import { useState } from "react";
import { Card, MoneyInput, InfoTip } from "../components/ui.jsx";
import { usePlanner, livingOf, budgetMathOf } from "../state.jsx";
import { fmt, monthsToStr } from "../lib/engine.js";

// Emergency fund planner: target (3–6 months of essentials, tailored), progress,
// time-to-reach, and where to keep it.
export default function Emergency({ onOpenTab }) {
  const { state, update } = usePlanner();
  const em = state.emergency || { saved: "", target: 0, variable: false, dependents: false };
  const setEm = (patch) => update((s) => ({ ...s, emergency: { ...s.emergency, ...patch } }));

  const living = livingOf(state);
  const m = budgetMathOf(state);
  const hasDebt = m.hasDebt;
  const recommended = em.variable || em.dependents ? 6 : 3;
  const months = em.target || recommended;
  const target = living * months;
  const saved = Math.max(0, parseFloat(em.saved) || 0);
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  const toGo = Math.max(0, target - saved);

  // Default monthly contribution: the plan's savings slice, else spare.
  const defaultMonthly = Math.round(m.savings > 0 ? m.savings : m.spare);
  const [monthly, setMonthly] = useState(defaultMonthly);
  const monthsToReach = monthly > 0 ? Math.ceil(toGo / monthly) : null;
  const starter = hasDebt && saved < 1000;

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-4">
        <h1 className="text-[22px] font-extrabold tracking-tight">🛟 Emergency fund</h1>
        <p className="mt-1 text-sm text-muted">A cash cushion so a surprise bill never becomes new debt. Aim for a few months of essentials, kept somewhere you can reach fast.</p>
      </header>

      {starter && (
        <div className="mb-4 rounded-2xl border border-[#5a3d12] bg-[#1c1407] px-4 py-3 text-[13px] text-warn">
          <b>While you're clearing debt</b>, aim for a small <b>£1,000 starter buffer</b> first — then attack your debt, then build the full {months} months once you're debt-free.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        {/* Goal */}
        <Card className="lg:p-5">
          <h2 className="mb-3 text-[17px] font-bold">Your goal</h2>

          <div className="mb-4 grid grid-cols-2 gap-2.5">
            <Toggle label="My income is" a="Steady" b="Variable" on={em.variable} onChange={(v) => setEm({ variable: v })} />
            <Toggle label="People relying on it" a="Just me" b="Others too" on={em.dependents} onChange={(v) => setEm({ dependents: v })} />
          </div>
          <p className="mb-3 text-[12px] text-muted">Based on that, we suggest <b className="text-ink">{recommended} months</b> of essentials.</p>

          <div className="mb-4 grid grid-cols-3 gap-2">
            {[1, 3, 6].map((mo) => (
              <button key={mo} onClick={() => setEm({ target: mo })}
                className={`rounded-xl border px-2 py-2.5 text-center transition ${months === mo ? "border-accent bg-[#0f241c]" : "border-border bg-[#0c121d] hover:border-[#244a3c]"}`}>
                <div className="text-[15px] font-extrabold">{mo}{mo === 1 ? " mo" : " mo"}</div>
                <div className="text-[10px] uppercase tracking-[.05em] text-muted">{mo === 1 ? "Starter" : mo === 3 ? "Solid" : "Secure"}</div>
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-[#0a0f17] p-4 text-center">
            <div className="text-[11px] uppercase tracking-[.06em] text-muted">Your target ({months} months of essentials)</div>
            <div className="mt-1 text-[32px] font-extrabold text-accent">{fmt(target)}</div>
            <div className="mt-1 text-[12px] text-muted">{fmt(living)}/mo essentials × {months}</div>
          </div>
        </Card>

        {/* Progress + plan */}
        <div className="flex flex-col gap-5">
          <Card className="lg:p-5">
            <h2 className="mb-3 text-[17px] font-bold">Where you are</h2>
            <label className="mb-1.5 block text-[12px] uppercase tracking-[.05em] text-muted">Saved so far</label>
            <div className="max-w-[200px]"><MoneyInput value={em.saved} onChange={(v) => setEm({ saved: v })} placeholder="0" /></div>

            <div className="mt-4 mb-1 flex items-baseline justify-between text-[12px]">
              <span className="text-muted">{Math.round(pct)}% there</span>
              <span className="font-bold">{fmt(saved)} <span className="font-normal text-muted">of {fmt(target)}</span></span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-[#0a0f17]">
              <div className="h-full rounded-full bg-gradient-to-r from-[#12b886] to-[#2fe6a6]" style={{ width: `${pct}%` }} />
            </div>
            {toGo > 0 ? <p className="mt-2 text-[13px] text-muted"><b className="text-ink">{fmt(toGo)}</b> to go.</p>
              : <p className="mt-2 text-[13px] text-good">🎉 You've hit your target — nicely done!</p>}
          </Card>

          {toGo > 0 && (
            <Card className="lg:p-5">
              <h2 className="mb-1 text-[17px] font-bold">How fast can you get there?<InfoTip text="A rough estimate — saving this much each month until you reach the target." /></h2>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[13px] text-muted">Save each month</span>
                <span className="text-[15px] font-bold">{fmt(monthly)}</span>
              </div>
              <input type="range" min="0" max={Math.max(500, Math.round(m.income * 0.5))} step="10" value={monthly} onChange={(e) => setMonthly(parseInt(e.target.value, 10))} style={{ "--acc": "#2fe6a6" }} />
              {defaultMonthly > 0 && monthly !== defaultMonthly && (
                <button onClick={() => setMonthly(defaultMonthly)} className="mt-1.5 text-[12px] text-accent hover:underline">Use my plan's savings ({fmt(defaultMonthly)}/mo)</button>
              )}
              <div className="mt-3 rounded-xl bg-[#0a0f17] p-3 text-center">
                {monthsToReach ? <><span className="text-[12px] text-muted">Fully funded in</span><div className="text-[22px] font-extrabold text-accent">{monthsToStr(monthsToReach)}</div></>
                  : <span className="text-[13px] text-muted">Set a monthly amount to see how long it'll take.</span>}
              </div>
            </Card>
          )}

          <Card className="lg:p-5">
            <h2 className="mb-1.5 text-[16px] font-bold">Where to keep it</h2>
            <p className="text-[13px] leading-relaxed text-muted">Use an <b className="text-ink">easy-access</b> savings account — separate from your current account so you're not tempted, but reachable within a day. Don't invest it; this money's job is to be there.</p>
            <button onClick={() => onOpenTab?.("savings")} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline">See top easy-access accounts →</button>
          </Card>
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-muted">An emergency = an urgent, unexpected, necessary cost (car repair, boiler, income gap) — not a holiday. Top it back up after you dip in.</p>
    </div>
  );
}

function Toggle({ label, a, b, on, onChange }) {
  return (
    <div>
      <div className="mb-1 text-[11px] uppercase tracking-[.05em] text-muted">{label}</div>
      <div className="flex gap-1 rounded-lg border border-border bg-[#0a0f17] p-0.5">
        <button onClick={() => onChange(false)} className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-semibold transition ${!on ? "bg-[#1c2738] text-ink" : "text-muted hover:text-ink"}`}>{a}</button>
        <button onClick={() => onChange(true)} className={`flex-1 rounded-md px-2 py-1.5 text-[12px] font-semibold transition ${on ? "bg-[#1c2738] text-ink" : "text-muted hover:text-ink"}`}>{b}</button>
      </div>
    </div>
  );
}
