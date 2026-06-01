import { useMemo, useState } from "react";
import { Card } from "../components/ui.jsx";
import Donut from "../components/Donut.jsx";
import {
  usePlanner, monthlyIncomeOf, debtsOf, livingOf, savingsToDeployOf, expenseItemsOf,
} from "../state.jsx";
import { SECTIONS, sectionByKey } from "../data/sections.js";
import { fmt, monthsToStr, buildPlans, simulateDetailed, projectRetirement, projectSavings } from "../lib/engine.js";
import Savings from "./Savings.jsx";
import Career from "./Career.jsx";
import Results from "./Results.jsx";
import Detail from "./Detail.jsx";

const LIVE = new Set(["debt", "savings", "career"]);
const TONE = { green: "#3ad07f", orange: "#f5953a", red: "#f0556f" };

// Sidebar shell: Overview is the home panel; sections are in-place tabs.
export default function Dashboard({ onEdit }) {
  const { state } = usePlanner();
  const [tab, setTab] = useState("overview");
  const [detailPlan, setDetailPlan] = useState(null); // debt sub-view
  const go = (t) => { setTab(t); setDetailPlan(null); window.scrollTo({ top: 0, behavior: "smooth" }); };

  // Tab order: Overview, then goal-personalised sections.
  const primary = state.goals?.primary || "";
  const interests = Object.keys(state.goals?.interests || {});
  const ordered = [];
  if (primary) ordered.push(primary);
  SECTIONS.forEach((s) => { if (interests.includes(s.key) && s.key !== primary) ordered.push(s.key); });
  SECTIONS.forEach((s) => { if (!ordered.includes(s.key)) ordered.push(s.key); });

  return (
    <div className="w-full">
      <header className="mb-4">
        <div className="text-[13px] text-muted">{hello()}, here's your money</div>
        <h1 className="text-[22px] font-extrabold tracking-tight">Orcl. hub</h1>
      </header>

      <div className="flex flex-col gap-6 md:flex-row lg:gap-9">
        {/* Sidebar */}
        <aside className="md:w-[200px] md:shrink-0">
          <nav className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            <TabBtn label="Overview" emoji="🏠" active={tab === "overview"} onClick={() => go("overview")} />
            {ordered.map((key) => {
              const sec = sectionByKey(key);
              if (!sec) return null;
              return (
                <TabBtn
                  key={key} label={sec.title} emoji={sec.emoji}
                  soon={!LIVE.has(key)} active={tab === key} onClick={() => go(key)}
                />
              );
            })}
            <button onClick={onEdit} className="mt-1 flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-semibold text-muted transition hover:bg-[#0c1a15] hover:text-ink md:mt-3 md:border-t md:border-border md:pt-3.5">
              <span className="text-base">⚙️</span><span className="whitespace-nowrap">Edit my details</span>
            </button>
          </nav>
        </aside>

        {/* Main panel */}
        <main className="min-w-0 flex-1">
          {tab === "overview" && <Overview onOpenTab={go} onEdit={onEdit} />}
          {tab === "debt" && (detailPlan
            ? <Detail planKey={detailPlan} onBack={() => setDetailPlan(null)} />
            : <Results embedded onPickPlan={(k) => { setDetailPlan(k); window.scrollTo({ top: 0, behavior: "smooth" }); }} />)}
          {tab === "savings" && <Savings embedded />}
          {tab === "career" && <Career embedded />}
          {!["overview", "debt", "savings", "career"].includes(tab) && <ComingSoon section={sectionByKey(tab)} onBack={() => go("overview")} />}
        </main>
      </div>
    </div>
  );
}

function TabBtn({ label, emoji, active, soon, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[14px] font-semibold transition md:w-full ${
        active
          ? "bg-[#0f241c] text-ink shadow-[inset_3px_0_0_#2fe6a6] md:shadow-[inset_3px_0_0_#2fe6a6]"
          : "text-muted hover:bg-[#0c1a15] hover:text-ink"
      }`}
    >
      <span className="text-base">{emoji}</span>
      <span className="whitespace-nowrap">{label}</span>
      {soon && <span className="ml-auto hidden rounded-full bg-[#0c1a15] px-1.5 py-0.5 text-[9px] uppercase tracking-[.06em] text-muted md:inline">soon</span>}
    </button>
  );
}

/* ----------------------------------------------------------- OVERVIEW -- */
function Overview({ onOpenTab, onEdit }) {
  const { state } = usePlanner();
  const income = monthlyIncomeOf(state);
  const debts = debtsOf(state);
  const living = livingOf(state);
  const lump = savingsToDeployOf(state);
  const expItems = expenseItemsOf(state);
  const totalExpenses = expItems.reduce((s, c) => s + c.value, 0);
  const minTotal = debts.reduce((s, d) => s + d.min, 0);
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const spentOut = living + minTotal;          // money leaving each month
  const leftover = income - spentOut;          // can be negative (over budget)
  const spare = Math.max(0, leftover);

  const { plans } = useMemo(() => buildPlans(debts, income, living, lump), [debts, income, living, lump]);
  // Snapshot uses the Accelerated plan (plan 2): a chunk to debt now, the rest
  // building savings — shifting fully to savings once debt-free.
  const accel = plans.find((p) => p.def.key === "accelerated") || plans[0];
  const balanced = plans.find((p) => p.def.key === "balanced") || plans[0];

  const age = parseInt(state.age, 10);
  const retire = useMemo(() => projectRetirement({
    age, retireAge: 60, annualRate: 0.045,
    monthlyWhileDebt: spare, monthlyAfterDebt: income * 0.2,
    debtMonths: balanced && isFinite(balanced.sim.months) ? balanced.sim.months : 0,
    startingPot: 0,
  }), [age, spare, income, balanced]);

  const recs = buildRecommendations({ debts, income, living, spare, mortgageOn: state.mortgage.on });

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      {/* Left: donut + income/expenses/budget */}
      <Card className="lg:p-7">
        <h2 className="mb-1 text-[20px] font-bold">Income &amp; expenses</h2>
        <p className="mb-5 text-sm text-muted">Where your {fmt(income)} a month goes.</p>
        {expItems.length ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-center xl:gap-10">
            <div className="flex justify-center">
              <Donut items={expItems} total={Math.max(income, totalExpenses)} idPrefix="ov" centerTop={fmt(income)} maxW={420} />
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {expItems.map((c) => (
                <span key={c.key} className="inline-flex items-center justify-between gap-2 border-b border-border/60 pb-1.5 text-[13px]">
                  <span className="inline-flex items-center gap-2 text-muted">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c.color }} />
                    {c.name}
                  </span>
                  <b className="text-ink tabular-nums">{fmt(c.value)}</b>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            Add your budget to see the breakdown.
            <div className="mt-3"><button onClick={onEdit} className="font-semibold text-accent hover:underline">Edit my details →</button></div>
          </div>
        )}
      </Card>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        <MonthlyFigures income={income} spent={spentOut} leftover={leftover} />
        <Snapshot6 income={income} living={living} debts={debts} extra={accel ? accel.extra : 0} lump={lump} monthlyToDebt={accel ? accel.monthly : 0} totalDebt={totalDebt} />
        <RetirementCard retire={retire} age={age} />
      </div>

      {/* Recommendations (full width) */}
      {recs.length > 0 && (
        <div className="lg:col-span-2">
          <h2 className="mb-1 text-[18px] font-bold">Recommended for you</h2>
          <p className="mb-3 text-sm text-muted">Personalised next steps based on your numbers.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {recs.map((r) => <RecCard key={r.id} r={r} onOpen={LIVE.has(r.sectionKey) ? () => onOpenTab(r.sectionKey) : null} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function MonthlyFigures({ income, spent, leftover }) {
  const pct = income > 0 ? Math.min(100, Math.round((spent / income) * 100)) : 0;
  const over = leftover < 0;
  const C = ({ k, v, tone }) => (
    <div>
      <div className={`text-[15px] font-extrabold tabular-nums ${tone === "bad" ? "text-bad" : tone === "good" ? "text-good" : "text-ink"}`}>{v}</div>
      <div className="text-[9px] uppercase tracking-[.06em] text-muted">{k}</div>
    </div>
  );
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-panel to-panel2 p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-[14px] font-bold">This month</h3>
        <span className={`text-[12px] font-semibold ${over ? "text-bad" : "text-good"}`}>{over ? `${fmt(-leftover)} over` : `${fmt(leftover)} under budget`}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <C k="Spent" v={fmt(spent)} tone="bad" />
        <C k="Left" v={fmt(Math.max(0, leftover))} tone="good" />
        <C k="Budget" v={fmt(income)} />
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[#0a0f17]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? "#f0556f" : "linear-gradient(90deg,#12b886,#2fe6a6)" }} />
      </div>
    </div>
  );
}

const SNAP_RANGES = [{ n: 3, label: "3m" }, { n: 6, label: "6m" }, { n: 12, label: "1y" }];

function Snapshot6({ income, living, debts, extra, lump, monthlyToDebt, totalDebt }) {
  const [n, setN] = useState(6);
  const hasDebt = debts.length > 0;
  const sim = useMemo(() => (hasDebt ? simulateDetailed(debts, extra, lump) : null), [debts, extra, lump, hasDebt]);
  const essentials = living;

  const now = new Date();
  const months = Array.from({ length: n }, (_, i) => {
    const label = new Date(now.getFullYear(), now.getMonth() + i, 1).toLocaleString("en-GB", { month: "short" });
    const inDebt = sim && i < sim.schedule.length;
    let debtPaid = 0, bal = 0;
    if (inDebt) {
      debtPaid = sim.schedule[i].pay.reduce((s, p) => s + p, 0);
      bal = sim.schedule[i].bal.reduce((s, b) => s + b, 0);
    }
    // Anything not spent on essentials/debt goes to savings & spare.
    const saved = Math.max(0, income - essentials - debtPaid);
    return { label, essentials, debtPaid, saved, bal };
  });

  const maxStack = Math.max(income, ...months.map((m) => m.essentials + m.debtPaid + m.saved), 1);
  const clearsWithin = hasDebt && sim && sim.schedule.length <= n;
  const endBal = hasDebt ? months[n - 1].bal : 0;
  const totalSaved = months.reduce((s, m) => s + m.saved, 0);
  const rangeWord = n === 12 ? "a year" : `${n} months`;
  const thin = n > 6;

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="font-bold">Snapshot</h3>
        <div className="flex gap-1 rounded-lg border border-border bg-[#0a0f17] p-0.5">
          {SNAP_RANGES.map((r) => (
            <button key={r.n} onClick={() => setN(r.n)}
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${n === r.n ? "bg-[#1c2738] text-ink" : "text-muted hover:text-ink"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-3 text-[13px] leading-snug text-muted">
        {!hasDebt
          ? <>No debt — on a 50/30/20 split you'd save about <b className="text-good">{fmt(totalSaved)}</b> over {rangeWord}.</>
          : clearsWithin
          ? <>You're debt-free in <b className="text-ink">{monthsToStr(sim.months)}</b> — then your money shifts to a 50/30/20 savings split.</>
          : <>Paying <b className="text-ink">{fmt(monthlyToDebt)}</b>/mo, your debt drops from <b className="text-ink">{fmt(totalDebt)}</b> to <b className="text-good">{fmt(endBal)}</b> over {rangeWord}.</>}
      </p>
      <div className={`flex h-[180px] items-stretch ${thin ? "gap-1" : "gap-2"}`}>
        {months.map((m, i) => {
          const h = (v) => `${(v / maxStack) * 100}%`;
          return (
            <div key={i} className="flex h-full flex-1 flex-col items-center">
              <div className="flex w-full flex-1 flex-col justify-end overflow-hidden rounded-md bg-[#0a0f17]">
                {m.saved > 0 && <div style={{ height: h(m.saved), background: "#3ad07f" }} title={`Savings/spare ${fmt(m.saved)}`} />}
                {m.debtPaid > 0 && <div style={{ height: h(m.debtPaid), background: "#f0556f" }} title={`Debt ${fmt(m.debtPaid)}`} />}
                <div style={{ height: h(m.essentials), background: "#4cb8f0", minHeight: m.essentials > 0 ? 2 : 0 }} title={`Essentials ${fmt(m.essentials)}`} />
              </div>
              {(!thin || i % 2 === 0) && <span className="mt-2 text-[10px] text-muted">{m.label}</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <Legend c="#4cb8f0" t="Essentials" />
        {hasDebt && <Legend c="#f0556f" t="Debt" />}
        <Legend c="#3ad07f" t="Savings / spare" />
      </div>
    </Card>
  );
}

function Legend({ c, t }) {
  return <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />{t}</span>;
}

function RetirementCard({ retire, age }) {
  if (!retire) {
    return (
      <Card>
        <h3 className="mb-1 font-bold">Retirement</h3>
        <p className="text-[13px] text-muted">Add your age to project your pot at 60.</p>
      </Card>
    );
  }
  return (
    <Card className="lg:p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-bold">Retirement</h3>
        <span className="text-[12px] text-muted">at age 60</span>
      </div>
      <div className="mt-1.5 text-[28px] font-extrabold leading-none text-accent">{fmt(retire.balanceAtRetirement)}</div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        From age {age || "—"} you'd pay in <b className="text-ink">{fmt(retire.totalContributed)}</b> and earn <b className="text-good">{fmt(retire.totalInterest)}</b> in growth (4.5%/yr).
      </p>
    </Card>
  );
}

/* ------------------------------------------------------- recs + misc -- */
function buildRecommendations({ debts, income, living, spare, mortgageOn }) {
  const out = [];
  const debtFreeUser = debts.length === 0;
  const accruing = debts.filter((d) => d.freeMonths === 0 && d.rate > 0);
  const top = accruing.sort((a, b) => b.rate - a.rate)[0];

  if (top) out.push({ id: "debt", emoji: "🔥", sectionKey: "debt", title: `Tackle ${top.name} first`, text: `At ${top.rate}% APR it's your priciest debt — clearing this one first saves the most in interest.` });
  if (debtFreeUser && income > 0) out.push({ id: "invest", emoji: "📈", sectionKey: "savings", title: "You're debt-free — grow it", text: "No debt to clear, so redirect your spare cash into high-yield savings and simple investments." });
  if (spare > 0 && !debtFreeUser) {
    const yr = projectSavings({ monthly: spare, annualRate: 0.045, years: 1 }).balance;
    out.push({ id: "spare", emoji: "💷", sectionKey: "savings", title: `Put your ${fmt(spare)}/mo to work`, text: `You've about ${fmt(spare)} spare each month — in a top UK account that's roughly ${fmt(yr)} after a year.` });
  }
  if (living > 0) out.push({ id: "emergency", emoji: "🛟", sectionKey: "emergency", title: "Build an emergency fund", text: `Aim for ${fmt(living * 3)}–${fmt(living * 6)} (3–6 months of essentials) so a surprise bill never derails your plan.` });
  if (!mortgageOn) out.push({ id: "mortgage", emoji: "🏠", sectionKey: "mortgage", title: "Thinking about buying?", text: "You don't have a mortgage yet — our upcoming mortgage calculator will map out deposits and repayments." });
  if (income > 0) out.push({ id: "pension", emoji: "👴", sectionKey: "pensions", title: "Don't forget your pension", text: "Small top-ups now compound massively by retirement. Our pension tools are on the way." });

  return out.slice(0, 3);
}

function RecCard({ r, onOpen }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-[#0a120f]/80 p-4">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f241c] text-xl">{r.emoji}</div>
      <h3 className="text-[15px] font-bold leading-snug">{r.title}</h3>
      <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{r.text}</p>
      {onOpen ? (
        <button onClick={onOpen} className="mt-3 inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline">
          View now
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      ) : (
        <span className="mt-3 inline-flex w-fit rounded-full border border-[#2a3b34] bg-[#0c1a15] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-muted">Coming soon</span>
      )}
    </div>
  );
}

function ComingSoon({ section, onBack }) {
  if (!section) return null;
  return (
    <Card className="mx-auto max-w-[560px] text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0f241c] text-3xl">{section.emoji}</div>
      <span className="rounded-full border border-[#2a3b34] bg-[#0c1a15] px-3 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-muted">Coming soon</span>
      <h2 className="mt-3 text-[22px] font-extrabold">{section.title}</h2>
      <p className="mx-auto mt-2 max-w-[420px] text-[14px] leading-relaxed text-muted">{section.desc}</p>
      <p className="mt-3 text-[13px] text-muted">We're building this — it'll appear right here when it's ready.</p>
      <button onClick={onBack} className="mt-5 rounded-xl border border-[#1e2b27] bg-[#101a18] px-4 py-2.5 text-sm font-semibold text-ink transition hover:brightness-125">Back to overview</button>
    </Card>
  );
}

function hello() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
