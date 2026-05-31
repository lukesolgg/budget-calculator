import { Button } from "../components/ui.jsx";

export default function Welcome({ onNew, onReturn, onContinue, canContinue }) {
  return (
    <div className="mx-auto mt-[8vh] max-w-[560px] animate-pop text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br from-[#3b86ff] to-[#246cf0] shadow-[0_10px_30px_-8px_rgba(36,108,240,.6)] animate-glow">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" />
        </svg>
      </div>
      <h1 className="mb-2.5 text-[34px] font-bold tracking-tight">
        Debt Freedom <span className="text-accent">Planner</span>
      </h1>
      <p className="mb-8 text-base leading-relaxed text-muted">
        Answer a few quick questions and we'll build you a personalised,
        month-by-month plan to clear your debt and take control of your money.
      </p>
      <div className="mx-auto flex max-w-[360px] flex-col gap-3">
        <Button onClick={onNew} className="w-full py-[15px] text-[15px]">I'm new — let's get started</Button>
        <Button variant="ghost" onClick={onReturn} className="w-full py-[15px] text-[15px]">I have an account — sign in</Button>
        {canContinue && (
          <Button variant="ghost" onClick={onContinue} className="w-full py-[15px] text-[15px]">Continue where I left off</Button>
        )}
      </div>
      <p className="mt-[18px] text-xs text-muted">Anonymous &amp; free — no email needed, just a username &amp; PIN.</p>
    </div>
  );
}
