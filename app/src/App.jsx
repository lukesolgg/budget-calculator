import { useState } from "react";
import { PlannerProvider } from "./state.js";
import Welcome from "./screens/Welcome.jsx";
import Wizard from "./screens/Wizard.jsx";

function Shell() {
  const [screen, setScreen] = useState("welcome");
  const go = (s) => { setScreen(s); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return (
    <div className="mx-auto max-w-[1240px] px-6 pb-16 pt-8">
      {screen === "welcome" && (
        <Welcome
          onNew={() => go("wizard")}
          onReturn={() => go("wizard")}
          onContinue={() => go("inputs")}
          canContinue={false}
        />
      )}
      {screen === "wizard" && (
        <Wizard onDone={() => go("inputs")} onExitTop={() => go("welcome")} />
      )}
      {screen === "inputs" && (
        <div className="py-24 text-center text-muted">Budget screen — coming next ✓</div>
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
