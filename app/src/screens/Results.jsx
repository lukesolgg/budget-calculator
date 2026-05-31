import { Card, Chevron } from "../components/ui.jsx";
import Donut from "../components/Donut.jsx";
import {
  usePlanner, monthlyIncomeOf, debtsOf, livingOf, savingsToDeployOf, expenseItemsOf,
} from "../state.jsx";
import { fmt, monthsToStr, buildPlans, projectInterestFreeShortfall } from "../lib/engine.js";

const COLOR_BY = { green: "#3ad07f", orange: "#f5953a", red: "#f0556f" };

export default function Results({ onBack, onPickPlan }) {
  const { state, update } = usePlanner();
  const income = monthlyIncomeOf(state);
  const debts = debtsOf(state);
  const living = livingOf(state);
  const lump = savingsToDeployOf(state);
  const noDebt = debts.length === 0;

  const expItems = expenseItemsOf(state);
  const totalExpenses = expItems.reduce((s, c) => s + c.value, 0);
  const leftover = income - totalExpenses;

  const { plans, available, minTotal, surplus } = buildPlans(debts, income, living, lump);

  const pick = (k) => { update({ selectedPlan: k }); onPickPlan(k); };

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-[18px] flex items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-[#1e2b27] bg-[#101a18] px-[18px] py-2.5 text-sm font-semibold text-ink transition hover:brightness-125">
          <Chevron dir="left" /> Back to dashboard
        </button>
      </div>

      {/* Top: donut (left) + stats (right) */}
      <div className="mb-7 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col items-center justify-center">
          <Donut items={expItems} total={Math.max(income, totalExpenses)} idPrefix="budget" centerTop={fmt(income)} />
        </Card>

        <Card className="flex flex-col">
          <h3 className="mb-3 font-bold">Your money at a glance</h3>
          <StatRow k="Income" v={fmt(income)} />
          <StatRow k="Expenses" v={fmt(totalExpenses)} />
          <StatRow k="Leftover" v={fmt(leftover)} tone={leftover >= 0 ? "good" : "bad"} last />

          {!noDebt && (
            <>
              <div className="mt-4 mb-2 text-[12px] font-semibold uppercase tracking-[.06em] text-muted">Debt-free in</div>
              {plans.map((x) => (
                <div key={x.def.key} className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
                  <span className="flex items-center gap-2.5 text-sm">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: COLOR_BY[x.def.cls] }} />
                    {x.def.title}
                  </span>
                  <span className="font-bold tabular-nums" style={{ color: COLOR_BY[x.def.cls] }}>{monthsToStr(x.sim.months)}</span>
                </div>
              ))}
            </>
          )}
        </Card>
      </div>

      {noDebt ? (
        <DebtFree income={income} living={living} available={available} />
      ) : (
        <>
          <div className="mb-5 text-center">
            <h2 className="text-[26px] font-bold tracking-tight">Choose Your Debt Freedom Strategy</h2>
            <p className="text-muted">Three ways to clear your debt — pick the pace that fits your life.</p>
          </div>

          {available < minTotal && (
            <Note>⚠️ Your minimum payments ({fmt(minTotal)}) are higher than the money left after your other expenses ({fmt(available)}). Trim some expenses, or these timelines assume you can still cover the minimums.</Note>
          )}
          {available >= minTotal && surplus <= 0 && (
            <Note>💡 After expenses and minimum payments there's no spare cash to accelerate with, so all three plans pay just the minimums.</Note>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {plans.map((x) => (
              <PlanCard key={x.def.key} x={x} selected={state.selectedPlan === x.def.key} onPick={() => pick(x.def.key)} />
            ))}
          </div>

          {/* Interest-free panel now sits BELOW the plan cards */}
          <InterestFreePanel debts={debts} available={available} />
        </>
      )}
    </div>
  );
}

function StatRow({ k, v, tone, last }) {
  const c = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className={`flex items-center justify-between py-2.5 ${last ? "" : "border-b border-border"}`}>
      <span className="text-sm text-muted">{k}</span>
      <span className={`text-lg font-bold tabular-nums ${c}`}>{v}</span>
    </div>
  );
}

function Note({ children }) {
  return <div className="mb-[18px] rounded-[10px] border border-[#5a3d12] bg-[#1c1407] px-3.5 py-3 text-[13px] leading-relaxed text-warn">{children}</div>;
}

function PlanCard({ x, selected, onPick }) {
  const p = x.def;
  const ring = { green: "before:bg-good", orange: "before:bg-[#f5953a]", red: "before:bg-[#f0556f]" }[p.cls];
  const acc = COLOR_BY[p.cls];
  let after;
  if (p.key === "balanced") after = <><b className="text-ink">After debt-free:</b> a full 50/30/20 split — <b className="text-ink">{fmt(x.wants)}</b> fun money and <b className="text-ink">{fmt(x.savings)}</b> into savings & investments every month.</>;
  else if (p.key === "accelerated") after = <><b className="text-ink">After debt-free:</b> switch to 50/30/20 with the freed <b className="text-ink">{fmt(x.monthly)}</b>/mo supercharging your savings.</>;
  else after = <><b className="text-ink">After debt-free:</b> your entire income is yours again — a clean 50/30/20 lifestyle with <b className="text-ink">{fmt(x.savings)}</b>/mo invested.</>;

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-[18px] border bg-gradient-to-b from-panel to-panel2 p-[22px] transition before:absolute before:left-0 before:right-0 before:top-0 before:h-[5px] ${ring} ${selected ? "border-transparent" : "border-border"}`}
      style={selected ? { boxShadow: `0 0 0 2px ${acc}, 0 14px 36px -18px ${acc}` } : undefined}
    >
      {selected && (
        <span className="absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-[#04140d]" style={{ background: acc }}>✓ Selected</span>
      )}
      <span className="mb-2 text-[11px] font-bold uppercase tracking-[.06em]" style={{ color: acc }}>{p.badge}</span>
      <h3 className="mb-1.5 text-[19px] font-bold">{p.title}</h3>
      <div className="min-h-[72px] text-[13px] leading-relaxed text-muted">{p.desc}</div>
      <div className="my-3.5 rounded-xl bg-[#0c121d] p-3.5 text-center">
        <div className="text-[12px] uppercase tracking-[.06em] text-muted">Debt-free in</div>
        <div className="mt-1 text-[24px] font-extrabold" style={{ color: acc }}>{monthsToStr(x.sim.months)}</div>
      </div>
      <div className="mb-3.5 flex flex-col gap-2.5 text-sm">
        <Row k="Total monthly to debt" v={fmt(x.monthly)} />
        <Row k="Extra on top of minimums" v={fmt(x.extra)} />
        <Row k="Total interest paid" v={isFinite(x.sim.months) ? fmt(x.sim.totalInterest) : "—"} />
      </div>
      <div className="mb-3.5 border-t border-dashed border-border pt-3 text-[12px] leading-relaxed text-muted">{after}</div>
      <div className="mt-auto">
        <button onClick={onPick} className="w-full rounded-xl py-[11px] font-semibold text-[#04140d] transition hover:brightness-110" style={{ background: acc }}>
          {selected ? "View this plan" : "Select This Plan"}
        </button>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return <div className="flex justify-between"><span className="text-muted">{k}</span><span className="font-semibold">{v}</span></div>;
}

function DebtFree({ income, living, available }) {
  return (
    <Card className="text-center">
      <div className="mb-1.5 text-[42px]">🎉</div>
      <h2 className="mb-2 text-[24px] font-bold">You're debt-free — brilliant!</h2>
      <p className="mx-auto mb-[18px] max-w-[560px] leading-relaxed text-muted">
        No debts to clear, so let's focus on your money. Above is where it goes each month — and here's what you've got spare to build savings and wealth.
      </p>
      <div className="flex flex-wrap justify-center gap-7">
        <div className="text-center"><div className="text-[22px] font-bold">{fmt(income)}</div><div className="mt-1 text-[12px] uppercase tracking-[.07em] text-muted">Monthly income</div></div>
        <div className="text-center"><div className="text-[22px] font-bold">{fmt(living)}</div><div className="mt-1 text-[12px] uppercase tracking-[.07em] text-muted">Living costs</div></div>
        <div className="text-center"><div className="text-[22px] font-bold text-good">{fmt(available)}</div><div className="mt-1 text-[12px] uppercase tracking-[.07em] text-muted">Spare to save / invest</div></div>
      </div>
    </Card>
  );
}

function InterestFreePanel({ debts, available }) {
  const free = debts.filter((d) => d.freeMonths > 0);
  if (!free.length) return null;
  return (
    <Card className="mx-auto mt-7 max-w-[940px]">
      <h3 className="mb-1 text-lg font-bold">⏳ Beat the interest deadline</h3>
      <p className="mb-[18px] text-[13px] text-muted">How to clear your 0% debts before the interest kicks in — or pay the least interest if money's tight.</p>
      {free.map((d, i) => {
        const otherMins = debts.reduce((s, x) => s + (x === d ? 0 : x.min), 0);
        const maxAfford = Math.max(0, available - otherMins);
        const needed = d.balance / d.freeMonths;
        const onTrack = maxAfford + 1e-6 >= needed;
        return (
          <div key={i} className="mb-3.5 rounded-xl border border-border bg-[#0c121d] p-4 last:mb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="text-base font-bold">{d.name}</span>
              <span className={`rounded-full border px-2.5 py-0.5 text-[12px] font-bold ${onTrack ? "border-[#1f5c3a] bg-[#11301f] text-good" : "border-[#5a3d12] bg-[#1c1407] text-warn"}`}>
                {onTrack ? "✓ Beatable" : "⚠ Tight — minimise interest"}
              </span>
            </div>
            <div className="mt-1 text-[13px] text-muted">{fmt(d.balance)} at 0% for {d.freeMonths} more month{d.freeMonths === 1 ? "" : "s"}, then {d.rate}%</div>
            {onTrack ? (
              <p className="mt-3 border-t border-dashed border-border pt-3 text-[13px] leading-relaxed text-muted">
                Put <b className="text-ink">{fmt(needed)}/mo</b> on {d.name} for the next <b className="text-ink">{d.freeMonths} months</b> and it's gone the month before any interest is charged — <b className="text-ink">£0 interest</b>.
              </p>
            ) : (() => {
              const proj = projectInterestFreeShortfall(d, maxAfford);
              return (
                <p className="mt-3 border-t border-dashed border-border pt-3 text-[13px] leading-relaxed text-muted">
                  You can't fully clear {d.name} before the 0% ends. Best move: pay the <b className="text-ink">most you can ({fmt(maxAfford)}/mo)</b> during the 0% window — that leaves <b className="text-ink">{fmt(proj.leftover)}</b> when interest starts, costing about <b className="text-ink">{fmt(proj.interest)}</b> (vs {fmt(proj.interestIfMinOnly)} if you only paid the minimum). Freeing up an extra <b className="text-ink">{fmt(needed - maxAfford)}/mo</b> would wipe out the interest.
                </p>
              );
            })()}
          </div>
        );
      })}
    </Card>
  );
}
