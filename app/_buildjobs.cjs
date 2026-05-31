// Clean ONS ASHE 2025 (Occupation SOC20) into app/src/data/jobs.js
// We take the 4-digit SOC rows (actual occupations) and join median ANNUAL
// pay (Table 2.7a) with median HOURLY pay (Table 2.5a) by SOC code.
const XLSX = require("xlsx");
const fs = require("fs");

const RAW = "../rawdata";
const ANNUAL = `${RAW}/PROV - Occupation SOC20 (2) Table 2.7a   Annual pay - Gross 2025.xlsx`;
const HOURLY = `${RAW}/PROV - Occupation SOC20 (2) Table 2.5a   Hourly pay - Gross 2025.xlsx`;

function readMedians(file, sheet) {
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[sheet];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
  const map = {}; // soc -> { title, median }
  for (const r of rows) {
    const code = r[0], desc = r[1], median = r[3];
    if (code === null || code === undefined) continue;
    const soc = String(code).trim();
    if (!/^\d{4}$/.test(soc)) continue; // only 4-digit unit occupations
    const m = typeof median === "number" ? Math.round(median) : null;
    map[soc] = { title: String(desc).trim(), median: m };
  }
  return map;
}

const annual = readMedians(ANNUAL, "Annual pay - Gross 2025");
const hourly = readMedians(HOURLY, "Hourly pay - Gross 2025");

const socs = Object.keys(annual).sort();
const jobs = [];
let withAnnual = 0;
for (const soc of socs) {
  const a = annual[soc];
  const h = hourly[soc];
  if (a.median == null && (!h || h.median == null)) continue; // skip fully-suppressed
  jobs.push({
    soc,
    title: a.title,
    medianAnnual: a.median,
    medianHourly: h && h.median != null ? Math.round(h.median * 100) / 100 : null,
  });
  if (a.median != null) withAnnual++;
}

const header = `// ===========================================================================
// REFERENCE DATA — UK occupations & median pay.
// Source: ONS ASHE 2025 (provisional), Occupation SOC20 (2-digit file),
// Table 2.7a (annual gross median) + Table 2.5a (hourly gross median).
// 4-digit SOC "unit group" occupations only. Pay in GBP. Some roles have a
// null median where ONS suppressed it (small sample). Shared, read-only —
// NOT part of any user profile. Regenerate with app/_buildjobs.cjs.
// ===========================================================================

export const JOBS_LAST_UPDATED = "2025 (ASHE provisional)";

export const JOBS = ${JSON.stringify(jobs, null, 0).replace(/},{/g, "},\n  {").replace("[{", "[\n  {").replace("}]", "}\n]")};

export const hasJobsData = () => JOBS.length > 0;

// Simple fuzzy search over titles. Returns up to `limit` matches.
export function searchJobs(query, limit = 8) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\\s+/);
  return JOBS
    .map((j) => {
      const t = j.title.toLowerCase();
      let score = 0;
      if (t === q) score = 1000;
      else if (t.startsWith(q)) score = 500;
      else if (t.includes(q)) score = 200;
      for (const w of words) if (t.includes(w)) score += 10;
      return { j, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.j);
}
`;

fs.writeFileSync("src/data/jobs.js", header);
console.log(`jobs: ${jobs.length} (with annual median: ${withAnnual})`);
console.log("sample:", JSON.stringify(jobs.slice(0, 3)));
console.log("nurse test:", jobs.filter((j) => /nurse/i.test(j.title)).slice(0, 3).map((j) => j.soc + " " + j.title + " £" + j.medianAnnual));
