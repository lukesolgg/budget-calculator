import { createContext, useContext, useEffect, useRef, useState } from "react";
import { freqToMonthly, monthsUntil } from "./lib/engine.js";

// Expense categories (key, label, colour) — drives the budget grid + donut.
export const CATEGORIES = [
  { key: "rent", name: "Rent", color: "#f0556f" },
  { key: "utilities", name: "Utilities", color: "#46d17f" },
  { key: "phone", name: "Phone", color: "#f2932f" },
  { key: "gas", name: "Gas", color: "#9b6bf2" },
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

const blankDebt = () => ({ name: "", bal: "", min: "", rate: "", iffree: false, ifuntil: "" });

export const initialState = {
  payFrequency: "monthly",
  income: "",
  hasDebt: true,
  debts: [blankDebt()],
  mortgage: { on: false, payment: "", balance: "", rate: "" },
  car: { on: false, balance: "", payment: "", rate: "" },
  savings: { total: "", use: "" },
  expenses: {}, // key -> string value
};

const DRAFT_KEY = "dfp_draft_react";

const StateCtx = createContext(null);
export const usePlanner = () => useContext(StateCtx);

export function PlannerProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (saved) return { ...initialState, ...saved };
    } catch {}
    return initialState;
  });

  // Debounced draft autosave to localStorage.
  const timer = useRef(null);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(state)); } catch {}
    }, 400);
    return () => clearTimeout(timer.current);
  }, [state]);

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

export function livingOf(s) {
  let living = 0;
  CATEGORIES.forEach((c) => {
    if (s.mortgage.on && c.key === "rent") return; // mortgage replaces rent
    living += Math.max(0, parseFloat(s.expenses[c.key]) || 0);
  });
  if (s.mortgage.on) living += Math.max(0, parseFloat(s.mortgage.payment) || 0);
  return living;
}

export const savingsToDeployOf = (s) => {
  const total = Math.max(0, parseFloat(s.savings.total) || 0);
  const use = Math.max(0, parseFloat(s.savings.use) || 0);
  return Math.min(use, total);
};

// Expense items (incl. mortgage) for the chart.
export function expenseItemsOf(s) {
  const items = CATEGORIES.filter((c) => !(s.mortgage.on && c.key === "rent"))
    .map((c) => ({ key: c.key, name: c.name, color: c.color, value: Math.max(0, parseFloat(s.expenses[c.key]) || 0) }))
    .filter((c) => c.value > 0);
  if (s.mortgage.on) {
    const p = Math.max(0, parseFloat(s.mortgage.payment) || 0);
    if (p > 0) items.unshift({ key: "mortgage", name: "Mortgage", color: MORTGAGE_COLOR, value: p });
  }
  return items;
}
