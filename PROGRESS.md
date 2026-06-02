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
  savings.js (UK accounts, live), jobs.js (369 UK occupations from ONS ASHE
  Table 14, 4-digit SOC, annual+hourly medians + searchJobs()). Regenerate via
  app/scripts/build-jobs.cjs (reads rawdata/table14/*.xlsx, gitignored).
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
- Ease-of-use pass (orientation, trust, clarity, engagement):
  - Settings tab (Settings.jsx): account (username, Change PIN via new
    backend.changePin/auth.changePin + change_pin RPC in SUPABASE_SETUP.md, sign
    out), goals editor, edit details, export JSON / delete data (blanks cloud +
    wipes local + signs out). Sidebar gained a Settings tab; old "Edit my
    details" moved into it.
  - First-visit welcome nudge on Overview (dismiss persists in localStorage).
  - InfoTip tooltip primitive (ui.jsx) on Spent / Free / Retirement.
  - Debt & budget tab: section intro; DebtManager "cleared so far" progress bar
    (uses debtBaseline), monthly payment reminder (lastPaymentMonth), inline
    EDIT per debt (incl. car + remove), bigger animated celebration on clear.
  - Persist debtBaseline + lastPaymentMonth (schema 7); baseline auto-tracks the
    peak total owed in PlannerProvider.
- Dashboard density + direction: Overview donut + income/expenses list now sit
  side-by-side (donut ~270px) so the block is short vertically; compact plan
  banner below. Added a 4-card "What do you want to do?" quick-actions row under
  the overview (In-depth budget→edit, Debt planning→debt tab, Emergency fund &
  Side hustles = coming soon) via ActionCard. DebtManager list now sorts biggest→
  smallest and colour-codes each debt (green = 0% with >6mo, orange = 0% running
  out, red = accruing interest) with a left border + label.
- Auth gate fix: "Continue where you left off" no longer opens the dashboard
  from a stale localStorage draft when not signed in. Shell now reads useAuth
  session: signed in → dashboard; has a draft but no session → opens the sign-in
  modal (accounts are required, so a draft implies an account); brand new →
  onboarding. Sign-in modal gained a "Create an account" link (→ onboarding).
- Overview + onboarding plan step:
  - Onboarding now routes budget → (first-time debtors) payoff-plan selection →
    dashboard. App.jsx `finishInputs` goes to a new "plan" screen = Results with
    an `onboarding` prop (header "Last step: choose your payoff plan", back to
    budget, hides debt manager, picking → dashboard). Skipped if no debt or a
    plan's already chosen.
  - Overview donut now shows expenses + minimum debt payments, sorted biggest→
    smallest; the budget list uses the same sorted breakdown. Donut sits on top,
    then a plan banner (coloured by chosen plan: "🔥 Accelerated Payoff · debt-
    free in Xm", taps to the debt tab), then the title + budget list below.
  - "This month" + 6-month snapshot now reflect the CHOSEN plan (and any locked
    custom split from Detail): "Free" = fun money (e.g. £800), snapshot debt vs
    savings split matches the plan. MonthlyFigures shows Spent/Free/Budget +
    "+£X into savings".
- REMOVED the "cash on hand / lump sum to clear debt now" feature entirely:
  dropped state.savings, savingsToDeployOf, the budget.savings namespace
  (profile serialize/deserialize/migrateV1), and stopped passing `lump` to
  buildPlans/simulateDetailed in Results/Detail/Dashboard. Old saved blobs with a
  lump are ignored on load and dropped on next auto-save. (engine.js untouched —
  it still accepts an optional lump that defaults to 0.)
- Debt manager on the Debt & budget tab (Results.jsx): "Your debts" card at the
  top lists each debt + total, with "💸 Log a payment" (pick a debt, enter the
  amount → subtracts from its balance, clears at 0) and "＋ Add a debt" (name/
  balance/min/rate). Updates state.debts / state.car directly (auto-saves), so
  no need to re-do onboarding to record a payment. Plan/stats recompute live.
- Dashboard layout polish: dashboard breaks out to a wide container (App.jsx
  max-w 1760 on the dashboard screen only), sidebar hugs the left, Overview grid
  widened (1.35fr/1fr) with a bigger donut (Donut now takes a `maxW` prop, 520
  here). Fixed the 6-month snapshot bars rendering as zero-height (bar column
  needed a real height: parent h-[190px] + flex-1 bar track).
- Dashboard → SIDEBAR SHELL (Budgetwise-style; build-verified, NOT visually
  checked). Dashboard.jsx is now a shell: left sidebar of tabs (Overview +
  goal-ordered sections; live = debt/savings/career, others show a ComingSoon
  panel). Tabs swap the main panel IN PLACE — Savings/Career/Results now take an
  `embedded` prop to hide their "Back to dashboard" button; debt tab = Results →
  (pick plan) → Detail (Detail keeps its "Back to plans"). App.jsx no longer has
  separate savings/career/results/detail screens — all live inside the shell.
  New OVERVIEW panel: left = income/expenses donut + Income/Expenses/Left;
  right column = "This month" (Spent/Left/Budget + progress bar + over/under),
  "6-month snapshot" (stacked essentials/debt/spare bars; headline = debt
  paydown while in debt, switches to "set aside £X" when debt-free), and
  "Retirement" (renamed pot-at-60). Recommendations span full width below.
- Landing page makeover (Welcome.jsx, pre-login; build-verified, NOT visually
  checked — no headless browser in CI env): full marketing page inspired by
  Budgetwise but in Orcl. dark/green theme. Top nav (logo + Log in + Get
  started), 2-col HERO with angled CSS phone mockups (PlanScreen + Dashboard
  screen, in-flow w/ overlap), TOOLS section (pill tabs + arrows + dot nav, one
  phone preview that switches per tool via ToolGraphic: donut/bars/line/steps/
  checks/lock), FAQ accordion (2-col, single-open), closing CTA band, footer.
  CTAs unchanged: onNew (get started / continue) + onReturn (log in modal).
- Goals + personalised dashboard (build-verified; needs device pass):
  - New onboarding "goals" step (after account, first-run only): pick a PRIMARY
    focus + tick extra interests. State: `goals { primary, interests }` (schema 6).
  - `src/data/sections.js` = single registry of dashboard tabs (incl. two new
    COMING-SOON tabs: Emergency fund + Mortgage calculator). Used by the goals
    step and the dashboard.
  - Dashboard rebuilt: stat tiles → in-depth breakdown (expense donut + income/
    living/min-payments/spare + legend) → rule-based RECOMMENDATIONS (top 3:
    high-interest debt, spare→savings / invest-if-debt-free, emergency fund,
    mortgage, pension) → personalised section cards (primary featured under
    "Your focus", ticked interests next, everything else under "Explore more" —
    nothing hidden). Recs/cards for coming-soon tabs show a "Coming soon" pill;
    live ones navigate. No goals set (legacy users) = all tabs, no featured.
- Onboarding + accounts overhaul (build-verified; needs device pass):
  - Auth centralised in `src/lib/auth.jsx` (AuthProvider/useAuth): holds the
    session + debounced cloud AUTO-SAVE (no more "Save progress" button). Wraps
    Shell inside PlannerProvider. Account.jsx is now just the bar (username +
    save status + Log out) plus a LOGIN-ONLY modal (signup moved into onboarding).
  - Sign in now goes straight to the dashboard (App passes onSignedIn).
  - New users MUST create a username+PIN as the FIRST onboarding step (required;
    App passes `firstRun`, Wizard captures it once so step indices stay stable
    after signup). Returning/edit flows skip it.
  - Age wheel: added desktop click-and-drag (mouse pointer drag); mobile still
    uses native touch scroll; JS snapping (dropped CSS scroll-snap).
  - New steps: "Do you own a car?" (carown → car.owns) gating the existing car-
    loan step, and "Do you have pets?" (pets.on). Budget now hides Petrol/Diesel
    + Car Insurance when no car, and Pet Food + Pet Insurance when no pets, via
    `visibleCategories(s)` (used by Inputs, livingOf, expenseItemsOf).
  - profile.js schema → 5 (budget.pets). hydrate() infers car.owns / pets.on for
    legacy saves so existing budgets don't lose categories.
- TODO batch done (build-verified; needs a device visual pass): Onboarding —
  age step now a custom `WheelPicker` (Wizard.jsx: native momentum scroll/snap,
  no scrollbar, centre band + fades; defaults empty age to 30); wizard wider on
  desktop (md:760/lg:900). Budget — "Gas"→"Petrol/Diesel" (key kept), removed
  the "Savings / cash on hand" block. Results — removed "Beat the interest
  deadline" panel. Detail — schedule cards one-per-row, no inner scroll, 7+
  month plans collapse to 6 rows w/ "Show all" toggle (Chevron now does up/down).
  Account bar — not-signed-in button is "Log out" (→ Welcome) instead of "Sign
  in / Sign up" (App passes onLogout). Savings — hero SVG + copy, per-category
  TABLES, row-click accordion opens an inline per-account "forecast your
  earnings" (one open at a time). New CSS util `.no-scrollbar`.
- Career & income LIVE (verified): jobs.js = 406 UK occupations (ONS ASHE Table
  14, 4-digit SOC, annual+hourly medians) via app/scripts/build-jobs.cjs (reads
  rawdata/table14/*.xlsx, gitignored). data/careers.js (progressionFrom/search/
  find). Career.jsx: role picker, pay-vs-median, progression ladder, compare-
  any-role, side-hustle calc. jobSoc persisted (schema 4). Dashboard card live.
- Savings section LIVE: Savings.jsx (forecast + growth chart, account list).
- Debt/budget UX polish (verified): Results = donut left + stats panel right
  (per-plan debt-free rows), interest panel below cards, compare table removed,
  selected plan remembered (schema 3: plan namespace). Detail = milestones right
  (roadmap removed), lockable sliders w/ Edit (saved to profile), 0% badge
  colour-coded by months left (<=3 red/<=6 orange/6+ green). Dashboard Debt card
  border = plan colour (green/orange/red), green if fully debt-free; CTA flips to
  "View my plan".
- Job dataset live: 369 UK occupations (ONS ASHE Table 14, 4-digit SOC) + search.
- Reference data: src/data/savings.js (UK accounts) + jobs.js placeholder.
- Foundation refactor (Option A): versioned/namespaced persistence + migration.
- Dashboard hub: stat header + section cards (debt live, others coming soon).
- Home redesign: green theme, pre-alpha hero, 4 animated feature cards, 2 CTAs.
- Retirement projection card (age -> 60 @ 4.5%).
- Weekly/fortnightly per-paycheck payment breakdown.
- Full React rebuild of the app (was a single index.html).
