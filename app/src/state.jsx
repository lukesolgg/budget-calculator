import { createContext, useContext, useEffect, useRef, useState } from "react";
import { freqToMonthly, monthsUntil, buildPlans } from "./lib/engine.js";
import { serialize, deserialize } from "./lib/profile.js";

// Expense categories (key, label, colour) — drives the budget grid + donut.
export const CATEGORIES = [
  { key: "rent", name: "Rent", color: "#f0556f" },
  { key: "utilities", name: "Utilities", color: "#46d17f" },
  { key: "phone", name: "Phone", color: "#f2932f" },
  { key: "gas", name: "Petrol/Diesel", color: "#9b6bf2" },
  { key: "carInsurance", name: "Car Insurance", color: "#2fd6b0" },
  { key: "food", name: "Food", color: "#ef4444" },
  { key: "medical", name: "Medical", color: "#d2691e" },
  { key: "subscriptions", name: "Subscriptions", color: "#c04bd6" },
  { key: "petInsurance", name: "Pet Insurance", color: "#4f6bf0" },
  { key: "petFood", name: "Pet Food", color: "#5fd66f" },
];
export const MORTGAGE_COLOR = "#4cb8f0";
export const MAX_DEBTS = 8;

export const EXPENSE_PLACEHOLDERS = {
  rent: 1430, utilities: 330, phone: 180, gas: 400, carInsurance: 284,
  food: 600, medical: 80, subscriptions: 80, petInsurance: 50, petFood: 40,
};
export const DEBT_PLACEHOLDERS = [
  { name: "Visa Credit Card", bal: 4500, min: 120, rate: 22.9 },
  { name: "Barclaycard", bal: 2800, min: 75, rate: 24.9 },
  { name: "MBNA Card", bal: 1900, min: 50, rate: 19.9 },
  { name: "Store Card", bal: 900, min: 25, rate: 29.9 },
  { name: "Amex", bal: 3200, min: 90, rate: 21.9 },
];

const blankDebt = () => ({ name: "", bal: "", min: "", rate: "", iffree: false, ifuntil: "", dueDay: "" });

export const initialState = {
  payFrequency: "monthly",
  age: "",
  income: "",
  jobSoc: "",              // current role (ONS SOC code), or ""
  hasDebt: true,
  debts: [blankDebt()],
  mortgage: { on: false, payment: "", balance: "", rate: "" },
  car: { owns: false, on: false, balance: "", payment: "", rate: "" },
  pets: { on: false },
  expenses: {}, // key -> string value
  // Debt-plan choices (remembered):
  selectedPlan: "",        // "" | balanced | accelerated | avalanche
  alloc: null,             // locked { fun, savings, extra } split, or null
  allocLocked: false,
  // What the user wants from the app — drives dashboard ordering + advice.
  goals: { primary: "", interests: {} }, // primary = section key; interests = { [key]: true }
  debtBaseline: 0,          // peak total debt seen — basis for "cleared so far"
  lastPaymentMonth: "",     // "YYYY-MM" of last logged payment (reminder nudge)
  payAnchor: "",            // "YYYY-MM-DD" next payday — recurs by payFrequency
};

const DRAFT_KEY = "dfp_draft_react";

// Merge a partial (possibly-migrated) flat blob onto the defaults so a restore
// never leaves required fields missing. Nested objects merge one level deep.
export function hydrate(flat) {
  if (!flat) return initialState;
  const expenses = flat.expenses || {};
  const car = { ...initialState.car, ...(flat.car || {}) };
  const pets = { ...initialState.pets, ...(flat.pets || {}) };
  // Legacy saves predate the car-ownership / pets flags: infer them so existing
  // budgets don't suddenly hide categories the user already filled in.
  if (!flat.car || flat.car.owns === undefined) {
    car.owns = !!(car.on || parseFloat(expenses.carInsurance) > 0 || parseFloat(expenses.gas) > 0);
  }
  if (!flat.pets || flat.pets.on === undefined) {
    pets.on = !!(parseFloat(expenses.petInsurance) > 0 || parseFloat(expenses.petFood) > 0);
  }
  return {
    ...initialState,
    ...flat,
    mortgage: { ...initialState.mortgage, ...(flat.mortgage || {}) },
    car,
    pets,
    goals: { primary: flat.goals?.primary || "", interests: flat.goals?.interests || {} },
    debtBaseline: flat.debtBaseline || 0,
    lastPaymentMonth: flat.lastPaymentMonth || "",
    payAnchor: flat.payAnchor || "",
    debts: flat.debts && flat.debts.length ? flat.debts : initialState.debts,
    expenses,
  };
}

// Convenience for cloud accounts: stored blob <-> flat state.
export const toStored = (state) => serialize(state);
export const fromStored = (raw) => hydrate(deserialize(raw));

const StateCtx = createContext(null);
export const usePlanner = () => useContext(StateCtx);

export function PlannerProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      const flat = deserialize(raw);
      if (flat) return hydrate(flat);
    } catch {}
    return initialState;
  });

  // Debounced draft autosave to localStorage (versioned namespaced blob).
  const timer = useRef(null);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(serialize(state))); } catch {}
    }, 400);
    return () => clearTimeout(timer.current);
  }, [state]);

  // Keep the debt baseline at the peak total owed, so "cleared so far" measures
  // real progress (paying down lowers the current total, not the baseline).
  useEffect(() => {
    const total = debtsOf(state).reduce((s, d) => s + d.balance, 0);
    if (total > (state.debtBaseline || 0) + 0.5) {
      setState((s) => ({ ...s, debtBaseline: total }));
    }
  }, [state.debts, state.car, state.hasDebt]); // eslint-disable-line

  // Generic field updater (supports nested via updater fn).
  const update = (patch) =>
    setState((s) => (typeof patch === "function" ? patch(s) : { ...s, ...patch }));

  const value = { state, setState, update };
  return <StateCtx.Provider value={value}>{children}</StateCtx.Provider>;
}

// ---- derived selectors (pure, take state) --------------------------------
export const monthlyIncomeOf = (s) => freqToMonthly(parseFloat(s.income) || 0, s.payFrequency);

export function debtsOf(s) {
  const list = (s.hasDebt ? s.debts : []).map((d) => ({
    name: (d.name || "").trim() || "Debt",
    balance: Math.max(0, parseFloat(d.bal) || 0),
    min: Math.max(0, parseFloat(d.min) || 0),
    rate: Math.max(0, parseFloat(d.rate) || 0),
    freeMonths: d.iffree ? monthsUntil(d.ifuntil) : 0,
  }));
  if (s.car.on) {
    const bal = Math.max(0, parseFloat(s.car.balance) || 0);
    if (bal > 0) list.push({
      name: "Car Loan", balance: bal,
      min: Math.max(0, parseFloat(s.car.payment) || 0),
      rate: Math.max(0, parseFloat(s.car.rate) || 0), freeMonths: 0,
    });
  }
  return list.filter((d) => d.balance > 0);
}

// Categories shown in the budget for this user. Mortgage replaces rent; car
// costs only if they own a car; pet costs only if they have pets.
export function visibleCategories(s) {
  return CATEGORIES.filter((c) => {
    if (s.mortgage.on && c.key === "rent") return false;
    if (!s.car?.owns && (c.key === "carInsurance" || c.key === "gas")) return false;
    if (!s.pets?.on && (c.key === "petInsurance" || c.key === "petFood")) return false;
    return true;
  });
}

export function livingOf(s) {
  let living = 0;
  visibleCategories(s).forEach((c) => {
    living += Math.max(0, parseFloat(s.expenses[c.key]) || 0);
  });
  if (s.mortgage.on) living += Math.max(0, parseFloat(s.mortgage.payment) || 0);
  return living;
}

// Expense items (incl. mortgage) for the chart.
export function expenseItemsOf(s) {
  const items = visibleCategories(s)
    .map((c) => ({ key: c.key, name: c.name, color: c.color, value: Math.max(0, parseFloat(s.expenses[c.key]) || 0) }))
    .filter((c) => c.value > 0);
  if (s.mortgage.on) {
    const p = Math.max(0, parseFloat(s.mortgage.payment) || 0);
    if (p > 0) items.unshift({ key: "mortgage", name: "Mortgage", color: MORTGAGE_COLOR, value: p });
  }
  return items;
}

// The monthly money split for the chosen plan (mirrors the Detail sliders incl.
// a locked custom split). Shared by the Overview cards and the Budget tab.
export function budgetMathOf(s) {
  const income = monthlyIncomeOf(s);
  const debts = debtsOf(s);
  const living = livingOf(s);
  const minTotal = debts.reduce((a, d) => a + d.min, 0);
  const totalDebt = debts.reduce((a, d) => a + d.balance, 0);
  const { plans } = buildPlans(debts, income, living);
  const balanced = plans.find((p) => p.def.key === "balanced") || plans[0];
  const chosen = plans.find((p) => p.def.key === s.selectedPlan) || balanced;
  const hasDebt = debts.length > 0;

  const available = Math.max(0, income - living);
  const baseToDebt = Math.min(minTotal, available);
  const pool = Math.max(0, available - baseToDebt);
  const funCap = income * 0.3;
  let extra = 0, fun = 0, savings = 0;
  if (hasDebt) {
    if (s.allocLocked && s.alloc) {
      extra = s.alloc.extra || 0; fun = s.alloc.fun || 0; savings = s.alloc.savings || 0;
    } else {
      extra = Math.min(pool, pool * (chosen?.def.share ?? 0.25));
      const rest = Math.max(0, pool - extra);
      fun = Math.min(rest / 2, funCap);
      savings = Math.max(0, rest - fun);
    }
  }
  const spare = Math.max(0, income - living - minTotal);
  const debtMonthly = hasDebt ? baseToDebt + extra : 0;
  const funLeft = hasDebt ? fun : spare;
  return { income, debts, living, minTotal, totalDebt, plans, chosen, balanced, hasDebt, extra, fun: funLeft, savings, debtMonthly, spare };
}
