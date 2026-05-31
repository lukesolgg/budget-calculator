import { useMemo, useState } from "react";
import { Card, Chevron } from "../components/ui.jsx";
import { usePlanner, monthlyIncomeOf, debtsOf, livingOf } from "../state.jsx";
import { fmt, projectSavings } from "../lib/engine.js";
import { SAVINGS_ACCOUNTS, SAVINGS_LAST_UPDATED } from "../data/savings.js";

const TYPE_ORDER = ["Easy Access", "Regular Saver", "Fixed Rate", "Cash ISA"];
const TYPE_BLURB = {
  "Easy Access": "Dip in and out anytime — best for your emergency fund.",
  "Regular Saver": "High rates if you pay in a set amount each month.",
  "Fixed Rate": "Lock money away for a set term for a guaranteed rate.",
  "Cash ISA": "Tax-free interest, within your annual ISA allowance.",
};
const keyOf = (a) => `${a.provider}·${a.name}`;

export default function Savings({ onBack }) {
  const { state } = usePlanner();
  const income = monthlyIncomeOf(state);
  const debts = debtsOf(state);
  const living = livingOf(state);
  const minTotal = debts.reduce((s, d) => s + d.min, 0);
  const spare = Math.max(0, income - living - minTotal);

  // Accordion: at most one account's forecast open at a time.
  const [openKey, setOpenKey] = useState(null);

  const grouped = TYPE_ORDER
    .map((t) => ({ type: t, items: SAVINGS_ACCOUNTS.filter((a) => a.type === t).sort((x, y) => y.aer - x.aer) }))
    .filter((g) => g.items.length);

  const topRate = Math.max(...SAVINGS_ACCOUNTS.map((a) => a.aer));

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-[18px] flex items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-[#1e2b27] bg-[#101a18] px-[18px] py-2.5 text-sm font-semibold text-ink transition hover:brightness-125">
          <Chevron dir="left" /> Back to dashboard
        </button>
      </div>

      {/* Hero */}
      <Card className="mb-7 overflow-hidden !p-0">
        <div className="grid grid-cols-1 items-center gap-6 p-6 sm:p-8 md:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#1e3a30] bg-[#0c1a15] px-3 py-1 text-[11px] font-bold uppercase tracking-[.08em] text-accent">
              Live UK rates · updated {SAVINGS_LAST_UPDATED}
            </span>
            <h1 className="mt-3 text-[30px] font-extrabold leading-tight tracking-tight">
              Make your spare cash <span className="text-accent">actually work</span>.
            </h1>
            <p className="mt-2.5 max-w-[460px] text-[15px] leading-relaxed text-muted">
              These are some of the most competitive UK savings accounts right now — hand-picked across
              easy-access, regular savers, fixed bonds and cash ISAs. Tap any account to forecast exactly
              what it could earn you.
            </p>
            <div className="mt-5 flex flex-wrap gap-6">
              <Headline value={`${topRate.toFixed(2)}%`} label="Top rate available" />
              <Headline value={fmt(spare)} label="Your spare / month" />
              <Headline value={SAVINGS_ACCOUNTS.length} label="Accounts tracked" />
            </div>
          </div>
          <HeroArt />
        </div>
      </Card>

      {/* Tables per category */}
      {grouped.map((g) => (
        <Card key={g.type} className="mb-6 overflow-hidden">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-lg font-bold">{g.type}</h3>
            <span className="text-[13px] text-muted">{TYPE_BLURB[g.type]}</span>
          </div>
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[.05em] text-muted">
                  <th className="py-2 pr-3 text-left font-semibold">Account</th>
                  <th className="px-3 py-2 text-right font-semibold">AER</th>
                  <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Min</th>
                  <th className="hidden px-3 py-2 text-left font-semibold md:table-cell">Access</th>
                  <th className="py-2 pl-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((a) => {
                  const k = keyOf(a);
                  const open = openKey === k;
                  return (
                    <AccountRows
                      key={k}
                      a={a}
                      open={open}
                      onToggle={() => setOpenKey(open ? null : k)}
                      spare={spare}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <p className="mt-2 text-center text-[11px] text-muted">
        All accounts FSCS protected up to £85,000. Rates change often — always check the provider before applying. General information, not financial advice.
      </p>
    </div>
  );
}

function Headline({ value, label }) {
  return (
    <div>
      <div className="text-[24px] font-extrabold leading-none text-good">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[.06em] text-muted">{label}</div>
    </div>
  );
}

// Inline SVG illustration — growing savings, no external image needed.
function HeroArt() {
  return (
    <div className="relative mx-auto hidden w-full max-w-[320px] md:block">
      <svg viewBox="0 0 320 200" className="w-full">
        <defs>
          <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2fe6a6" stopOpacity="0.35" />
            <stop offset="1" stopColor="#2fe6a6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* growth area */}
        <polygon points="10,170 10,150 70,140 130,110 190,80 250,48 310,20 310,170" fill="url(#heroFill)" />
        <polyline points="10,150 70,140 130,110 190,80 250,48 310,20" fill="none" stroke="#2fe6a6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {/* coin stacks */}
        {[
          { x: 70, h: 30 }, { x: 130, h: 60 }, { x: 190, h: 90 }, { x: 250, h: 122 },
        ].map((c, i) => (
          <g key={i}>
            {Array.from({ length: Math.round(c.h / 14) }).map((_, j) => (
              <ellipse key={j} cx={c.x} cy={170 - j * 14} rx="20" ry="7"
                fill={j % 2 ? "#12b886" : "#19c596"} stroke="#0b3b2c" strokeWidth="1" />
            ))}
            <text x={c.x} y={195} textAnchor="middle" fontSize="11" fill="#5fd6b0">£</text>
          </g>
        ))}
        <text x="300" y="14" textAnchor="end" fontSize="13" fontWeight="700" fill="#2fe6a6">↑ grows</text>
      </svg>
    </div>
  );
}

function AccountRows({ a, open, onToggle, spare }) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer border-t border-border transition hover:bg-[#0e141f] ${open ? "bg-[#0e141f]" : ""}`}
      >
        <td className="py-3 pr-3">
          <div className="font-bold">{a.provider}</div>
          <div className="text-[12px] text-muted">{a.name}</div>
          <div className="mt-1 flex flex-wrap gap-1.5 sm:hidden">
            <MiniTags a={a} />
          </div>
        </td>
        <td className="px-3 py-3 text-right">
          <span className="text-[20px] font-extrabold text-good">{a.aer}%</span>
        </td>
        <td className="hidden px-3 py-3 text-right tabular-nums text-muted sm:table-cell">{fmt(a.min)}</td>
        <td className="hidden px-3 py-3 text-left text-[13px] text-muted md:table-cell">{a.access}</td>
        <td className="py-3 pl-3 text-right">
          <span className={`inline-flex transition-transform ${open ? "rotate-180" : ""}`}><Chevron dir="down" /></span>
        </td>
      </tr>
      {open && (
        <tr className="border-t border-border bg-[#0a0f18]">
          <td colSpan={5} className="p-0">
            <AccountForecast a={a} spare={spare} />
          </td>
        </tr>
      )}
    </>
  );
}

function MiniTags({ a }) {
  return (
    <>
      {a.taxFree && <Tag>Tax-free</Tag>}
      {a.bonus && <Tag>Bonus rate</Tag>}
      {a.termMonths && <Tag>{a.termMonths}-mo term</Tag>}
      {a.perMonthCap && <Tag>Max {fmt(a.perMonthCap)}/mo</Tag>}
    </>
  );
}

// The inline "forecast your earnings" dropdown for one account.
function AccountForecast({ a, spare }) {
  const cap = a.perMonthCap || Infinity;
  const seed = Math.min(Math.round(spare) || 0, cap);
  const [monthly, setMonthly] = useState(seed > 0 ? seed : Math.min(200, cap === Infinity ? 200 : cap));
  const [years, setYears] = useState(a.termMonths && a.termMonths < 12 ? 1 : 5);

  const proj = useMemo(
    () => projectSavings({ lump: 0, monthly, annualRate: a.aer / 100, years }),
    [monthly, years, a.aer]
  );

  return (
    <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <h4 className="mb-1 font-bold">Forecast your earnings · {a.provider}</h4>
        <p className="mb-4 flex flex-wrap gap-1.5 text-[12px] text-muted"><MiniTags a={a} /></p>

        <Field label="Amount saved each month">
          <span className="relative block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">£</span>
            <input
              type="number" min="0" value={monthly}
              onChange={(e) => setMonthly(Math.min(cap, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-full rounded-xl border border-border bg-[#0c121d] py-3 pl-7 pr-3 text-lg font-bold text-ink outline-none focus:border-accent" />
          </span>
          {a.perMonthCap && (
            <div className="mt-1.5 text-[12px] text-muted">Capped at <b className="text-ink">{fmt(a.perMonthCap)}/mo</b> on this account.</div>
          )}
          {spare > 0 && monthly !== Math.min(Math.round(spare), cap) && (
            <button onClick={() => setMonthly(Math.min(Math.round(spare), cap))} className="mt-1.5 text-[12px] text-accent hover:underline">
              Use my spare cash ({fmt(Math.min(Math.round(spare), cap))}/mo)
            </button>
          )}
        </Field>

        <Field label={`Time · ${years} year${years > 1 ? "s" : ""}`}>
          <input type="range" min="1" max="30" step="1" value={years} onChange={(e) => setYears(parseInt(e.target.value, 10))} style={{ "--acc": "#2fe6a6" }} />
          {a.termMonths && (
            <div className="mt-1 text-[12px] text-muted">Note: the headline rate runs for {a.termMonths} months — this projection assumes a similar rate continues.</div>
          )}
        </Field>
      </div>

      <div className="rounded-xl bg-[#0c121d] p-5">
        <div className="text-[12px] uppercase tracking-[.06em] text-muted">After {years} year{years > 1 ? "s" : ""} at {a.aer}% you'd have</div>
        <div className="mt-1 text-[36px] font-extrabold text-good">{fmt(proj.balance)}</div>
        <div className="mt-1 text-[13px] text-muted">
          You'd pay in <b className="text-ink">{fmt(proj.contributed)}</b> and earn <b className="text-good">{fmt(proj.interest)}</b> in interest.
        </div>
        <GrowthChart series={proj.yearly} />
      </div>
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

function Tag({ children }) {
  return <span className="rounded-full border border-[#1e3a30] bg-[#0c1a15] px-2 py-0.5 text-[10px] font-semibold text-accent">{children}</span>;
}

function GrowthChart({ series }) {
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
