import { useState } from "react";
import { Card, Button, MoneyInput } from "../components/ui.jsx";
import Donut from "../components/Donut.jsx";
import AllocationCard from "../components/AllocationCard.jsx";
import {
  usePlanner, visibleCategories, expenseItemsOf, budgetMathOf, EXPENSE_PLACEHOLDERS,
} from "../state.jsx";
import { fmt, monthlyToFreq } from "../lib/engine.js";

const wk = (monthly) => fmt(monthlyToFreq(monthly, "weekly"));

// In-depth budget: every category shown per month AND per week, locked by
// default, with an Edit button to change the monthly amounts.
export default function Budget({ onEditDetails }) {
  const { state, update } = usePlanner();
  const m = budgetMathOf(state);
  const [editing, setEditing] = useState(false);

  const cats = visibleCategories(state);
  const setExpense = (key, v) => update((s) => ({ ...s, expenses: { ...s.expenses, [key]: v } }));
  const setBillDue = (key, day) => update((s) => {
    const bd = { ...(s.billDue || {}) };
    const n = parseInt(day, 10);
    if (!n) delete bd[key]; else bd[key] = Math.max(1, Math.min(31, n));
    return { ...s, billDue: bd };
  });
  const billDue = state.billDue || {};

  const expItems = expenseItemsOf(state);
  const breakdown = [...expItems];
  if (m.minTotal > 0) breakdown.push({ key: "debtmin", name: "Debt payments", color: "#ff4d6d", value: m.minTotal });
  breakdown.sort((a, b) => b.value - a.value);
  const breakdownSum = breakdown.reduce((s, c) => s + c.value, 0);
  const mortgage = state.mortgage.on ? Math.max(0, parseFloat(state.mortgage.payment) || 0) : 0;
  const leftMonthly = Math.max(0, m.income - m.living);

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-5">
        <h1 className="text-[22px] font-extrabold tracking-tight">Budget</h1>
        <p className="mt-1 text-sm text-muted">What goes where each month and each week. Locked so you don't change it by accident — tap Edit to update.</p>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[17px] font-bold">Your spending</h2>
            <Button variant={editing ? "primary" : "ghost"} onClick={() => setEditing((e) => !e)} className="px-3.5 py-2 text-[13px]">
              {editing ? "✓ Done" : "✎ Edit"}
            </Button>
          </div>

          {/* column headers */}
          <div className="grid grid-cols-[1fr_96px_60px_64px] items-center gap-2 border-b border-border pb-2 text-[10px] font-semibold uppercase tracking-[.06em] text-muted">
            <span>Category</span>
            <span className="text-right">Monthly</span>
            <span className="text-right">Weekly</span>
            <span className="text-right">Due</span>
          </div>

          {state.mortgage.on && (
            <Row color="#4cb8f0" name="Mortgage" value={mortgage} editing={editing} amountLocked
              due={billDue.mortgage} onDue={(v) => setBillDue("mortgage", v)}>
              <span className="text-[11px] text-muted">set in <button onClick={onEditDetails} className="text-accent hover:underline">details</button></span>
            </Row>
          )}

          {cats.map((c) => {
            const val = parseFloat(state.expenses[c.key]) || 0;
            return (
              <Row key={c.key} color={c.color} name={c.name} value={val} editing={editing}
                input={<MoneyInput value={state.expenses[c.key] ?? ""} onChange={(v) => setExpense(c.key, v)} placeholder={EXPENSE_PLACEHOLDERS[c.key]} />}
                due={billDue[c.key]} onDue={(v) => setBillDue(c.key, v)} />
            );
          })}
          {editing && <p className="mt-2 text-[11px] text-muted">💡 Set a <b className="text-ink">Due</b> day (1–31) to show bills on your payment calendar in the Planner tab.</p>}

          <div className="mt-4 border-t border-border pt-3">
            <TotalRow k="Income" monthly={m.income} tone="ink" />
            <TotalRow k="Total spending" monthly={m.living} tone="bad" />
            <TotalRow k="Left after spending" monthly={leftMonthly} tone="good" big />
          </div>

          <p className="mt-3 text-[12px] text-muted">
            Income, mortgage, car &amp; pets come from your details.{" "}
            <button onClick={onEditDetails} className="font-semibold text-accent hover:underline">Edit details →</button>
          </p>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <h3 className="mb-3 font-bold">Where it goes</h3>
            {breakdown.length ? (
              <div className="flex justify-center">
                <Donut items={breakdown} total={Math.max(m.income, breakdownSum)} idPrefix="budget" centerTop={fmt(m.income)} centerBottom="per month" maxW={300} />
              </div>
            ) : (
              <p className="py-8 text-center text-[13px] text-muted">Tap Edit and add some amounts to see your breakdown.</p>
            )}
          </Card>
          <AllocationCard income={m.income} living={m.living} minTotal={m.minTotal} debtMonthly={m.debtMonthly} savings={m.savings} fun={m.fun} freq={state.payFrequency || "monthly"} />
        </div>
      </div>
    </div>
  );
}

function ord(n) {
  if (!n) return "—";
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function Row({ color, name, value, editing, input, amountLocked, due, onDue, children }) {
  return (
    <div className="grid grid-cols-[1fr_96px_60px_64px] items-center gap-2 border-b border-border/60 py-2.5 last:border-0">
      <span className="flex items-center gap-2.5 text-sm">
        <span className="h-3 w-3 shrink-0 rounded" style={{ background: color }} />
        <span className="min-w-0 truncate">{name}{children && <span className="ml-2">{children}</span>}</span>
      </span>
      {editing && input && !amountLocked
        ? input
        : <span className="text-right font-semibold tabular-nums">{fmt(value)}</span>}
      <span className="text-right text-[13px] tabular-nums text-muted">{wk(value)}</span>
      {editing && onDue
        ? <input type="number" min="1" max="31" value={due || ""} onChange={(e) => onDue(e.target.value)} placeholder="–"
            className="w-full rounded-[8px] border border-border bg-[#0b0f17] px-2 py-1.5 text-right text-[13px] text-ink outline-none focus:border-accent" />
        : <span className="text-right text-[12px] tabular-nums text-muted">{ord(due)}</span>}
    </div>
  );
}

function TotalRow({ k, monthly, tone, big }) {
  const c = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="grid grid-cols-[1fr_96px_60px_64px] items-baseline gap-2 py-1">
      <span className="text-sm text-muted">{k}</span>
      <span className={`text-right tabular-nums ${big ? "text-[17px] font-extrabold" : "font-bold"} ${c}`}>{fmt(monthly)}</span>
      <span className={`text-right text-[12px] tabular-nums ${c} opacity-80`}>{wk(monthly)}</span>
      <span />
    </div>
  );
}
