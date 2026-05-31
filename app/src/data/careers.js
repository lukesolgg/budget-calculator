// Career helpers built on the ONS job dataset (jobs.js). Pure, read-only.
// "Same field" uses the SOC code hierarchy: first 3 digits = minor group
// (closest), first 2 = sub-major, first 1 = major group.
import { JOBS, searchJobs } from "./jobs.js";

const bySoc = Object.fromEntries(JOBS.map((j) => [j.soc, j]));

export const findJob = (soc) => bySoc[soc] || null;
export { searchJobs };

// Higher-paying roles in the same field as `soc`, nearest grouping first.
// Returns up to `limit`, each with the £ uplift vs the current role.
export function progressionFrom(soc, limit = 6) {
  const me = bySoc[soc];
  if (!me || me.medianAnnual == null) return [];
  const tiers = [3, 2, 1]; // minor group -> sub-major -> major
  const seen = new Set([soc]);
  const out = [];
  for (const t of tiers) {
    const prefix = soc.slice(0, t);
    JOBS.filter(
      (j) => j.soc.slice(0, t) === prefix &&
        !seen.has(j.soc) &&
        j.medianAnnual != null &&
        j.medianAnnual > me.medianAnnual
    )
      .sort((a, b) => b.medianAnnual - a.medianAnnual)
      .forEach((j) => { if (!seen.has(j.soc)) { seen.add(j.soc); out.push({ ...j, uplift: j.medianAnnual - me.medianAnnual }); } });
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}
