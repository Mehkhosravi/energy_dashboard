// src/pages/scenarios/ScenariosPage.tsx
import { useMemo, useState } from "react";
import ScenarioTabs, { type ScenarioSubTab } from "./ScenarioTabs"

import PredefinedScenariosPanel from "./predefined/PredefinedScenariosPanel";
import BuildScenarioPanel from "./build/BuildScenarioPanel";
import CompareScenariosPanel from "./compare/CompareScenariosPanel";

type ScenarioPageState = {
  year: number | null;
  level: "region" | "province" | "comune"; // align with backend naming
  territoryId: number | null;

  // what user wants to look at
  paramKey: string | null;

  // selection of scenarios (IDs or keys)
  selectedScenarioIds: string[]; // e.g. ["0","4","u_foo"]
};

export default function ScenariosPage() {
  const [tab, setTab] = useState<ScenarioSubTab>("predefined");

  // page-wide controls (shared across tabs)
  const [state, setState] = useState<ScenarioPageState>({
    year: 2019,
    level: "province",
    territoryId: null,
    paramKey: "consumption_mwh",
    selectedScenarioIds: ["0"],
  });

  const headerSubtitle = useMemo(() => {
    const year = state.year ?? "—";
    const territory = state.territoryId ? `#${state.territoryId}` : "All";
    return `${state.level} · ${territory} · ${year}`;
  }, [state.level, state.territoryId, state.year]);

  return (
    <div className="scenarios-page">
      {/* Top bar */}
      <div className="page-head">
        <div>
          <div className="page-title">Scenarios</div>
          <div className="page-subtitle">{headerSubtitle}</div>
        </div>

        {/* top-right actions */}
        <div className="page-actions">
          <button className="btn">Export</button>
          <button className="btn primary">Save</button>
        </div>
      </div>

      {/* Tab row */}
      <ScenarioTabs value={tab} onChange={setTab} />

      {/* Two-column layout */}
      <div className="scenarios-grid">
        {/* Left rail: shared filters */}
        <aside className="scenarios-rail">
          <div className="rail-card">
            <div className="rail-title">Context</div>

            <label className="field">
              <span>Level</span>
              <select
                value={state.level}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    level: e.target.value as ScenarioPageState["level"],
                  }))
                }
              >
                <option value="region">Region</option>
                <option value="province">Province</option>
                <option value="comune">Municipality</option>
              </select>
            </label>

            <label className="field">
              <span>Year</span>
              <select
                value={state.year ?? ""}
                onChange={(e) =>
                  setState((s) => ({ ...s, year: Number(e.target.value) }))
                }
              >
                <option value="2019">2019</option>
                <option value="2020">2020</option>
                <option value="2021">2021</option>
              </select>
            </label>

            <label className="field">
              <span>Metric (param_key)</span>
              <select
                value={state.paramKey ?? ""}
                onChange={(e) => setState((s) => ({ ...s, paramKey: e.target.value }))}
              >
                <option value="consumption_mwh">consumption_mwh</option>
                <option value="production_mwh">production_mwh</option>
                <option value="self_sufficiency_index">self_sufficiency_index</option>
              </select>
            </label>
          </div>

          <div className="rail-card">
            <div className="rail-title">Selected scenarios</div>

            <div className="chips">
              {state.selectedScenarioIds.map((id) => (
                <button
                  key={id}
                  className="chip"
                  onClick={() =>
                    setState((s) => ({
                      ...s,
                      selectedScenarioIds: s.selectedScenarioIds.filter((x) => x !== id),
                    }))
                  }
                  title="Remove"
                >
                  {id} ✕
                </button>
              ))}
            </div>

            <button
              className="btn"
              onClick={() =>
                setState((s) => ({
                  ...s,
                  selectedScenarioIds: Array.from(new Set([...s.selectedScenarioIds, "4"])),
                }))
              }
            >
              + Quick add “4”
            </button>

            <div className="hint">
              Tip: Predefined tab is where you’ll browse and add scenarios. Compare uses
              the selection above.
            </div>
          </div>
        </aside>

        {/* Main content: tab panel */}
        <section className="scenarios-main">
          {tab === "predefined" && (
            <PredefinedScenariosPanel state={state} setState={setState} />
          )}
          {tab === "build" && <BuildScenarioPanel state={state} setState={setState} />}
          {tab === "compare" && (
            <CompareScenariosPanel state={state} setState={setState} />
          )}
        </section>
      </div>
    </div>
  );
}
