// Clean ONS ASHE 2025 (Occupation SOC20) -> app/src/data/jobs.js
// Reads the "All" sheet via raw cells (sheet_to_json misreads these files).
// Layout: header row 5; data from row 7. Col A=Description, B=Code(SOC), D=Median £.
// Joins annual median (Table 2.7a) with hourly median (Table 2.5a) by SOC code.
//
// Run:  cd app && node scripts/build-jobs.cjs
const XLSX = require("xlsx");
const fs = require("fs");

const RAW = "../rawdata/table14";
const ANNUAL = `${RAW}/PROV - Occupation SOC20 (4) Table 14.7a   Annual pay - Gross 2025.xlsx`;
const HOURLY = `${RAW}/PROV - Occupation SOC20 (4) Table 14.5a   Hourly pay - Gross 2025.xlsx`;

function readMedians(file, sheet) {
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[sheet];
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const map = {}; // soc -> { title, median }
  for (let r = 6; r <= range.e.r; r++) {        // row 7 onward (0-indexed 6)
    const desc = ws["A" + (r + 1)];
    const code = ws["B" + (r + 1)];
    const med = ws["D" + (r + 1)];
    if (!code || code.v === "" || code.v == null) continue;
    const soc = String(code.v).trim();
    if (!/^\d{4}$/.test(soc)) continue;          // 4-digit unit occupations only
    const median = med && typeof med.v === "number" ? Math.round(med.v) : null;
    map[soc] = { title: String(desc.v).trim(), median };
  }
  return map;
}

const annual = readMedians(ANNUAL, "All");
const hourly = readMedians(HOURLY, "All");

const jobs = [];
for (const soc of Object.keys(annual).sort()) {
  const a = annual[soc], h = hourly[soc];
  if (a.median == null && (!h || h.median == null)) continue; // skip fully suppressed
  jobs.push({
    soc,
    title: a.title,
    medianAnnual: a.median,
    medianHourly: h && h.median != null ? Math.round(h.median * 100) / 100 : null,
  });
}

const DATA = JSON.stringify(jobs, null, 0)
  .replace(/^\[/, "[\n  ")
  .replace(/},\{/g, "},\n  {")
  .replace(/\]$/, "\n]");

const out = [
  "// ===========================================================================",
  "// REFERENCE DATA - UK occupations & median pay.",
  "// Source: ONS ASHE 2025 (provisional), Occupation SOC20, Table 2.7a (annual",
  "// gross median) + Table 2.5a (hourly gross median). 4-digit SOC unit groups.",
  "// Pay in GBP; null = ONS suppressed (small sample). Shared, read-only - NOT",
  "// part of any user profile. Regenerate: cd app && node scripts/build-jobs.cjs",
  "// ===========================================================================",
  "",
  'export const JOBS_LAST_UPDATED = "2025 (ASHE provisional)";',
  "",
  "export const JOBS = " + DATA + ";",
  "",
  "export const hasJobsData = () => JOBS.length > 0;",
  "",
  "// Simple fuzzy search over occupation titles. Returns up to `limit` matches.",
  "export function searchJobs(query, limit = 8) {",
  '  const q = (query || "").trim().toLowerCase();',
  "  if (!q) return [];",
  "  const words = q.split(/\\s+/);",
  "  return JOBS",
  "    .map((j) => {",
  "      const t = j.title.toLowerCase();",
  "      let score = 0;",
  "      if (t === q) score = 1000;",
  "      else if (t.startsWith(q)) score = 500;",
  "      else if (t.includes(q)) score = 200;",
  "      for (const w of words) if (w && t.includes(w)) score += 10;",
  "      return { j, score };",
  "    })",
  "    .filter((x) => x.score > 0)",
  "    .sort((a, b) => b.score - a.score)",
  "    .slice(0, limit)",
  "    .map((x) => x.j);",
  "}",
  "",
].join("\n");

fs.writeFileSync("src/data/jobs.js", out);
console.log("jobs written:", jobs.length);
console.log("sample:", JSON.stringify(jobs.slice(0, 3)));
console.log("nurse:", jobs.filter((j) => /nurse/i.test(j.title)).map((j) => `${j.soc} ${j.title} £${j.medianAnnual}`).slice(0, 4));
