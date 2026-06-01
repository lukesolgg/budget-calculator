import { useMemo } from "react";
import { Card } from "../components/ui.jsx";
import Donut from "../components/Donut.jsx";
import {
  usePlanner, monthlyIncomeOf, debtsOf, livingOf, savingsToDeployOf, expenseItemsOf,
} from "../state.jsx";
import { SECTIONS, sectionByKey } from "../data/sections.js";
import { fmt, monthsToStr, buildPlans, projectRetirement, projectSavings } from "../lib/engine.js";

const TONE = { green: "#3ad07f", orange: "#f5953a", red: "#f0556f" };

// The hub. Stat tiles → money breakdown → recommendations → personalised tabs.
export default function Dashboard({ onOpenDebt, onEdit, onOpenSavings, onOpenCareer }) {
  const { state } = usePlanner();
  const income = monthlyIncomeOf(state);
  const debts = debtsOf(state);
  const living = livingOf(state);
  const lump = savingsToDeployOf(state);
  const expItems = expenseItemsOf(state);
  const totalExpenses = expItems.reduce((s, c) => s + c.value, 0);

  const { plans } = useMemo(
    () => buildPlans(debts, income, living, lump),
    [debts, income, living, lump]
  );
  const balanced = plans.find((p) => p.def.key === "balanced") || plans[0];
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const avail = Math.max(0, income - living);
  const minTotal = debts.reduce((s, d) => s + d.min, 0);
  const spare = Math.max(0, avail - minTotal);
  const debtFree = debts.length ? (balanced ? monthsToStr(balanced.sim.months) : "—") : "Debt-free 🎉";

  const age = parseInt(state.age, 10);
  const retire = useMemo(
    () => projectRetirement({
      age, retireAge: 60, annualRate: 0.045,
      monthlyWhileDebt: spare, monthlyAfterDebt: income * 0.2,
      debtMonths: balanced && isFinite(balanced.sim.months) ? balanced.sim.months : 0,
      startingPot: 0,
    }),
    [age, spare, income, balanced]
  );

  // Navigation by section key (live sections only).
  const handlers = { debt: onOpenDebt, savings: onOpenSavings, career: onOpenCareer };
  const openFor = (key) => handlers[key];

  // Debt card border: by chosen plan, or green if fully debt-free.
  const completelyDebtFree = debts.length === 0 && !state.mortgage.on;
  const planTone = { balanced: "green", accelerated: "orange", avalanche: "red" }[state.selectedPlan] || null;
  const debtBorder = planTone || (completelyDebtFree ? "green" : null);

  // Personalised ordering from the goals step.
  const primaryKey = state.goals?.primary || "";
  const interestKeys = Object.keys(state.goals?.interests || {});
  const featured = primaryKey ? sectionByKey(primaryKey) : null;
  const mix = featured ? SECTIONS.filter((s) => s.key !== primaryKey && interestKeys.includes(s.key)) : [];
  const rest = featured
    ? SECTIONS.filter((s) => s.key !== primaryKey && !interestKeys.includes(s.key))
    : SECTIONS;

  const recs = buildRecommendations({ debts, income, living, spare, minTotal, totalDebt, mortgageOn: state.mortgage.on });

  const greeting = hello();

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-muted">{greeting}, here's your money at a glance</div>
          <h1 className="mt-0.5 text-[26px] font-extrabold tracking-tight">Dashboard</h1>
        </div>
        <button onClick={onEdit} className="rounded-xl border border-[#1e2b27] bg-[#101a18] px-3.5 py-2 text-[13px] font-semibold text-ink transition hover:brightness-125">
          Edit my details
        </button>
      </header>

      {/* Stat tiles */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Monthly income" value={fmt(income)} />
        <Stat label="Total debt" value={fmt(totalDebt)} tone={totalDebt > 0 ? "bad" : "good"} />
        <Stat label="Debt-free in" value={debtFree} tone="accent" />
        <Stat label="Spare / month" value={fmt(spare)} tone="good" />
        <Stat label="Pot at 60" value={retire ? fmt(retire.balanceAtRetirement) : "—"} tone="accent" />
      </div>

      {/* In-depth breakdown */}
      <Card className="mb-6">
        <h2 className="mb-1 text-[18px] font-bold">Your money breakdown</h2>
        <p className="mb-4 text-sm text-muted">Where your {fmt(income)} a month goes.</p>
        {expItems.length || income > 0 ? (
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[300px_1fr]">
            <div className="flex justify-center">
              {expItems.length
                ? <Donut items={expItems} total={Math.max(income, totalExpenses)} idPrefix="dash" centerTop={fmt(income)} />
                : <div className="flex h-[220px] w-[220px] items-center justify-center rounded-full border border-dashed border-border text-center text-[13px] text-muted">Add your budget to see the split</div>}
            </div>
            <div>
              <BreakRow k="Income" v={fmt(income)} />
              <BreakRow k="Living costs & bills" v={fmt(living)} tone="bad" />
              {minTotal > 0 && <BreakRow k="Minimum debt payments" v={fmt(minTotal)} tone="bad" />}
              <BreakRow k="Spare each month" v={fmt(spare)} tone="good" last />
              {expItems.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-border pt-3">
                  {expItems.map((c) => (
                    <span key={c.key} className="inline-flex items-center gap-2 text-[12px] text-muted">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c.color }} />
                      {c.name} <b className="text-ink">{fmt(c.value)}</b>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Add your income and budget to unlock your breakdown. <button onClick={onEdit} className="font-semibold text-accent hover:underline">Edit my details →</button></p>
        )}
      </Card>

      {/* Recommendations */}
      {recs.length > 0 && (
        <div className="mb-7">
          <h2 className="mb-1 text-[18px] font-bold">Recommended for you</h2>
          <p className="mb-3 text-sm text-muted">Personalised next steps based on your numbers.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {recs.map((r) => (
              <RecCard key={r.id} r={r} onOpen={openFor(r.sectionKey)} />
            ))}
          </div>
        </div>
      )}

      {/* Personalised sections */}
      {featured && (
        <div className="mb-4">
          <h2 className="mb-3 text-[18px] font-bold">Your focus</h2>
          <SectionCard section={featured} onOpen={openFor(featured.key)} featured borderTone={featured.key === "debt" ? debtBorder : null} debtCtx={{ debts, debtFree, selectedPlan: state.selectedPlan }} />
        </div>
      )}

      {mix.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {mix.map((sec) => (
            <SectionCard key={sec.key} section={sec} onOpen={openFor(sec.key)} borderTone={sec.key === "debt" ? debtBorder : null} debtCtx={{ debts, debtFree, selectedPlan: state.selectedPlan }} />
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-2 text-[18px] font-bold">{featured ? "Explore more" : "Your tabs"}</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rest.map((sec) => (
          <SectionCard key={sec.key} section={sec} onOpen={openFor(sec.key)} borderTone={sec.key === "debt" ? debtBorder : null} debtCtx={{ debts, debtFree, selectedPlan: state.selectedPlan }} />
        ))}
      </div>

      <p className="mt-8 text-center text-[11px] text-muted">
        Orcl. is a pre-alpha preview. Information here is general guidance, not financial advice.
      </p>
    </div>
  );
}

// --- recommendations engine (rule-based, prioritised, top 3 shown) ---
function buildRecommendations({ debts, income, living, spare, mortgageOn }) {
  const out = [];
  const debtFreeUser = debts.length === 0;
  const accruing = debts.filter((d) => d.freeMonths === 0 && d.rate > 0);
  const top = accruing.sort((a, b) => b.rate - a.rate)[0];

  if (top) out.push({
    id: "debt", emoji: "🔥", sectionKey: "debt",
    title: `Tackle ${top.name} first`,
    text: `At ${top.rate}% APR it's your priciest debt — clearing this one first saves the most in interest.`,
  });

  if (debtFreeUser && income > 0) out.push({
    id: "invest", emoji: "📈", sectionKey: "savings",
    title: "You're debt-free — grow it",
    text: "No debt to clear, so redirect your spare cash into high-yield savings and simple investments.",
  });

  if (spare > 0 && !debtFreeUser) {
    const yr = projectSavings({ monthly: spare, annualRate: 0.045, years: 1 }).balance;
    out.push({
      id: "spare", emoji: "💷", sectionKey: "savings",
      title: `Put your ${fmt(spare)}/mo to work`,
      text: `You've about ${fmt(spare)} spare each month — in a top UK account that's roughly ${fmt(yr)} after a year.`,
    });
  }

  if (living > 0) out.push({
    id: "emergency", emoji: "🛟", sectionKey: "emergency",
    title: "Build an emergency fund",
    text: `Aim for ${fmt(living * 3)}–${fmt(living * 6)} (3–6 months of essentials) so a surprise bill never derails your plan.`,
  });

  if (!mortgageOn) out.push({
    id: "mortgage", emoji: "🏠", sectionKey: "mortgage",
    title: "Thinking about buying?",
    text: "You don't have a mortgage yet — our upcoming mortgage calculator will map out deposits and repayments.",
  });

  if (income > 0) out.push({
    id: "pension", emoji: "👴", sectionKey: "pensions",
    title: "Don't forget your pension",
    text: "Small top-ups now compound massively by retirement. Our pension tools are on the way.",
  });

  return out.slice(0, 3);
}

function hello() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Stat({ label, value, tone }) {
  const c = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : tone === "accent" ? "text-accent" : "text-ink";
  return (
    <div className="rounded-2xl border border-[#16241f] bg-[#0a120f]/80 p-4">
      <div className={`text-[22px] font-extrabold leading-tight ${c}`}>{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[.06em] text-muted">{label}</div>
    </div>
  );
}

function BreakRow({ k, v, tone, last }) {
  const c = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className={`flex items-center justify-between py-2 ${last ? "" : "border-b border-border"}`}>
      <span className="text-sm text-muted">{k}</span>
      <span className={`text-[17px] font-bold tabular-nums ${c}`}>{v}</span>
    </div>
  );
}

function RecCard({ r, onOpen }) {
  const live = !!onOpen;
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-[#0a120f]/80 p-4">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f241c] text-xl">{r.emoji}</div>
      <h3 className="text-[15px] font-bold leading-snug">{r.title}</h3>
      <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{r.text}</p>
      {live ? (
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

function SectionCard({ section, onOpen, featured, borderTone, debtCtx }) {
  const live = !!onOpen;
  const toneColor = TONE[borderTone];

  // Section-specific copy where it helps.
  let desc = section.desc, cta = "Open";
  if (section.key === "debt") {
    desc = debtCtx.debts.length
      ? `${debtCtx.debts.length} debt${debtCtx.debts.length > 1 ? "s" : ""} · clear them in ${debtCtx.debtFree}. See your tailored payoff plan.`
      : "You're debt-free — see your budget breakdown and savings focus.";
    cta = debtCtx.selectedPlan ? "View my plan" : "Open my plan";
  } else if (section.key === "savings") cta = "Explore savings";
  else if (section.key === "career") cta = "Explore careers";

  return (
    <Card
      style={toneColor ? { borderColor: toneColor, boxShadow: `0 0 0 1px ${toneColor}, 0 14px 36px -20px ${toneColor}` } : undefined}
      className={`relative flex ${featured ? "flex-col sm:flex-row sm:items-center sm:gap-6" : "flex-col"} ${live ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-[0_12px_34px_-16px_rgba(47,230,166,.6)]" : ""}`}
    >
      {!live && (
        <span className="absolute right-4 top-4 rounded-full border border-[#2a3b34] bg-[#0c1a15] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-muted">
          Coming soon
        </span>
      )}
      <div className={`mb-3 flex items-center justify-center rounded-xl bg-[#0f241c] ${featured ? "h-16 w-16 text-3xl sm:mb-0" : "h-12 w-12 text-2xl"}`}>{section.emoji}</div>
      <div className={featured ? "flex-1" : "flex flex-1 flex-col"}>
        {featured && <span className="text-[11px] font-bold uppercase tracking-[.08em] text-accent">Your main focus</span>}
        <h3 className={`${featured ? "text-[21px]" : "text-[18px]"} font-bold`}>{section.title}</h3>
        <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted">{desc}</p>
        {live && (
          <button onClick={onOpen} className={`mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-b from-[#2fe6a6] to-[#12b886] px-4 py-2.5 text-[14px] font-semibold text-[#04140d] transition hover:brightness-110`}>
            {cta}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </button>
        )}
      </div>
    </Card>
  );
}
