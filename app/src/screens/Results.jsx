import { useState } from "react";
import { Button, Card, Chevron, MoneyInput } from "../components/ui.jsx";
import Donut from "../components/Donut.jsx";
import {
  usePlanner, monthlyIncomeOf, debtsOf, livingOf, expenseItemsOf, billDueItemsOf,
} from "../state.jsx";
import { fmt, monthsToStr, buildPlans, monthsUntil } from "../lib/engine.js";

// Highlight colour for a debt: green = interest-free with time, orange =
// interest-free running out, red = interest already accruing (no 0% period).
function debtTone(freeMonths) {
  if (freeMonths > 6) return { bd: "#1f5c3a", bg: "#0c1f16", tx: "#3ad07f", label: `0% · ${freeMonths} mo left` };
  if (freeMonths > 0) return { bd: "#5a3d12", bg: "#1c1407", tx: "#f0b86a", label: `0% · ${freeMonths} mo left` };
  return { bd: "#5a1f1f", bg: "#1a0f0f", tx: "#f87171", label: "Accruing interest" };
}

const COLOR_BY = { green: "#3ad07f", orange: "#f5953a", red: "#f0556f" };

// ---- payment-calendar date helpers ----
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dueDayFromDate = (s) => (s ? new Date(s + "T00:00").getDate() : "");
function nextDateForDay(day) {
  // next "YYYY-MM-DD" with this day-of-month (this month if not passed, else next)
  const t = startOfToday();
  let dt = clampedDate(t.getFullYear(), t.getMonth(), day);
  if (dt < t) dt = clampedDate(t.getFullYear(), t.getMonth() + 1, day);
  return toISO(dt);
}
function clampedDate(year, month, day) {
  const dim = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, dim));
}
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function advancePayday(d, freq) {
  const n = new Date(d);
  if (freq === "monthly") n.setMonth(n.getMonth() + 1);
  else n.setDate(n.getDate() + (freq === "fortnightly" ? 14 : 7));
  return n;
}
function generatePaydays(anchorISO, freq, count) {
  let d = new Date(anchorISO + "T00:00");
  const today = startOfToday();
  let guard = 0;
  while (d < today && guard < 1000) { d = advancePayday(d, freq); guard++; }
  const out = [];
  for (let i = 0; i < count; i++) { out.push(new Date(d)); d = advancePayday(d, freq); }
  return out;
}
function nextDueOnOrAfter(dueDay, from) {
  let dt = clampedDate(from.getFullYear(), from.getMonth(), dueDay);
  if (dt < from) dt = clampedDate(from.getFullYear(), from.getMonth() + 1, dueDay);
  return dt;
}
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fmtDay = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

export default function Results({ onBack, onPickPlan, embedded, onboarding }) {
  const { state, update } = usePlanner();
  const income = monthlyIncomeOf(state);
  const debts = debtsOf(state);
  const living = livingOf(state);
  const noDebt = debts.length === 0;

  const expItems = expenseItemsOf(state);
  const totalExpenses = expItems.reduce((s, c) => s + c.value, 0);
  const leftover = income - totalExpenses;

  const { plans, available, minTotal, surplus } = buildPlans(debts, income, living);

  const pick = (k) => { update({ selectedPlan: k }); onPickPlan(k); };

  return (
    <div className="mx-auto max-w-[1100px]">
      {!embedded && (
        <div className="mb-[18px] flex items-center gap-3">
          <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-[#1e2b27] bg-[#101a18] px-[18px] py-2.5 text-sm font-semibold text-ink transition hover:brightness-125">
            <Chevron dir="left" /> {onboarding ? "Back to budget" : "Back to dashboard"}
          </button>
        </div>
      )}

      {onboarding && (
        <div className="mb-6 rounded-2xl border border-[#1e3a30] bg-[#0c1a15] px-5 py-4 text-center">
          <div className="text-[11px] font-bold uppercase tracking-[.1em] text-accent">Last step</div>
          <h1 className="mt-1 text-[22px] font-extrabold tracking-tight">Choose your payoff plan</h1>
          <p className="mt-1 text-sm text-muted">Pick the pace that suits you — you can change it any time from your dashboard.</p>
        </div>
      )}

      {embedded && !onboarding && (
        <header className="mb-5">
          <h1 className="text-[22px] font-extrabold tracking-tight">Debt</h1>
          <p className="mt-1 text-sm text-muted">Track your debts, log payments, and choose how fast to clear them.</p>
        </header>
      )}

      {!onboarding && <DebtManager />}
      {!onboarding && <DebtCalendar />}

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

// Log a payment / add / edit a debt — updates balances without re-onboarding.
function DebtManager() {
  const { state, update } = usePlanner();
  const [mode, setMode] = useState(null);     // null | "pay" | "add" | "edit"
  const [editItem, setEditItem] = useState(null);
  const [flash, setFlash] = useState("");
  const [celebrate, setCelebrate] = useState("");
  const [hideReminder, setHideReminder] = useState(false);

  const items = [];
  state.debts.forEach((d, i) => {
    if ((parseFloat(d.bal) || 0) > 0) items.push({ id: `d${i}`, kind: "debt", index: i, name: (d.name || "").trim() || `Debt ${i + 1}`, bal: parseFloat(d.bal) || 0, rate: parseFloat(d.rate) || 0, freeMonths: d.iffree ? monthsUntil(d.ifuntil) : 0 });
  });
  if (state.car.on && (parseFloat(state.car.balance) || 0) > 0) {
    items.push({ id: "car", kind: "car", name: "Car Loan", bal: parseFloat(state.car.balance) || 0, rate: parseFloat(state.car.rate) || 0, freeMonths: 0 });
  }
  items.sort((a, b) => b.bal - a.bal); // biggest first
  const total = items.reduce((s, x) => s + x.bal, 0);

  const baseline = Math.max(state.debtBaseline || 0, total);
  const cleared = Math.max(0, baseline - total);
  const clearedPct = baseline > 0 ? Math.min(100, (cleared / baseline) * 100) : 0;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const showReminder = !hideReminder && items.length > 0 && state.lastPaymentMonth !== thisMonth && mode !== "pay";

  const flashMsg = (m) => { setFlash(m); setTimeout(() => setFlash(""), 3500); };

  const pay = (item, amt) => {
    const a = Math.max(0, amt);
    if (item.kind === "car") {
      update((s) => ({ ...s, car: { ...s.car, balance: String(Math.max(0, (parseFloat(s.car.balance) || 0) - a)) }, lastPaymentMonth: thisMonth }));
    } else {
      update((s) => ({ ...s, debts: s.debts.map((d, j) => (j === item.index ? { ...d, bal: String(Math.max(0, (parseFloat(d.bal) || 0) - a)) } : d)), lastPaymentMonth: thisMonth }));
    }
    if (a >= item.bal - 0.005) {
      const last = total - item.bal <= 0.5;
      setCelebrate(last ? "🎉 You're completely debt-free! Incredible work." : `🎉 ${item.name} is gone! One less debt.`);
      setTimeout(() => setCelebrate(""), 6000);
    } else {
      flashMsg(`−${fmt(a)} off ${item.name}. New balance ${fmt(Math.max(0, item.bal - a))}.`);
    }
    setMode(null);
  };

  const add = (deb) => {
    update((s) => ({ ...s, hasDebt: true, debts: [...s.debts, { name: deb.name.trim() || "New debt", bal: deb.bal, min: deb.min, rate: deb.rate, iffree: deb.iffree, ifuntil: deb.ifuntil, dueDay: deb.dueDay }] }));
    flashMsg(`Added ${deb.name.trim() || "new debt"} (${fmt(parseFloat(deb.bal) || 0)}).`);
    setMode(null);
  };

  const openEdit = (it) => { setEditItem(it); setMode("edit"); };

  return (
    <Card className="mb-7">
      {celebrate && (
        <div className="mb-4 animate-pop rounded-2xl border border-[#1f5c3a] bg-gradient-to-r from-[#11301f] to-[#0c1a15] px-5 py-4 text-center text-[17px] font-extrabold text-good shadow-[0_0_40px_-12px_#2fe6a6]">
          {celebrate}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Your debts</h3>
          <p className="text-[13px] text-muted">Total owed <b className="text-ink">{fmt(total)}</b></p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setMode(mode === "pay" ? null : "pay")} disabled={!items.length} className="px-3.5 py-2 text-[13px]">💸 Log a payment</Button>
          <Button variant="ghost" onClick={() => setMode(mode === "add" ? null : "add")} className="px-3.5 py-2 text-[13px]">＋ Add a debt</Button>
        </div>
      </div>

      {/* Progress: how much cleared since starting */}
      {cleared > 0.5 && (
        <div className="mt-3.5">
          <div className="mb-1 flex items-baseline justify-between text-[12px]">
            <span className="text-muted">Cleared so far</span>
            <span className="font-bold text-good">{fmt(cleared)} <span className="font-normal text-muted">of {fmt(baseline)}</span></span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#0a0f17]">
            <div className="h-full rounded-full bg-gradient-to-r from-[#12b886] to-[#2fe6a6]" style={{ width: `${clearedPct}%` }} />
          </div>
        </div>
      )}

      {flash && <div className="mt-3 rounded-lg border border-[#1f5c3a] bg-[#11301f] px-3.5 py-2 text-[13px] text-good">{flash}</div>}

      {showReminder && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#5a3d12] bg-[#1c1407] px-3.5 py-2.5 text-[13px] text-warn">
          <span>🔔 Made a payment this month? Log it to keep your plan accurate.</span>
          <span className="flex gap-2">
            <button onClick={() => setMode("pay")} className="font-semibold text-accent hover:underline">Log a payment</button>
            <button onClick={() => setHideReminder(true)} className="text-muted hover:text-ink">Dismiss</button>
          </span>
        </div>
      )}

      {items.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((it) => {
            const tone = debtTone(it.freeMonths);
            return (
              <div key={it.id} className="flex items-center justify-between gap-2 rounded-xl border bg-[#0c121d] px-3.5 py-2.5" style={{ borderColor: tone.bd, borderLeftWidth: 4 }}>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{it.name}</span>
                  <span className="text-[11px] font-semibold" style={{ color: tone.tx }}>{tone.label}{it.freeMonths === 0 && it.rate > 0 ? ` · ${it.rate}%` : ""}</span>
                </span>
                <span className="flex items-center gap-2.5">
                  <span className="font-bold tabular-nums">{fmt(it.bal)}</span>
                  <button onClick={() => openEdit(it)} className="text-muted transition hover:text-accent" title="Edit" aria-label={`Edit ${it.name}`}>✎</button>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-muted">No debts on record. Add one to build a payoff plan.</p>
      )}

      {mode === "pay" && <PayForm items={items} onCancel={() => setMode(null)} onPay={pay} />}
      {mode === "add" && <AddForm onCancel={() => setMode(null)} onAdd={add} />}
      {mode === "edit" && editItem && <EditForm item={editItem} onCancel={() => setMode(null)} onSaved={(m) => { flashMsg(m); setMode(null); }} />}
    </Card>
  );
}

// Edit an existing debt's details (name / balance / min / rate / 0% period).
function EditForm({ item, onCancel, onSaved }) {
  const { state, update } = usePlanner();
  const isCar = item.kind === "car";
  const raw = isCar ? state.car : (state.debts[item.index] || {});
  const [d, setD] = useState(
    isCar
      ? { bal: raw.balance ?? "", min: raw.payment ?? "", rate: raw.rate ?? "", due: raw.dueDay ? nextDateForDay(+raw.dueDay) : "" }
      : { name: raw.name ?? "", bal: raw.bal ?? "", min: raw.min ?? "", rate: raw.rate ?? "", iffree: !!raw.iffree, ifuntil: raw.ifuntil ?? "", due: raw.dueDay ? nextDateForDay(+raw.dueDay) : "" }
  );
  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));

  const save = () => {
    const dueDay = dueDayFromDate(d.due);
    if (isCar) {
      update((s) => ({ ...s, car: { ...s.car, balance: d.bal, payment: d.min, rate: d.rate, dueDay } }));
    } else {
      update((s) => ({ ...s, debts: s.debts.map((x, j) => (j === item.index ? { ...x, name: d.name, bal: d.bal, min: d.min, rate: d.rate, iffree: d.iffree, ifuntil: d.iffree ? d.ifuntil : "", dueDay } : x)) }));
    }
    onSaved(`Updated ${isCar ? "Car Loan" : (d.name || "debt")}.`);
  };

  const remove = () => {
    if (!window.confirm(`Remove ${isCar ? "your car loan" : (d.name || "this debt")}? This deletes it from your plan.`)) return;
    if (isCar) update((s) => ({ ...s, car: { ...s.car, on: false, balance: "", payment: "", rate: "" } }));
    else update((s) => ({ ...s, debts: s.debts.filter((_, j) => j !== item.index) }));
    onSaved(`Removed ${isCar ? "Car Loan" : (d.name || "debt")}.`);
  };

  return (
    <div className="mt-4 rounded-xl border border-border bg-[#0c121d] p-4">
      <h4 className="mb-3 font-semibold">Edit {isCar ? "Car Loan" : (raw.name || "debt")}</h4>
      <div className="grid gap-3 sm:grid-cols-4">
        {!isCar && (
          <MiniField label="Name">
            <input value={d.name} onChange={(e) => set("name", e.target.value)}
              className="w-full rounded-[10px] border border-border bg-[#0b0f17] px-3 py-[11px] text-[15px] text-ink outline-none focus:border-accent" />
          </MiniField>
        )}
        <MiniField label="Balance"><MoneyInput value={d.bal} onChange={(v) => set("bal", v)} /></MiniField>
        <MiniField label={isCar ? "Monthly payment" : "Min / month"}><MoneyInput value={d.min} onChange={(v) => set("min", v)} /></MiniField>
        <MiniField label="Rate">
          <span className="relative block">
            <input type="number" inputMode="decimal" min="0" step="0.1" value={d.rate} onChange={(e) => set("rate", e.target.value)}
              className="w-full rounded-[10px] border border-border bg-[#0b0f17] py-[11px] pl-3 pr-7 text-[15px] text-ink outline-none focus:border-accent" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
          </span>
        </MiniField>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
        <span className="inline-flex items-center gap-2 text-muted">Next payment due
          <input type="date" value={d.due} onChange={(e) => set("due", e.target.value)}
            className="rounded-[10px] border border-border bg-[#0b0f17] px-2.5 py-2 text-sm text-ink outline-none focus:border-accent" />
        </span>
      </div>

      {!isCar && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={d.iffree} onChange={(e) => set("iffree", e.target.checked)} className="h-4 w-4 accent-[#2fe6a6]" />
            Interest-free period (0%)
          </label>
          {d.iffree && (
            <span className="inline-flex items-center gap-2 text-muted">until
              <input type="month" value={d.ifuntil} onChange={(e) => set("ifuntil", e.target.value)}
                className="rounded-[10px] border border-border bg-[#0b0f17] px-2.5 py-2 text-sm text-ink outline-none focus:border-accent" />
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={save} className="px-4 py-2.5 text-sm">Save changes</Button>
        <Button variant="ghost" onClick={onCancel} className="px-3.5 py-2.5 text-sm">Cancel</Button>
        <div className="flex-1" />
        <button onClick={remove} className="rounded-xl border border-[#5a1f1f] bg-[#1a0f0f] px-3.5 py-2.5 text-sm font-semibold text-bad transition hover:brightness-125">Remove</button>
      </div>
    </div>
  );
}

function MiniField({ label, children }) {
  return <div><label className="mb-1.5 block text-[11px] uppercase tracking-[.06em] text-muted">{label}</label>{children}</div>;
}

function PayForm({ items, onCancel, onPay }) {
  const [sel, setSel] = useState(items[0]?.id || "");
  const [amt, setAmt] = useState("");
  const item = items.find((i) => i.id === sel) || items[0];
  const value = parseFloat(amt) || 0;
  return (
    <div className="mt-4 rounded-xl border border-border bg-[#0c121d] p-4">
      <h4 className="mb-3 font-semibold">Log a payment</h4>
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
        <MiniField label="Which debt">
          <select value={sel} onChange={(e) => setSel(e.target.value)}
            className="w-full rounded-[10px] border border-border bg-[#0b0f17] px-3 py-[11px] text-[15px] text-ink outline-none focus:border-accent">
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} — {fmt(i.bal)}</option>)}
          </select>
        </MiniField>
        <MiniField label="Amount you paid"><MoneyInput value={amt} onChange={setAmt} placeholder="500" /></MiniField>
        <div className="flex gap-2">
          <Button onClick={() => item && value > 0 && onPay(item, Math.min(value, item.bal))} disabled={!item || value <= 0} className="px-4 py-3 text-sm">Confirm</Button>
          <Button variant="ghost" onClick={onCancel} className="px-3.5 py-3 text-sm">Cancel</Button>
        </div>
      </div>
      {item && value > 0 && (
        <p className="mt-2.5 text-[12px] text-muted">{item.name} drops to <b className="text-good">{fmt(Math.max(0, item.bal - value))}</b>{value >= item.bal ? " — cleared! 🎉" : "."}</p>
      )}
    </div>
  );
}

function AddForm({ onCancel, onAdd }) {
  const [d, setD] = useState({ name: "", bal: "", min: "", rate: "", iffree: false, ifuntil: "", due: "" });
  const set = (k, v) => setD((s) => ({ ...s, [k]: v }));
  const ok = (parseFloat(d.bal) || 0) > 0;
  const submit = () => ok && onAdd({ ...d, dueDay: dueDayFromDate(d.due) });
  return (
    <div className="mt-4 rounded-xl border border-border bg-[#0c121d] p-4">
      <h4 className="mb-3 font-semibold">Add a debt</h4>
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_.8fr]">
        <MiniField label="Name">
          <input value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Santander"
            className="w-full rounded-[10px] border border-border bg-[#0b0f17] px-3 py-[11px] text-[15px] text-ink outline-none focus:border-accent" />
        </MiniField>
        <MiniField label="Balance"><MoneyInput value={d.bal} onChange={(v) => set("bal", v)} placeholder="2500" /></MiniField>
        <MiniField label="Min / month"><MoneyInput value={d.min} onChange={(v) => set("min", v)} placeholder="75" /></MiniField>
        <MiniField label="Rate">
          <span className="relative block">
            <input type="number" inputMode="decimal" min="0" step="0.1" value={d.rate} onChange={(e) => set("rate", e.target.value)} placeholder="22.9"
              className="w-full rounded-[10px] border border-border bg-[#0b0f17] py-[11px] pl-3 pr-7 text-[15px] text-ink outline-none focus:border-accent" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
          </span>
        </MiniField>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
        <span className="inline-flex items-center gap-2 text-muted">Next payment due
          <input type="date" value={d.due} onChange={(e) => set("due", e.target.value)}
            className="rounded-[10px] border border-border bg-[#0b0f17] px-2.5 py-2 text-sm text-ink outline-none focus:border-accent" />
        </span>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={d.iffree} onChange={(e) => set("iffree", e.target.checked)} className="h-4 w-4 accent-[#2fe6a6]" />
          Interest-free period (0%)
        </label>
        {d.iffree && (
          <span className="inline-flex items-center gap-2 text-muted">until
            <input type="month" value={d.ifuntil} onChange={(e) => set("ifuntil", e.target.value)}
              className="rounded-[10px] border border-border bg-[#0b0f17] px-2.5 py-2 text-sm text-ink outline-none focus:border-accent" />
          </span>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={submit} disabled={!ok} className="px-4 py-2.5 text-sm">Add debt</Button>
        <Button variant="ghost" onClick={onCancel} className="px-3.5 py-2.5 text-sm">Cancel</Button>
      </div>
    </div>
  );
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

// Payment calendar + "what to pay each payday" — uses each debt's due day and
// the user's payday anchor (recurred by pay frequency).
function DebtCalendar() {
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

  if (!items.length) {
    return (
      <Card className="mb-7">
        <h3 className="text-lg font-bold">Payment calendar</h3>
        <p className="mt-1 text-[13px] text-muted">Add a <b className="text-ink">due date</b> to your debts (tap ✎ above) or set a <b className="text-ink">Due</b> day on your bills in the Budget tab, and we'll show when each is due and which payday covers it.</p>
      </Card>
    );
  }

  const anchor = state.payAnchor;
  const today = startOfToday();
  const paydays = anchor ? generatePaydays(anchor, freq, 14) : [];

  // What to set aside on each upcoming payday (bills due before the next one).
  const sched = [];
  if (paydays.length) {
    const pre = items.map((it) => ({ it, date: nextDueOnOrAfter(it.dueDay, today) })).filter((x) => x.date < paydays[0]);
    if (pre.length) sched.push({ label: "Before your next payday", due: pre });
    for (let i = 0; i < Math.min(3, paydays.length); i++) {
      const start = paydays[i], end = paydays[i + 1] || advancePayday(paydays[i], freq);
      const due = items.map((it) => ({ it, date: nextDueOnOrAfter(it.dueDay, start) })).filter((x) => x.date >= start && x.date < end);
      sched.push({ label: fmtDay(paydays[i]), payday: true, due });
    }
  }

  // Month grid (Mon–Sun)
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
    <Card className="mb-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Payment calendar</h3>
          <p className="text-[13px] text-muted">When your bills &amp; debts are due — and what to set aside each payday.</p>
        </div>
        <label className="flex items-center gap-2 text-[12px] text-muted">
          Next payday
          <input type="date" value={anchor || ""} onChange={(e) => update((s) => ({ ...s, payAnchor: e.target.value }))}
            className="rounded-[10px] border border-border bg-[#0b0f17] px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-accent" />
        </label>
      </div>

      {!anchor ? (
        <p className="mt-3 rounded-lg border border-[#5a3d12] bg-[#1c1407] px-3.5 py-2.5 text-[13px] text-warn">
          Set your next payday above and we'll tell you which card to pay from each paycheck.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                    <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: x.it.tx }} />{x.it.name} · due {fmtDay(x.date)}</span>
                    <b className="text-ink tabular-nums">{fmt(x.it.amount)}</b>
                  </div>
                )) : <div className="text-[12px] text-muted">Nothing due before the next payday.</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* Month grid */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <button onClick={() => setMonthOffset((m) => m - 1)} className="rounded-lg border border-border bg-[#0c121d] px-2.5 py-1 text-sm text-ink hover:border-accent"><Chevron dir="left" /></button>
          <span className="text-[13px] font-bold">{monthLabel}</span>
          <button onClick={() => setMonthOffset((m) => m + 1)} className="rounded-lg border border-border bg-[#0c121d] px-2.5 py-1 text-sm text-ink hover:border-accent"><Chevron dir="right" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-[.04em] text-muted">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <span key={d}>{d}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <span key={i} />;
            const cellDate = new Date(year, month, day);
            const isToday = sameDay(cellDate, today);
            const due = dueByDay[day] || [];
            const isPay = paydaySet.has(day);
            return (
              <div key={i} className={`min-h-[52px] rounded-md border p-1 text-[10px] ${isToday ? "border-accent" : "border-border"} ${isPay ? "bg-[#0f241c]" : "bg-[#0c121d]"}`}>
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
          <span className="inline-flex items-center gap-1.5">💷 Payday</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: "#f87171" }} /> Payment due</span>
        </div>
      </div>
    </Card>
  );
}
