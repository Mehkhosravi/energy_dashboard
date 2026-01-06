// src/pages/scenarios/ScenarioTabs.tsx
export type ScenarioSubTab = "predefined" | "build" | "compare";

type Props = {
  value: ScenarioSubTab;
  onChange: (t: ScenarioSubTab) => void;
};

export default function ScenarioTabs({ value, onChange }: Props) {
  return (
    <div className="sheet-tabbar">
      <button
        className={`sheet-tab ${value === "predefined" ? "active" : ""}`}
        onClick={() => onChange("predefined")}
      >
        Predefined
      </button>
      <button
        className={`sheet-tab ${value === "build" ? "active" : ""}`}
        onClick={() => onChange("build")}
      >
        Build Scenario
      </button>
      <button
        className={`sheet-tab ${value === "compare" ? "active" : ""}`}
        onClick={() => onChange("compare")}
      >
        Compare
      </button>
    </div>
  );
}
