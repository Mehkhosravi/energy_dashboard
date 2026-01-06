// src/pages/scenarios/predefined/PredefinedScenariosPanel.tsx
import React, { useMemo, useState } from "react";

type Props = {
  state: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
};

// --- 11 predefined scenarios (static now, API later)
const PREDEFINED = [
  { id: "0",  code: "S0",  group: "Current",  short: "Base scenario with current production", notes: "No future production", sources: [] as string[] },
  { id: "1.1", code: "S1.1", group: "Solar",   short: "PV on rooftops, excluding historic centers", notes: "-", sources: ["solar"] },
  { id: "1.2", code: "S1.2", group: "Solar",   short: "PV excluding protected & cultural areas", notes: "-", sources: ["solar"] },
  { id: "2.1", code: "S2.1", group: "Wind",    short: "Wind turbines 850 kW", notes: "-", sources: ["wind"] },
  { id: "2.2", code: "S2.2", group: "Wind",    short: "Wind turbines 2000 kW", notes: "-", sources: ["wind"] },
  { id: "3.1", code: "S3.1", group: "Biomass", short: "Biomass excluding low air quality zones", notes: "Filtered", sources: ["biomass"] },
  { id: "3.2", code: "S3.2", group: "Biomass", short: "Biomass (all municipalities)", notes: "All", sources: ["biomass"] },
  { id: "4",  code: "S4",  group: "REC",      short: "All residential buildings as prosumers", notes: "Full prosumer", sources: ["solar"] },
  { id: "5",  code: "S5",  group: "REC",      short: "25% of residential buildings as prosumers", notes: "Partial prosumer", sources: ["solar"] },
  { id: "6.1", code: "S6.1", group: "Mixed",   short: "Use 100% of all sources", notes: "All full", sources: ["solar","wind","biomass"] },
  { id: "6.2", code: "S6.2", group: "Mixed",   short: "Use 50% solar, 100% wind & biomass", notes: "Reduced solar", sources: ["solar","wind","biomass"] },
];

// param keys you will fill later from API
const PARAM_KEYS_PLACEHOLDER = [
  "consumption_mwh",
  "production_mwh",
  "self_sufficiency_index",
  "self_consumption_index",
  "uncovered_demand_mwh",
  "over_production_mwh",
];

export default function PredefinedScenariosPanel({ state, setState }: Props) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PREDEFINED;
    return PREDEFINED.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        s.short.toLowerCase().includes(q)
    );
  }, [query]);

  const addScenario = (id: string) => {
    setState((s: any) => ({
      ...s,
      selectedScenarioIds: Array.from(new Set([...(s.selectedScenarioIds ?? []), id])),
    }));
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Predefined scenarios</div>
          <div className="panel-subtitle">
            Description table + scenario cards (values will be filled from API)
          </div>
        </div>

        <input
          className="input"
          placeholder="Search scenarios…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Description table */}
      <div className="predef-table">
        <div className="predef-table-head">
          <div>Scenario</div>
          <div>Group</div>
          <div>Description</div>
          <div>Sources</div>
          <div>Notes</div>
          <div />
        </div>

        {rows.map((s) => (
          <div className="predef-table-row" key={s.id}>
            <div className="mono">{s.code}</div>
            <div>{s.group}</div>
            <div className="muted">{s.short}</div>
            <div className="tag-row">
              {s.sources.length === 0 ? (
                <span className="muted">—</span>
              ) : (
                s.sources.map((t) => (
                  <span key={t} className={`tag tag-${t}`}>
                    {t}
                  </span>
                ))
              )}
            </div>
            <div className="muted">{s.notes}</div>
            <div>
              <button className="btn" onClick={() => addScenario(s.id)}>
                Add
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Cards board (11 cards) */}
      <div className="scenario-board">
        {PREDEFINED.map((s) => (
          <article className="scenario-card" key={s.id}>
            <header className="scenario-card-head">
              <div>
                <div className="scenario-title">{s.code}</div>
                <div className="scenario-desc">{s.short}</div>
              </div>
              <button className="btn" onClick={() => addScenario(s.id)}>
                Add
              </button>
            </header>

            <div className="scenario-tags">
              <span className="tag">{s.group}</span>
              {s.sources.map((t) => (
                <span key={t} className={`tag tag-${t}`}>
                  {t}
                </span>
              ))}
            </div>

            <div className="scenario-meta">
              <div className="meta-row">
                <span className="muted">Notes</span>
                <span>{s.notes}</span>
              </div>
              <div className="meta-row">
                <span className="muted">Year</span>
                <span>{state.year ?? "—"}</span>
              </div>
              <div className="meta-row">
                <span className="muted">Level</span>
                <span>{state.level}</span>
              </div>
            </div>

            {/* Placeholder param_key list */}
            <div className="param-table">
              {PARAM_KEYS_PLACEHOLDER.map((k) => (
                <div className="param-row" key={k}>
                  <div className="param-name">{k}</div>
                  <div className="param-value muted">—</div>

                  {/* Placeholder point/dot track */}
                  <div className="param-dotwrap">
                    <div className="dot-track">
                      <div className="dot" style={{ left: "50%" }} />
                    </div>
                    <div className="param-delta muted">—</div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
