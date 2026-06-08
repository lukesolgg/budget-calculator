import { useState, useEffect } from "react";
import { PlannerProvider, usePlanner, debtsOf } from "./state.jsx";
import { AuthProvider, useAuth } from "./lib/auth.jsx";
import Welcome from "./screens/Welcome.jsx";
import Wizard from "./screens/Wizard.jsx";
import Dashboard from "./screens/Dashboard.jsx";
import Results from "./screens/Results.jsx";
import Account from "./components/Account.jsx";

function Shell() {
  const { state } = usePlanner();
  const { session } = useAuth();
  const [screen, setScreen] = useState("welcome");
  const [signInSignal, setSignInSignal] = useState(0);
  const [wizardFirst, setWizardFirst] = useState(false);
  const go = (s) => { setScreen(s); window.scrollTo({ top: 0, behavior: "smooth" }); };
  // After onboarding, first-time debtors pick a payoff plan before the dashboard.
  // Returning users who already chose one skip straight through. (The budget now
  // lives in its own dashboard tab, not in the onboarding flow.)
  const finishWizard = () => go(debtsOf(state).length > 0 && !state.selectedPlan ? "plan" : "dashboard");
  const hasDraft = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem("dfp_draft_react") || "null");
      if (!raw) return false;
      // Namespaced (schema 2+) stores income under profile; legacy was top-level.
      return !!(raw.profile?.income || raw.income);
    } catch { return false; }
  })();

  // Returning from a bank consent redirect (Enable Banking adds ?code=…):
  // stash the code, clean the URL, and drop the user into the dashboard so the
  // Settings → Connected banks card can finish the link.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (!code) return;
    try { localStorage.setItem("orcl_bank_code", code); } catch {}
    window.history.replaceState({}, "", window.location.pathname);
    if (session) setScreen("dashboard");
  }, []); // eslint-disable-line

  const startNew = () => { setWizardFirst(true); go("wizard"); };
  // "Continue" only goes to the dashboard if actually signed in. A local draft
  // means they have an account (it's required) — so make them log in first.
  const onContinue = () => {
    if (session) return go("dashboard");
    if (hasDraft) return setSignInSignal((n) => n + 1); // open the sign-in modal
    startNew();
  };

  return (
    <div className={`mx-auto px-4 pb-16 pt-6 sm:px-6 ${screen === "dashboard" ? "max-w-[1840px]" : "max-w-[1240px]"}`}>
      <Account
        openSignal={signInSignal}
        showBar={screen !== "welcome"}
        onLogout={() => go("welcome")}
        onSignedIn={() => go("dashboard")}
        onCreateAccount={startNew}
      />
      {screen === "welcome" && (
        <Welcome
          onNew={onContinue}
          onReturn={() => setSignInSignal((n) => n + 1)}
          hasDraft={hasDraft || !!session}
        />
      )}
      {screen === "wizard" && (
        <Wizard firstRun={wizardFirst} onDone={() => { setWizardFirst(false); finishWizard(); }} onExitTop={() => go("welcome")} />
      )}
      {screen === "plan" && (
        <Results onboarding onBack={() => go("wizard")} onPickPlan={() => go("dashboard")} />
      )}
      {screen === "dashboard" && (
        <Dashboard onEdit={() => { setWizardFirst(false); go("wizard"); }} onLogout={() => go("welcome")} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <PlannerProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </PlannerProvider>
  );
}
