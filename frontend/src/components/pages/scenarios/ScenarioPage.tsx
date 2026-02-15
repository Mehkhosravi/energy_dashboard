// src/pages/scenarios/ScenariosPage.tsx
import { useEffect, useMemo, useState } from "react";
import ScenarioTabs, { type ScenarioSubTab } from "./ScenarioTabs";

import PredefinedScenariosPanel from "./predefined/PredefinedScenariosPanel";
import BuildScenarioPanel from "./build/BuildScenarioPanel";
import CompareScenariosPanel from "./compare/CompareScenariosPanel";

import { useSelectedTerritory } from "../../contexts/SelectedTerritoryContext";
import type { TerritoryLevel } from "../../TerritoryLevel";

type BackendLevel = "region" | "province" | "comune";

function toBackendLevel(level: TerritoryLevel): BackendLevel {
  return level === "municipality" ? "comune" : level;
}

function territoryCodeFor(level: BackendLevel, codes: { reg: number; prov?: number; mun?: number }) {
  if (level === "region") return codes.reg ?? null;
  if (level === "province") return codes.prov ?? null;
  return codes.mun ?? null; // comune
}

type ScenarioPageState = {
  year: number | null;
  level: BackendLevel;

  // IMPORTANT: this is the code expected by backend: region_code / province_code / comune_code
  territoryCode: number | null;

  // UI metric selection (used later for compare tabs)
  paramKey: string | null;

  selectedScenarioIds: string[];
};

export default function ScenariosPage() {
  const [tab, setTab] = useState<ScenarioSubTab>("predefined");
  const { selectedTerritory } = useSelectedTerritory();

  const [state, setState] = useState<ScenarioPageState>({
    year: 2019,
    level: "province",
    territoryCode: null,
    paramKey: "consumption_mwh",
    selectedScenarioIds: ["0"],
  });

  // Sync state.level + territoryCode from SelectedTerritoryContext
  useEffect(() => {
    if (!selectedTerritory) {
      setState((s) => ({ ...s, territoryCode: null }));
      return;
    }

    const backendLevel = toBackendLevel(selectedTerritory.level);
    const code = territoryCodeFor(backendLevel, selectedTerritory.codes);

    setState((s) => ({
      ...s,
      level: backendLevel,
      territoryCode: code,
    }));
  }, [selectedTerritory]);

  const headerSubtitle = useMemo(() => {
    const year = state.year ?? "—";

    const place =
      selectedTerritory?.name ??
      (state.territoryCode != null ? `code ${state.territoryCode}` : "All");

    return `${state.level} · ${place} · ${year}`;
  }, [state.level, state.year, state.territoryCode, selectedTerritory?.name]);

  return (
    <div className="scenarios-page">
      {/* Top bar */}
      <div className="page-head">
        <div>
          <div className="page-title">Scenarios</div>
          <div className="page-subtitle">{headerSubtitle}</div>
        </div>

        <div className="page-actions">
          <button className="btn">Export</button>
          <button className="btn primary">Save</button>
        </div>
      </div>

      {/* Tab row */}
      <ScenarioTabs value={tab} onChange={setTab} />

      {/* Single-column content */}
      <section className="scenarios-main">
        {tab === "predefined" && (
          <PredefinedScenariosPanel
            state={state}
            _setState={setState}
            selectedTerritoryName={selectedTerritory?.name ?? null}
          />
        )}
        {tab === "build" && <BuildScenarioPanel state={state} setState={setState} />}
        {tab === "compare" && <CompareScenariosPanel state={state} setState={setState} />}
      </section>
    </div>
  );
}
