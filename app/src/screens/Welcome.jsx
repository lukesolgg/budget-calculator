import { Button } from "../components/ui.jsx";

// Small inline icons (stroke = currentColor so they inherit the accent).
const Icons = {
  budget: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <path d="M21 12a9 9 0 1 1-9-9" /><path d="M12 12 21 4" /><path d="M12 3v9h9" opacity=".5" />
    </svg>
  ),
  career: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 12h18" opacity=".5" />
    </svg>
  ),
  planner: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /><path d="M8 15h3" opacity=".6" />
    </svg>
  ),
  anywhere: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" opacity=".6" />
    </svg>
  ),
};

const FEATURES = [
  { icon: Icons.budget, title: "Budget & debt", desc: "A month-by-month plan to crush debt and own your money." },
  { icon: Icons.career, title: "Career plans", desc: "Map routes to higher income and second-job ideas." },
  { icon: Icons.planner, title: "Weekly planner", desc: "Turn your goals into a simple, doable weekly routine." },
  { icon: Icons.anywhere, title: "Anytime, anywhere", desc: "At home, at work, on the go — your hub goes with you." },
];

export default function Welcome({ onNew, onReturn, hasDraft }) {
  return (
    <div className="mx-auto max-w-[760px] px-2 pt-[6vh] text-center">
      {/* Logo + pre-alpha badge */}
      <div className="animate-fadeUp" style={{ animationDelay: "0ms" }}>
        <div className="mx-auto mb-5 flex h-[68px] w-[68px] animate-float items-center justify-center rounded-[20px] bg-gradient-to-br from-[#2fe6a6] to-[#12b886] shadow-[0_12px_36px_-8px_rgba(47,230,166,.55)]">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#04140d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" />
          </svg>
        </div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#1e3a30] bg-[#0c1a15] px-3 py-1 text-[11px] font-semibold uppercase tracking-[.1em] text-accent">
          <span className="h-1.5 w-1.5 animate-glow rounded-full bg-accent" /> Pre-alpha · early preview
        </div>
        <h1 className="text-[26px] font-extrabold tracking-tight">
          <span className="text-accent">Orcl.</span>
        </h1>
      </div>

      {/* Headline */}
      <h2 className="mx-auto mt-3 max-w-[640px] animate-fadeUp text-[clamp(30px,5vw,46px)] font-extrabold leading-[1.08] tracking-tight" style={{ animationDelay: "80ms" }}>
        Your all-in-one hub for{" "}
        <span className="bg-gradient-to-r from-[#2fe6a6] to-[#5fd6ff] bg-clip-text text-transparent">financial planning</span>
      </h2>
      <p className="mx-auto mt-4 max-w-[540px] animate-fadeUp text-[17px] leading-relaxed text-muted" style={{ animationDelay: "150ms" }}>
        Manage your whole financial life with personalised systems built to
        fast-track you to success — debt, budget, career and beyond.
      </p>

      {/* Feature cards */}
      <div className="mx-auto mt-9 grid max-w-[640px] grid-cols-2 gap-3.5">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="group animate-fadeUp rounded-2xl border border-[#16241f] bg-[#0a120f]/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-[#244a3c] hover:shadow-[0_10px_30px_-14px_rgba(47,230,166,.5)]"
            style={{ animationDelay: `${220 + i * 70}ms` }}
          >
            <div className="mb-2.5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f241c] text-accent transition group-hover:scale-105">
              {f.icon}
            </div>
            <div className="text-[15px] font-bold">{f.title}</div>
            <div className="mt-1 text-[13px] leading-snug text-muted">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mx-auto mt-9 flex max-w-[380px] animate-fadeUp flex-col items-center gap-3" style={{ animationDelay: "520ms" }}>
        <Button onClick={onNew} className="w-full py-4 text-base">
          {hasDraft ? "Continue where you left off" : "Get started — it's free"}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </Button>
        <button onClick={onReturn} className="group inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
          Already been here before?
          <span className="text-accent transition group-hover:translate-x-0.5">→</span>
        </button>
      </div>

      <p className="mt-7 text-xs text-muted">
        Anonymous &amp; free — no email needed, just a username &amp; PIN.
      </p>
    </div>
  );
}
