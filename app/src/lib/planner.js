// Shared helpers for the payment calendar / planner + debt rows.

// Highlight colour for a debt: green = interest-free with time, orange =
// interest-free running out, red = interest already accruing (no 0% period).
export function debtTone(freeMonths) {
  if (freeMonths > 6) return { bd: "#1f5c3a", bg: "#0c1f16", tx: "#3ad07f", label: `0% · ${freeMonths} mo left` };
  if (freeMonths > 0) return { bd: "#5a3d12", bg: "#1c1407", tx: "#f0b86a", label: `0% · ${freeMonths} mo left` };
  return { bd: "#5a1f1f", bg: "#1a0f0f", tx: "#f87171", label: "Accruing interest" };
}

export const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export const dueDayFromDate = (s) => (s ? new Date(s + "T00:00").getDate() : "");
export function clampedDate(year, month, day) {
  const dim = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, dim));
}
export const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function nextDateForDay(day) {
  const t = startOfToday();
  let dt = clampedDate(t.getFullYear(), t.getMonth(), day);
  if (dt < t) dt = clampedDate(t.getFullYear(), t.getMonth() + 1, day);
  return toISO(dt);
}
export function advancePayday(d, freq) {
  const n = new Date(d);
  if (freq === "monthly") n.setMonth(n.getMonth() + 1);
  else n.setDate(n.getDate() + (freq === "fortnightly" ? 14 : 7));
  return n;
}
export function generatePaydays(anchorISO, freq, count) {
  let d = new Date(anchorISO + "T00:00");
  const today = startOfToday();
  let guard = 0;
  while (d < today && guard < 1000) { d = advancePayday(d, freq); guard++; }
  const out = [];
  for (let i = 0; i < count; i++) { out.push(new Date(d)); d = advancePayday(d, freq); }
  return out;
}
export function nextDueOnOrAfter(dueDay, from) {
  let dt = clampedDate(from.getFullYear(), from.getMonth(), dueDay);
  if (dt < from) dt = clampedDate(from.getFullYear(), from.getMonth() + 1, dueDay);
  return dt;
}
export const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const fmtDay = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
