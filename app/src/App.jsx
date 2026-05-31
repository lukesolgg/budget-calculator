import { useState } from "react";
import { PlannerProvider } from "./state.jsx";
import Welcome from "./screens/Welcome.jsx";
import Wizard from "./screens/Wizard.jsx";
import Inputs from "./screens/Inputs.jsx";
import Dashboard from "./screens/Dashboard.jsx";
import Savings from "./screens/Savings.jsx";
import Career from "./screens/Career.jsx";
import Results from "./screens/Results.jsx";
import Detail from "./screens/Detail.jsx";
import Account from "./components/Account.jsx";

function Shell() {
  const [screen, setScreen] = useState("welcome");
  const [planKey, setPlanKey] = useState("balanced");
  const [signInSignal, setSignInSignal] = useState(0);
  const go = (s) => { setScreen(s); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const hasDraft = (() => {
    try {
      const raw = JSON.parse(localStorage.getItem("dfp_draft_react") || "null");
      if (!raw) return false;
      // Namespaced (schema 2+) stores income under profile; legacy was top-level.
      return !!(raw.profile?.income || raw.income);
    } catch { return false; }
  })();

  return (
    <div className="mx-auto max-w-[1240px] px-6 pb-16 pt-8">
      <Account openSignal={signInSignal} showBar={screen !== "welcome"} />
      {screen === "welcome" && (
        <Welcome
          onNew={() => (hasDraft ? go("dashboard") : go("wizard"))}
          onReturn={() => setSignInSignal((n) => n + 1)}
          hasDraft={hasDraft}
        />
      )}
      {screen === "wizard" && (
        <Wizard onDone={() => go("inputs")} onExitTop={() => go("welcome")} />
      )}
      {screen === "inputs" && (
        <Inputs onBack={() => go("wizard")} onResults={() => go("dashboard")} onEdit={() => go("wizard")} />
      )}
      {screen === "dashboard" && (
        <Dashboard onOpenDebt={() => go("results")} onEdit={() => go("inputs")} onOpenSavings={() => go("savings")} onOpenCareer={() => go("career")} />
      )}
      {screen === "savings" && (
        <Savings onBack={() => go("dashboard")} />
      )}
      {screen === "career" && (
        <Career onBack={() => go("dashboard")} />
      )}
      {screen === "results" && (
        <Results onBack={() => go("dashboard")} onPickPlan={(k) => { setPlanKey(k); go("detail"); }} />
      )}
      {screen === "detail" && (
        <Detail planKey={planKey} onBack={() => go("results")} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <PlannerProvider>
      <Shell />
    </PlannerProvider>
  );
}
