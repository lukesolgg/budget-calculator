// ===========================================================================
// Profile persistence: versioned + namespaced storage with migrations.
// ---------------------------------------------------------------------------
// The app keeps a FLAT state object in memory (simple for components), but
// everything written to localStorage / Supabase goes through serialize() into
// a NAMESPACED, VERSIONED blob:
//
//   { schemaVersion, profile:{...}, debts:{...}, budget:{...}, ... }
//
// This means: (1) adding fields later is safe, (2) old saves are migrated up
// by deserialize(), (3) the stored shape maps cleanly onto future Supabase
// tables/columns if we ever split it. Reference data (job pay tables, savings
// rates) lives in src/data/* and NEVER touches a user profile.
// ===========================================================================

export const CURRENT_SCHEMA = 8;

// Flat in-memory state -> versioned namespaced blob for storage.
export function serialize(s) {
  return {
    schemaVersion: CURRENT_SCHEMA,
    profile: { age: s.age, payFrequency: s.payFrequency, income: s.income, jobSoc: s.jobSoc, payAnchor: s.payAnchor },
    debts: { hasDebt: s.hasDebt, list: s.debts, mortgage: s.mortgage, car: s.car, baseline: s.debtBaseline, lastPayment: s.lastPaymentMonth },
    budget: { expenses: s.expenses, pets: s.pets },
    plan: { selected: s.selectedPlan, alloc: s.alloc, locked: s.allocLocked },
    goals: { primary: s.goals?.primary || "", interests: s.goals?.interests || {} },
  };
}

// Any stored blob (null | v1 flat | v2 namespaced | future) -> flat partial.
// Returns null if there's nothing usable. The caller hydrates with defaults.
export function deserialize(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (!raw.schemaVersion) return migrateV1(raw); // legacy flat blob (pre-namespacing)

  // v2+ : read known namespaces (forward-compatible — unknown keys ignored).
  const p = raw.profile || {}, d = raw.debts || {}, b = raw.budget || {}, pl = raw.plan || {};
  return strip({
    age: p.age, payFrequency: p.payFrequency, income: p.income, jobSoc: p.jobSoc, payAnchor: p.payAnchor,
    hasDebt: d.hasDebt, debts: d.list, mortgage: d.mortgage, car: d.car,
    debtBaseline: d.baseline, lastPaymentMonth: d.lastPayment,
    expenses: b.expenses, pets: b.pets,
    selectedPlan: pl.selected, alloc: pl.alloc, allocLocked: pl.locked,
    goals: raw.goals,
  });
}

// v1 was a flat blob with these keys at the top level (the React app's first
// localStorage format). Map it straight across.
function migrateV1(raw) {
  return strip({
    age: raw.age, payFrequency: raw.payFrequency, income: raw.income,
    hasDebt: raw.hasDebt, debts: raw.debts, mortgage: raw.mortgage,
    car: raw.car, expenses: raw.expenses,
  });
}

// Drop undefined keys so a partial restore never clobbers defaults.
function strip(o) {
  const out = {};
  for (const k in o) if (o[k] !== undefined) out[k] = o[k];
  return out;
}
