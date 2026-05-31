# START HERE — read this first (handover for a new session)

You are continuing work on **Orcl.**, a pre-alpha financial-planning web app.
A fresh chat has no memory of past sessions — git is the source of truth.

## Read these 3 files, in order, before doing anything
1. **PROGRESS.md** — architecture, file map, what's built, deploy process, the
   "Recent changes" log. THIS IS THE MAIN CONTEXT FILE.
2. **VISION.md** — the product vision and roadmap.
3. **TODO.md** — the agreed next batch of changes to work through.

## The 60-second summary
- The product is the **React app in `app/`** (Vite + React + Tailwind, dark
  theme, green accent). The old root `index.html` is retired — ignore it.
- Live at https://lukesolgg.github.io/budget-calculator/ via GitHub Pages
  serving `master /docs` (legacy build — GitHub Actions is billing-locked).
- Flow: Welcome → Wizard (onboarding) → Inputs (budget) → Dashboard (hub) →
  Results (debt plans) → Detail (chosen plan). Plus Savings + Career sections.
- User data persists via `app/src/lib/profile.js` (versioned namespaced blob,
  schema 4). Reference data (savings, jobs) is in `app/src/data/` — never in
  user profiles.

## Working rules (IMPORTANT — learned the hard way)
- **Commit after EVERY working change.** Small, frequent commits.
- **NEVER batch a git checkout/reset/clean in the same tool block as edits** —
  it has wiped uncommitted work before. Do git state changes alone, sequentially.
- **Don't fire many dependent tool calls in one parallel block** — if the first
  errors, the rest cancel. Go step by step for anything sequential.
- Files containing JSX must be `.jsx`.
- Update PROGRESS.md "Recent changes" after each task.

## How to build & deploy (the manual process)
```
cd app
npm install        # first time in a new environment only
npm run build      # outputs to ../docs
```
Then commit BOTH the `app/` source and the regenerated `docs/` files, and push.
Live updates ~1-2 min later.

### ⚠️ If Node/npm is NOT available (e.g. on phone)
You can still write code and commit it — just DO NOT commit a stale `docs/`.
Note in the commit message "needs build", and the build/deploy gets done later
on a machine with Node. Never hand-edit files in `docs/` (they're generated).

## Commit author used so far
`-c user.email="luke@local" -c user.name="lukesolgg"` (or just normal commit).

## Quick verify a session is set up right
- `git status` clean, `git log --oneline -3` shows recent Orcl. commits.
- `node --version` tells you if you can build/deploy here.
