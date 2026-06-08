import { useMemo, useState } from "react";
import { Card } from "../components/ui.jsx";
import Logo from "../components/Logo.jsx";
import Donut from "../components/Donut.jsx";
import AllocationCard from "../components/AllocationCard.jsx";
import {
  usePlanner, monthlyIncomeOf, debtsOf, livingOf, expenseItemsOf,
} from "../state.jsx";
import { SECTIONS, sectionByKey } from "../data/sections.js";
import { fmt, monthsToStr, buildPlans, simulateDetailed } from "../lib/engine.js";
import Savings from "./Savings.jsx";
import Career from "./Career.jsx";
import Results from "./Results.jsx";
import Detail from "./Detail.jsx";
import Settings from "./Settings.jsx";
import Budget from "./Budget.jsx";
import Planner from "./Planner.jsx";
import Emergency from "./Emergency.jsx";

const LIVE = new Set(["debt", "savings", "career", "emergency"]);
const TONE = { green: "#3ad07f", orange: "#f5953a", red: "#f0556f" };

// Sidebar shell: Overview is the home panel; sections are in-place tabs.
export default function Dashboard({ onEdit, onLogout }) {
  const { state } = usePlanner();
  // Land on Settings if we're completing a bank link (redirect just returned).
  const [tab, setTab] = useState(() => { try { return localStorage.getItem("orcl_bank_code") ? "settings" : "overview"; } catch { return "overview"; } });
  const [detailPlan, setDetailPlan] = useState(null); // debt sub-view
  const go = (t) => { setTab(t); setDetailPlan(null); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const hasDebt = debtsOf(state).length > 0;
  const [nudgeOpen, setNudgeOpen] = useState(() => { try { return !localStorage.getItem("dfp_nudge_dismissed"); } catch { return true; } });
  const dismissNudge = () => { setNudgeOpen(false); try { localStorage.setItem("dfp_nudge_dismissed", "1"); } catch {} };

  // Tab order: Overview, then goal-personalised sections.
  const primary = state.goals?.primary || "";
  const interests = Object.keys(state.goals?.interests || {});
  const ordered = [];
  if (primary) ordered.push(primary);
  SECTIONS.forEach((s) => { if (interests.includes(s.key) && s.key !== primary) ordered.push(s.key); });
  SECTIONS.forEach((s) => { if (!ordered.includes(s.key)) ordered.push(s.key); });

  return (
    <div className="w-full">
      <header className="mb-4 flex items-center gap-3">
        <Logo size={38} />
        <div>
          <div className="text-[13px] text-muted">{hello()}, here's your money</div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight">Orcl. hub</h1>
        </div>
      </header>

      {tab === "overview" && nudgeOpen && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-[#1e3a30] bg-[#0c1a15] px-4 py-3 animate-fadeUp">
          <span className="text-xl">👋</span>
          <div className="flex-1 text-[13px] leading-snug">
            <b className="text-ink">Welcome to your hub.</b>{" "}
            <span className="text-muted">
              {hasDebt
                ? <>This is your home base. Start with <button onClick={() => go("debt")} className="font-semibold text-accent hover:underline">your debt plan</button>, then explore the tools below.</>
                : <>This is your home base — explore the tools below to grow your money.</>}
            </span>
          </div>
          <button onClick={dismissNudge} className="shrink-0 text-muted transition hover:text-ink" aria-label="Dismiss">✕</button>
        </div>
      )}

      <div className="flex flex-col gap-6 md:flex-row lg:gap-9">
        {/* Sidebar */}
        <aside className="md:w-[200px] md:shrink-0">
          <nav className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            <TabBtn label="Overview" emoji="🏠" active={tab === "overview"} onClick={() => go("overview")} />
            <TabBtn label="Budget" emoji="🧮" active={tab === "budget"} onClick={() => go("budget")} />
            <TabBtn label="Planner" emoji="🗓️" active={tab === "planner"} onClick={() => go("planner")} />
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
            <div className="mt-1 md:mt-3 md:border-t md:border-border md:pt-2">
              <TabBtn label="Settings" emoji="⚙️" active={tab === "settings"} onClick={() => go("settings")} />
            </div>
          </nav>
        </aside>

        {/* Main panel */}
        <main className="min-w-0 flex-1">
          {tab === "overview" && <Overview onOpenTab={go} onEdit={onEdit} />}
          {tab === "budget" && <Budget onEditDetails={onEdit} />}
          {tab === "planner" && <Planner />}
          {tab === "debt" && (detailPlan
            ? <Detail planKey={detailPlan} onBack={() => setDetailPlan(null)} />
            : <Results embedded onPickPlan={(k) => { setDetailPlan(k); window.scrollTo({ top: 0, behavior: "smooth" }); }} />)}
          {tab === "savings" && <Savings embedded />}
          {tab === "career" && <Career embedded />}
          {tab === "emergency" && <Emergency onOpenTab={go} />}
          {tab === "settings" && <Settings onEdit={onEdit} onLogout={onLogout} />}
          {!["overview", "budget", "planner", "debt", "savings", "career", "emergency", "settings"].includes(tab) && <ComingSoon section={sectionByKey(tab)} onBack={() => go("overview")} />}
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
const PLAN_EMOJI = { balanced: "🌱", accelerated: "🔥", avalanche: "⚡" };

function Overview({ onOpenTab, onEdit }) {
  const { state } = usePlanner();
  const income = monthlyIncomeOf(state);
  const debts = debtsOf(state);
  const living = livingOf(state);
  const expItems = expenseItemsOf(state);
  const minTotal = debts.reduce((s, d) => s + d.min, 0);
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const spare = Math.max(0, income - living - minTotal);
  const hasDebt = debts.length > 0;

  const { plans } = useMemo(() => buildPlans(debts, income, living), [debts, income, living]);
  const balanced = plans.find((p) => p.def.key === "balanced") || plans[0];
  // The plan they chose during onboarding (defaults to balanced).
  const chosen = plans.find((p) => p.def.key === state.selectedPlan) || balanced;

  // Monthly money split for the chosen plan (mirrors the Detail sliders, incl.
  // a locked custom split). Drives the right-hand "free to spend" + snapshot.
  const available = Math.max(0, income - living);
  const baseToDebt = Math.min(minTotal, available);
  const pool = Math.max(0, available - baseToDebt);
  const funCap = income * 0.3;
  let aExtra = 0, aFun = 0, aSav = 0;
  if (hasDebt) {
    if (state.allocLocked && state.alloc) {
      aExtra = state.alloc.extra || 0; aFun = state.alloc.fun || 0; aSav = state.alloc.savings || 0;
    } else {
      aExtra = Math.min(pool, pool * (chosen?.def.share ?? 0.25));
      const rest = Math.max(0, pool - aExtra);
      aFun = Math.min(rest / 2, funCap);
      aSav = Math.max(0, rest - aFun);
    }
  }
  const debtMonthly = hasDebt ? baseToDebt + aExtra : 0;   // total to debt / month
  const funLeft = hasDebt ? aFun : spare;                  // free to spend
  const overBudget = living + minTotal > income + 0.5;

  // Donut + budget list: every pound of income — essentials, debt (min + the
  // plan's extra), savings and free-to-spend per the chosen plan / slider.
  const breakdown = useMemo(() => {
    const items = [...expItems];
    if (minTotal > 0) items.push({ key: "debtmin", name: "Debt payments", color: "#ff4d6d", value: minTotal });
    if (aExtra > 0.5) items.push({ key: "debtextra", name: "Extra to debt", color: "#ff8fa3", value: aExtra });
    if (aSav > 0.5) items.push({ key: "savings", name: "Savings", color: "#3ad07f", value: aSav });
    if (funLeft > 0.5) items.push({ key: "fun", name: "Free to spend", color: "#f5953a", value: funLeft });
    return items.sort((a, b) => b.value - a.value);
  }, [expItems, minTotal, aExtra, aSav, funLeft]);
  const breakdownSum = breakdown.reduce((s, c) => s + c.value, 0);


  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      {/* Left: donut + grouped budget, plan banner, quick actions */}
      <Card className="lg:p-7">
        {breakdown.length ? (
          <div className="grid gap-5 sm:grid-cols-[minmax(0,250px)_1fr] sm:items-center">
            <div className="flex justify-center">
              <Donut items={breakdown} total={Math.max(income, breakdownSum)} idPrefix="ov" centerTop={fmt(income)} maxW={250} />
            </div>
            <div>
              <h2 className="mb-2.5 text-[16px] font-bold">Where your money goes</h2>
              <GroupedBudget breakdown={breakdown} income={income} />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
            Set up your budget to see where your money goes.
            <div className="mt-3"><button onClick={() => onOpenTab("budget")} className="font-semibold text-accent hover:underline">Go to Budget →</button></div>
          </div>
        )}

        {hasDebt && chosen && (
          <button
            onClick={() => onOpenTab("debt")}
            style={{ borderColor: chosen.def.color, boxShadow: `0 0 0 1px ${chosen.def.color}, 0 12px 30px -18px ${chosen.def.color}` }}
            className="mt-5 flex w-full items-center gap-3 rounded-2xl border bg-[#0c121d] px-4 py-2.5 text-left transition hover:brightness-110"
          >
            <span className="text-xl">{PLAN_EMOJI[chosen.def.key] || "🎯"}</span>
            <span className="flex-1">
              <span className="block text-[14px] font-bold">{chosen.def.title}</span>
              <span className="block text-[11px] text-muted">Your chosen payoff plan · tap to view</span>
            </span>
            <span className="text-right">
              <span className="block text-[9px] uppercase tracking-[.06em] text-muted">Debt-free in</span>
              <span className="block text-[15px] font-extrabold tabular-nums" style={{ color: chosen.def.color }}>{monthsToStr(chosen.sim.months)}</span>
            </span>
          </button>
        )}

        <div className="mt-5 border-t border-border pt-5">
          <h3 className="mb-2.5 text-[15px] font-bold">What do you want to do?</h3>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <ActionCard emoji="🔎" title="In-depth budget" onOpen={() => onOpenTab("budget")} />
            <ActionCard emoji="💳" title="Debt planning" onOpen={() => onOpenTab("debt")} />
            <ActionCard emoji="🛟" title="Emergency fund" onOpen={() => onOpenTab("emergency")} />
            <ActionCard emoji="🚀" title="Side hustles" soon />
          </div>
        </div>
      </Card>

      {/* Right column */}
      <div className="flex flex-col gap-4">
        <AllocationCard income={income} living={living} minTotal={minTotal} debtMonthly={debtMonthly} savings={aSav} fun={funLeft} freq={state.payFrequency || "monthly"} />
        <Snapshot6 income={income} living={living} debts={debts} extra={aExtra} monthlyToDebt={debtMonthly} totalDebt={totalDebt} />
      </div>
    </div>
  );
}

const SNAP_RANGES = [{ n: 3, label: "3m" }, { n: 6, label: "6m" }, { n: 12, label: "1y" }];

function Snapshot6({ income, living, debts, extra, monthlyToDebt, totalDebt }) {
  const [n, setN] = useState(6);
  const hasDebt = debts.length > 0;
  const sim = useMemo(() => (hasDebt ? simulateDetailed(debts, extra) : null), [debts, extra, hasDebt]);
  const essentials = living;

  const now = new Date();
  const debtFreeMonth = sim ? (isFinite(sim.months) ? sim.months : sim.schedule.length) : 0;
  const months = Array.from({ length: n }, (_, i) => {
    const label = new Date(now.getFullYear(), now.getMonth() + i, 1).toLocaleString("en-GB", { month: "short" });
    const hasSched = sim && i < sim.schedule.length;
    const inDebt = sim && i < debtFreeMonth;
    const debtPaid = inDebt && hasSched ? sim.schedule[i].pay.reduce((s, p) => s + p, 0) : 0;
    const bal = hasSched ? sim.schedule[i].bal.reduce((s, b) => s + b, 0) : 0;
    // Anything not spent on essentials/debt goes to savings & spare.
    const saved = Math.max(0, income - essentials - debtPaid);
    return { label, essentials, debtPaid, saved, bal };
  });

  // Debt-balance trajectory for the overlay line (falls from today's debt to 0).
  const maxBal = Math.max(totalDebt, 1);
  const linePts = [`0,${(1 - Math.min(1, totalDebt / maxBal)) * 100}`,
    ...months.map((m, i) => `${i + 0.5},${(1 - Math.min(1, m.bal / maxBal)) * 100}`)].join(" ");

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
      <div className="relative h-[150px]">
        <div className={`flex h-full items-stretch ${thin ? "gap-1" : "gap-2"}`}>
          {months.map((m, i) => {
            const h = (v) => `${(v / maxStack) * 100}%`;
            return (
              <div key={i} className="flex h-full flex-1 flex-col justify-end overflow-hidden rounded-md bg-[#0a0f17]">
                {m.saved > 0 && <div style={{ height: h(m.saved), background: "#3ad07f" }} title={`Savings/spare ${fmt(m.saved)}`} />}
                {m.debtPaid > 0 && <div style={{ height: h(m.debtPaid), background: "#f0556f" }} title={`Debt ${fmt(m.debtPaid)}`} />}
                <div style={{ height: h(m.essentials), background: "#4cb8f0", minHeight: m.essentials > 0 ? 2 : 0 }} title={`Essentials ${fmt(m.essentials)}`} />
              </div>
            );
          })}
        </div>
        {hasDebt && totalDebt > 0 && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${n} 100`} preserveAspectRatio="none">
            <polyline points={linePts} fill="none" stroke="#eef2ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
        )}
      </div>
      <div className={`mt-2 flex ${thin ? "gap-1" : "gap-2"}`}>
        {months.map((m, i) => (
          <span key={i} className="flex-1 text-center text-[10px] text-muted">{(!thin || i % 2 === 0) ? m.label : ""}</span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <Legend c="#4cb8f0" t="Essentials" />
        {hasDebt && <Legend c="#f0556f" t="Debt paid" />}
        <Legend c="#3ad07f" t="Savings / spare" />
        {hasDebt && totalDebt > 0 && <span className="inline-flex items-center gap-1.5"><span className="h-[2px] w-3.5 rounded bg-[#eef2ff]" />Debt left</span>}
      </div>
    </Card>
  );
}

function Legend({ c, t }) {
  return <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />{t}</span>;
}

function GroupedBudget({ breakdown, income }) {
  const PAY = new Set(["debtmin", "debtextra"]);
  const SAVE = new Set(["savings", "fun"]);
  const sum = (a) => a.reduce((s, c) => s + c.value, 0);
  const groups = [
    { label: "Essentials", items: breakdown.filter((i) => !PAY.has(i.key) && !SAVE.has(i.key)) },
    { label: "Debt payments", items: breakdown.filter((i) => PAY.has(i.key)) },
    { label: "Savings & spare", items: breakdown.filter((i) => SAVE.has(i.key)) },
  ].filter((g) => g.items.length);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-1.5 text-[13px]">
        <span className="font-semibold text-muted">Income</span>
        <b className="tabular-nums">{fmt(income)}</b>
      </div>
      {groups.map((g) => (
        <div key={g.label}>
          <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-[.06em] text-muted">
            <span>{g.label}</span>
            <span className="tabular-nums text-ink/70">{fmt(sum(g.items))}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-0.5">
            {g.items.map((c) => (
              <span key={c.key} className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="flex min-w-0 items-center gap-1.5 text-muted">
                  <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: c.color }} />
                  <span className="truncate">{c.name}</span>
                </span>
                <b className="shrink-0 tabular-nums">{fmt(c.value)}</b>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionCard({ emoji, title, onOpen, soon }) {
  return (
    <button
      onClick={soon ? undefined : onOpen}
      className={`flex items-center gap-2.5 rounded-xl border border-border bg-[#0a120f]/80 p-2.5 text-left transition ${soon ? "cursor-default opacity-90" : "hover:border-[#244a3c] hover:shadow-[0_10px_28px_-16px_rgba(47,230,166,.6)]"}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0f241c] text-lg">{emoji}</span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold leading-tight">{title}</span>
        {soon
          ? <span className="text-[9px] font-bold uppercase tracking-[.06em] text-muted">Coming soon</span>
          : <span className="text-[11px] font-semibold text-accent">Open →</span>}
      </span>
    </button>
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
