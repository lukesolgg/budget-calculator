import { useState } from "react";
import { Card, MoneyInput } from "../components/ui.jsx";
import Donut from "../components/Donut.jsx";
import AllocationCard from "../components/AllocationCard.jsx";
import {
  usePlanner, visibleCategories, expenseItemsOf, budgetMathOf, EXPENSE_PLACEHOLDERS,
} from "../state.jsx";
import { fmt, monthlyToFreq, freqLabel } from "../lib/engine.js";

// In-depth budget: set what you allocate to each category, see it per month or
// per payday, with the breakdown donut + the payday allocation card.
export default function Budget({ onEditDetails }) {
  const { state, update } = usePlanner();
  const m = budgetMathOf(state);
  const freq = state.payFrequency || "monthly";
  const weekly = freq !== "monthly";
  const noun = freqLabel(freq) || "month";
  const [perWeek, setPerWeek] = useState(weekly);
  const periodWord = perWeek ? noun : "month";

  const cats = visibleCategories(state);
  const setExpense = (key, v) => update((s) => ({ ...s, expenses: { ...s.expenses, [key]: v } }));

  const expItems = expenseItemsOf(state);
  const breakdown = [...expItems];
  if (m.minTotal > 0) breakdown.push({ key: "debtmin", name: "Debt payments", color: "#ff4d6d", value: m.minTotal });
  breakdown.sort((a, b) => b.value - a.value);
  const breakdownSum = breakdown.reduce((s, c) => s + c.value, 0);

  const per = (v) => (perWeek ? monthlyToFreq(v, freq) : v);
  const mortgage = state.mortgage.on ? Math.max(0, parseFloat(state.mortgage.payment) || 0) : 0;

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Budget</h1>
          <p className="mt-1 text-sm text-muted">Set how much goes to each category, and see it per month or per payday.</p>
        </div>
        {weekly && (
          <div className="flex gap-1 rounded-lg border border-border bg-[#0a0f17] p-0.5">
            <button onClick={() => setPerWeek(false)} className={`rounded-md px-3 py-1 text-[12px] font-semibold transition ${!perWeek ? "bg-[#1c2738] text-ink" : "text-muted hover:text-ink"}`}>Monthly</button>
            <button onClick={() => setPerWeek(true)} className={`rounded-md px-3 py-1 text-[12px] font-semibold transition ${perWeek ? "bg-[#1c2738] text-ink" : "text-muted hover:text-ink"}`}>Per {noun}</button>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Editable categories */}
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-[17px] font-bold">Your spending</h2>
            <span className="text-[12px] text-muted">Amounts are <b className="text-ink">per month</b></span>
          </div>

          {state.mortgage.on && (
            <Row color="#4cb8f0" name="Mortgage" locked perWeek={perWeek} freq={freq} noun={noun} value={mortgage} onEditDetails={onEditDetails}>
              <span className="font-bold tabular-nums">{fmt(mortgage)}</span>
            </Row>
          )}

          {cats.map((c) => {
            const val = parseFloat(state.expenses[c.key]) || 0;
            return (
              <Row key={c.key} color={c.color} name={c.name} perWeek={perWeek} freq={freq} noun={noun} value={val}>
                <div className="w-[130px]">
                  <MoneyInput value={state.expenses[c.key] ?? ""} onChange={(v) => setExpense(c.key, v)} placeholder={EXPENSE_PLACEHOLDERS[c.key]} />
                </div>
              </Row>
            );
          })}

          <div className="mt-4 space-y-1.5 border-t border-border pt-4">
            <Total k="Income" v={fmt(per(m.income))} sub={`/ ${periodWord}`} />
            <Total k="Total spending" v={fmt(per(m.living))} sub={`/ ${periodWord}`} tone="bad" />
            <Total k="Left after spending" v={fmt(per(Math.max(0, m.income - m.living)))} sub={`/ ${periodWord}`} tone="good" big />
          </div>

          <p className="mt-3 text-[12px] text-muted">
            Income, mortgage, car &amp; pets come from your details.{" "}
            <button onClick={onEditDetails} className="font-semibold text-accent hover:underline">Edit details →</button>
          </p>
        </Card>

        {/* Donut + payday allocation */}
        <div className="flex flex-col gap-5">
          <Card>
            <h3 className="mb-3 font-bold">Where it goes</h3>
            {breakdown.length ? (
              <div className="flex justify-center">
                <Donut items={breakdown} total={Math.max(m.income, breakdownSum)} idPrefix="budget" centerTop={fmt(per(m.income))} centerBottom={`per ${periodWord}`} maxW={300} />
              </div>
            ) : (
              <p className="py-8 text-center text-[13px] text-muted">Add some amounts to see your breakdown.</p>
            )}
          </Card>
          <AllocationCard income={m.income} living={m.living} minTotal={m.minTotal} debtMonthly={m.debtMonthly} savings={m.savings} fun={m.fun} freq={freq} />
        </div>
      </div>
    </div>
  );
}

function Row({ color, name, value, perWeek, freq, noun, locked, onEditDetails, children }) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 py-2.5 last:border-0">
      <span className="h-3 w-3 shrink-0 rounded" style={{ background: color }} />
      <span className="flex-1 text-sm">
        {name}
        {locked && <button onClick={onEditDetails} className="ml-2 text-[11px] text-accent hover:underline">edit</button>}
      </span>
      {perWeek && value > 0 && <span className="text-[11px] text-muted">≈ {fmt(monthlyToFreq(value, freq))}/{noun}</span>}
      {children}
    </div>
  );
}

function Total({ k, v, sub, tone, big }) {
  const c = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm text-muted">{k}</span>
      <span className={`tabular-nums ${big ? "text-[18px] font-extrabold" : "font-bold"} ${c}`}>{v} <span className="text-[11px] font-normal text-muted">{sub}</span></span>
    </div>
  );
}
