// Small shared UI primitives, Tailwind-styled.

export function Button({ variant = "primary", className = "", children, ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold cursor-pointer transition active:translate-y-px disabled:opacity-40 disabled:cursor-default";
  const sizes = "px-[18px] py-[10px] text-sm";
  const variants = {
    primary: "text-[#04140d] bg-gradient-to-b from-[#2fe6a6] to-[#12b886] shadow-[0_6px_18px_rgba(18,184,134,.35)] hover:brightness-110",
    ghost: "text-ink bg-[#101a18] border border-[#1e2b27] hover:brightness-125",
  };
  return (
    <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ className = "", children }) {
  return (
    <section className={`rounded-2xl border border-border bg-gradient-to-b from-panel to-panel2 p-6 ${className}`}>
      {children}
    </section>
  );
}

export function MoneyInput({ value, onChange, placeholder, className = "", big = false }) {
  return (
    <span className="relative block">
      <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted ${big ? "text-2xl left-[18px]" : "text-sm"}`}>£</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border border-border bg-[#0c121d] text-ink outline-none transition focus:border-accent ${
          big ? "py-[18px] pl-[42px] pr-[18px] text-[28px] font-bold focus:shadow-[0_0_24px_-8px_#4ea8ff]" : "py-3 pl-7 pr-3 text-[15px]"
        } ${className}`}
      />
    </span>
  );
}

export function Chevron({ dir = "right" }) {
  const pts = dir === "right" ? "9 18 15 12 9 6" : "15 18 9 12 15 6";
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={pts} />
    </svg>
  );
}

// Glowing yes/no or choice card used in the wizard.
export function Choice({ selected, emoji, title, desc, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`relative cursor-pointer select-none rounded-2xl border bg-[#0c121d] p-5 text-center transition hover:-translate-y-0.5 ${
        selected
          ? "border-accent bg-gradient-to-b from-[#14233c] to-[#0c121d] shadow-[0_0_0_1px_#4ea8ff,0_0_30px_-8px_#4ea8ff]"
          : "border-border hover:border-[#36507e] hover:shadow-[0_8px_26px_-12px_rgba(78,168,255,.5)]"
      }`}
    >
      {selected && <span className="absolute right-3 top-2.5 font-extrabold text-accent">✓</span>}
      <span className="mb-2.5 block text-3xl">{emoji}</span>
      <span className="block text-base font-bold">{title}</span>
      {desc && <span className="mt-1 block text-[12.5px] leading-tight text-muted">{desc}</span>}
    </div>
  );
}
