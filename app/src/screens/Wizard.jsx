import { useEffect, useRef, useState } from "react";
import { Button, Choice, MoneyInput, Chevron } from "../components/ui.jsx";
import {
  usePlanner, monthlyIncomeOf, debtsOf, DEBT_PLACEHOLDERS, MAX_DEBTS,
} from "../state.jsx";
import { useAuth } from "../lib/auth.jsx";
import { SECTIONS } from "../data/sections.js";
import { fmt } from "../lib/engine.js";

export default function Wizard({ firstRun, onDone, onExitTop }) {
  const { state, update } = usePlanner();
  const { session, signup } = useAuth();
  const income = monthlyIncomeOf(state);
  const validDebts = debtsOf(state).length;

  // Whether onboarding opens with the account step. Captured once: a new user
  // has no session at entry, and we keep the step in the list even after signup
  // so the step indices don't shift mid-flow.
  const includeAccount = useRef(firstRun && !session).current;

  // Dynamic step list. Car-loan details only appear if they own a car.
  const steps = [];
  if (includeAccount) steps.push("account", "goals");
  steps.push("age", "freq", "income", "mortgage", "carown");
  if (state.car.owns) steps.push("car");
  steps.push("pets", "debts");

  const [idx, setIdx] = useState(0);
  const safeIdx = Math.min(idx, steps.length - 1);
  const step = steps[safeIdx];
  const lastStep = safeIdx === steps.length - 1;

  // Local state for the account-creation step.
  const [acct, setAcct] = useState({ username: "", pin: "", err: "", busy: false });

  const next = async () => {
    if (step === "income" && income <= 0) return;
    if (step === "goals" && !state.goals.primary) return;
    if (step === "age") {
      const a = parseInt(state.age, 10);
      if (!a || a < 16 || a > 100) return;
    }
    if (step === "account" && !session) {
      const u = acct.username.trim().toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/.test(u)) return setAcct((s) => ({ ...s, err: "Username: 3–24 letters, numbers or underscores." }));
      if (!/^\d{4,6}$/.test(acct.pin)) return setAcct((s) => ({ ...s, err: "PIN must be 4–6 digits." }));
      setAcct((s) => ({ ...s, busy: true, err: "" }));
      const res = await signup(u, acct.pin);
      if (!res.ok) return setAcct((s) => ({ ...s, busy: false, err: res.error }));
      setAcct((s) => ({ ...s, busy: false }));
    }
    if (safeIdx < steps.length - 1) setIdx(safeIdx + 1);
    else onDone();
  };
  const back = () => (safeIdx > 0 ? setIdx(safeIdx - 1) : onExitTop());

  return (
    <div className="mx-auto mt-[4vh] max-w-[600px] md:max-w-[760px] lg:max-w-[900px]">
      <div className="mb-7 h-1.5 overflow-hidden rounded-full bg-[#1a2230]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#3b86ff] to-[#4ea8ff] transition-[width] duration-300"
          style={{ width: `${((safeIdx + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div key={step} className="animate-pop">
        {step === "account" && <AccountStep acct={acct} setAcct={setAcct} session={session} />}
        {step === "goals" && <GoalsStep state={state} update={update} />}
        {step === "age" && <AgeStep state={state} update={update} />}
        {step === "freq" && <FreqStep state={state} update={update} />}
        {step === "income" && <IncomeStep state={state} update={update} income={income} />}
        {step === "mortgage" && <MortgageStep state={state} update={update} />}
        {step === "carown" && <CarOwnStep state={state} update={update} />}
        {step === "car" && <CarStep state={state} update={update} />}
        {step === "pets" && <PetsStep state={state} update={update} />}
        {step === "debts" && <DebtsStep state={state} update={update} validDebts={validDebts} />}
      </div>

      <div className="mt-[30px] flex gap-3">
        <Button variant="ghost" onClick={back}>Back</Button>
        <div className="flex-1" />
        <Button onClick={next} disabled={acct.busy}>
          {step === "account" && !session
            ? (acct.busy ? "Creating…" : "Create account")
            : lastStep ? "Finish setup" : "Continue"}
          {!(step === "account" && acct.busy) && <Chevron />}
        </Button>
      </div>
    </div>
  );
}

function AccountStep({ acct, setAcct, session }) {
  if (session) {
    return (
      <>
        <StepHead kicker="Your account" title="You're all set" sub="Your progress now saves automatically to this account." />
        <div className="mx-auto max-w-[420px] rounded-2xl border border-[#1f5c3a] bg-[#11301f] px-4 py-5 text-center text-[15px]">
          Signed in as <b className="text-good">{session.username}</b> ✓
        </div>
      </>
    );
  }
  const set = (patch) => setAcct((s) => ({ ...s, ...patch, err: "" }));
  return (
    <>
      <StepHead
        kicker="First, secure your progress"
        title="Create your account"
        sub="Pick a username & PIN so you can log back into your plan on any device. No email needed."
      />
      <div className="mx-auto max-w-[420px]">
        <div className="mb-4">
          <Field label="Username">
            <input value={acct.username} onChange={(e) => set({ username: e.target.value })} maxLength={24} autoComplete="off"
              placeholder="e.g. luke_money"
              className="w-full rounded-[10px] border border-border bg-[#0c121d] px-3.5 py-3 text-base text-ink outline-none focus:border-accent" />
          </Field>
        </div>
        <div className="mb-3">
          <Field label="PIN (4–6 digits)">
            <input value={acct.pin} onChange={(e) => set({ pin: e.target.value.replace(/\D/g, "") })} maxLength={6} inputMode="numeric" autoComplete="off"
              placeholder="••••"
              className="w-full rounded-[10px] border border-border bg-[#0c121d] px-3.5 py-3 text-base text-ink outline-none focus:border-accent" />
          </Field>
        </div>
        <div className="min-h-[18px] text-[13px] text-bad">{acct.err}</div>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">Anonymous &amp; free. Your PIN protects your data — keep it safe, it can't be recovered.</p>
      </div>
    </>
  );
}

function CarOwnStep({ state, update }) {
  const setCar = (patch) => update((s) => ({ ...s, car: { ...s.car, ...patch } }));
  return (
    <>
      <StepHead
        kicker="Your situation"
        title="Do you own a car?"
        sub="Paid off or on finance, either counts. This decides whether we budget for petrol & car insurance."
      />
      <YesNo
        value={state.car.owns}
        onChange={(v) => setCar(v ? { owns: true } : { owns: false, on: false })}
        yes={{ emoji: "🚗", title: "Yes", desc: "I own / run a car" }}
        no={{ emoji: "🚶", title: "No", desc: "No car" }}
      />
    </>
  );
}

function PetsStep({ state, update }) {
  return (
    <>
      <StepHead
        kicker="Your situation"
        title="Do you have any pets?"
        sub="So we include pet food & insurance in your budget."
      />
      <YesNo
        value={state.pets.on}
        onChange={(v) => update((s) => ({ ...s, pets: { ...s.pets, on: v } }))}
        yes={{ emoji: "🐾", title: "Yes", desc: "I have pets" }}
        no={{ emoji: "🚫", title: "No", desc: "No pets" }}
      />
    </>
  );
}

function GoalsStep({ state, update }) {
  const { primary, interests } = state.goals;
  const setPrimary = (key) =>
    update((s) => ({ ...s, goals: { ...s.goals, primary: key } }));
  const toggleInterest = (key) =>
    update((s) => {
      const it = { ...s.goals.interests };
      if (it[key]) delete it[key]; else it[key] = true;
      return { ...s, goals: { ...s.goals, interests: it } };
    });

  return (
    <>
      <StepHead
        kicker="Make it yours"
        title="What do you want to focus on first?"
        sub="Pick your main goal — your dashboard will lead with it. You can always change this later."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SECTIONS.map((sec) => (
          <button
            key={sec.key}
            onClick={() => setPrimary(sec.key)}
            className={`relative flex flex-col items-center rounded-2xl border bg-[#0c121d] p-4 text-center transition hover:-translate-y-0.5 ${
              primary === sec.key
                ? "border-accent shadow-[0_0_0_1px_#2fe6a6,0_0_30px_-8px_#2fe6a6]"
                : "border-border hover:border-[#244a3c]"
            }`}
          >
            {primary === sec.key && <span className="absolute right-2.5 top-2 font-extrabold text-accent">✓</span>}
            <span className="mb-2 text-2xl">{sec.emoji}</span>
            <span className="text-[14px] font-bold leading-tight">{sec.title}</span>
            {!sec.live && <span className="mt-1 text-[10px] uppercase tracking-[.06em] text-muted">Coming soon</span>}
          </button>
        ))}
      </div>

      {primary && (
        <div className="mt-7">
          <h3 className="text-[15px] font-bold">Anything else you're interested in?</h3>
          <p className="mb-3 text-[13px] text-muted">Tick any extras to add them to your dashboard mix.</p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {SECTIONS.filter((s) => s.key !== primary).map((sec) => (
              <label
                key={sec.key}
                className="flex cursor-pointer select-none items-center gap-3 rounded-xl border border-border bg-[#0c121d] px-3.5 py-3 text-sm transition hover:border-[#244a3c]"
              >
                <GlowCheck checked={!!interests[sec.key]} onChange={() => toggleInterest(sec.key)} />
                <span className="text-lg">{sec.emoji}</span>
                <span className="font-semibold">{sec.title}</span>
                {!sec.live && <span className="ml-auto text-[10px] uppercase tracking-[.06em] text-muted">Soon</span>}
              </label>
            ))}
          </div>
        </div>
      )}
    </>
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

const AGE_MIN = 16, AGE_MAX = 100, AGE_DEFAULT = 30;
const AGES = Array.from({ length: AGE_MAX - AGE_MIN + 1 }, (_, i) => AGE_MIN + i);

function AgeStep({ state, update }) {
  // The wheel always has a value under the indicator, so default an empty age.
  useEffect(() => {
    if (!parseInt(state.age, 10)) update({ age: String(AGE_DEFAULT) });
  }, []); // eslint-disable-line

  const a = parseInt(state.age, 10) || AGE_DEFAULT;
  const years = a < 60 ? 60 - a : null;
  return (
    <>
      <StepHead kicker="About you" title="How old are you?" sub="We'll plan your journey through to retirement at 60." />
      <WheelPicker
        values={AGES}
        value={a}
        onChange={(v) => update({ age: String(v) })}
        renderLabel={(v) => v}
      />
      <div className="mt-4 min-h-[18px] text-center text-[13px] text-muted">
        {years
          ? <>That's <b className="text-good">{years} years</b> of compounding until you're 60.</>
          : <>You can still make every remaining year count.</>}
      </div>
    </>
  );
}

// iOS/Android-style wheel. Mobile uses native momentum touch-scroll; desktop
// adds click-and-drag (hold and pull up/down) plus the mouse wheel. Snapping is
// done in JS so it works the same for both. No visible scrollbar.
const ITEM_H = 48;
const PAD_ITEMS = 2; // items of padding so first/last can reach the centre

function WheelPicker({ values, value, onChange, renderLabel = (v) => v }) {
  const ref = useRef(null);
  const settle = useRef(null);
  const drag = useRef(null);   // active mouse drag: { startY, startTop, moved, id }
  const moved = useRef(false);  // suppress the click that follows a drag
  const selIndex = Math.max(0, values.indexOf(value));
  const [centre, setCentre] = useState(selIndex);

  const clampIdx = (i) => Math.max(0, Math.min(values.length - 1, i));
  const nearestIdx = () => clampIdx(Math.round((ref.current?.scrollTop || 0) / ITEM_H));

  // Position the wheel on the current value when it changes from outside.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = selIndex * ITEM_H;
    if (Math.abs(el.scrollTop - target) > 1) el.scrollTop = target;
    setCentre(selIndex);
  }, [selIndex]);

  const snapTo = (idx) => {
    const el = ref.current;
    if (!el) return;
    const target = idx * ITEM_H;
    if (Math.abs(el.scrollTop - target) > 1) el.scrollTo({ top: target, behavior: "smooth" });
    const v = values[idx];
    if (v !== value) onChange(v);
  };

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const idx = clampIdx(Math.round(el.scrollTop / ITEM_H));
    if (idx !== centre) setCentre(idx);
    if (drag.current) return; // mid-drag: snap on release instead
    clearTimeout(settle.current);
    settle.current = setTimeout(() => snapTo(idx), 110);
  };

  // --- desktop click-and-drag (mouse only; touch keeps native scrolling) ---
  const onPointerDown = (e) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    drag.current = { startY: e.clientY, startTop: el.scrollTop, id: e.pointerId };
    moved.current = false;
    el.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const d = drag.current, el = ref.current;
    if (!d || !el) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 3) moved.current = true;
    el.scrollTop = d.startTop - dy;
  };
  const endDrag = () => {
    const d = drag.current, el = ref.current;
    if (!d || !el) return;
    el.releasePointerCapture?.(d.id);
    drag.current = null;
    snapTo(nearestIdx());
  };

  const onItemClick = (i) => {
    if (moved.current) { moved.current = false; return; } // was a drag, not a click
    snapTo(clampIdx(i));
  };

  return (
    <div
      className="relative mx-auto max-w-[260px] select-none overflow-hidden rounded-2xl border border-border bg-[#0c121d]"
      style={{ height: ITEM_H * (PAD_ITEMS * 2 + 1) }}
    >
      {/* Centre highlight band */}
      <div
        className="pointer-events-none absolute inset-x-2 top-1/2 z-10 -translate-y-1/2 rounded-xl border border-accent/50 bg-accent/[.06]"
        style={{ height: ITEM_H }}
      />
      {/* Top & bottom fades */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-2/5 bg-gradient-to-b from-[#0c121d] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-2/5 bg-gradient-to-t from-[#0c121d] to-transparent" />

      <div
        ref={ref}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="no-scrollbar h-full cursor-grab overflow-y-scroll active:cursor-grabbing"
      >
        <div style={{ height: ITEM_H * PAD_ITEMS }} />
        {values.map((v, i) => {
          const dist = Math.abs(i - centre);
          const cls = dist === 0
            ? "text-accent text-[34px] font-extrabold"
            : dist === 1
            ? "text-ink/70 text-[24px] font-semibold"
            : "text-muted/50 text-[20px] font-medium";
          return (
            <div
              key={v}
              onClick={() => onItemClick(i)}
              className={`flex items-center justify-center tabular-nums transition-all duration-100 ${cls}`}
              style={{ height: ITEM_H }}
            >
              {renderLabel(v)}
            </div>
          );
        })}
        <div style={{ height: ITEM_H * PAD_ITEMS }} />
      </div>
    </div>
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
