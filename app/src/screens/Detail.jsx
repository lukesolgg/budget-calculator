import { useMemo, useState } from "react";
import { Card, Chevron } from "../components/ui.jsx";
import Donut from "../components/Donut.jsx";
import { usePlanner, monthlyIncomeOf, debtsOf, livingOf } from "../state.jsx";
import { fmt, monthsToStr, buildPlans, simulateDetailed, monthlyToFreq, freqLabel } from "../lib/engine.js";

// Colour for a 0%-interest window by months remaining: <=3 red, <=6 orange, 6+ green.
function freeWindowStyle(m) {
  if (m <= 3) return { bg: "#2a1010", bd: "#5a1f1f", tx: "#f87171" };
  if (m <= 6) return { bg: "#1c1407", bd: "#5a3d12", tx: "#f0b86a" };
  return { bg: "#11301f", bd: "#1f5c3a", tx: "#3ad07f" };
}

export default function Detail({ planKey, onBack }) {
  const { state, update } = usePlanner();
  const income = monthlyIncomeOf(state);
  const debts = debtsOf(state);
  const living = livingOf(state);

  const freq = state.payFrequency || "monthly";
  const weekly = freq !== "monthly";
  const perPay = (monthly) => fmt(monthlyToFreq(monthly, freq));
  const payWord = freqLabel(freq);

  const { plans } = useMemo(() => buildPlans(debts, income, living), [debts, income, living]);
  const plan = plans.find((p) => p.def.key === (state.selectedPlan || planKey)) || plans[0];

  // Spare-cash pool above minimum payments.
  const avail = Math.max(0, income - living);
  const minTotal = debts.reduce((s, d) => s + d.min, 0);
  const baseToDebt = Math.min(minTotal, avail);
  const pool = Math.max(0, avail - baseToDebt);
  const funCap = income * 0.3;

  // Allocation: restore a locked split if saved, else default from the plan.
  const [alloc, setAlloc] = useState(() => {
    if (state.alloc && state.allocLocked) {
      const a = state.alloc;
      return { fun: a.fun || 0, savings: a.savings || 0, extra: a.extra || 0 };
    }
    const extra = Math.min(pool, pool * plan.def.share);
    const rest = Math.max(0, pool - extra);
    const fun = Math.min(rest / 2, funCap);
    return { extra, fun, savings: Math.max(0, rest - fun) };
  });
  const [locked, setLocked] = useState(!!(state.alloc && state.allocLocked));

  const onSlider = (which, pctv) => {
    if (locked) return;
    let v = Math.max(0, Math.min((pctv / 100) * pool, pool));
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

  const lockIn = () => { update({ alloc, allocLocked: true }); setLocked(true); };
  const editAlloc = () => { update({ allocLocked: false }); setLocked(false); };

  const debtPayments = baseToDebt + alloc.extra;
  const sim = useMemo(() => simulateDetailed(debts, alloc.extra), [debts, alloc.extra]);

  const allocItems = [
    { key: "living", name: "Living expenses", color: "#4cb8f0", value: living },
    { key: "debtpay", name: "Debt payments", color: "#f0556f", value: debtPayments },
    { key: "fun", name: "Fun money", color: "#f5953a", value: alloc.fun },
    { key: "savings", name: "Savings", color: "#3ad07f", value: alloc.savings },
  ].filter((a) => a.value > 0.5);

  const pct = (x) => (pool > 0 ? (x / pool) * 100 : 0);

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-[18px] flex items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-[#1e2b27] bg-[#101a18] px-[18px] py-2.5 text-sm font-semibold text-ink transition hover:brightness-125">
          <Chevron dir="left" /> Back to plans
        </button>
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
        {/* Allocation + sliders (left) */}
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
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[13px] text-muted">Split your <b className="text-ink">{fmt(pool)}</b> spare cash each month.{!locked && " Drag any slider and the others rebalance."}</p>
                {locked ? (
                  <button onClick={editAlloc} className="shrink-0 rounded-lg border border-[#1e2b27] bg-[#101a18] px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:brightness-125">Edit</button>
                ) : (
                  <button onClick={lockIn} className="shrink-0 rounded-lg bg-gradient-to-b from-[#2fe6a6] to-[#12b886] px-3 py-1.5 text-[12px] font-semibold text-[#04140d] transition hover:brightness-110">🔒 Lock split</button>
                )}
              </div>
              {locked && <div className="mb-3 rounded-lg border border-[#1f5c3a] bg-[#11301f] px-3 py-2 text-[12px] text-good">Split locked &amp; saved. Tap Edit to change it.</div>}
              <Slider label="🎉 Fun money" val={fmt(alloc.fun)} color="#f5953a" pct={pct(alloc.fun)} onChange={(p) => onSlider("fun", p)} disabled={locked} />
              <Slider label="🐷 Savings" val={fmt(alloc.savings)} color="#3ad07f" pct={pct(alloc.savings)} onChange={(p) => onSlider("savings", p)} disabled={locked} />
              <Slider label="⚡ Extra debt payoff" val={fmt(alloc.extra)} color="#f0556f" pct={pct(alloc.extra)} onChange={(p) => onSlider("extra", p)} disabled={locked} />
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">Fun money is capped at 30% of income. Extra debt payoff is paid <b className="text-ink">on top of</b> your minimums — the more you slide here, the faster you're debt-free.</p>
            </div>
          )}
        </Card>

        {/* Month-by-month milestones (right — replaces the old roadmap) */}
        <Card>
          <h3 className="mb-3.5 font-bold">Month-by-month milestones</h3>
          <Milestones plan={plan} debts={debts} sim={sim} toDebt={debtPayments} extra={alloc.extra} weekly={weekly} payWord={payWord} freq={freq} />
        </Card>
      </div>

      {/* Exact payment plan (full width) */}
      <Card className="mt-6">
        <h3 className="mb-1 font-bold">Exact payment plan — card by card</h3>
        <p className="mb-3.5 text-[13px] text-muted">
          Each debt in the order you'll clear it, with exactly what to pay and when.
          {weekly && <> Each month also shows the amount to set aside <b className="text-ink">every {payWord}</b>.</>}
        </p>
        <ScheduleCards debts={debts} sim={sim} weekly={weekly} payWord={payWord} freq={freq} />
      </Card>
    </div>
  );
}

function Slider({ label, val, color, pct, onChange, disabled }) {
  return (
    <div className={`mb-3 ${disabled ? "opacity-60" : ""}`}>
      <div className="mb-1.5 flex items-center justify-between text-sm font-semibold">
        <span>{label}</span><span style={{ color }}>{val}/mo</span>
      </div>
      <input type="range" min="0" max="100" value={pct} disabled={disabled} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ "--acc": color }} />
    </div>
  );
}

function Milestones({ plan, debts, sim, toDebt, extra, weekly, payWord, freq }) {
  const items = [];
  if (weekly) {
    items.push({ m: "Each " + payWord, win: false, txt: <>You're paid {payWord}ly, so aim to set aside <b className="text-ink">{fmt(monthlyToFreq(toDebt, freq))}</b> toward your debts every {payWord} — that adds up to {fmt(toDebt)}/month.</> });
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
  const order = debts.map((_, i) => i).sort((a, b) => (sim.clearedMonth[a] || 1e9) - (sim.clearedMonth[b] || 1e9));
  return (
    <div className="flex flex-col gap-4">
      {order.map((di, rank) => (
        <ScheduleCard key={di} di={di} rank={rank} d={debts[di]} sim={sim} weekly={weekly} payWord={payWord} freq={freq} />
      ))}
    </div>
  );
}

// Rows shown before the "Show all" toggle kicks in (keeps long plans from forcing a scroll).
const COLLAPSED_ROWS = 6;

function ScheduleCard({ di, rank, d, sim, weekly, payWord, freq }) {
  const perPay = (monthly) => fmt(monthlyToFreq(monthly, freq));
  const lumpAmt = sim.lumpPerDebt[di] || 0;
  const rows = [];
  if (lumpAmt > 0.5) rows.push({ label: "Start (savings)", pay: lumpAmt, bal: null });
  for (let m = 0; m < sim.schedule.length; m++) {
    const pay = sim.schedule[m].pay[di], bal = sim.schedule[m].bal[di];
    if (pay > 0.5 || bal > 0.5) rows.push({ label: `Month ${m + 1}`, pay, bal });
    if (bal <= 0.5) break;
  }
  const fw = d.freeMonths > 0 ? freeWindowStyle(d.freeMonths) : null;
  const collapsible = rows.length > COLLAPSED_ROWS;
  const [open, setOpen] = useState(false);
  const visible = collapsible && !open ? rows.slice(0, COLLAPSED_ROWS) : rows;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#0c121d]">
      <div className="border-b border-border p-3.5">
        <span className="mr-2 inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-accent align-middle text-[12px] font-extrabold text-[#0b0f17]">{rank + 1}</span>
        <span className="align-middle text-[15px] font-bold">{d.name}</span>
        {fw && (
          <span className="ml-2 rounded-full border px-2 py-0.5 align-middle text-[10px] font-bold uppercase" style={{ background: fw.bg, borderColor: fw.bd, color: fw.tx }}>
            0% · {d.freeMonths} mo left
          </span>
        )}
        <div className="mt-1.5 text-[12px] text-muted">{fmt(d.balance)} · {d.rate}% APR · <b className="text-ink">{sim.clearedMonth[di] ? `Cleared in ${monthsToStr(sim.clearedMonth[di])}` : "Not cleared"}</b></div>
      </div>
      <table className="w-full border-collapse text-[13px]">
        <thead><tr className="text-[11px] uppercase tracking-[.05em] text-muted">
          <th className="bg-[#141b29] px-4 py-2 text-left">When</th>
          <th className="bg-[#141b29] px-4 py-2 text-right">{weekly ? "Pay (month)" : "Pay"}</th>
          {weekly && <th className="bg-[#141b29] px-4 py-2 text-right">Per {payWord}</th>}
          <th className="bg-[#141b29] px-4 py-2 text-right">Balance after</th>
        </tr></thead>
        <tbody>
          {visible.map((r, i) => (
            <tr key={i} className="even:bg-[#0e141f]">
              <td className="border-b border-border px-4 py-2 text-muted">{r.label}</td>
              <td className="border-b border-border px-4 py-2 text-right tabular-nums">{r.pay > 0.5 ? fmt(r.pay) : "—"}</td>
              {weekly && <td className="border-b border-border px-4 py-2 text-right tabular-nums text-accent">{r.pay > 0.5 && r.bal !== null ? perPay(r.pay) : ""}</td>}
              <td className="border-b border-border px-4 py-2 text-right tabular-nums">{r.bal === null ? "" : r.bal > 0.5 ? fmt(r.bal) : <span className="font-semibold text-good">cleared ✓</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {collapsible && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border bg-[#0e141f] py-2.5 text-[12px] font-semibold text-accent transition hover:bg-[#141b29]"
        >
          {open ? "Show less" : `Show all ${rows.length} months`}
          <Chevron dir={open ? "up" : "down"} />
        </button>
      )}
    </div>
  );
}
