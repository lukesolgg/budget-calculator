// ===========================================================================
// Dashboard sections registry — the "tabs" of the app. Single source of truth
// for the dashboard cards AND the onboarding goals step. UI metadata only;
// navigation handlers are wired by key in Dashboard.jsx. `live` = usable now.
// ===========================================================================

export const SECTIONS = [
  {
    key: "debt", emoji: "💳", title: "Debt", live: true,
    goalLabel: "Crush my debt",
    desc: "A month-by-month plan to clear your debts for good.",
  },
  {
    key: "savings", emoji: "💷", title: "Best UK savings", live: true,
    goalLabel: "Grow my savings",
    desc: "Top high-yield UK accounts and how your spare cash could grow.",
  },
  {
    key: "career", emoji: "🚀", title: "Career & income", live: true,
    goalLabel: "Boost my income",
    desc: "Promotions, second-job ideas and pay comparisons for your field.",
  },
  {
    key: "emergency", emoji: "🛟", title: "Emergency fund", live: true,
    goalLabel: "Build a safety net",
    desc: "Plan a 3–6 month cushion so a surprise bill never derails you.",
  },
  {
    key: "mortgage", emoji: "🏠", title: "Mortgage calculator", live: false,
    goalLabel: "Buy a home",
    desc: "Work out repayments, deposits and what you could afford.",
  },
  {
    key: "pensions", emoji: "👴", title: "Pensions", live: false,
    goalLabel: "Plan retirement",
    desc: "Understand your pensions and see how small top-ups add up.",
  },
  {
    key: "investments", emoji: "📈", title: "Investments", live: false,
    goalLabel: "Start investing",
    desc: "Simple, lower-risk options with plain-English projections.",
  },
  {
    key: "education", emoji: "🎓", title: "Further education", live: false,
    goalLabel: "Retrain or upskill",
    desc: "Courses that boost earning power, with cost vs payoff mapped.",
  },
  {
    key: "planner", emoji: "🗓️", title: "Weekly planner", live: false,
    goalLabel: "Organise my week",
    desc: "A visual timetable that finds free hours for your goals.",
  },
];

export const sectionByKey = (key) => SECTIONS.find((s) => s.key === key) || null;
