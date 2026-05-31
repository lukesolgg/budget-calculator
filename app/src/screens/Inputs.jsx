import { Button, Card, MoneyInput, Chevron } from "../components/ui.jsx";
import {
  usePlanner, CATEGORIES, EXPENSE_PLACEHOLDERS,
  monthlyIncomeOf, debtsOf, livingOf,
} from "../state.jsx";
import { fmt } from "../lib/engine.js";

export default function Inputs({ onBack, onResults, onEdit }) {
  const { state, update } = usePlanner();
  const income = monthlyIncomeOf(state);
  const debts = debtsOf(state);
  const canProceed = income > 0 && (!state.hasDebt || debts.length > 0);

  const setExpense = (key, v) =>
    update((s) => ({ ...s, expenses: { ...s.expenses, [key]: v } }));

  // Rent is hidden when a mortgage is active.
  const cats = CATEGORIES.filter((c) => !(state.mortgage.on && c.key === "rent"));

  const chips = [
    ["Paid", state.payFrequency],
    ["Income", `${fmt(income)}/mo`],
    ["Mortgage", state.mortgage.on ? `${fmt(parseFloat(state.mortgage.payment) || 0)}/mo` : "No"],
    ["Car loan", state.car.on ? "Yes" : "No"],
    ["Debts", debts.length ? `${debts.length} · ${fmt(debts.reduce((s, d) => s + d.balance, 0))}` : "None 🎉"],
  ];

  return (
    <div className="mx-auto max-w-[940px]">
      <header className="mb-7">
        <h1 className="text-[22px] font-bold tracking-tight">Your <span className="text-accent">budget</span></h1>
        <div className="mt-1 text-sm text-muted">A couple more details and your plan is ready.</div>
      </header>

      <Card className="mb-6">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[20px] font-bold">Here's what you told us</h2>
            <p className="text-sm text-muted">Tap edit to change any of these.</p>
          </div>
          <Button variant="ghost" onClick={onEdit} className="px-3.5 py-2 text-[13px]">Edit</Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2.5">
          {chips.map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-2 rounded-full border border-border bg-[#0c121d] px-3.5 py-2 text-[13px]">
              <span className="h-[7px] w-[7px] rounded-full bg-accent" />
              <span className="text-muted">{k}</span> <b>{v}</b>
            </span>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="text-[20px] font-bold">Your monthly expenses</h2>
        <p className="mb-4 text-sm text-muted">Roughly what you spend each month — estimates are fine.</p>
        <div className="grid grid-cols-1 gap-x-7 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <div key={c.key} className="grid grid-cols-[14px_1fr_120px] items-center gap-2.5">
              <span className="h-[13px] w-[13px] rounded" style={{ background: c.color }} />
              <span className="text-sm">{c.name}</span>
              <MoneyInput value={state.expenses[c.key] || ""} onChange={(v) => setExpense(c.key, v)} placeholder={EXPENSE_PLACEHOLDERS[c.key]} />
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}><Chevron dir="left" /> Back</Button>
        <div className="flex-1" />
        <Button onClick={onResults} disabled={!canProceed}>Go to my dashboard <Chevron /></Button>
      </div>
    </div>
  );
}
