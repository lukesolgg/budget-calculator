import { useState } from "react";
import { Card, Button, MoneyInput } from "../components/ui.jsx";
import Donut from "../components/Donut.jsx";
import AllocationCard from "../components/AllocationCard.jsx";
import {
  usePlanner, visibleCategories, expenseItemsOf, budgetMathOf, EXPENSE_PLACEHOLDERS, normBill,
} from "../state.jsx";
import { fmt, monthlyToFreq } from "../lib/engine.js";

const COLS = "grid grid-cols-[minmax(0,1fr)_84px_76px_112px_66px] items-center gap-3";
const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const wkly = (monthly) => fmt(monthlyToFreq(monthly || 0, "weekly"));
function ord(n) {
  if (!n) return "—";
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// In-depth budget: amounts (monthly + weekly), how often each is paid, and when
// it's due. Locked by default; Edit unlocks. Drives the donut + payday planner.
export default function Budget({ onEditDetails }) {
  const { state, update } = usePlanner();
  const m = budgetMathOf(state);
  const [editing, setEditing] = useState(false);

  const cats = visibleCategories(state);
  const billDue = state.billDue || {};
  const setExpense = (key, v) => update((s) => ({ ...s, expenses: { ...s.expenses, [key]: v } }));
  const setBill = (key, patch) => update((s) => {
    const cur = normBill(s.billDue?.[key]) || { freq: "monthly", day: 0, dow: 0 };
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
          <p className="mt-1 text-sm text-muted">What you spend, how often, and when it's due — monthly and weekly.</p>
        </div>
        <Button variant={editing ? "primary" : "ghost"} onClick={() => setEditing((e) => !e)} className="px-4 py-2 text-[13px]">
          {editing ? "✓ Done" : "✎ Edit"}
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_330px] lg:items-start">
        <Card className="overflow-hidden lg:p-5">
          <div className="overflow-x-auto">
            <div className="min-w-[480px]">
              <div className={`${COLS} border-b border-border px-2 pb-2 text-[10px] font-semibold uppercase tracking-[.07em] text-muted`}>
                <span>Category</span>
                <span className="text-right">Monthly</span>
                <span className="text-right">Weekly</span>
                <span className="text-center">How often</span>
                <span className="text-right">Due</span>
              </div>

              <div className="max-h-[400px] overflow-y-auto thin-scroll">
                {rows.map((r) => {
                  const b = normBill(billDue[r.key]) || { freq: "monthly", day: 0, dow: 0 };
                  return (
                    <Row key={r.key} {...r} editing={editing} freq={b.freq} day={b.day} dow={b.dow}
                      input={!r.locked && <MoneyInput value={state.expenses[r.key] ?? ""} onChange={(v) => setExpense(r.key, v)} placeholder={EXPENSE_PLACEHOLDERS[r.key]} />}
                      onFreq={(v) => setBill(r.key, { freq: v })}
                      onDay={(v) => setBill(r.key, { day: Math.max(0, Math.min(31, parseInt(v, 10) || 0)) })}
                      onDow={(v) => setBill(r.key, { dow: parseInt(v, 10) || 0 })}
                      hint={r.locked && <button onClick={onEditDetails} className="text-accent hover:underline">edit</button>} />
                  );
                })}
              </div>

              <div className="mt-3 space-y-0.5 border-t border-border pt-3">
                <TotalRow k="Income" monthly={m.income} />
                <TotalRow k="Total spending" monthly={m.living} tone="bad" />
                <TotalRow k="Left after spending" monthly={leftMonthly} tone="good" big />
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted">Income, mortgage, car &amp; pets come from your details. <button onClick={onEditDetails} className="font-semibold text-accent hover:underline">Edit details →</button></p>
        </Card>

        <div className="flex flex-col gap-5">
          <Card className="lg:p-5">
            <h3 className="mb-3 font-bold">Where it goes</h3>
            {breakdown.length ? (
              <div className="flex justify-center">
                <Donut items={breakdown} total={Math.max(m.income, breakdownSum)} idPrefix="budget" centerTop={fmt(m.income)} centerBottom="per month" maxW={250} />
              </div>
            ) : <p className="py-6 text-center text-[13px] text-muted">Tap Edit and add amounts to see your breakdown.</p>}
          </Card>
          <AllocationCard income={m.income} living={m.living} minTotal={m.minTotal} debtMonthly={m.debtMonthly} savings={m.savings} fun={m.fun} freq={state.payFrequency || "monthly"} />
        </div>
      </div>
    </div>
  );
}

function FreqPill({ freq }) {
  const c = freq === "weekly" ? "#3ad07f" : freq === "fortnightly" ? "#f0b86a" : "#8b97a8";
  const label = freq === "weekly" ? "Weekly" : freq === "fortnightly" ? "Fortnightly" : "Monthly";
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: c, background: `${c}1a` }}>{label}</span>;
}

function Row({ color, name, value, editing, input, locked, freq, day, dow, onFreq, onDay, onDow, hint }) {
  const weekly = freq === "weekly" || freq === "fortnightly";
  const inputCls = "w-full rounded-[8px] border border-border bg-[#0b0f17] px-2 py-1.5 text-[12px] text-ink outline-none focus:border-accent";
  return (
    <div className={`${COLS} rounded-lg px-2 py-2.5 transition hover:bg-[#0c1420]`}>
      <span className="flex min-w-0 items-center gap-2.5 text-sm">
        <span className="h-7 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
        <span className="truncate">{name}</span>
        {hint && editing && <span className="text-[11px]">{hint}</span>}
      </span>
      {editing && input && !locked ? input : <span className="text-right font-bold tabular-nums">{fmt(value)}</span>}
      <span className="text-right text-[13px] tabular-nums text-muted">{wkly(value)}</span>
      {editing
        ? <select value={freq} onChange={(e) => onFreq(e.target.value)} className={`app-select ${inputCls} text-center`}>
            <option value="monthly">Monthly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="weekly">Weekly</option>
          </select>
        : <span className="flex justify-center"><FreqPill freq={freq} /></span>}
      {editing
        ? (weekly
            ? <select value={dow ?? 0} onChange={(e) => onDow(e.target.value)} className={`app-select ${inputCls} text-right`}>{WD.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>
            : <input type="number" min="1" max="31" value={day || ""} onChange={(e) => onDay(e.target.value)} placeholder="–" className={`${inputCls} text-right`} />)
        : <span className="text-right text-[12px] tabular-nums text-muted">{weekly ? WD[dow ?? 0] : ord(day)}</span>}
    </div>
  );
}

function TotalRow({ k, monthly, tone, big }) {
  const c = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className={`${COLS} px-2 py-1`}>
      <span className={`${big ? "text-[14px] font-bold" : "text-sm"} text-muted`}>{k}</span>
      <span className={`text-right tabular-nums ${big ? "text-[18px] font-extrabold" : "font-bold"} ${c}`}>{fmt(monthly)}</span>
      <span className={`text-right text-[12px] tabular-nums ${c} opacity-75`}>{wkly(monthly)}</span>
      <span /><span />
    </div>
  );
}
