import { useState } from "react";
import { Card, Chevron } from "../components/ui.jsx";
import { usePlanner, billDueItemsOf } from "../state.jsx";
import { fmt, monthsUntil, monthlyToFreq } from "../lib/engine.js";
import {
  debtTone, startOfToday, generatePaydays, advancePayday, occurrences, sameDay, fmtDay,
} from "../lib/planner.js";

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Payment calendar + "what to set aside each payday" — bills & debts together.
export default function Planner() {
  const { state, update } = usePlanner();
  const freq = state.payFrequency || "monthly";
  const [monthOffset, setMonthOffset] = useState(0);
  const today = startOfToday();
  const anchor = state.payAnchor ? new Date(state.payAnchor + "T00:00") : today;

  // Unified items: { name, perOcc, freq, day, kind, tx, bg }
  const items = [];
  state.debts.forEach((dd) => {
    if ((parseFloat(dd.bal) || 0) > 0 && dd.dueDay) {
      const t = debtTone(dd.iffree ? monthsUntil(dd.ifuntil) : 0);
      items.push({ name: (dd.name || "").trim() || "Debt", perOcc: parseFloat(dd.min) || 0, freq: "monthly", day: +dd.dueDay, kind: "debt", tx: t.tx, bg: t.bg });
    }
  });
  if (state.car.on && (parseFloat(state.car.balance) || 0) > 0 && state.car.dueDay) {
    const t = debtTone(0);
    items.push({ name: "Car Loan", perOcc: parseFloat(state.car.payment) || 0, freq: "monthly", day: +state.car.dueDay, kind: "debt", tx: t.tx, bg: t.bg });
  }
  billDueItemsOf(state).forEach((b) => {
    items.push({ name: b.name, perOcc: monthlyToFreq(b.amountMonthly, b.freq), freq: b.freq, day: b.day, dow: b.dow, kind: "bill", tx: b.color, bg: "#0d1420" });
  });

  const paydays = state.payAnchor ? generatePaydays(state.payAnchor, freq, 14) : [];

  // What to set aside each payday (occurrences before the next payday).
  const windowDue = (start, end) => {
    const due = [];
    items.forEach((it) => {
      const occ = occurrences(it.freq, it.day, it.dow, anchor, start, end);
      if (occ.length) due.push({ it, date: occ[0], amount: occ.length * it.perOcc });
    });
    due.sort((a, b) => a.date - b.date);
    return { due, total: due.reduce((s, x) => s + x.amount, 0) };
  };
  const sched = [];
  if (paydays.length) {
    const pre = windowDue(today, paydays[0]);
    if (pre.due.length) sched.push({ label: "Before your next payday", payday: false, ...pre });
    for (let i = 0; i < Math.min(4, paydays.length); i++) {
      const w = windowDue(paydays[i], paydays[i + 1] || advancePayday(paydays[i], freq));
      sched.push({ label: fmtDay(paydays[i]), payday: true, ...w });
    }
  }

  // Month grid
  const base = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = base.getFullYear(), month = base.getMonth();
  const dim = new Date(year, month + 1, 0).getDate();
  const firstW = (new Date(year, month, 1).getDay() + 6) % 7;
  const monthLabel = base.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const monthStart = new Date(year, month, 1), monthEnd = new Date(year, month + 1, 1);
  const paydaySet = new Set(paydays.filter((p) => p.getFullYear() === year && p.getMonth() === month).map((p) => p.getDate()));
  const dueByDay = {};
  items.forEach((it) => occurrences(it.freq, it.day, it.dow, anchor, monthStart, monthEnd).forEach((d) => { (dueByDay[d.getDate()] ||= []).push(it); }));
  const cells = [...Array(firstW).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];

  return (
    <div className="mx-auto max-w-[1160px]">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight">Planner</h1>
          <p className="mt-1 text-sm text-muted">When your bills &amp; debts are due, and what to set aside each payday.</p>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-border bg-[#0c121d] px-3 py-1.5 text-[12px] text-muted">
          Next payday
          <input type="date" value={state.payAnchor || ""} onChange={(e) => update((s) => ({ ...s, payAnchor: e.target.value }))}
            className="bg-transparent text-[13px] text-ink outline-none" />
        </label>
      </header>

      {!items.length ? (
        <Card>
          <p className="text-[13px] text-muted">Add a <b className="text-ink">due date</b> to your debts (Debt tab → ✎) or a schedule to your bills (Budget tab → Edit), and they'll appear here with a payday plan.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_330px] lg:items-start">
          {/* Calendar */}
          <Card className="lg:p-5">
            <div className="mb-3 flex items-center justify-between">
              <button onClick={() => setMonthOffset((m) => m - 1)} className="rounded-lg border border-border bg-[#0c121d] p-1.5 text-ink transition hover:border-accent hover:text-accent"><Chevron dir="left" /></button>
              <span className="text-[15px] font-bold">{monthLabel}</span>
              <button onClick={() => setMonthOffset((m) => m + 1)} className="rounded-lg border border-border bg-[#0c121d] p-1.5 text-ink transition hover:border-accent hover:text-accent"><Chevron dir="right" /></button>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-[.05em] text-muted">
              {WD.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="mt-1.5 grid grid-cols-7 gap-1.5">
              {cells.map((day, i) => {
                if (!day) return <span key={i} />;
                const isToday = sameDay(new Date(year, month, day), today);
                const due = dueByDay[day] || [];
                const isPay = paydaySet.has(day);
                return (
                  <div key={i} className={`flex min-h-[62px] flex-col rounded-lg border p-1.5 transition ${isToday ? "border-accent bg-[#0c1a15]" : isPay ? "border-[#1f5c3a]/60 bg-[#0c1a15]/60" : "border-border bg-[#0c121d]"}`}>
                    <div className="mb-0.5 flex items-center justify-between">
                      <span className={`text-[11px] ${isToday ? "font-bold text-accent" : "text-muted"}`}>{day}</span>
                      {isPay && <span className="text-[10px]" title="Payday">💷</span>}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {due.slice(0, 3).map((it, j) => (
                        <span key={j} className="truncate rounded px-1 py-px text-[9px] font-semibold leading-tight" style={{ background: it.bg, color: it.tx, boxShadow: `inset 2px 0 0 ${it.tx}` }} title={`${it.name} · ${fmt(it.perOcc)}`}>{it.name}</span>
                      ))}
                      {due.length > 3 && <span className="text-[9px] text-muted">+{due.length - 3} more</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
              <span>💷 Payday</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "#f87171" }} /> Debt</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "#4cb8f0" }} /> Bill</span>
            </div>
          </Card>

          {/* Payday plan */}
          <div className="flex max-h-[560px] flex-col gap-2.5 overflow-y-auto thin-scroll pr-1">
            {!state.payAnchor && (
              <div className="rounded-xl border border-[#5a3d12] bg-[#1c1407] px-3.5 py-2.5 text-[13px] text-warn">Set your next payday above to see what to set aside each payday.</div>
            )}
            {sched.map((w, i) => (
              <div key={i} className="rounded-xl border border-border bg-[#0c121d] p-3">
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-bold">{w.payday ? `💷 ${w.label}` : `⏰ ${w.label}`}</span>
                  <span className={`shrink-0 text-[13px] font-bold ${w.total > 0 ? "text-warn" : "text-good"}`}>{w.total > 0 ? `set aside ${fmt(w.total)}` : "nothing due"}</span>
                </div>
                {w.due.length ? w.due.map((x, j) => (
                  <div key={j} className="flex items-center justify-between gap-2 text-[12px] text-muted">
                    <span className="inline-flex min-w-0 items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: x.it.tx }} /><span className="truncate">{x.it.name}</span></span>
                    <b className="shrink-0 text-ink tabular-nums">{fmt(x.amount)}</b>
                  </div>
                )) : <div className="text-[12px] text-muted">Nothing due before the next payday.</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
