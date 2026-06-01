import { useState } from "react";
import { PlannerProvider, usePlanner, debtsOf } from "./state.jsx";
import { AuthProvider } from "./lib/auth.jsx";
import Welcome from "./screens/Welcome.jsx";
import Wizard from "./screens/Wizard.jsx";
import Inputs from "./screens/Inputs.jsx";
import Dashboard from "./screens/Dashboard.jsx";
import Results from "./screens/Results.jsx";
import Account from "./components/Account.jsx";

function Shell() {
  const { state } = usePlanner();
  const [screen, setScreen] = useState("welcome");
  const [signInSignal, setSignInSignal] = useState(0);
  const [wizardFirst, setWizardFirst] = useState(false);
  const go = (s) => { setScreen(s); window.scrollTo({ top: 0, behavior: "smooth" }); };
  // After the budget step, first-time debtors pick a payoff plan before the
  // dashboard. Returning users who already chose one skip straight through.
  const finishInputs = () => go(debtsOf(state).length > 0 && !state.selectedPlan ? "plan" : "dashboard");
  const hasDraft = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem("dfp_draft_react") || "null");
      if (!raw) return false;
      // Namespaced (schema 2+) stores income under profile; legacy was top-level.
      return !!(raw.profile?.income || raw.income);
    } catch { return false; }
  })();

  return (
    <div className={`mx-auto px-4 pb-16 pt-6 sm:px-6 ${screen === "dashboard" ? "max-w-[1840px]" : "max-w-[1240px]"}`}>
      <Account
        openSignal={signInSignal}
        showBar={screen !== "welcome"}
        onLogout={() => go("welcome")}
        onSignedIn={() => go("dashboard")}
      />
      {screen === "welcome" && (
        <Welcome
          onNew={() => (hasDraft ? go("dashboard") : (setWizardFirst(true), go("wizard")))}
          onReturn={() => setSignInSignal((n) => n + 1)}
          hasDraft={hasDraft}
        />
      )}
      {screen === "wizard" && (
        <Wizard firstRun={wizardFirst} onDone={() => { setWizardFirst(false); go("inputs"); }} onExitTop={() => go("welcome")} />
      )}
      {screen === "inputs" && (
        <Inputs onBack={() => go("wizard")} onResults={finishInputs} onEdit={() => go("wizard")} />
      )}
      {screen === "plan" && (
        <Results onboarding onBack={() => go("inputs")} onPickPlan={() => go("dashboard")} />
      )}
      {screen === "dashboard" && (
        <Dashboard onEdit={() => go("inputs")} />
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
