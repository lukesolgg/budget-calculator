import { useState } from "react";
import { InfoTip } from "./ui.jsx";
import { fmt, monthlyToFreq, freqLabel } from "../lib/engine.js";

// Payday plan: where each paycheck (or month) should go. Reframes the monthly
// figures into the user's pay cycle so they know what to allocate on payday.
export default function AllocationCard({ income, living, minTotal, debtMonthly, savings, fun, freq }) {
  const weekly = freq !== "monthly";
  const [perPay, setPerPay] = useState(weekly); // default to per-payday for weekly/fortnightly
  const noun = freqLabel(freq) || "month";       // "week" | "fortnight" | "month"
  const periodWord = perPay ? noun : "month";
  const scale = (m) => (perPay ? monthlyToFreq(m, freq) : m);
  const over = living + minTotal > income + 0.5;

  const rows = [
    { emoji: "🏠", label: "Bills & essentials", v: living, c: "#4cb8f0", tip: "Rent/mortgage, utilities, food and other regular costs." },
    debtMonthly > 0.5 && { emoji: "💳", label: "Debt payment", v: debtMonthly, c: "#ff4d6d" },
    savings > 0.5 && { emoji: "🐷", label: "Savings", v: savings, c: "#3ad07f" },
    { emoji: "🎉", label: "Free to spend", v: fun, c: "#f5953a", hl: true, tip: "Yours to enjoy after essentials, debt and savings." },
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-panel to-panel2 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-bold">{perPay ? "Each payday" : "Each month"}</h3>
        {weekly && (
          <div className="flex gap-1 rounded-lg border border-border bg-[#0a0f17] p-0.5">
            <button onClick={() => setPerPay(true)} className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${perPay ? "bg-[#1c2738] text-ink" : "text-muted hover:text-ink"}`}>Per {noun}</button>
            <button onClick={() => setPerPay(false)} className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${!perPay ? "bg-[#1c2738] text-ink" : "text-muted hover:text-ink"}`}>Monthly</button>
          </div>
        )}
      </div>

      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-[24px] font-extrabold tabular-nums">{fmt(scale(income))}</span>
        <span className="text-[13px] text-muted">per {periodWord}</span>
      </div>

      {over && (
        <div className="mb-3 rounded-lg border border-[#5a3d12] bg-[#1c1407] px-3 py-2 text-[12px] text-warn">
          Your essentials and minimum debt payments are more than your income — worth trimming somewhere.
        </div>
      )}

      <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-[#0a0f17]">
        {rows.map((r) => income > 0 && r.v > 0 && (
          <div key={r.label} style={{ width: `${(r.v / income) * 100}%`, background: r.c }} />
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <div key={r.label} className={`flex items-center justify-between rounded-lg px-2.5 py-2 ${r.hl ? "bg-[#0f241c]" : "bg-[#0a0f17]"}`}>
            <span className="inline-flex items-center gap-2 text-[13px]">
              <span>{r.emoji}</span>
              <span className={r.hl ? "font-semibold text-ink" : "text-muted"}>{r.label}</span>
              {r.tip && <InfoTip text={r.tip} />}
            </span>
            <b className={`tabular-nums ${r.hl ? "text-good" : "text-ink"}`}>{fmt(scale(r.v))}</b>
          </div>
        ))}
      </div>

      {perPay && weekly && living > 0 && (
        <p className="mt-2.5 text-[11px] leading-snug text-muted">💡 Tip: move <b className="text-ink">{fmt(scale(living))}</b> into a separate bills pot each {noun} so it's ready when monthly bills land.</p>
      )}
    </div>
  );
}
