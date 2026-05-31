import { useMemo, useState } from "react";
import { Button, Card, Chevron } from "../components/ui.jsx";
import Donut from "../components/Donut.jsx";
import {
  usePlanner, monthlyIncomeOf, debtsOf, livingOf, savingsToDeployOf,
} from "../state.jsx";
import { fmt, monthsToStr, buildPlans, simulateDetailed, monthlyToFreq, freqLabel, projectRetirement } from "../lib/engine.js";

const ACC = { green: "#3ad07f", orange: "#f5953a", red: "#f0556f" };
const PAYS_PER_MONTH = { weekly: 52 / 12, fortnightly: 26 / 12, monthly: 1 };

export default function Detail({ planKey, onBack }) {
  const { state } = usePlanner();
  const income = monthlyIncomeOf(state);
  const debts = debtsOf(state);
  const living = livingOf(state);
  const lump = savingsToDeployOf(state);

  // Pay-frequency helpers: convert a monthly £ figure into a per-paycheck one.
  const freq = state.payFrequency || "monthly";
  const weekly = freq !== "monthly";
  const perPay = (monthly) => fmt(monthlyToFreq(monthly, freq));
  const payWord = freqLabel(freq); // "week" | "fortnight" | "month"

  const { plans } = useMemo(() => buildPlans(debts, income, living, lump), [debts, income, living, lump]);
  const plan = plans.find((p) => p.def.key === planKey) || plans[0];

  // The spare-cash pool above minimum payments.
  const avail = Math.max(0, income - living);
  const minTotal = debts.reduce((s, d) => s + d.min, 0);
  const baseToDebt = Math.min(minTotal, avail);
  const pool = Math.max(0, avail - baseToDebt);
  const funCap = income * 0.3;

  // Allocation split: extra-debt / fun / savings, summing to the pool.
  const [alloc, setAlloc] = useState(() => {
    const extra = Math.min(pool, pool * plan.def.share);
    const rest = Math.max(0, pool - extra);
    const fun = Math.min(rest / 2, funCap);
    return { extra, fun, savings: Math.max(0, rest - fun) };
  });

  // When one slider moves, rebalance the other two proportionally.
  const onSlider = (which, pct) => {
    let v = Math.max(0, Math.min((pct / 100) * pool, pool));
    if (which === "fun") v = Math.min(v, funCap);
    const others = ["fun", "savings", "extra"].filter((k) => k !== which);
    const remaining = pool - v;
    const o0 = alloc[others[0]], o1 = alloc[others[1]], sum = o0 + o1;
    let a0, a1;
    if (sum <= 0.001) { a0 = remaining / 2; a1 = remaining / 2; }
    else { a0 = remaining * (o0 / sum); a1 = remaining * (o1 / sum); }
    const res = { [which]: v, [others[0]]: a0, [others[1]]: a1 };
    if (res.fun > funCap + 0.001) {
      const over = res.fun - funCap; res.fun = funCap;
      const tgt = ["savings", "extra"].find((k) => k !== which);
      res[tgt] = (res[tgt] || 0) + over;
    }
    setAlloc(res);
  };

  const debtPayments = baseToDebt + alloc.extra;
  const sim = useMemo(() => simulateDetailed(debts, alloc.extra, lump), [debts, alloc.extra, lump]);

  // Retirement projection: contribute the savings-slider amount while in debt,
  // then 20% of income (the 50/30/20 savings slice) once debt-free, compounding
  // at 4.5%/yr in a savings account until age 60.
  const age = parseInt(state.age, 10);
  const debtMonths = isFinite(sim.months) ? sim.months : 0;
  const afterDebtSaving = income * 0.2;
  const retire = useMemo(
    () => projectRetirement({
      age, retireAge: 60, annualRate: 0.045,
      monthlyWhileDebt: alloc.savings, monthlyAfterDebt: afterDebtSaving,
      debtMonths, startingPot: 0,
    }),
    [age, alloc.savings, afterDebtSaving, debtMonths]
  );

  const allocItems = [
    { key: "living", name: "Living expenses", color: "#4cb8f0", value: living },
    { key: "debtpay", name: "Debt payments", color: "#f0556f", value: debtPayments },
    { key: "fun", name: "Fun money", color: "#f5953a", value: alloc.fun },
    { key: "savings", name: "Savings", color: "#3ad07f", value: alloc.savings },
  ].filter((a) => a.value > 0.5);

  const pct = (x) => (pool > 0 ? (x / pool) * 100 : 0);
  const acc = ACC[plan.def.cls];

  // payoff roadmap display order: interest-free debts go last
  const displayOrder = sim.order.slice().sort((a, b) => {
    const fa = debts[a].freeMonths > 0 ? 1 : 0, fb = debts[b].freeMonths > 0 ? 1 : 0;
    if (fa !== fb) return fa - fb;
    return debts[b].rate - debts[a].rate;
  });

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-[18px] flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}><Chevron dir="left" /> Back to plans</Button>
      </div>

      <div className="mb-6 text-center">
        <h2 className="text-[26px] font-bold tracking-tight">{plan.def.title}</h2>
        <p className="text-muted">
          Debt-free in {monthsToStr(sim.months)} ·{" "}
          {weekly
            ? <><b className="text-ink">{perPay(debtPayments)}</b> toward debt every {payWord} <span className="opacity-70">({fmt(debtPayments)}/mo)</span></>
            : <>{fmt(debtPayments)}/mo toward debt</>}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Allocation + sliders */}
        <Card className="flex flex-col items-center">
          <h3 className="mb-1 self-start font-bold">Monthly money allocation</h3>
          <p className="mb-4 self-start text-[13px] text-muted">How your {fmt(income)} income is split each month.</p>
          <Donut items={allocItems} total={income} idPrefix="alloc" centerTop={fmt(income)} />
          <div className="mt-5 flex w-full flex-col gap-2">
            {allocItems.map((a) => (
              <div key={a.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5"><span className="h-3 w-3 rounded" style={{ background: a.color }} />{a.name}</span>
                <span><b>{fmt(a.value)}</b> <span className="ml-2 text-[12px] text-muted">{income > 0 ? Math.round(a.value / income * 100) : 0}%</span></span>
              </div>
            ))}
          </div>
          {pool > 0.5 && (
            <div className="mt-5 w-full border-t border-border pt-4">
              <p className="mb-3 text-[13px] text-muted">Split your <b className="text-ink">{fmt(pool)}</b> spare cash each month. Drag any slider and the others rebalance.</p>
              <Slider label="🎉 Fun money" val={fmt(alloc.fun)} color="#f5953a" pct={pct(alloc.fun)} onChange={(p) => onSlider("fun", p)} />
              <Slider label="🐷 Savings" val={fmt(alloc.savings)} color="#3ad07f" pct={pct(alloc.savings)} onChange={(p) => onSlider("savings", p)} />
              <Slider label="⚡ Extra debt payoff" val={fmt(alloc.extra)} color="#f0556f" pct={pct(alloc.extra)} onChange={(p) => onSlider("extra", p)} />
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">Fun money is capped at 30% of income. Extra debt payoff is paid <b className="text-ink">on top of</b> your minimums — the more you slide here, the faster you're debt-free.</p>
            </div>
          )}
        </Card>

        {/* Roadmap */}
        <Card>
          <h3 className="mb-1 font-bold">Your payoff roadmap</h3>
          <p className="mb-4 text-[13px] text-muted">Pay every minimum, then throw spare cash at the highest-interest debt first.</p>
          <ol className="flex flex-col gap-3">
            {displayOrder.map((di, idx) => {
              const d = debts[di];
              const when = sim.clearedMonth[di];
              const rateLabel = d.freeMonths > 0 ? `0% for ${d.freeMonths} mo, then ${d.rate}%` : `${d.rate}% APR`;
              let focus;
              if (d.freeMonths > 0) focus = `Interest-free for now — just pay the ${fmt(d.min)} minimum and clear it before the 0% ends (≈ month ${d.freeMonths}).`;
              else if (idx === 0) focus = "Attack this first with all your spare cash.";
              else focus = `Keep paying the ${fmt(d.min)} minimum until it's your turn.`;
              return (
                <li key={di} className="relative rounded-xl border border-border bg-[#0c121d] py-3.5 pl-[54px] pr-3.5">
                  <span className="absolute left-3.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[14px] font-extrabold text-[#0b0f17]" style={{ background: acc }}>{idx + 1}</span>
                  <div className="flex items-baseline justify-between gap-2.5">
                    <span className="text-[15px] font-semibold">{d.name}</span>
                    <span className="text-[12px] font-semibold text-warn">{rateLabel}</span>
                  </div>
                  <div className="mt-1 text-[13px] text-muted">{fmt(d.balance)} balance · {focus} {when ? <>Cleared by <b className="text-ink">month {when}</b>.</> : "Not cleared in projection."}</div>
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      {/* Milestones + schedule */}
      <Card className="mt-6">
        <h3 className="mb-3.5 font-bold">Month-by-month milestones</h3>
        <Milestones plan={plan} debts={debts} sim={sim} toDebt={debtPayments} extra={alloc.extra} lump={lump} weekly={weekly} payWord={payWord} freq={freq} />

        <h3 className="mb-1 mt-7 font-bold">Exact payment plan — card by card</h3>
        <p className="mb-3.5 text-[13px] text-muted">
          Each debt in the order you'll clear it, with exactly what to pay and when.
          {weekly && <> Each month also shows the amount to set aside <b className="text-ink">every {payWord}</b>.</>}
        </p>
        <ScheduleCards debts={debts} sim={sim} weekly={weekly} payWord={payWord} freq={freq} />
      </Card>

      <RetirementCard retire={retire} age={age} debtMonths={debtMonths} whileDebt={alloc.savings} afterDebt={afterDebtSaving} />
    </div>
  );
}

function RetirementCard({ retire, age, debtMonths, whileDebt, afterDebt }) {
  if (!age) {
    return (
      <Card className="mt-6 text-center">
        <h3 className="font-bold">🌅 Retirement projection</h3>
        <p className="mt-1 text-sm text-muted">Add your age in setup and we'll project what you could retire with at 60.</p>
      </Card>
    );
  }
  if (!retire) {
    return (
      <Card className="mt-6 text-center">
        <h3 className="font-bold">🌅 Retirement projection</h3>
        <p className="mt-1 text-sm text-muted">You're already 60 or over — the projection is for those still saving toward 60.</p>
      </Card>
    );
  }
  const dy = Math.floor(debtMonths / 12), dm = debtMonths % 12;
  const debtSpan = debtMonths > 0 ? `${dy ? dy + "y " : ""}${dm}m` : "now";
  // Sparkline of the yearly balances.
  const pts = retire.yearly;
  const max = pts[pts.length - 1].balance || 1;
  const W = 600, H = 90;
  const line = pts.map((p, i) => `${(i / (pts.length - 1)) * W},${H - (p.balance / max) * H}`).join(" ");

  return (
    <Card className="mt-6">
      <h3 className="font-bold">🌅 What you could retire with at 60</h3>
      <p className="mb-4 text-[13px] text-muted">
        Assuming a savings account at <b className="text-ink">4.5%/yr</b>, and that your income &amp; spending stay the same.
        You save <b className="text-ink">{fmt(whileDebt)}/mo</b> while clearing debt ({debtSpan}), then <b className="text-ink">{fmt(afterDebt)}/mo</b> (your 50/30/20 savings) once debt-free.
      </p>

      <div className="mb-4 rounded-xl bg-[#0c121d] p-5 text-center">
        <div className="text-[12px] uppercase tracking-[.06em] text-muted">Projected pot at 60</div>
        <div className="mt-1 text-[40px] font-extrabold text-good">{fmt(retire.balanceAtRetirement)}</div>
        <div className="mt-1 text-[13px] text-muted">
          You'd put in <b className="text-ink">{fmt(retire.totalContributed)}</b> and earn <b className="text-good">{fmt(retire.totalInterest)}</b> in interest.
        </div>
      </div>

      {/* growth sparkline */}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[90px] w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="retFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3ad07f" stopOpacity="0.35" />
            <stop offset="1" stopColor="#3ad07f" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${line} ${W},${H}`} fill="url(#retFill)" />
        <polyline points={line} fill="none" stroke="#3ad07f" strokeWidth="2.5" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>Age {age}</span><span>Age 60</span>
      </div>
    </Card>
  );
}

function Slider({ label, val, color, pct, onChange }) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center justify-between text-sm font-semibold">
        <span>{label}</span><span style={{ color }}>{val}/mo</span>
      </div>
      <input type="range" min="0" max="100" value={pct} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ "--acc": color }} />
    </div>
  );
}

function Milestones({ plan, debts, sim, toDebt, extra, lump, weekly, payWord, freq }) {
  const items = [];
  if (weekly) {
    items.push({ m: "Each " + payWord, win: false, txt: <>You're paid {payWord}ly, so aim to set aside <b className="text-ink">{fmt(monthlyToFreq(toDebt, freq))}</b> toward your debts every {payWord} — that adds up to {fmt(toDebt)}/month.</> });
  }
  if (lump > 0) {
    const hit = sim.lumpPerDebt.map((amt, i) => ({ name: debts[i].name, amt })).filter((x) => x.amt > 0.5)
      .map((x) => `${fmt(x.amt)} off ${x.name}`).join(", ");
    items.push({ m: "Start", win: true, txt: <>Use your <b className="text-ink">{fmt(lump)}</b> savings as a head-start lump sum — {hit}. This shrinks the balance before any interest is charged.</> });
  }
  const accruing = sim.order.filter((i) => debts[i].freeMonths === 0);
  const firstIdx = accruing.length ? accruing[0] : sim.order[0];
  const first = debts[firstIdx];
  items.push({ m: "Month 1", win: false, txt: <>Pay every minimum payment (<b className="text-ink">{fmt(debts.reduce((s, d) => s + d.min, 0))}</b> total), then put your remaining <b className="text-ink">{fmt(extra)}</b> straight onto <b className="text-ink">{first.name}</b>{first.freeMonths > 0 ? " (clear it before its 0% period ends)" : ` — your highest-interest debt at ${first.rate}%`}.</> });

  const clears = sim.order.map((i) => ({ name: debts[i].name, month: sim.clearedMonth[i] })).filter((c) => c.month).sort((a, b) => a.month - b.month);
  clears.forEach((c, idx) => {
    const next = clears[idx + 1];
    items.push({ m: `Month ${c.month}`, win: true, txt: <>🎉 <b className="text-ink">{c.name}</b> is fully paid off.{next ? <> Roll its payment onto <b className="text-ink">{next.name}</b> — your momentum builds.</> : " That was your last debt!"}</> });
  });
  if (isFinite(plan.sim.months) && isFinite(sim.months)) {
    items.push({ m: monthsToStr(sim.months), win: true, txt: <><b className="text-ink">You're completely debt-free.</b> Redirect the full <b className="text-ink">{fmt(toDebt)}</b>/mo into a 50/30/20 lifestyle — savings, investments and guilt-free spending.</> });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((it, i) => (
        <div key={i} className={`flex items-start gap-3.5 rounded-[10px] border bg-[#0c121d] p-3.5 text-sm ${it.win ? "border-[#3ad07f55]" : "border-border"}`}>
          <span className={`flex-shrink-0 rounded-lg border border-border bg-[#1a2230] px-2.5 py-1 text-[12px] font-bold ${it.win ? "text-good" : "text-accent"}`}>{it.m}</span>
          <span className="leading-relaxed">{it.txt}</span>
        </div>
      ))}
    </div>
  );
}

function ScheduleCards({ debts, sim, weekly, payWord, freq }) {
  if (!sim.schedule.length || !isFinite(sim.months)) {
    return <p className="text-[13px] text-muted">A full payment plan isn't available (these debts aren't projected to clear with the current payment).</p>;
  }
  const perPay = (monthly) => fmt(monthlyToFreq(monthly, freq));
  const order = debts.map((_, i) => i).sort((a, b) => (sim.clearedMonth[a] || 1e9) - (sim.clearedMonth[b] || 1e9));
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {order.map((di, rank) => {
        const d = debts[di];
        const lumpAmt = sim.lumpPerDebt[di] || 0;
        const rows = [];
        if (lumpAmt > 0.5) rows.push({ label: "Start (savings)", pay: lumpAmt, bal: null });
        for (let m = 0; m < sim.schedule.length; m++) {
          const pay = sim.schedule[m].pay[di], bal = sim.schedule[m].bal[di];
          if (pay > 0.5 || bal > 0.5) rows.push({ label: `Month ${m + 1}`, pay, bal });
          if (bal <= 0.5) break;
        }
        return (
          <div key={di} className="overflow-hidden rounded-xl border border-border bg-[#0c121d]">
            <div className="border-b border-border p-3.5">
              <span className="mr-2 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent align-middle text-[12px] font-extrabold text-[#0b0f17]">{rank + 1}</span>
              <span className="align-middle text-[15px] font-bold">{d.name}</span>
              {d.freeMonths > 0 && <span className="ml-2 rounded-full border border-[#1f5c3a] bg-[#11301f] px-2 py-0.5 align-middle text-[10px] font-bold uppercase text-good">0% for {d.freeMonths} mo</span>}
              <div className="mt-1.5 text-[12px] text-muted">{fmt(d.balance)} · {d.rate}% APR · <b className="text-ink">{sim.clearedMonth[di] ? `Cleared in ${monthsToStr(sim.clearedMonth[di])}` : "Not cleared"}</b></div>
            </div>
            <div className="max-h-[280px] overflow-y-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead><tr className="text-[11px] uppercase tracking-[.05em] text-muted">
                  <th className="sticky top-0 bg-[#141b29] px-4 py-2 text-left">When</th>
                  <th className="sticky top-0 bg-[#141b29] px-4 py-2 text-right">{weekly ? "Pay (month)" : "Pay"}</th>
                  {weekly && <th className="sticky top-0 bg-[#141b29] px-4 py-2 text-right">Per {payWord}</th>}
                  <th className="sticky top-0 bg-[#141b29] px-4 py-2 text-right">Balance after</th>
                </tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="even:bg-[#0e141f]">
                      <td className="border-b border-border px-4 py-2 text-muted">{r.label}</td>
                      <td className="border-b border-border px-4 py-2 text-right tabular-nums">{r.pay > 0.5 ? fmt(r.pay) : "—"}</td>
                      {weekly && <td className="border-b border-border px-4 py-2 text-right tabular-nums text-accent">{r.pay > 0.5 && r.bal !== null ? perPay(r.pay) : ""}</td>}
                      <td className="border-b border-border px-4 py-2 text-right tabular-nums">{r.bal === null ? "" : r.bal > 0.5 ? fmt(r.bal) : <span className="font-semibold text-good">cleared ✓</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
