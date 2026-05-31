# Orcl. — Agreed TODO

Status: DONE (batch below completed). Add the next batch under "Next up".

## Completed batch (done)

### Onboarding
- [x] Age step: iOS/Android-style scroll/drag wheel picker (native momentum
      scroll on mobile, scroll wheel on desktop, no scrollbar, centre highlight
      band + fades). Component: `WheelPicker` in Wizard.jsx.
- [x] Desktop: wizard fills more of the page (max-w 600 → md:760 → lg:900).
- [x] Budget: expense category "Gas" → "Petrol/Diesel" (kept `gas` key so saved
      data isn't broken).
- [x] Budget: REMOVED the "Savings / cash on hand" block (moves to a future
      dedicated savings/investments/pension onboarding). State is untouched, so
      the engine's lump-sum just defaults to 0.

### Debt & budget (Results)
- [x] Removed the "Beat the interest deadline" section.

### Plan detail
- [x] Schedule cards are one-per-row (single column), no more inner scroll.
      Long plans (7+ months) collapse to the first 6 rows with a "Show all N
      months" expand/collapse toggle.

### Dashboard
- [x] When NOT signed in, the top bar button is now "Log out" (returns to the
      Welcome/home screen) instead of "Sign in / Sign up". Signed-in "Log out"
      unchanged (clears session) and also returns home. Returning users still
      sign in from the Welcome screen.

### Savings page
- [x] Reformatted as TABLES per category (Easy Access / Regular Saver / Fixed
      Rate / Cash ISA) listing all accounts.
- [x] Click a row → expands an inline "forecast your earnings" dropdown for that
      account (monthly amount + years, that account's AER, growth chart).
      Accordion: opening one auto-closes any other.
- [x] Hero graphic (inline SVG) + description (most competitive UK accounts).

## Next up
- (none agreed yet)

## Notes
- Future onboarding (separate): savings / investments / pension.
- Worth a visual pass on a real device for the age wheel feel + savings tables
  on mobile.
</content>
</invoke>
