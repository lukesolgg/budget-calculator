import { useId } from "react";

// Orcl. mark — an oracle "orb" (the O) with a growth arrow rising out of the
// top: foresight + financial growth, in the brand green→teal→blue gradient.
// `badge` renders the app-icon style (gradient rounded square, dark mark).
export default function Logo({ size = 40, badge = false, className = "" }) {
  const gid = useId().replace(/[:]/g, "");
  if (badge) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="Orcl.">
        <defs>
          <linearGradient id={`b${gid}`} x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#12b886" /><stop offset="1" stopColor="#2fe6a6" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="13" fill={`url(#b${gid})`} />
        <g stroke="#04140d" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle cx="24" cy="24" r="12.5" strokeDasharray="59 21" transform="rotate(-45 24 24)" />
          <path d="M18.5 28.5 L29.5 13" />
          <path d="M23.5 12.5 L30.5 12.5 L30.5 19.5" />
        </g>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="Orcl.">
      <defs>
        <linearGradient id={`g${gid}`} x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#12b886" /><stop offset="0.55" stopColor="#2fe6a6" /><stop offset="1" stopColor="#5fd6ff" />
        </linearGradient>
      </defs>
      <g stroke={`url(#g${gid})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx="24" cy="24" r="16" strokeDasharray="75 26" transform="rotate(-45 24 24)" />
        <path d="M17 30 L31 11" />
        <path d="M23 10 L32 10 L32 19" />
      </g>
    </svg>
  );
}
