import { useState } from "react";
import { PlannerProvider } from "./state.jsx";
import Welcome from "./screens/Welcome.jsx";
import Wizard from "./screens/Wizard.jsx";
import Inputs from "./screens/Inputs.jsx";
import Results from "./screens/Results.jsx";
import Detail from "./screens/Detail.jsx";

function Shell() {
  const [screen, setScreen] = useState("welcome");
  const [planKey, setPlanKey] = useState("balanced");
  const go = (s) => { setScreen(s); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const hasDraft = (() => {
    try { return !!JSON.parse(localStorage.getItem("dfp_draft_react") || "null")?.income; } catch { return false; }
  })();

  return (
    <div className="mx-auto max-w-[1240px] px-6 pb-16 pt-8">
      {screen === "welcome" && (
        <Welcome onNew={() => go("wizard")} onReturn={() => go("wizard")} onContinue={() => go("inputs")} canContinue={hasDraft} />
      )}
      {screen === "wizard" && (
        <Wizard onDone={() => go("inputs")} onExitTop={() => go("welcome")} />
      )}
      {screen === "inputs" && (
        <Inputs onBack={() => go("wizard")} onResults={() => go("results")} onEdit={() => go("wizard")} />
      )}
      {screen === "results" && (
        <Results onBack={() => go("inputs")} onPickPlan={(k) => { setPlanKey(k); go("detail"); }} />
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
