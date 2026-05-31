// ===========================================================================
// REFERENCE DATA — UK occupations & median pay (ONS ASHE, by SOC code).
// Shared, read-only. NOT part of any user profile.
//
// PLACEHOLDER until the cleaned ASHE dataset lands. Luke will drop the raw
// ASHE export in /data-raw and I'll generate this file:
//   { soc, title, medianAnnual, medianHourly }
// `JOB_SEARCH` (a simple fuzzy search over titles) will be added then.
// ===========================================================================

export const JOBS_LAST_UPDATED = null; // set when real data is generated

export const JOBS = [
  // e.g. { soc: "2136", title: "Programmers & software development", medianAnnual: 49000, medianHourly: 24.1 }
];

export const hasJobsData = () => JOBS.length > 0;
