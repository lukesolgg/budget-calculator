import { useMemo, useState } from "react";
import { Card, Chevron } from "../components/ui.jsx";
import { usePlanner, monthlyIncomeOf } from "../state.jsx";
import { fmt } from "../lib/engine.js";
import { findJob, searchJobs, progressionFrom } from "../data/careers.js";

export default function Career({ onBack }) {
  const { state, update } = usePlanner();
  const income = monthlyIncomeOf(state);
  const annualIncome = Math.round(income * 12);
  const me = state.jobSoc ? findJob(state.jobSoc) : null;

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-[18px] flex items-center gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-[#1e2b27] bg-[#101a18] px-[18px] py-2.5 text-sm font-semibold text-ink transition hover:brightness-125">
          <Chevron dir="left" /> Back to dashboard
        </button>
      </div>

      <header className="mb-6">
        <h1 className="text-[26px] font-extrabold tracking-tight">Career &amp; income</h1>
        <p className="mt-1 text-muted">See how your pay compares, where you could progress, and how a side hustle adds up.</p>
      </header>

      {/* Current role */}
      <Card className="mb-6">
        <h3 className="mb-1 font-bold">Your current role</h3>
        <p className="mb-3 text-[13px] text-muted">Pick your job to compare your pay against the UK median (ONS, 2025).</p>
        <RolePicker value={state.jobSoc} onPick={(soc) => update({ jobSoc: soc })} placeholder="Search your job title…" />

        {me && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="UK median for this role" value={me.medianAnnual != null ? fmt(me.medianAnnual) + "/yr" : "—"} />
            <Stat label="Your income" value={annualIncome > 0 ? fmt(annualIncome) + "/yr" : "Not set"} />
            {me.medianAnnual != null && annualIncome > 0 && (() => {
              const diff = annualIncome - me.medianAnnual;
              return <Stat label={diff >= 0 ? "Above median" : "Below median"} value={(diff >= 0 ? "+" : "−") + fmt(Math.abs(diff)) + "/yr"} tone={diff >= 0 ? "good" : "bad"} />;
            })()}
          </div>
        )}
        {me && me.medianAnnual != null && annualIncome > 0 && annualIncome < me.medianAnnual && (
          <p className="mt-3 rounded-lg border border-[#5a3d12] bg-[#1c1407] px-3.5 py-2.5 text-[13px] text-warn">
            You're earning below the typical pay for this role — worth a salary conversation, or see the progression options below.
          </p>
        )}
      </Card>

      {/* Progression */}
      {me && (
        <Card className="mb-6">
          <h3 className="mb-1 font-bold">Where you could progress</h3>
          <p className="mb-3 text-[13px] text-muted">Higher-paying roles in your field, by typical UK pay.</p>
          <Progression soc={me.soc} income={income} />
        </Card>
      )}

      {/* Compare any role */}
      <Card className="mb-6">
        <h3 className="mb-1 font-bold">Compare another job</h3>
        <p className="mb-3 text-[13px] text-muted">Thinking of a change? See what another role typically pays.</p>
        <CompareRole annualIncome={annualIncome} />
      </Card>

      {/* Side hustle */}
      <Card>
        <h3 className="mb-1 font-bold">Side hustle / second job</h3>
        <p className="mb-3 text-[13px] text-muted">See what a few extra hours a week could add to your income.</p>
        <SideHustle />
      </Card>

      <p className="mt-6 text-center text-[11px] text-muted">
        Pay figures are UK median gross earnings (ONS ASHE 2025, by occupation). General information, not financial or career advice.
      </p>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const c = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink";
  return (
    <div className="rounded-xl bg-[#0c121d] p-4">
      <div className={`text-[20px] font-extrabold ${c}`}>{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-[.06em] text-muted">{label}</div>
    </div>
  );
}

function RolePicker({ value, onPick, placeholder }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => (q.trim() ? searchJobs(q, 8) : []), [q]);
  const current = value ? findJob(value) : null;

  return (
    <div className="relative">
      {current && !open ? (
        <div className="flex items-center justify-between rounded-xl border border-accent bg-[#0c1a15] px-4 py-3">
          <span className="font-semibold">{current.title}</span>
          <button onClick={() => { setOpen(true); setQ(""); }} className="text-[13px] text-accent hover:underline">Change</button>
        </div>
      ) : (
        <>
          <input
            autoFocus={open} value={q} placeholder={placeholder}
            onChange={(e) => { setQ(e.target.value); setOpen(true); }}
            className="w-full rounded-xl border border-border bg-[#0c121d] px-4 py-3 text-[15px] text-ink outline-none focus:border-accent"
          />
          {open && results.length > 0 && (
            <div className="absolute z-10 mt-1.5 max-h-[280px] w-full overflow-y-auto rounded-xl border border-border bg-[#0c121d] shadow-xl">
              {results.map((j) => (
                <button key={j.soc} onClick={() => { onPick(j.soc); setOpen(false); setQ(""); }}
                  className="flex w-full items-center justify-between border-b border-border px-4 py-2.5 text-left text-sm last:border-0 hover:bg-[#121c2a]">
                  <span>{j.title}</span>
                  <span className="ml-3 shrink-0 text-muted">{j.medianAnnual != null ? fmt(j.medianAnnual) : "—"}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Progression({ soc, income }) {
  const list = useMemo(() => progressionFrom(soc, 6), [soc]);
  if (!list.length) return <p className="text-[13px] text-muted">No higher-paying roles found in this field — you may already be near the top of the pay range.</p>;
  const annual = Math.round(income * 12);
  return (
    <div className="flex flex-col gap-2.5">
      {list.map((j) => {
        const vsYou = annual > 0 ? j.medianAnnual - annual : null;
        return (
          <div key={j.soc} className="flex items-center justify-between rounded-xl border border-border bg-[#0c121d] px-4 py-3">
            <span className="text-sm font-semibold">{j.title}</span>
            <div className="ml-3 shrink-0 text-right">
              <div className="font-bold">{fmt(j.medianAnnual)}/yr</div>
              <div className="text-[12px] text-good">
                +{fmt(j.uplift)} vs your role{vsYou != null && vsYou !== j.uplift ? ` · ${vsYou >= 0 ? "+" : "−"}${fmt(Math.abs(vsYou))} vs you` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompareRole({ annualIncome }) {
  const [soc, setSoc] = useState("");
  const job = soc ? findJob(soc) : null;
  return (
    <>
      <RolePicker value={soc} onPick={setSoc} placeholder="Search any job to compare…" />
      {job && job.medianAnnual != null && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label={`${job.title} median`} value={fmt(job.medianAnnual) + "/yr"} />
          <Stat label="Per month (gross)" value={fmt(job.medianAnnual / 12)} />
          {annualIncome > 0 && (() => {
            const diff = job.medianAnnual - annualIncome;
            return <Stat label={diff >= 0 ? "More than you earn" : "Less than you earn"} value={(diff >= 0 ? "+" : "−") + fmt(Math.abs(diff / 12)) + "/mo"} tone={diff >= 0 ? "good" : "bad"} />;
          })()}
        </div>
      )}
    </>
  );
}

function SideHustle() {
  const [rate, setRate] = useState(15);
  const [hours, setHours] = useState(8);
  const weekly = rate * hours;
  const monthly = weekly * (52 / 12);
  const yearly = weekly * 52;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.05em] text-muted">Hourly rate · {fmt(rate)}/hr</label>
          <input type="range" min="5" max="60" step="1" value={rate} onChange={(e) => setRate(parseInt(e.target.value, 10))} style={{ "--acc": "#2fe6a6" }} />
        </div>
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[.05em] text-muted">Extra hours / week · {hours}h</label>
          <input type="range" min="1" max="30" step="1" value={hours} onChange={(e) => setHours(parseInt(e.target.value, 10))} style={{ "--acc": "#2fe6a6" }} />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Per week" value={fmt(weekly)} />
        <Stat label="Per month" value={fmt(monthly)} tone="good" />
        <Stat label="Per year" value={fmt(yearly)} tone="good" />
      </div>
      <p className="mt-3 text-[12px] text-muted">Tip: putting this straight onto debt or into savings is where it compounds fastest — try it in those sections.</p>
    </>
  );
}
