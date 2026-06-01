import { useState } from "react";
import { Button } from "../components/ui.jsx";

function LogoMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#2fe6a6] to-[#12b886] shadow-[0_8px_20px_-8px_rgba(47,230,166,.6)]">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#04140d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" />
      </svg>
    </div>
  );
}

export default function Welcome({ onNew, onReturn, hasDraft }) {
  return (
    <div className="-mt-2">
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[19px] font-extrabold tracking-tight">Orcl.</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <button onClick={onReturn} className="rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:text-accent">Log in</button>
          <Button onClick={onNew} className="px-3.5 py-2 text-sm sm:px-5">Get started</Button>
        </div>
      </nav>
      <Hero onNew={onNew} onReturn={onReturn} hasDraft={hasDraft} />
      <Tools />
      <Faqs />
      <ClosingCta onNew={onNew} hasDraft={hasDraft} />
      <footer className="mt-14 border-t border-border py-8 text-center text-xs text-muted">
        Orcl. · pre-alpha preview · general guidance, not financial advice.
      </footer>
    </div>
  );
}

/* ----------------------------------------------------------------- HERO -- */
function Hero({ onNew, onReturn, hasDraft }) {
  return (
    <section className="grid grid-cols-1 items-center gap-10 pt-[5vh] lg:grid-cols-[1.05fr_1fr] lg:gap-6">
      <div className="animate-fadeUp text-center lg:text-left">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#1e3a30] bg-[#0c1a15] px-3 py-1 text-[11px] font-semibold uppercase tracking-[.1em] text-accent">
          <span className="h-1.5 w-1.5 animate-glow rounded-full bg-accent" /> Pre-alpha · early preview
        </div>
        <h1 className="text-[clamp(34px,6vw,58px)] font-extrabold leading-[1.04] tracking-tight">
          Plan your{" "}
          <span className="bg-gradient-to-r from-[#2fe6a6] to-[#5fd6ff] bg-clip-text text-transparent">future</span>{" "}
          🔮<br className="hidden sm:block" /> in one hub
        </h1>
        <p className="mx-auto mt-5 max-w-[520px] text-[17px] leading-relaxed text-muted lg:mx-0">
          Orcl. is your all-in-one financial planning hub — clear your debt, master your
          budget, grow your savings and map your career, all in one place. Free and
          anonymous: no email, just a username &amp; PIN.
        </p>
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:items-start">
          <Button onClick={onNew} className="w-full py-4 text-base sm:w-auto sm:px-7">
            {hasDraft ? "Continue where you left off" : "Get started — it's free"}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Button>
          <Button variant="ghost" onClick={onReturn} className="w-full py-4 text-base sm:w-auto sm:px-7">
            Log in
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted">No card. No email. Cancel the noise, not your future.</p>
      </div>

      {/* Phone cluster */}
      <div className="mx-auto flex w-full max-w-[440px] animate-fadeUp items-center justify-center py-4" style={{ animationDelay: "120ms" }}>
        <div className="z-10 rotate-[-5deg] animate-float">
          <Phone><PlanScreen /></Phone>
        </div>
        <div className="z-0 hidden translate-y-7 rotate-[7deg] sm:-ml-14 sm:block">
          <Phone><DashboardScreen /></Phone>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- PHONES -- */
function Phone({ className = "", children }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[2.2rem] border-[7px] border-[#05080c] bg-[#0c121d] shadow-[0_40px_90px_-30px_rgba(0,0,0,.85)] ${className}`}
      style={{ width: 224, height: 456 }}
    >
      <div className="absolute left-1/2 top-2 z-20 h-[18px] w-20 -translate-x-1/2 rounded-full bg-[#05080c]" />
      <div className="h-full w-full overflow-hidden px-3.5 pb-3.5 pt-7">{children}</div>
    </div>
  );
}

function ScreenHead({ title }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <span className="text-[13px] font-bold">{title}</span>
      <span className="flex gap-1"><Dot /><Dot /><Dot /></span>
    </div>
  );
}
const Dot = () => <span className="h-1.5 w-1.5 rounded-full bg-[#2a3647]" />;

function PlanScreen() {
  return (<><ScreenHead title="Your debt plan" /><PlanBody /></>);
}
function PlanBody() {
  return (
    <>
      <div className="rounded-xl bg-[#0a0f17] p-3 text-center">
        <div className="text-[10px] uppercase tracking-[.08em] text-muted">Debt-free in</div>
        <div className="mt-0.5 text-[26px] font-extrabold text-accent">2y 4m</div>
      </div>
      <div className="mt-3 flex h-[92px] items-end justify-between gap-1.5">
        {[70, 62, 55, 47, 40, 32, 24, 14].map((h, i) => (
          <span key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#12b886] to-[#2fe6a6]" style={{ height: `${h}%`, opacity: 0.5 + i * 0.06 }} />
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {[["Visa card", "£0", "good"], ["Car loan", "£3,210", ""], ["Overdraft", "£640", ""]].map(([n, v, t]) => (
          <div key={n} className="flex items-center justify-between rounded-lg bg-[#0a0f17] px-2.5 py-2 text-[11px]">
            <span className="text-muted">{n}</span>
            <b className={t === "good" ? "text-good" : "text-ink"}>{v}</b>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-gradient-to-b from-[#2fe6a6] to-[#12b886] py-2 text-center text-[12px] font-bold text-[#04140d]">On track 🎉</div>
    </>
  );
}

function DashboardScreen() {
  return (<><ScreenHead title="Dashboard" /><DashboardBody /></>);
}
function DashboardBody() {
  return (
    <>
      <div className="flex items-center justify-center py-1">
        <div className="relative h-[112px] w-[112px] rounded-full" style={{ background: "conic-gradient(#4cb8f0 0 32%, #f0556f 32% 56%, #f5953a 56% 74%, #3ad07f 74% 100%)" }}>
          <div className="absolute inset-[15px] flex flex-col items-center justify-center rounded-full bg-[#0c121d]">
            <span className="text-[9px] text-muted">income</span>
            <span className="text-[15px] font-extrabold">£2,480</span>
          </div>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {[["Spare", "£540", "good"], ["Debt", "£3,850", "bad"], ["Saved", "£1,200", ""], ["Pot @60", "£218k", "accent"]].map(([k, v, t]) => (
          <div key={k} className="rounded-lg bg-[#0a0f17] px-2.5 py-2">
            <div className={`text-[13px] font-extrabold ${t === "good" ? "text-good" : t === "bad" ? "text-bad" : t === "accent" ? "text-accent" : "text-ink"}`}>{v}</div>
            <div className="text-[8px] uppercase tracking-[.06em] text-muted">{k}</div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 rounded-lg border border-[#1e3a30] bg-[#0c1a15] p-2.5">
        <div className="text-[10px] font-bold text-accent">🛟 Build an emergency fund</div>
        <div className="mt-0.5 text-[9px] leading-snug text-muted">Aim for £3.6k–£7.2k of essentials set aside.</div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- TOOLS -- */
const TOOLS = [
  { key: "debt", tab: "Debt & budget", title: "A clear plan to crush your debt", text: "Add your cards and loans and Orcl. builds a month-by-month payoff plan — choose the pace, see your debt-free date, and watch the balances fall.", graphic: "bars" },
  { key: "stats", tab: "Smart dashboard", title: "Your whole picture, at a glance", text: "Income, spending, debt and your spare cash — broken down with a live donut and tailored stats the moment you finish onboarding.", graphic: "donut" },
  { key: "savings", tab: "Best UK savings", title: "Grow your spare cash", text: "The most competitive UK savings accounts, hand-picked — with a forecast of exactly what your money could earn over time.", graphic: "line" },
  { key: "career", tab: "Career & income", title: "Earn more, sooner", text: "See realistic pay for your role, the promotion ladder above you, and side-hustle ideas to lift your income.", graphic: "steps" },
  { key: "advice", tab: "Recommendations", title: "Tailored next steps", text: "Orcl. reads your numbers and suggests what to do next — tackle the priciest debt, start an emergency fund, put spare cash to work.", graphic: "checks" },
  { key: "private", tab: "Private & free", title: "Anonymous by design", text: "No email, no bank login, no cost. Just a username and PIN — your plan syncs across devices and stays yours.", graphic: "lock" },
];

function Tools() {
  const [i, setI] = useState(0);
  const t = TOOLS[i];
  const move = (d) => setI((p) => (p + d + TOOLS.length) % TOOLS.length);

  return (
    <section className="mt-24">
      <h2 className="text-center text-[clamp(26px,4vw,40px)] font-extrabold leading-tight tracking-tight">
        All the tools you need
        <span className="block text-muted">in one easy hub</span>
      </h2>

      {/* Tab pills */}
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        {TOOLS.map((tool, idx) => (
          <button
            key={tool.key}
            onClick={() => setI(idx)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold transition ${
              idx === i
                ? "bg-gradient-to-b from-[#2fe6a6] to-[#12b886] text-[#04140d] shadow-[0_6px_18px_-6px_rgba(47,230,166,.6)]"
                : "border border-border bg-[#0c121d] text-muted hover:text-ink"
            }`}
          >
            {tool.tab}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div className="relative mt-10">
        <button onClick={() => move(-1)} aria-label="Previous" className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-border bg-[#0c121d] p-2.5 text-ink transition hover:border-accent hover:text-accent sm:block">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button onClick={() => move(1)} aria-label="Next" className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-border bg-[#0c121d] p-2.5 text-ink transition hover:border-accent hover:text-accent sm:block">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>

        <div key={t.key} className="mx-auto grid max-w-[820px] animate-pop grid-cols-1 items-center gap-10 md:grid-cols-2">
          <div className="flex justify-center">
            <Phone><ToolScreen tool={t} /></Phone>
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-[24px] font-extrabold leading-snug tracking-tight">{t.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{t.text}</p>
            <div className="mt-5 flex justify-center gap-1.5 md:justify-start">
              {TOOLS.map((_, idx) => (
                <button key={idx} onClick={() => setI(idx)} aria-label={`Tool ${idx + 1}`} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-accent" : "w-1.5 bg-[#2a3647] hover:bg-[#3a4658]"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToolScreen({ tool }) {
  return (
    <>
      <ScreenHead title={tool.tab} />
      <div className="flex h-[320px] flex-col">
        <ToolGraphic kind={tool.graphic} />
      </div>
    </>
  );
}

function ToolGraphic({ kind }) {
  if (kind === "donut") return <DashboardBody />;
  if (kind === "bars") return <PlanBody />;
  if (kind === "line") {
    return (
      <>
        <div className="rounded-xl bg-[#0a0f17] p-3">
          <div className="text-[10px] uppercase tracking-[.07em] text-muted">In 5 years you'd have</div>
          <div className="text-[24px] font-extrabold text-good">£34,180</div>
        </div>
        <svg viewBox="0 0 240 110" className="mt-4 w-full" preserveAspectRatio="none">
          <defs><linearGradient id="wf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2fe6a6" stopOpacity=".4" /><stop offset="1" stopColor="#2fe6a6" stopOpacity="0" /></linearGradient></defs>
          <polygon points="0,100 0,86 50,74 100,58 150,40 200,22 240,8 240,100" fill="url(#wf)" />
          <polyline points="0,86 50,74 100,58 150,40 200,22 240,8" fill="none" stroke="#2fe6a6" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div className="mt-3 space-y-1.5">
          {[["Cahoot", "5.00%"], ["Tembo", "4.55%"], ["Chase", "4.50%"]].map(([n, r]) => (
            <div key={n} className="flex items-center justify-between rounded-lg bg-[#0a0f17] px-2.5 py-2 text-[11px]"><span className="text-muted">{n}</span><b className="text-good">{r}</b></div>
          ))}
        </div>
      </>
    );
  }
  if (kind === "steps") {
    return (
      <>
        <div className="rounded-xl bg-[#0a0f17] p-3 text-center"><div className="text-[10px] uppercase tracking-[.07em] text-muted">Your role pays</div><div className="text-[22px] font-extrabold">£31,400</div></div>
        <div className="mt-4 flex h-[150px] items-end justify-between gap-2">
          {[["now", 38], ["+2y", 60], ["+5y", 82], ["lead", 100]].map(([l, h], i) => (
            <div key={l} className="flex flex-1 flex-col items-center gap-1">
              <span className="w-full rounded-t bg-gradient-to-t from-[#12b886] to-[#2fe6a6]" style={{ height: `${h}%` }} />
              <span className="text-[9px] text-muted">{l}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-[#1e3a30] bg-[#0c1a15] p-2.5 text-[10px] text-accent">🚀 +£12k with one promotion</div>
      </>
    );
  }
  if (kind === "checks") {
    return (
      <div className="space-y-2.5 pt-1">
        {[["🔥", "Tackle your Visa first", "Highest APR — saves the most"], ["🛟", "Start an emergency fund", "Aim for 3–6 months"], ["💷", "Put £540/mo to work", "≈ £6,640 in a year"], ["👴", "Top up your pension", "Small now, huge later"]].map(([e, t, s]) => (
          <div key={t} className="flex items-start gap-2.5 rounded-lg bg-[#0a0f17] p-2.5">
            <span className="text-base">{e}</span>
            <span><span className="block text-[11px] font-bold">{t}</span><span className="block text-[9px] text-muted">{s}</span></span>
          </div>
        ))}
      </div>
    );
  }
  // lock / private
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2fe6a6] to-[#12b886] text-[#04140d]">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
      </div>
      <div className="mt-4 text-[13px] font-bold">Username &amp; PIN</div>
      <div className="mt-1 px-4 text-[10px] leading-snug text-muted">No email. No bank login. Your data stays anonymous and syncs across devices.</div>
      <div className="mt-4 flex gap-1.5">{["•", "•", "•", "•"].map((d, i) => <span key={i} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0a0f17] text-accent">{d}</span>)}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- FAQs -- */
const FAQS = [
  { q: "What is Orcl.?", a: "Orcl. is an all-in-one financial planning hub. It brings your debt payoff plan, budget, savings forecasts and career tools together so you can see exactly where you stand and what to do next." },
  { q: "Is Orcl. free?", a: "Yes — Orcl. is completely free while it's in pre-alpha. No card, no trial, no catch." },
  { q: "Do I need to give an email?", a: "No. Accounts are anonymous — you sign up with just a username and a PIN. There's no email, phone number or personal detail required." },
  { q: "Does it work on mobile and desktop?", a: "Yes. Orcl. is a web app that runs in any browser, so it works on your phone, tablet and computer — and your plan syncs across them when you're signed in." },
  { q: "Can Orcl. help me get out of debt?", a: "That's the core of it. Enter your debts and Orcl. builds a tailored month-by-month payoff plan, shows your debt-free date, and tells you which debt to attack first." },
  { q: "Where does the savings & pay data come from?", a: "UK savings rates are hand-curated and dated, and pay figures come from the ONS ASHE survey. It's general information to help you plan — always check a provider before applying." },
  { q: "Is this financial advice?", a: "No. Orcl. gives clear, general guidance to help you plan and make confident decisions — but it isn't regulated financial advice." },
];

function Faqs() {
  const [open, setOpen] = useState(null);
  return (
    <section className="mt-24">
      <h2 className="text-center text-[clamp(26px,4vw,40px)] font-extrabold tracking-tight">Frequently asked questions</h2>
      <div className="mx-auto mt-8 grid max-w-[920px] grid-cols-1 gap-3 md:grid-cols-2">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className={`h-fit rounded-2xl border bg-[#0c121d] transition ${isOpen ? "border-accent/50" : "border-border"}`}>
              <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left">
                <span className="text-[15px] font-semibold">{f.q}</span>
                <span className={`shrink-0 text-muted transition-transform ${isOpen ? "rotate-180 text-accent" : ""}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </span>
              </button>
              {isOpen && <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-muted">{f.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ CLOSING CTA */
function ClosingCta({ onNew, hasDraft }) {
  return (
    <section className="mt-24">
      <div className="relative overflow-hidden rounded-[28px] border border-[#1e3a30] bg-gradient-to-br from-[#0c1a15] to-[#0a120f] px-6 py-12 text-center">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
        <h2 className="text-[clamp(24px,4vw,36px)] font-extrabold tracking-tight">Ready to take control of your money?</h2>
        <p className="mx-auto mt-3 max-w-[480px] text-[15px] text-muted">Set up your free, anonymous plan in a couple of minutes — and finally see the whole picture.</p>
        <div className="mt-7 flex justify-center">
          <Button onClick={onNew} className="px-8 py-4 text-base">
            {hasDraft ? "Continue where you left off" : "Get started — it's free"}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Button>
        </div>
      </div>
    </section>
  );
}
