# Orcl. — Progress & Architecture (read this first)

> One-glance status doc. Update the "Recent changes" log after each task.

## What it is
Orcl. — anonymous all-in-one financial planning hub (pre-alpha). Currently:
debt-payoff planner + budget + retirement projection. Vision: add career
plans, weekly planner, investments, second-job suggestions.

## Live
- URL: https://lukesolgg.github.io/budget-calculator/
- Deploy: **manual** (GitHub Actions is billing-locked). Process:
  `cd app && npm run build` (outputs to `../docs/`) -> commit -> push. Pages
  serves from `master /docs` (legacy build). Live ~1-2 min after push.

## Stack & layout (the REACT app in app/ is the product; old root index.html is retired)
- `app/` — Vite + React + Tailwind. Dark theme, green accent (#2fe6a6).
- `app/src/lib/engine.js` — PURE calc engine: simulate, simulateDetailed,
  buildPlans, projectRetirement, projectInterestFreeShortfall, fmt,
  monthsToStr, freq helpers. Regression-verified — change carefully.
- `app/src/state.jsx` — PlannerProvider context + selectors (monthlyIncomeOf,
  debtsOf, livingOf, expenseItemsOf, etc.) + draft autosave. In-memory state is
  FLAT; persistence goes through profile.js (see below). `toStored`/`fromStored`
  convert flat<->stored for cloud saves.
- `app/src/lib/profile.js` — VERSIONED + NAMESPACED persistence (Option A).
  serialize(flat) -> {schemaVersion, profile, debts, budget}; deserialize(raw)
  migrates any old blob (v1 flat / v2) back to flat. CURRENT_SCHEMA=2. To add a
  feature's data: add a namespace in serialize/deserialize + bump schema + add a
  migration branch. Old saves auto-migrate. (regression-tested)
- `app/src/data/` — REFERENCE data (shared, read-only, NOT in user profiles):
  savings.js (UK accounts, live), jobs.js (ONS ASHE placeholder).
- `data-raw/` — gitignored drop folder for raw source files to clean (ASHE zip).
- `app/src/lib/accounts.js` — Supabase (username+PIN) w/ local fallback. Keys
  in this file. Schema/setup in SUPABASE_SETUP.md.
- `app/src/components/` — ui.jsx (Button/Card/MoneyInput/Choice/Chevron),
  Donut.jsx, Account.jsx (top bar + auth modal).
- `app/src/screens/` — Welcome (home/hero), Wizard (onboarding), Inputs
  (budget+savings), Results (chart+plans+compare+debt-free), Detail
  (allocation donut, 3 sliders, roadmap, milestones, per-card schedule,
  retirement card).
- Screen flow controlled in app/src/App.jsx Shell.

## Features done
- Onboarding wizard: age, pay frequency, income, mortgage, car loan, debts
  (+ "I'm debt-free" path). Glowing choice cards, segmented control.
- Budget donut + 3 payoff strategies (Balanced/Accelerated/Avalanche),
  avalanche ordering, 0%-interest-free handling, savings lump sum, compare.
- Plan detail: allocation donut + 3 interlinked sliders (fun/savings/extra,
  fun capped 30% income), payoff roadmap, milestones, per-card schedule.
- Weekly/fortnightly: per-paycheck breakdown in detail + schedule.
- Retirement projection to age 60 @ 4.5% (savings while in debt -> 20% after).
- Accounts: signup/login/save, dirty indicator. Home: green hero, 2 CTAs.

## Known gaps / TODO
- PNG exports (Budget/Plan) NOT ported to React yet (existed in old HTML).
- Investments beyond the 4.5% savings account (future).
- Career plans, weekly planner (future / vision).

## Conventions (IMPORTANT)
- Commit after EACH working change. NEVER batch git checkout/reset with edits.
- Always npm run build before committing (catches JSX errors).
- Files with JSX must be .jsx.

## Recent changes (newest first)
- Reference data: src/data/savings.js (UK accounts) + jobs.js placeholder.
- Foundation refactor (Option A): versioned/namespaced persistence + migration.
- Dashboard hub: stat header + section cards (debt live, others coming soon).
- Home redesign: green theme, pre-alpha hero, 4 animated feature cards, 2 CTAs.
- Retirement projection card (age -> 60 @ 4.5%).
- Weekly/fortnightly per-paycheck payment breakdown.
- Full React rebuild of the app (was a single index.html).
