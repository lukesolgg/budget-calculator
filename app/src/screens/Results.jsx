import { Button, Card, Chevron } from "../components/ui.jsx";
import Donut from "../components/Donut.jsx";
import {
  usePlanner, monthlyIncomeOf, debtsOf, livingOf, savingsToDeployOf, expenseItemsOf,
} from "../state.jsx";
import {
  fmt, monthsToStr, buildPlans, projectInterestFreeShortfall,
} from "../lib/engine.js";

export default function Results({ onBack, onPickPlan }) {
  const { state } = usePlanner();
  const income = monthlyIncomeOf(state);
  const debts = debtsOf(state);
  const living = livingOf(state);
  const lump = savingsToDeployOf(state);
  const noDebt = debts.length === 0;

  const expItems = expenseItemsOf(state);
  const totalExpenses = expItems.reduce((s, c) => s + c.value, 0);
  const leftover = income - totalExpenses;

  const { plans, available, minTotal, surplus, bestTime } = buildPlans(debts, income, living, lump);
  const colorBy = { green: "#3ad07f", orange: "#f5953a", red: "#f0556f" };

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-[18px] flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}><Chevron dir="left" /> Back to inputs</Button>
        <div className="flex-1" />
      </div>

      {/* Budget chart */}
      <Card className="mb-7 flex flex-col items-center">
        <Donut items={expItems} total={Math.max(income, totalExpenses)} idPrefix="budget" centerTop={fmt(income)} />
        <div className="mt-6 flex flex-wrap justify-center gap-7">
          <Stat v={fmt(income)} k="Income" />
          <Stat v={fmt(totalExpenses)} k="Expenses" />
          <Stat v={fmt(leftover)} k="Leftover" tone={leftover >= 0 ? "good" : "bad"} />
        </div>
      </Card>

      {noDebt ? (
        <DebtFree income={income} living={living} available={available} />
      ) : (
        <>
          <div className="mb-5 text-center">
            <h2 className="text-[26px] font-bold tracking-tight">Choose Your Debt Freedom Strategy</h2>
            <p className="text-muted">Three ways to clear your debt — pick the pace that fits your life.</p>
          </div>

          <InterestFreePanel debts={debts} available={available} />

          {available < minTotal && (
            <Note>⚠️ Your minimum payments ({fmt(minTotal)}) are higher than the money left after your other expenses ({fmt(available)}). Trim some expenses, or these timelines assume you can still cover the minimums.</Note>
          )}
          {available >= minTotal && surplus <= 0 && (
            <Note>💡 After expenses and minimum payments there's no spare cash to accelerate with, so all three plans pay just the minimums.</Note>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {plans.map((x) => (
              <PlanCard key={x.def.key} x={x} onPick={() => onPickPlan(x.def.key)} />
            ))}
          </div>

          {/* Compare table */}
          <Card className="mx-auto mt-8 max-w-[860px]">
            <h3 className="mb-3.5 text-lg font-bold">Compare all plans</h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-[12px] uppercase tracking-[.05em] text-muted">
                  <th className="border-b border-border px-3.5 py-3 text-left">Strategy</th>
                  <th className="border-b border-border px-3.5 py-3 text-right">Monthly to debt</th>
                  <th className="border-b border-border px-3.5 py-3 text-right">Debt-free in</th>
                  <th className="border-b border-border px-3.5 py-3 text-right">Total interest</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((x) => {
                  const best = bestTime !== null && x.sim.months === bestTime;
                  return (
                    <tr key={x.def.key} className={best ? "text-good" : ""}>
                      <td className="border-b border-border px-3.5 py-3">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-[3px] align-middle" style={{ background: colorBy[x.def.cls] }} />
                        {x.def.title}
                      </td>
                      <td className="border-b border-border px-3.5 py-3 text-right tabular-nums">{fmt(x.monthly)}</td>
                      <td className="border-b border-border px-3.5 py-3 text-right tabular-nums">{monthsToStr(x.sim.months)}</td>
                      <td className="border-b border-border px-3.5 py-3 text-right tabular-nums">{isFinite(x.sim.months) ? fmt(x.sim.totalInterest) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ v, k, tone }) {
  const c = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "";
  return (
    <div className="text-center">
      <div className={`text-[22px] font-bold ${c}`}>{v}</div>
      <div className="mt-1 text-[12px] uppercase tracking-[.07em] text-muted">{k}</div>
    </div>
  );
}

function Note({ children }) {
  return <div className="mb-[18px] rounded-[10px] border border-[#5a3d12] bg-[#1c1407] px-3.5 py-3 text-[13px] leading-relaxed text-warn">{children}</div>;
}

function PlanCard({ x, onPick }) {
  const p = x.def;
  const ring = { green: "before:bg-good", orange: "before:bg-[#f5953a]", red: "before:bg-[#f0556f]" }[p.cls];
  const acc = { green: "#3ad07f", orange: "#f5953a", red: "#f0556f" }[p.cls];
  let after;
  if (p.key === "balanced") after = <><b className="text-ink">After debt-free:</b> a full 50/30/20 split — <b className="text-ink">{fmt(x.wants)}</b> fun money and <b className="text-ink">{fmt(x.savings)}</b> into savings & investments every month.</>;
  else if (p.key === "accelerated") after = <><b className="text-ink">After debt-free:</b> switch to 50/30/20 with the freed <b className="text-ink">{fmt(x.monthly)}</b>/mo supercharging your savings.</>;
  else after = <><b className="text-ink">After debt-free:</b> your entire income is yours again — a clean 50/30/20 lifestyle with <b className="text-ink">{fmt(x.savings)}</b>/mo invested.</>;

  return (
    <div className={`relative flex flex-col overflow-hidden rounded-[18px] border border-border bg-gradient-to-b from-panel to-panel2 p-[22px] before:absolute before:left-0 before:right-0 before:top-0 before:h-[5px] ${ring}`}>
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
        <button onClick={onPick} className="w-full rounded-xl py-[11px] font-semibold text-white transition hover:brightness-110"
          style={{ background: acc }}>Select This Plan</button>
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
        <Stat v={fmt(income)} k="Monthly income" />
        <Stat v={fmt(living)} k="Living costs" />
        <Stat v={fmt(available)} k="Spare to save / invest" tone="good" />
      </div>
    </Card>
  );
}

function InterestFreePanel({ debts, available }) {
  const free = debts.filter((d) => d.freeMonths > 0);
  if (!free.length) return null;
  return (
    <Card className="mx-auto mb-7 max-w-[940px]">
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
