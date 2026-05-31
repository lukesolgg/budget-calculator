# Orcl. — Vision & Roadmap

## North star
An anonymous all-in-one hub that gives people **clear, structured routes through
their financial life** so they feel less stressed and can see exactly where to
cut, what to work on, and how to get ahead.

## Primary user
20s–40s, in debt or stretched for money (works for the financially comfortable
too, but debt-help is the core). Tone: supportive, motivating, plain-English.

## The MVP shape
1. **Deeper onboarding** (more questions than now) — see "Onboarding v2" below.
2. **Dashboard** — the home base after onboarding. Sections:
   - **Top: current stats** (income, debt, debt-free date, spare cash, retirement pot).
   - **Debt plan** (existing engine) — tailored payoff plan for those in debt.
   - **Career / income** — promotions in their field + side-hustle/2nd-job ideas
     (bundled). Compare other jobs' pay. (needs a UK job→pay dataset; Luke can source.)
   - **Best UK savings** — high-yield savings accounts + forecasted growth
     (Luke aggregates the rate data).
   - **Investments (low-risk only)** — S&P 500, gold, bonds. Keep it simple for
     now; expand later.
   - **Weekly planner** (optional) — visual timetable of work/sleep/eat/gym/busy
     hours, surfacing free slots for side hustles. Needs a 2nd onboarding for
     schedule details.

## Onboarding v2 (expand the wizard) — TODO list of questions to add
- Current job/role (dropdown from standard UK list à la CreditKarma + "Other" +
  "Prefer not to say").
- (have: age, pay frequency, income, mortgage, car loan, debts, debt-free flag)
- Likely additions: dependents/household, employment type (full/part/self),
  rough monthly spend confidence, primary goal (get out of debt / save / grow /
  change career), risk appetite (for later investment section).
- Keep it skippable/optional where sensible so it doesn't feel heavy.

## Build order (proposed — one slice at a time, commit each)
1. **Dashboard shell** — convert the post-onboarding flow into a dashboard with
   stat header + cards that link to existing Results/Detail. Foundation for all
   future sections. (next up)
2. **Onboarding v2** — add job + goal questions; feed the dashboard.
3. **Savings section** — high-yield accounts list + growth forecast (data: Luke).
4. **Career/income section** — promotions + side hustles; needs job→pay dataset.
5. **Weekly planner** — schedule onboarding + timetable + free-slot finder.
6. **Investments** — low-risk options + projections.

## Data Luke will supply
- UK high-yield savings account rates.
- UK job → typical pay dataset (for career/income compare).
- Standard job-role list (CreditKarma-style).

## Constraints / context
- Passion project for now; may seek funding once MVP is compelling.
- Budget: Claude Pro plan only. Build lean, scale later.
- Deploy is manual (Actions billing-locked) — see PROGRESS.md.

## Open questions to revisit
- Investments: how deep to go, and risk/disclaimer wording (regulatory care —
  it's UK financial info; keep "not financial advice" framing).
- Job dataset: source + licensing + how to match roles.
