import { useState } from "react";
import { Card, Button, MoneyInput } from "../components/ui.jsx";
import Donut from "../components/Donut.jsx";
import AllocationCard from "../components/AllocationCard.jsx";
import {
  usePlanner, visibleCategories, expenseItemsOf, budgetMathOf, EXPENSE_PLACEHOLDERS, normBill,
} from "../state.jsx";
import { fmt } from "../lib/engine.js";
import { FREQ_LABEL } from "../lib/planner.js";

const COLS = "grid grid-cols-[1fr_88px_106px_58px] items-center gap-2";
function ord(n) {
  if (!n) return "—";
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// In-depth budget: amounts + how often each is paid + when it's due. Locked by
// default; Edit unlocks. Drives the donut and the payday planner.
export default function Budget({ onEditDetails }) {
  const { state, update } = usePlanner();
  const m = budgetMathOf(state);
  const [editing, setEditing] = useState(false);

  const cats = visibleCategories(state);
  const billDue = state.billDue || {};
  const setExpense = (key, v) => update((s) => ({ ...s, expenses: { ...s.expenses, [key]: v } }));
  const setBill = (key, patch) => update((s) => {
    const cur = normBill(s.billDue?.[key]) || { freq: "monthly", day: 0 };
    return { ...s, billDue: { ...(s.billDue || {}), [key]: { ...cur, ...patch } } };
  });

  const expItems = expenseItemsOf(state);
  const breakdown = [...expItems];
  if (m.minTotal > 0) breakdown.push({ key: "debtmin", name: "Debt payments", color: "#ff4d6d", value: m.minTotal });
  breakdown.sort((a, b) => b.value - a.value);
  const breakdownSum = breakdown.reduce((s, c) => s + c.value, 0);
  const mortgage = state.mortgage.on ? Math.max(0, parseFloat(state.mortgage.payment) || 0) : 0;
  const leftMonthly = Math.max(0, m.income - m.living);

  const rows = [];
  if (state.mortgage.on) rows.push({ key: "mortgage", color: "#4cb8f0", name: "Mortgage", value: mortgage, locked: true });
  cats.forEach((c) => rows.push({ key: c.key, color: c.color, name: c.name, value: parseFloat(state.expenses[c.key]) || 0 }));

  return (
    <div className="mx-auto max-w-[1160px]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Budget</h1>
          <p className="mt-1 text-sm text-muted">What you spend, how often, and when it's due. Tap Edit to change anything.</p>
        </div>
        <Button variant={editing ? "primary" : "ghost"} onClick={() => setEditing((e) => !e)} className="px-4 py-2 text-[13px]">
          {editing ? "✓ Done" : "✎ Edit"}
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_330px] lg:items-start">
        <Card className="lg:p-5">
          <div className={`${COLS} border-b border-border pb-2 text-[10px] font-semibold uppercase tracking-[.06em] text-muted`}>
            <span>Category</span>
            <span className="text-right">Amount</span>
            <span className="text-right">How often</span>
            <span className="text-right">Due</span>
          </div>

          <div className="max-h-[420px] overflow-y-auto thin-scroll">
            {rows.map((r) => {
              const b = normBill(billDue[r.key]) || { freq: "monthly", day: 0 };
              return (
                <Row key={r.key} color={r.color} name={r.name} value={r.value} editing={editing} locked={r.locked}
                  input={!r.locked && <MoneyInput value={state.expenses[r.key] ?? ""} onChange={(v) => setExpense(r.key, v)} placeholder={EXPENSE_PLACEHOLDERS[r.key]} />}
                  freq={b.freq} day={b.day}
                  onFreq={(v) => setBill(r.key, { freq: v })} onDay={(v) => setBill(r.key, { day: Math.max(0, Math.min(31, parseInt(v, 10) || 0)) })}
                  hint={r.locked && <button onClick={onEditDetails} className="text-accent hover:underline">edit</button>} />
              );
            })}
          </div>

          <div className="mt-3 border-t border-border pt-3">
            <TotalRow k="Income" monthly={m.income} />
            <TotalRow k="Total spending" monthly={m.living} tone="bad" />
            <TotalRow k="Left after spending" monthly={leftMonthly} tone="good" big />
          </div>
          <p className="mt-2.5 text-[11px] text-muted">Income, mortgage, car &amp; pets come from your details. <button onClick={onEditDetails} className="font-semibold text-accent hover:underline">Edit details →</button></p>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="lg:p-5">
            <h3 className="mb-3 font-bold">Where it goes</h3>
            {breakdown.length ? (
              <div className="flex justify-center">
                <Donut items={breakdown} total={Math.max(m.income, breakdownSum)} idPrefix="budget" centerTop={fmt(m.income)} centerBottom="per month" maxW={260} />
              </div>
            ) : <p className="py-6 text-center text-[13px] text-muted">Tap Edit and add amounts to see your breakdown.</p>}
          </Card>
          <AllocationCard income={m.income} living={m.living} minTotal={m.minTotal} debtMonthly={m.debtMonthly} savings={m.savings} fun={m.fun} freq={state.payFrequency || "monthly"} />
        </div>
      </div>
    </div>
  );
}

function Row({ color, name, value, editing, input, locked, freq, day, onFreq, onDay, hint }) {
  return (
    <div className={`${COLS} border-b border-border/60 py-2.5 last:border-0`}>
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <span className="h-3 w-3 shrink-0 rounded" style={{ background: color }} />
        <span className="truncate">{name}</span>
        {hint && editing && <span className="text-[11px]">{hint}</span>}
      </span>
      {editing && input && !locked ? input : <span className="text-right font-semibold tabular-nums">{fmt(value)}</span>}
      {editing
        ? <select value={freq} onChange={(e) => onFreq(e.target.value)} className="app-select w-full rounded-[8px] border border-border bg-[#0b0f17] py-1.5 pl-2 text-[12px] text-ink outline-none focus:border-accent">
            <option value="monthly">Monthly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="weekly">Weekly</option>
          </select>
        : <span className="text-right text-[12px] text-muted">{FREQ_LABEL[freq] || "Monthly"}</span>}
      {editing
        ? (freq === "monthly"
            ? <input type="number" min="1" max="31" value={day || ""} onChange={(e) => onDay(e.target.value)} placeholder="–" className="w-full rounded-[8px] border border-border bg-[#0b0f17] px-1.5 py-1.5 text-right text-[12px] text-ink outline-none focus:border-accent" />
            : <span className="text-right text-[12px] text-muted">—</span>)
        : <span className="text-right text-[12px] tabular-nums text-muted">{freq === "monthly" ? ord(day) : "—"}</span>}
    </div>
  );
}

function TotalRow({ k, monthly, tone, big }) {
  const c = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className={`${COLS} py-1`}>
      <span className="text-sm text-muted">{k}</span>
      <span className={`text-right tabular-nums ${big ? "text-[17px] font-extrabold" : "font-bold"} ${c}`}>{fmt(monthly)}</span>
      <span /><span />
    </div>
  );
}
