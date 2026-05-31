import { useMemo } from "react";
import { Card } from "../components/ui.jsx";
import {
  usePlanner, monthlyIncomeOf, debtsOf, livingOf, savingsToDeployOf,
} from "../state.jsx";
import { fmt, monthsToStr, buildPlans, projectRetirement } from "../lib/engine.js";

// The hub. Stat header + section cards (debt live, others "coming soon").
export default function Dashboard({ onOpenDebt, onEdit, onOpenSavings, onOpenCareer }) {
  const { state } = usePlanner();
  const income = monthlyIncomeOf(state);
  const debts = debtsOf(state);
  const living = livingOf(state);
  const lump = savingsToDeployOf(state);

  const { plans } = useMemo(
    () => buildPlans(debts, income, living, lump),
    [debts, income, living, lump]
  );
  // Headline figures off the Balanced plan (the sensible default).
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

  const greeting = `${hello()},`;

  // Debt & budget card border: by chosen plan, or green if fully debt-free.
  const completelyDebtFree = debts.length === 0 && !state.mortgage.on;
  const planTone = { balanced: "green", accelerated: "orange", avalanche: "red" }[state.selectedPlan] || null;
  const debtBorder = planTone || (completelyDebtFree ? "green" : null);

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm text-muted">{greeting} here's your money at a glance</div>
          <h1 className="mt-0.5 text-[26px] font-extrabold tracking-tight">Dashboard</h1>
        </div>
        <button onClick={onEdit} className="rounded-xl border border-[#1e2b27] bg-[#101a18] px-3.5 py-2 text-[13px] font-semibold text-ink transition hover:brightness-125">
          Edit my details
        </button>
      </header>

      {/* Stat header */}
      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Monthly income" value={fmt(income)} />
        <Stat label="Total debt" value={fmt(totalDebt)} tone={totalDebt > 0 ? "bad" : "good"} />
        <Stat label="Debt-free in" value={debtFree} tone="accent" />
        <Stat label="Spare / month" value={fmt(spare)} tone="good" />
        <Stat label="Pot at 60" value={retire ? fmt(retire.balanceAtRetirement) : "—"} tone="accent" />
      </div>

      {/* Section cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionCard
          live emoji="💳" title="Debt & budget"
          desc={debts.length
            ? `${debts.length} debt${debts.length > 1 ? "s" : ""} · clear them in ${debtFree}. See your tailored payoff plan.`
            : "You're debt-free — see your budget breakdown and savings focus."}
          cta={state.selectedPlan ? "View my plan" : "Open my plan"} onClick={onOpenDebt}
          borderTone={debtBorder}
        />
        <SectionCard
          live emoji="💷" title="Best UK savings"
          desc="Top high-yield savings accounts and how your spare cash could grow. Forecasted with real UK rates."
          cta="Explore savings" onClick={onOpenSavings}
        />
        <SectionCard
          live emoji="🚀" title="Career & income"
          desc="Promotions in your field, plus side-hustle and second-job ideas to boost your income — and compare other roles' pay."
          cta="Explore careers" onClick={onOpenCareer}
        />
        <SectionCard
          emoji="🗓️" title="Weekly planner"
          desc="A visual timetable of your week that finds the free hours for side hustles and goals."
        />
        <SectionCard
          emoji="📈" title="Investments"
          desc="Simple, lower-risk options (index funds, gold, bonds) with plain-English projections."
        />
        <SectionCard
          emoji="🎓" title="Further education"
          desc="Courses and qualifications that boost your earning power — with the time and cost mapped against the payoff."
        />
        <SectionCard
          emoji="👴" title="Pensions"
          desc="Understand your workplace and private pensions, and see how small top-ups grow into a bigger retirement."
        />
        <SectionCard
          emoji="✨" title="More coming"
          desc="Orcl. is pre-alpha and growing fast. New systems to fast-track your success are on the way."
        />
      </div>

      <p className="mt-8 text-center text-[11px] text-muted">
        Orcl. is a pre-alpha preview. Information here is general guidance, not financial advice.
      </p>
    </div>
  );
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

function SectionCard({ live, emoji, title, desc, cta, onClick, borderTone }) {
  const toneColor = { green: "#3ad07f", orange: "#f5953a", red: "#f0556f" }[borderTone];
  return (
    <Card
      style={toneColor ? { borderColor: toneColor, boxShadow: `0 0 0 1px ${toneColor}, 0 14px 36px -20px ${toneColor}` } : undefined}
      className={`relative flex flex-col ${live ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-[0_12px_34px_-16px_rgba(47,230,166,.6)]" : ""}`}
    >
      {!live && (
        <span className="absolute right-4 top-4 rounded-full border border-[#2a3b34] bg-[#0c1a15] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] text-muted">
          Coming soon
        </span>
      )}
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f241c] text-2xl">{emoji}</div>
      <h3 className="text-[18px] font-bold">{title}</h3>
      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted">{desc}</p>
      {live && (
        <button onClick={onClick} className="mt-4 inline-flex w-fit items-center gap-2 rounded-xl bg-gradient-to-b from-[#2fe6a6] to-[#12b886] px-4 py-2.5 text-[14px] font-semibold text-[#04140d] transition hover:brightness-110">
          {cta}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      )}
    </Card>
  );
}
