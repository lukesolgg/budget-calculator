// ===========================================================================
// Debt Freedom Planner — pure calculation engine (no DOM, fully testable)
// Ported 1:1 from the verified vanilla build.
// ===========================================================================

// ---- formatting ----------------------------------------------------------
export const fmt = (n) =>
  (n < 0 ? "-£" : "£") + Math.abs(Math.round(n)).toLocaleString("en-GB");

export const FREQ_PER_YEAR = { weekly: 52, fortnightly: 26, monthly: 12 };

export const freqToMonthly = (amount, freq) =>
  Math.max(0, (amount || 0) * (FREQ_PER_YEAR[freq] / 12));
export const monthlyToFreq = (monthly, freq) =>
  monthly / (FREQ_PER_YEAR[freq] / 12);
export const freqLabel = (freq) =>
  ({ weekly: "week", fortnightly: "fortnight", monthly: "month" }[freq]);

export function monthsToStr(m) {
  if (!isFinite(m)) return "Never*";
  const y = Math.floor(m / 12), mo = m % 12;
  const parts = [];
  if (y) parts.push(y + (y === 1 ? " year" : " years"));
  if (mo) parts.push(mo + (mo === 1 ? " month" : " months"));
  return parts.join(" ") || "0 months";
}

// Whole months between now and the start of a "YYYY-MM" month string.
export function monthsUntil(ym) {
  if (!ym) return 0;
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return 0;
  const now = new Date();
  return Math.max(0, (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()));
}

// ---- colour helpers (for chart gradients) --------------------------------
const hexToRgb = (h) => {
  h = h.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
const mix = (rgb, t, target) => rgb.map((c, i) => Math.round(c + (target[i] - c) * t));
const rgbStr = (rgb) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
export const lighten = (hex, t) => rgbStr(mix(hexToRgb(hex), t, [255, 255, 255]));
export const darken = (hex, t) => rgbStr(mix(hexToRgb(hex), t, [0, 0, 0]));

// ---- payoff simulation ---------------------------------------------------

// Apply a one-off lump sum to balances, hitting the highest currently-accruing
// rate first (a 0%-window debt counts as rate 0 at month `atMonth`).
function applyLump(bal, lump, free, rate, atMonth) {
  let pool = lump;
  if (pool <= 0) return;
  const ord = bal.map((_, i) => i).sort((a, b) => {
    const ra = atMonth < free[a] ? 0 : rate[a];
    const rb = atMonth < free[b] ? 0 : rate[b];
    return rb - ra;
  });
  for (const i of ord) {
    if (pool <= 0) break;
    if (bal[i] <= 0) continue;
    const pay = Math.min(pool, bal[i]);
    bal[i] -= pay; pool -= pay;
  }
}

// `debts`: [{ balance, min, rate (APR %), freeMonths }]
// `extra`: spare cash beyond minimums, `lump`: up-front savings.
// Returns { months, totalInterest, impossible }.
export function simulate(debts, extra, lump) {
  const bal = debts.map((d) => d.balance);
  const rate = debts.map((d) => d.rate / 100 / 12);
  const free = debts.map((d) => d.freeMonths || 0);
  const min = debts.map((d) => d.min);
  const order = debts.map((_, i) => i).sort((a, b) => rate[b] - rate[a]);
  applyLump(bal, lump || 0, free, rate, 0);

  let months = 0, totalInterest = 0;
  const CAP = 1200;

  while (bal.some((b) => b > 0.005)) {
    if (months >= CAP) return { months: Infinity, totalInterest, impossible: true };
    months++;
    for (let i = 0; i < bal.length; i++) {
      if (bal[i] > 0 && months > free[i]) { const it = bal[i] * rate[i]; bal[i] += it; totalInterest += it; }
    }
    let pool = extra;
    for (let i = 0; i < bal.length; i++) {
      if (bal[i] <= 0) continue;
      const pay = Math.min(min[i], bal[i]);
      bal[i] -= pay; pool += (min[i] - pay);
    }
    const monthOrder = order.slice().sort((a, b) => {
      const ra = months <= free[a] ? 0 : rate[a];
      const rb = months <= free[b] ? 0 : rate[b];
      return rb - ra;
    });
    for (const i of monthOrder) {
      if (pool <= 0) break;
      if (bal[i] <= 0) continue;
      const pay = Math.min(pool, bal[i]);
      bal[i] -= pay; pool -= pay;
    }
    if (months > 1 && extra <= 0) {
      const tMin = min.reduce((s, m, i) => s + (bal[i] > 0 ? m : 0), 0);
      const tInt = bal.reduce((s, b, i) => s + (b > 0 && months > free[i] ? b * rate[i] : 0), 0);
      if (tMin <= tInt + 0.005 && bal.some((b) => b > 0.005)) {
        return { months: Infinity, totalInterest, impossible: true };
      }
    }
  }
  return { months, totalInterest, impossible: false };
}

// Detailed version: also records clear order, per-debt clear month, the full
// per-month payment schedule, and how the lump sum hit each debt.
export function simulateDetailed(debts, extra, lump) {
  const bal = debts.map((d) => d.balance);
  const rate = debts.map((d) => d.rate / 100 / 12);
  const free = debts.map((d) => d.freeMonths || 0);
  const min = debts.map((d) => d.min);
  const order = debts.map((_, i) => i).sort((a, b) => rate[b] - rate[a]);

  const before = bal.slice();
  applyLump(bal, lump || 0, free, rate, 0);
  const lumpPerDebt = before.map((b0, i) => b0 - bal[i]);

  const clearedMonth = debts.map(() => null);
  const schedule = [];
  let months = 0, totalInterest = 0;
  const CAP = 1200;

  while (bal.some((b) => b > 0.005)) {
    if (months >= CAP) break;
    months++;
    const pay = debts.map(() => 0);
    for (let i = 0; i < bal.length; i++) {
      if (bal[i] > 0 && months > free[i]) { const it = bal[i] * rate[i]; bal[i] += it; totalInterest += it; }
    }
    let pool = extra;
    for (let i = 0; i < bal.length; i++) {
      if (bal[i] <= 0) continue;
      const p = Math.min(min[i], bal[i]);
      bal[i] -= p; pay[i] += p; pool += (min[i] - p);
    }
    const monthOrder = order.slice().sort((a, b) => {
      const ra = months <= free[a] ? 0 : rate[a];
      const rb = months <= free[b] ? 0 : rate[b];
      return rb - ra;
    });
    for (const i of monthOrder) {
      if (pool <= 0) break;
      if (bal[i] <= 0) continue;
      const p = Math.min(pool, bal[i]);
      bal[i] -= p; pay[i] += p; pool -= p;
    }
    for (let i = 0; i < bal.length; i++) {
      if (bal[i] <= 0.005 && clearedMonth[i] === null) clearedMonth[i] = months;
    }
    schedule.push({ pay: pay.slice(), bal: bal.map((b) => Math.max(0, b)) });
    if (months > 1 && extra <= 0) {
      const tMin = min.reduce((s, m, i) => s + (bal[i] > 0 ? m : 0), 0);
      const tInt = bal.reduce((s, b, i) => s + (b > 0 && months > free[i] ? b * rate[i] : 0), 0);
      if (tMin <= tInt + 0.005 && bal.some((b) => b > 0.005)) { months = Infinity; break; }
    }
  }
  return { months, totalInterest, clearedMonth, order, schedule, lumpPerDebt };
}

// ---- plan definitions + builder ------------------------------------------
export const PLAN_DEFS = [
  { key: "balanced", cls: "green", color: "#3ad07f", badge: "Least Aggressive", title: "Balanced 50/30/20 Lifestyle", share: 0.25,
    desc: "Keep a healthy lifestyle while making steady, sustainable progress on your debt — extra payments stay modest so you still enjoy today." },
  { key: "accelerated", cls: "orange", color: "#f5953a", badge: "Moderate", title: "Accelerated Payoff", share: 0.5,
    desc: "Put roughly half of your spare cash (after minimums) toward debt. A strong middle ground — noticeably faster without going all-in." },
  { key: "avalanche", cls: "red", color: "#f0556f", badge: "Maximum Speed", title: "Debt Avalanche", share: 1.0,
    desc: "Throw every spare pound at your highest-interest debt until it's gone. The fastest route to freedom and the least interest paid." },
];

// Compute the three plans from inputs.
// `debts` filtered to balance>0; `monthlyIncome` and `living` are monthly £.
export function buildPlans(debts, monthlyIncome, living, lump) {
  const available = Math.max(0, monthlyIncome - living);
  const minTotal = debts.reduce((s, d) => s + d.min, 0);
  const surplus = Math.max(0, available - minTotal);
  const savings = monthlyIncome * 0.2, wants = monthlyIncome * 0.3;

  const plans = PLAN_DEFS.map((def) => {
    const extra = surplus * def.share;
    const monthly = minTotal + extra;
    const sim = simulate(debts, extra, lump);
    return { def, extra, monthly, sim, income: monthlyIncome, savings, wants };
  });

  const finite = plans.filter((x) => isFinite(x.sim.months));
  const bestTime = finite.length ? Math.min(...finite.map((x) => x.sim.months)) : null;

  return { plans, available, minTotal, surplus, bestTime };
}

// ---- retirement projection ----------------------------------------------
// Compound a savings pot monthly at `annualRate` until the user turns
// `retireAge`. While in debt (first `debtMonths`), they contribute
// `monthlyWhileDebt`; once debt-free they contribute `monthlyAfterDebt`
// (typically 20% of income — the 50/30/20 savings slice).
// Returns { months, balanceAtRetirement, totalContributed, totalInterest,
//           yearly: [{ age, balance, contributed }] } or null if no horizon.
export function projectRetirement({
  age, retireAge = 60, annualRate = 0.045,
  monthlyWhileDebt, monthlyAfterDebt, debtMonths, startingPot = 0,
}) {
  const a = Math.floor(age);
  if (!a || a >= retireAge) return null;
  const totalMonths = (retireAge - a) * 12;
  const mRate = annualRate / 12;

  let bal = startingPot, contributed = 0;
  const yearly = [];
  for (let m = 1; m <= totalMonths; m++) {
    bal += bal * mRate; // monthly compounding
    const contrib = m <= debtMonths ? monthlyWhileDebt : monthlyAfterDebt;
    bal += contrib; contributed += contrib;
    if (m % 12 === 0) {
      yearly.push({ age: a + m / 12, balance: bal, contributed: startingPot + contributed });
    }
  }
  return {
    months: totalMonths,
    balanceAtRetirement: bal,
    totalContributed: startingPot + contributed,
    totalInterest: bal - startingPot - contributed,
    yearly,
  };
}

// For an interest-free debt: payment needed to clear in time, and the
// least-interest fallback if that's unaffordable.
export function projectInterestFreeShortfall(d, payment) {
  const mRate = d.rate / 100 / 12;
  let bal = d.balance;
  for (let m = 0; m < d.freeMonths && bal > 0; m++) bal -= payment;
  bal = Math.max(0, bal);
  const leftover = bal;

  let interest = 0, guard = 0;
  while (bal > 0.005 && guard < 1200) {
    guard++;
    const it = bal * mRate; interest += it; bal += it; bal -= payment;
    if (payment <= it) { interest = Infinity; break; }
  }
  let bal2 = Math.max(0, d.balance - d.min * d.freeMonths), int2 = 0, g2 = 0;
  while (bal2 > 0.005 && g2 < 1200) {
    g2++;
    const it = bal2 * mRate; int2 += it; bal2 += it; bal2 -= payment;
    if (payment <= it) { int2 = Infinity; break; }
  }
  return { leftover, interest, interestIfMinOnly: int2 };
}
