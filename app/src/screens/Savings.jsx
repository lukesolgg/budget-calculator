import { useMemo, useState } from "react";
import { Card, Chevron } from "../components/ui.jsx";
import { usePlanner, monthlyIncomeOf, debtsOf, livingOf } from "../state.jsx";
import { fmt, projectSavings } from "../lib/engine.js";
import { SAVINGS_ACCOUNTS, SAVINGS_LAST_UPDATED, bestSavings } from "../data/savings.js";

const TYPE_ORDER = ["Easy Access", "Regular Saver", "Fixed Rate", "Cash ISA"];
const TYPE_BLURB = {
  "Easy Access": "Dip in and out anytime — best for your emergency fund.",
  "Regular Saver": "High rates if you pay in a set amount each month.",
  "Fixed Rate": "Lock money away for a set term for a guaranteed rate.",
  "Cash ISA": "Tax-free interest, within your annual ISA allowance.",
};

export default function Savings({ onBack }) {
  const { state } = usePlanner();
  const income = monthlyIncomeOf(state);
  const debts = debtsOf(state);
  const living = livingOf(state);
  const minTotal = debts.reduce((s, d) => s + d.min, 0);
  const spare = Math.max(0, income - living - minTotal);

  const best = bestSavings();
  // Forecast controls — seed monthly from spare cash.
  const [monthly, setMonthly] = useState(Math.round(spare));
  const [years, setYears] = useState(5);
  const [rate, setRate] = useState(best.aer);

  const proj = useMemo(
    () => projectSavings({ lump: 0, monthly, annualRate: rate / 100, years }),
    [monthly, rate, years]
  );

  const grouped = TYPE_ORDER
    .map((t) => ({ type: t, items: SAVINGS_ACCOUNTS.filter((a) => a.type === t) }))
    .filter((g) => g.items.length);

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-[18px] flex items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-[#1e2b27] bg-[#101a18] px-[18px] py-2.5 text-sm font-semibold text-ink transition hover:brightness-125">
          <Chevron dir="left" /> Back to dashboard
        </button>
      </div>

      <header className="mb-6">
        <h1 className="text-[26px] font-extrabold tracking-tight">Best UK savings</h1>
        <p className="mt-1 text-muted">Grow your spare cash. Live UK rates, updated {SAVINGS_LAST_UPDATED}.</p>
      </header>

      {/* Forecast */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* Controls */}
          <div>
            <h3 className="mb-3 font-bold">Forecast your savings</h3>
            <Field label="Amount saved each month">
              <span className="relative block">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">£</span>
                <input type="number" min="0" value={monthly} onChange={(e) => setMonthly(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full rounded-xl border border-border bg-[#0c121d] py-3 pl-7 pr-3 text-lg font-bold text-ink outline-none focus:border-accent" />
              </span>
              {spare > 0 && (
                <button onClick={() => setMonthly(Math.round(spare))} className="mt-1.5 text-[12px] text-accent hover:underline">
                  Use my spare cash ({fmt(spare)}/mo)
                </button>
              )}
            </Field>

            <Field label={`Interest rate · ${rate.toFixed(2)}% AER`}>
              <input type="range" min="0.5" max="8" step="0.05" value={rate} onChange={(e) => setRate(parseFloat(e.target.value))} style={{ "--acc": "#2fe6a6" }} />
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[...SAVINGS_ACCOUNTS].sort((a, b) => b.aer - a.aer).slice(0, 3).map((a) => (
                  <button key={a.provider + a.name} onClick={() => setRate(a.aer)}
                    className="rounded-full border border-[#1e2b27] bg-[#0c121d] px-2.5 py-1 text-[11px] text-muted transition hover:text-ink">
                    {a.provider} {a.aer}%
                  </button>
                ))}
              </div>
            </Field>

            <Field label={`Time · ${years} year${years > 1 ? "s" : ""}`}>
              <input type="range" min="1" max="30" step="1" value={years} onChange={(e) => setYears(parseInt(e.target.value, 10))} style={{ "--acc": "#2fe6a6" }} />
            </Field>
          </div>

          {/* Result + chart */}
          <div className="rounded-xl bg-[#0c121d] p-5">
            <div className="text-[12px] uppercase tracking-[.06em] text-muted">After {years} year{years > 1 ? "s" : ""} you'd have</div>
            <div className="mt-1 text-[40px] font-extrabold text-good">{fmt(proj.balance)}</div>
            <div className="mt-1 text-[13px] text-muted">
              You'd pay in <b className="text-ink">{fmt(proj.contributed)}</b> and earn <b className="text-good">{fmt(proj.interest)}</b> in interest.
            </div>
            <GrowthChart series={proj.yearly} years={years} />
          </div>
        </div>
        {spare <= 0 && (
          <p className="mt-4 rounded-lg border border-[#5a3d12] bg-[#1c1407] px-3.5 py-2.5 text-[13px] text-warn">
            You've no spare cash flagged right now — clear your debts or trim expenses first, then this is where it can grow.
          </p>
        )}
      </Card>

      {/* Account list */}
      {grouped.map((g) => (
        <div key={g.type} className="mb-6">
          <div className="mb-2 flex items-baseline gap-3">
            <h3 className="text-lg font-bold">{g.type}</h3>
            <span className="text-[13px] text-muted">{TYPE_BLURB[g.type]}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {g.items.sort((a, b) => b.aer - a.aer).map((a) => (
              <AccountCard key={a.provider + a.name} a={a} onPick={() => setRate(a.aer)} />
            ))}
          </div>
        </div>
      ))}

      <p className="mt-2 text-center text-[11px] text-muted">
        All accounts FSCS protected up to £85,000. Rates change often — always check the provider before applying. General information, not financial advice.
      </p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.05em] text-muted">{label}</label>
      {children}
    </div>
  );
}

function AccountCard({ a, onPick }) {
  return (
    <div className="rounded-xl border border-border bg-[#0c121d] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold">{a.provider}</div>
          <div className="text-[13px] text-muted">{a.name}</div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-extrabold text-good">{a.aer}%</div>
          <div className="text-[10px] uppercase tracking-[.06em] text-muted">AER</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {a.taxFree && <Tag>Tax-free</Tag>}
        {a.bonus && <Tag>Bonus rate</Tag>}
        {a.termMonths && <Tag>{a.termMonths}-mo term</Tag>}
        {a.perMonthCap && <Tag>Max {fmt(a.perMonthCap)}/mo</Tag>}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-y-1 text-[12px] text-muted">
        <span>Min: <b className="text-ink">{fmt(a.min)}</b></span>
        <span>Max: <b className="text-ink">{a.max ? fmt(a.max) : "No limit"}</b></span>
        <span className="col-span-2">Access: <b className="text-ink">{a.access}</b></span>
      </div>
      {a.notes && <p className="mt-2 text-[12px] leading-snug text-muted">{a.notes}</p>}
      <button onClick={onPick} className="mt-3 text-[12px] font-semibold text-accent hover:underline">Use this rate in the forecast →</button>
    </div>
  );
}

function Tag({ children }) {
  return <span className="rounded-full border border-[#1e3a30] bg-[#0c1a15] px-2 py-0.5 text-[10px] font-semibold text-accent">{children}</span>;
}

function GrowthChart({ series, years }) {
  if (!series || series.length < 2) return null;
  const W = 520, H = 120, pad = 4;
  const maxBal = series[series.length - 1].balance || 1;
  const x = (i) => pad + (i / (series.length - 1)) * (W - pad * 2);
  const y = (v) => H - pad - (v / maxBal) * (H - pad * 2);
  const balLine = series.map((p, i) => `${x(i)},${y(p.balance)}`).join(" ");
  const contribLine = series.map((p, i) => `${x(i)},${y(p.contributed)}`).join(" ");
  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[120px] w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="savFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2fe6a6" stopOpacity="0.32" />
            <stop offset="1" stopColor="#2fe6a6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`${x(0)},${H - pad} ${balLine} ${x(series.length - 1)},${H - pad}`} fill="url(#savFill)" />
        <polyline points={contribLine} fill="none" stroke="#3a4656" strokeWidth="1.6" strokeDasharray="4 4" />
        <polyline points={balLine} fill="none" stroke="#2fe6a6" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span><span className="text-good">●</span> With interest</span>
        <span><span className="text-[#3a4656]">▬</span> Money paid in</span>
      </div>
    </div>
  );
}
