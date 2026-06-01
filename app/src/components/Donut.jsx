import { fmt, lighten, darken } from "../lib/engine.js";

// Reusable donut chart. `items`: [{ key, name, color, value }]. `total` is the
// value the full ring represents (the undrawn remainder shows as dark track).
export default function Donut({ items, total, idPrefix = "d", centerTop, centerBottom = "Monthly income", maxW = 420 }) {
  const cx = 100, cy = 100, r = 78, stroke = 18;
  const DEG = Math.PI / 180;
  const ptT = (radius, deg) => [
    cx + radius * Math.cos((-90 + deg) * DEG),
    cy + radius * Math.sin((-90 + deg) * DEG),
  ];
  const n3 = (v) => Math.round(v * 1000) / 1000;
  const gapDeg = 3.6;
  const drawable = items.filter((c) => c.value > 0);
  const shadowId = `seg-shadow-${idPrefix}`;

  let segs = null;
  if (total > 0 && drawable.length) {
    const cornerStroke = 3, rh = cornerStroke / 2;
    const angInset = rh / r / DEG;
    const roUse = r + stroke / 2 - rh, riUse = r - stroke / 2 + rh;
    const minDeg = 2.4, minSlot = minDeg + gapDeg;

    const slots = drawable.map((c) => ({ c, frac: c.value / total, slot: Math.max((c.value / total) * 360, minSlot) }));
    const expDeg = drawable.reduce((s, c) => s + (c.value / total) * 360, 0);
    let excess = slots.reduce((s, x) => s + x.slot, 0) - expDeg;
    if (excess > 0) {
      const headroom = slots.reduce((s, x) => s + Math.max(0, x.slot - minSlot), 0);
      if (headroom > 0) slots.forEach((x) => { x.slot -= excess * (Math.max(0, x.slot - minSlot) / headroom); });
    }

    let startDeg = 0;
    segs = slots.map(({ c, frac, slot }, i) => {
      const a0 = startDeg + gapDeg / 2, a1 = startDeg + slot - gapDeg / 2;
      let b0 = a0 + angInset, b1 = a1 - angInset;
      if (b1 <= b0) { const m = (a0 + a1) / 2; b0 = m - 0.25; b1 = m + 0.25; }
      const [ox0, oy0] = ptT(roUse, b0), [ox1, oy1] = ptT(roUse, b1);
      const [ix1, iy1] = ptT(riUse, b1), [ix0, iy0] = ptT(riUse, b0);
      const large = b1 - b0 > 180 ? 1 : 0;
      const d = `M ${n3(ox0)} ${n3(oy0)} A ${n3(roUse)} ${n3(roUse)} 0 ${large} 1 ${n3(ox1)} ${n3(oy1)} L ${n3(ix1)} ${n3(iy1)} A ${n3(riUse)} ${n3(riUse)} 0 ${large} 0 ${n3(ix0)} ${n3(iy0)} Z`;
      startDeg += slot;
      const gid = `grad-${idPrefix}-${c.key}-${i}`;
      return { d, c, gid, title: `${c.name}: ${fmt(c.value)} (${(frac * 100).toFixed(1)}%)` };
    });
  }

  const rOuter = r + stroke / 2;
  const innerOff = (r - stroke / 2) / rOuter;

  return (
    <div className="relative w-full" style={{ maxWidth: maxW }}>
      <svg viewBox="0 0 200 200" className="block h-auto w-full">
        <defs>
          <filter id={shadowId} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0.6" stdDeviation="2.2" floodColor="#000000" floodOpacity="0.6" />
          </filter>
          {segs && segs.map(({ c, gid }) => (
            <radialGradient key={gid} id={gid} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={rOuter}>
              <stop offset={innerOff} stopColor={lighten(c.color, 0.2)} />
              <stop offset={innerOff + (1 - innerOff) * 0.5} stopColor={c.color} />
              <stop offset={1} stopColor={darken(c.color, 0.12)} />
            </radialGradient>
          ))}
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2c3547" strokeWidth={stroke + 8} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1b2230" strokeWidth={stroke} />
        {segs && segs.map(({ d, gid, title }, i) => (
          <path key={i} d={d} fill={`url(#${gid})`} stroke={`url(#${gid})`} strokeWidth="3"
            strokeLinejoin="round" strokeLinecap="round" filter={`url(#${shadowId})`}>
            <title>{title}</title>
          </path>
        ))}
      </svg>
      {(centerTop || centerBottom) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[42px] font-bold leading-none">{centerTop}</div>
          <div className="mt-1.5 text-[18px] text-muted">{centerBottom}</div>
        </div>
      )}
    </div>
  );
}
