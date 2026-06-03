import { useState } from "react";
import { Card, Chevron } from "../components/ui.jsx";
import { usePlanner, billDueItemsOf } from "../state.jsx";
import { fmt, monthsUntil } from "../lib/engine.js";
import {
  debtTone, startOfToday, generatePaydays, advancePayday, nextDueOnOrAfter, sameDay, fmtDay,
} from "../lib/planner.js";

// Payment calendar + "what to set aside each payday" — bills & debts together.
export default function Planner() {
  const { state, update } = usePlanner();
  const freq = state.payFrequency || "monthly";
  const [monthOffset, setMonthOffset] = useState(0);

  const items = [];
  state.debts.forEach((dd) => {
    if ((parseFloat(dd.bal) || 0) > 0 && dd.dueDay) {
      const tone = debtTone(dd.iffree ? monthsUntil(dd.ifuntil) : 0);
      items.push({ name: (dd.name || "").trim() || "Debt", amount: parseFloat(dd.min) || 0, dueDay: +dd.dueDay, kind: "debt", tx: tone.tx, bg: tone.bg });
    }
  });
  if (state.car.on && (parseFloat(state.car.balance) || 0) > 0 && state.car.dueDay) {
    const tone = debtTone(0);
    items.push({ name: "Car Loan", amount: parseFloat(state.car.payment) || 0, dueDay: +state.car.dueDay, kind: "debt", tx: tone.tx, bg: tone.bg });
  }
  billDueItemsOf(state).forEach((b) => {
    items.push({ name: b.name, amount: b.amount, dueDay: b.dueDay, kind: "bill", tx: b.color, bg: "#0c121d" });
  });

  const anchor = state.payAnchor;
  const today = startOfToday();
  const paydays = anchor ? generatePaydays(anchor, freq, 14) : [];

  const sched = [];
  if (paydays.length) {
    const pre = items.map((it) => ({ it, date: nextDueOnOrAfter(it.dueDay, today) })).filter((x) => x.date < paydays[0]);
    if (pre.length) sched.push({ label: "Before your next payday", due: pre });
    for (let i = 0; i < Math.min(4, paydays.length); i++) {
      const start = paydays[i], end = paydays[i + 1] || advancePayday(paydays[i], freq);
      const due = items.map((it) => ({ it, date: nextDueOnOrAfter(it.dueDay, start) })).filter((x) => x.date >= start && x.date < end);
      sched.push({ label: fmtDay(paydays[i]), payday: true, due });
    }
  }

  const base = new Date(); base.setHours(0, 0, 0, 0); base.setDate(1); base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear(), month = base.getMonth();
  const dim = new Date(year, month + 1, 0).getDate();
  const firstW = (new Date(year, month, 1).getDay() + 6) % 7;
  const monthLabel = base.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const paydaySet = new Set(paydays.filter((p) => p.getFullYear() === year && p.getMonth() === month).map((p) => p.getDate()));
  const dueByDay = {};
  items.forEach((it) => { const day = Math.min(it.dueDay, dim); (dueByDay[day] ||= []).push(it); });
  const cells = [...Array(firstW).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Planner</h1>
          <p className="mt-1 text-sm text-muted">When your bills &amp; debts are due, and what to set aside each payday.</p>
        </div>
        <label className="flex items-center gap-2 text-[12px] text-muted">
          Next payday
          <input type="date" value={anchor || ""} onChange={(e) => update((s) => ({ ...s, payAnchor: e.target.value }))}
            className="rounded-[10px] border border-border bg-[#0b0f17] px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent" />
        </label>
      </header>

      {!items.length ? (
        <Card>
          <p className="text-[13px] text-muted">Add a <b className="text-ink">due date</b> to your debts (Debt tab → ✎) or a <b className="text-ink">Due</b> day to your bills (Budget tab → Edit), and they'll appear here with a payday plan.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_minmax(0,360px)] lg:items-start">
          {/* Calendar */}
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <button onClick={() => setMonthOffset((m) => m - 1)} className="rounded-lg border border-border bg-[#0c121d] px-2.5 py-1 text-sm text-ink hover:border-accent"><Chevron dir="left" /></button>
              <span className="text-[14px] font-bold">{monthLabel}</span>
              <button onClick={() => setMonthOffset((m) => m + 1)} className="rounded-lg border border-border bg-[#0c121d] px-2.5 py-1 text-sm text-ink hover:border-accent"><Chevron dir="right" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[.04em] text-muted">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <span key={i} />;
                const isToday = sameDay(new Date(year, month, day), today);
                const due = dueByDay[day] || [];
                const isPay = paydaySet.has(day);
                return (
                  <div key={i} className={`min-h-[58px] rounded-md border p-1 text-[10px] ${isToday ? "border-accent" : "border-border"} ${isPay ? "bg-[#0f241c]" : "bg-[#0c121d]"}`}>
                    <div className="flex items-center justify-between">
                      <span className={isToday ? "font-bold text-accent" : "text-muted"}>{day}</span>
                      {isPay && <span title="Payday">💷</span>}
                    </div>
                    {due.map((it, j) => (
                      <div key={j} className="mt-0.5 truncate rounded px-1 text-[9px] font-semibold" style={{ background: it.bg, color: it.tx }} title={`${it.name} · ${fmt(it.amount)}`}>{it.name}</div>
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
              <span>💷 Payday</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "#f87171" }} /> Debt</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "#4cb8f0" }} /> Bill</span>
            </div>
          </Card>

          {/* Payday plan */}
          <div className="flex flex-col gap-3">
            {!anchor && (
              <div className="rounded-xl border border-[#5a3d12] bg-[#1c1407] px-3.5 py-2.5 text-[13px] text-warn">Set your next payday above to see what to set aside each payday.</div>
            )}
            {sched.map((w, i) => {
              const total = w.due.reduce((s, x) => s + x.it.amount, 0);
              return (
                <div key={i} className="rounded-xl border border-border bg-[#0c121d] p-3">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[13px] font-bold">{w.payday ? `💷 ${w.label}` : `⏰ ${w.label}`}</span>
                    <span className={`text-[13px] font-bold ${total > 0 ? "text-warn" : "text-good"}`}>{total > 0 ? `set aside ${fmt(total)}` : "nothing due"}</span>
                  </div>
                  {w.due.length ? w.due.map((x, j) => (
                    <div key={j} className="flex items-center justify-between text-[12px] text-muted">
                      <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: x.it.tx }} />{x.it.name} · {fmtDay(x.date)}</span>
                      <b className="text-ink tabular-nums">{fmt(x.it.amount)}</b>
                    </div>
                  )) : <div className="text-[12px] text-muted">Nothing due before the next payday.</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
