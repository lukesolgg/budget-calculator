// ===========================================================================
// REFERENCE DATA - UK occupations & median pay.
// Source: ONS ASHE 2025 (provisional), Occupation SOC20, Table 2.7a (annual
// gross median) + Table 2.5a (hourly gross median). 4-digit SOC unit groups.
// Pay in GBP; null = ONS suppressed (small sample). Shared, read-only - NOT
// part of any user profile. Regenerate: cd app && node scripts/build-jobs.cjs
// ===========================================================================

export const JOBS_LAST_UPDATED = "2025 (ASHE provisional)";

export const JOBS = [
  
];

export const hasJobsData = () => JOBS.length > 0;

// Simple fuzzy search over occupation titles. Returns up to `limit` matches.
export function searchJobs(query, limit = 8) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return [];
  const words = q.split(/\s+/);
  return JOBS
    .map((j) => {
      const t = j.title.toLowerCase();
      let score = 0;
      if (t === q) score = 1000;
      else if (t.startsWith(q)) score = 500;
      else if (t.includes(q)) score = 200;
      for (const w of words) if (w && t.includes(w)) score += 10;
      return { j, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.j);
}
