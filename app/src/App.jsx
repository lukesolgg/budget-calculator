export default function App() {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center animate-pop">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b86ff] to-[#246cf0] animate-glow">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold tracking-tight">
        Debt Freedom <span className="text-accent">Planner</span>
      </h1>
      <p className="mt-3 text-muted">React + Tailwind rebuild — scaffold is running ✓</p>
    </div>
  );
}
