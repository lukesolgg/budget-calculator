import { useState } from "react";
import { Button, Choice, MoneyInput, Chevron } from "../components/ui.jsx";
import {
  usePlanner, monthlyIncomeOf, debtsOf, DEBT_PLACEHOLDERS, MAX_DEBTS,
} from "../state.jsx";
import { fmt } from "../lib/engine.js";

const STEPS = ["freq", "income", "mortgage", "car", "debts"];

export default function Wizard({ onDone, onExitTop }) {
  const { state, update } = usePlanner();
  const [idx, setIdx] = useState(0);
  const step = STEPS[idx];
  const income = monthlyIncomeOf(state);
  const validDebts = debtsOf(state).length;

  const next = () => {
    if (step === "income" && income <= 0) return;
    if (idx < STEPS.length - 1) setIdx(idx + 1);
    else onDone();
  };
  const back = () => (idx > 0 ? setIdx(idx - 1) : onExitTop());

  return (
    <div className="mx-auto mt-[4vh] max-w-[600px]">
      <div className="mb-7 h-1.5 overflow-hidden rounded-full bg-[#1a2230]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#3b86ff] to-[#4ea8ff] transition-[width] duration-300"
          style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div key={step} className="animate-pop">
        {step === "freq" && <FreqStep state={state} update={update} />}
        {step === "income" && <IncomeStep state={state} update={update} income={income} />}
        {step === "mortgage" && <MortgageStep state={state} update={update} />}
        {step === "car" && <CarStep state={state} update={update} />}
        {step === "debts" && <DebtsStep state={state} update={update} validDebts={validDebts} />}
      </div>

      <div className="mt-[30px] flex gap-3">
        <Button variant="ghost" onClick={back}>Back</Button>
        <div className="flex-1" />
        <Button onClick={next}>
          {idx === STEPS.length - 1 ? "Continue to budget" : "Continue"} <Chevron />
        </Button>
      </div>
    </div>
  );
}

function Kicker({ children }) {
  return <div className="text-[13px] font-bold uppercase tracking-[.08em] text-accent">{children}</div>;
}
function StepHead({ kicker, title, sub }) {
  return (
    <>
      <Kicker>{kicker}</Kicker>
      <h2 className="mb-1.5 mt-1.5 text-[27px] font-bold tracking-tight">{title}</h2>
      <p className="mb-[26px] text-[15px] leading-snug text-muted">{sub}</p>
    </>
  );
}

function FreqStep({ state, update }) {
  const opts = [
    { v: "weekly", label: "Weekly", per: "52 / year" },
    { v: "fortnightly", label: "Fortnightly", per: "26 / year" },
    { v: "monthly", label: "Monthly", per: "12 / year" },
  ];
  return (
    <>
      <StepHead kicker="Getting started" title="How often are you paid?" sub="We'll tailor your plan so it matches your payday rhythm." />
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-[#0c121d] p-1.5">
        {opts.map((o) => (
          <div
            key={o.v}
            onClick={() => update({ payFrequency: o.v })}
            className={`cursor-pointer rounded-[10px] px-2.5 py-3.5 text-center text-sm font-semibold transition ${
              state.payFrequency === o.v
                ? "bg-gradient-to-b from-[#3b86ff] to-[#246cf0] text-white shadow-[0_6px_16px_-6px_rgba(36,108,240,.6)]"
                : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
            <small className="mt-0.5 block text-[11px] font-normal opacity-80">{o.per}</small>
          </div>
        ))}
      </div>
    </>
  );
}

function IncomeStep({ state, update, income }) {
  const q = {
    weekly: "What's your weekly take-home pay?",
    fortnightly: "What's your fortnightly take-home pay?",
    monthly: "What's your monthly take-home pay?",
  }[state.payFrequency];
  return (
    <>
      <StepHead kicker="Your money" title={q} sub="The amount that actually lands in your account, after tax." />
      <div className="mx-auto max-w-[320px]">
        <MoneyInput big value={state.income} onChange={(v) => update({ income: v })} placeholder="0" />
      </div>
      <div className="mt-3 min-h-[18px] text-center text-[13px] text-muted">
        {income > 0 && state.payFrequency !== "monthly" && (
          <>That's about <b className="text-good">{fmt(income)}</b> per month.</>
        )}
      </div>
    </>
  );
}

function YesNo({ value, onChange, yes, no }) {
  return (
    <div className="grid grid-cols-2 gap-3.5">
      <Choice selected={value === true} {...yes} onClick={() => onChange(true)} />
      <Choice selected={value === false} {...no} onClick={() => onChange(false)} />
    </div>
  );
}

function MortgageStep({ state, update }) {
  const m = state.mortgage;
  const setM = (patch) => update((s) => ({ ...s, mortgage: { ...s.mortgage, ...patch } }));
  return (
    <>
      <StepHead kicker="Your situation" title="Do you have a mortgage?" sub={'If so, it replaces "rent" in your budget later.'} />
      <YesNo
        value={m.on}
        onChange={(v) => setM({ on: v })}
        yes={{ emoji: "🏠", title: "Yes", desc: "I pay a mortgage" }}
        no={{ emoji: "🔑", title: "No", desc: "I rent or live rent-free" }}
      />
      {m.on && (
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <Field label="Monthly mortgage payment"><MoneyInput value={m.payment} onChange={(v) => setM({ payment: v })} placeholder="1200" /></Field>
          <Field label="Balance remaining (optional)"><MoneyInput value={m.balance} onChange={(v) => setM({ balance: v })} placeholder="185000" /></Field>
          <Field label="Interest rate (optional)"><PctInput value={m.rate} onChange={(v) => setM({ rate: v })} placeholder="4.5" /></Field>
        </div>
      )}
    </>
  );
}

function CarStep({ state, update }) {
  const c = state.car;
  const setC = (patch) => update((s) => ({ ...s, car: { ...s.car, ...patch } }));
  return (
    <>
      <StepHead kicker="Your situation" title="Do you have a car loan?" sub="We'll fold it into your payoff plan alongside your cards." />
      <YesNo
        value={c.on}
        onChange={(v) => setC({ on: v })}
        yes={{ emoji: "🚗", title: "Yes", desc: "I'm paying off a car" }}
        no={{ emoji: "🚌", title: "No", desc: "No car finance" }}
      />
      {c.on && (
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <Field label="Balance remaining"><MoneyInput value={c.balance} onChange={(v) => setC({ balance: v })} placeholder="8200" /></Field>
          <Field label="Monthly payment"><MoneyInput value={c.payment} onChange={(v) => setC({ payment: v })} placeholder="210" /></Field>
          <Field label="Interest rate"><PctInput value={c.rate} onChange={(v) => setC({ rate: v })} placeholder="7.4" /></Field>
        </div>
      )}
    </>
  );
}

function DebtsStep({ state, update, validDebts }) {
  const setDebt = (i, patch) =>
    update((s) => ({ ...s, debts: s.debts.map((d, j) => (j === i ? { ...d, ...patch } : d)) }));
  const addDebt = () =>
    update((s) => (s.debts.length >= MAX_DEBTS ? s : { ...s, debts: [...s.debts, { name: "", bal: "", min: "", rate: "", iffree: false, ifuntil: "" }] }));
  const delDebt = (i) =>
    update((s) => ({ ...s, debts: s.debts.filter((_, j) => j !== i) }));

  const minTotal = (state.hasDebt ? state.debts : []).reduce(
    (sum, d) => sum + (parseFloat(d.bal) > 0 ? Math.max(0, parseFloat(d.min) || 0) : 0), 0);

  return (
    <>
      <StepHead kicker="The big one" title="What debts are you tackling?" sub="Credit cards, overdrafts, personal loans — add each one." />
      <div className="mb-5 grid grid-cols-2 gap-3.5">
        <Choice selected={state.hasDebt === true} emoji="💳" title="I have debts" desc="Let's clear them" onClick={() => update({ hasDebt: true })} />
        <Choice selected={state.hasDebt === false} emoji="🎉" title="I'm debt-free" desc="Just budgeting" onClick={() => update({ hasDebt: false })} />
      </div>

      {state.hasDebt && (
        <div>
          {state.debts.map((d, i) => {
            const ph = DEBT_PLACEHOLDERS[i % DEBT_PLACEHOLDERS.length];
            return (
              <div key={i} className="mb-4 border-b border-border pb-4 last:border-0">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_1fr_.85fr_44px] sm:items-end">
                  <Field label="Debt name">
                    <input value={d.name} placeholder={`e.g. ${ph.name}`} onChange={(e) => setDebt(i, { name: e.target.value })}
                      className="w-full rounded-[10px] border border-border bg-[#0c121d] px-3 py-[11px] text-[15px] text-ink outline-none focus:border-accent" />
                  </Field>
                  <Field label="Total balance"><MoneyInput value={d.bal} onChange={(v) => setDebt(i, { bal: v })} placeholder={ph.bal} /></Field>
                  <Field label="Min. monthly payment"><MoneyInput value={d.min} onChange={(v) => setDebt(i, { min: v })} placeholder={ph.min} /></Field>
                  <Field label="Interest rate"><PctInput value={d.rate} onChange={(v) => setDebt(i, { rate: v })} placeholder={ph.rate} dim={d.iffree} /></Field>
                  <button onClick={() => delDebt(i)} title="Remove debt"
                    className="h-11 rounded-[10px] border border-border bg-[#1a2230] text-xl leading-none text-bad hover:brightness-125">×</button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3.5">
                  <label className="inline-flex cursor-pointer select-none items-center gap-2 text-[13px]">
                    <GlowCheck checked={d.iffree} onChange={(v) => setDebt(i, { iffree: v })} /> Interest-free period (e.g. 0% credit card)
                  </label>
                  {d.iffree && (
                    <span className="inline-flex items-center gap-2 text-[13px] text-muted">
                      until
                      <input type="month" value={d.ifuntil} onChange={(e) => setDebt(i, { ifuntil: e.target.value })}
                        className="rounded-[10px] border border-border bg-[#0c121d] px-2.5 py-2 text-sm text-ink outline-none focus:border-accent" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <Button variant="ghost" onClick={addDebt} disabled={state.debts.length >= MAX_DEBTS} className="mt-1 px-3.5 py-[9px] text-[13px]">
            + Add Card / Loan
          </Button>

          <div className="mt-2.5 flex items-center justify-between border-t border-border pt-4">
            <span className="text-[13px] uppercase tracking-[.06em] text-muted">Total minimum monthly payments</span>
            <span className="text-[22px] font-bold">{fmt(minTotal)}</span>
          </div>
        </div>
      )}
    </>
  );
}

// ---- little field helpers ----
function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] uppercase tracking-[.06em] text-muted">{label}</label>
      {children}
    </div>
  );
}
function PctInput({ value, onChange, placeholder, dim }) {
  return (
    <span className="relative block">
      <input type="number" inputMode="decimal" min="0" step="0.1" value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-[10px] border border-border bg-[#0c121d] py-[11px] pl-3 pr-7 text-[15px] text-ink outline-none focus:border-accent ${dim ? "opacity-40" : ""}`} />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
    </span>
  );
}
function GlowCheck({ checked, onChange }) {
  return (
    <span onClick={() => onChange(!checked)}
      className={`relative inline-block h-5 w-5 flex-shrink-0 cursor-pointer rounded-md border-2 transition ${
        checked ? "border-[#4ea8ff] bg-gradient-to-br from-[#3b86ff] to-[#246cf0] shadow-[0_0_12px_-2px_#4ea8ff]" : "border-[#36507e] bg-[#0c121d]"
      }`}>
      {checked && <span className="absolute inset-0 flex items-center justify-center text-[13px] font-extrabold text-white">✓</span>}
    </span>
  );
}
