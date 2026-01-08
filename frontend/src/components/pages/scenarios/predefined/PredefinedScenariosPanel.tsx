// src/pages/scenarios/predefined/PredefinedScenariosPanel.tsx
import React, { useMemo, useState } from "react";
import {
  useScenarioTerritory,
  splitMetrics,
  type BackendLevel,
  type ScenarioTerritoryResponse,
} from "../hooks/useScenarioTerritory";

type Props = {
  state: {
    year: number | null;
    level: BackendLevel;
    territoryCode: number | null;
    paramKey: string | null;
    selectedScenarioIds: string[];
  };
  setState: React.Dispatch<React.SetStateAction<any>>;
  selectedTerritoryName?: string | null;
};

const PREDEFINED = [
  { id: "0", code: "S0", group: "Baseline", short: "Current system", sources: [] as string[] },
  { id: "1.1", code: "S1.1", group: "Solar", short: "PV rooftops (exclude historic centers)", sources: ["solar"] },
  { id: "1.2", code: "S1.2", group: "Solar", short: "PV (exclude protected/cultural)", sources: ["solar"] },
  { id: "2.1", code: "S2.1", group: "Wind", short: "Wind turbines 850 kW", sources: ["wind"] },
  { id: "2.2", code: "S2.2", group: "Wind", short: "Wind turbines 2 MW", sources: ["wind"] },
  { id: "3.1", code: "S3.1", group: "Biomass", short: "Biomass (exclude low air quality)", sources: ["biomass"] },
  { id: "3.2", code: "S3.2", group: "Biomass", short: "Biomass (all municipalities)", sources: ["biomass"] },
  { id: "4", code: "S4", group: "REC", short: "Full prosumer adoption", sources: ["solar"] },
  { id: "5", code: "S5", group: "REC", short: "25% prosumer adoption", sources: ["solar"] },
  { id: "6.1", code: "S6.1", group: "Mixed", short: "100% solar+wind+biomass", sources: ["solar", "wind", "biomass"] },
  { id: "6.2", code: "S6.2", group: "Mixed", short: "50% solar, 100% wind+biomass", sources: ["solar", "wind", "biomass"] },
];

function fmtValue(v: number, unit: string, format?: string) {
  if (format === "ratio" || unit === "ratio") {
    return v.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  }
  // energy numbers: keep readable, but not too long
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function groupValues(resp: ScenarioTerritoryResponse | null) {
  if (!resp?.values) return [];

  const items = Object.entries(resp.values).map(([key, x]) => ({
    key,
    label: x?.meta?.label ?? key,
    group: x?.meta?.group ?? "Other",
    format: x?.meta?.format ?? "",
    unit: x?.meta?.unit ?? x?.unit ?? "",
    value: x?.value ?? null,
  }));

  // group -> items
  const map = new Map<string, typeof items>();
  for (const it of items) {
    const g = it.group || "Other";
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(it);
  }

  // stable order inside groups
  for (const arr of map.values()) arr.sort((a, b) => a.label.localeCompare(b.label));

  // prefer Indexes first, then Energy, then Others
  const orderedGroups = Array.from(map.keys()).sort((a, b) => {
    const score = (g: string) =>
      g.toLowerCase().includes("indexes") ? 0 :
      g.toLowerCase().includes("energy") ? 1 :
      2;
    return score(a) - score(b) || a.localeCompare(b);
  });

  return orderedGroups.map((g) => ({ group: g, items: map.get(g)! }));
}

export default function PredefinedScenariosPanel({
  state,
  setState,
  selectedTerritoryName,
}: Props) {
  const [query, setQuery] = useState("");
  const [activeScenarioId, setActiveScenarioId] = useState<string>("0");

  const activeScenario = useMemo(
    () => PREDEFINED.find((s) => s.id === activeScenarioId) ?? PREDEFINED[0],
    [activeScenarioId]
  );

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

  const canLoad = Boolean(state.year && state.territoryCode);

  const { data, loading, error } = useScenarioTerritory({
    enabled: canLoad,
    level: state.level,
    year: state.year,
    territoryCode: state.territoryCode,
    scenarioId: activeScenarioId,
  });

  // derived groups for full “values”
  const groups = useMemo(() => groupValues(data), [data]);

  // optional: keep your previous “Indexes” list for a quick glance
  const quick = useMemo(() => splitMetrics(data), [data]); // { indexes, energy }

  const addScenario = (id: string) => {
    setState((s: any) => ({
      ...s,
      selectedScenarioIds: Array.from(new Set([...(s.selectedScenarioIds ?? []), id])),
    }));
  };

  const topStatus = !canLoad
    ? "Select territory + year"
    : loading
    ? "Loading…"
    : error
    ? "No data"
    : "Ready";

  return (
    <div className="panel">
      {/* Header */}
      <div className="panel-head" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="panel-title">Predefined scenarios</div>
          <div className="panel-subtitle">
            Pick a scenario → see full parameters for the selected territory/year
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            className="input"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 240 }}
          />
        </div>
      </div>

      {/* ✅ Tidy context bar */}
      <div
        className="predef-contextbar"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          padding: "10px 12px",
          borderRadius: 12,
        }}
      >
        <div className="ctx-pill">
          <span className="ctx-pill-label">Territory</span>
          <span className="ctx-pill-value">
            {selectedTerritoryName ?? "—"}
            {state.territoryCode ? (
              <span className="muted" style={{ marginLeft: 8 }}>
                (code {state.territoryCode})
              </span>
            ) : null}
          </span>
        </div>

        <div className="ctx-pill">
          <span className="ctx-pill-label">Level</span>
          <span className="ctx-pill-value mono">{state.level}</span>
        </div>

        <div className="ctx-pill">
          <span className="ctx-pill-label">Year</span>
          <span className="ctx-pill-value mono">{state.year ?? "—"}</span>
        </div>

        <div className="ctx-pill">
          <span className="ctx-pill-label">Scenario</span>
          <span className="ctx-pill-value mono">{activeScenario.code}</span>
        </div>

        <div className="ctx-pill" style={{ marginLeft: "auto" }}>
          <span className="ctx-pill-label">Status</span>
          <span className="ctx-pill-value">{topStatus}</span>
        </div>
      </div>

      {/* Main layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "560px minmax(0,1fr)", // wider left table
          gap: 14,
          marginTop: 12,
          alignItems: "start", // ✅ fixes: table not starting lower
        }}
      >
        {/* LEFT: compact list */}
        <div className="predef-table compact" style={{ overflow: "hidden" }}>
          <div className="predef-table-head"
            style={{
              display: "grid",
              gridTemplateColumns: "88px 120px minmax(0,1fr) 96px",
              columnGap: 12,
              alignItems: "center",
            }}
          >
            <div>Code</div>
            <div>Group</div>
            <div>Description</div>
            <div style={{ textAlign: "right" }}> </div>
          </div>


          {rows.map((s) => {
            const isActive = s.id === activeScenarioId;
            return (
              <div
                key={s.id}
                className="predef-table-row"
                
                onClick={() => setActiveScenarioId(s.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "88px 120px minmax(0,1fr) 96px",
                  columnGap: 12,
                  alignItems: "center",
                  cursor: "pointer",
                  borderRadius: 12,
                  outline: isActive ? "2px solid rgba(59,130,246,0.7)" : "none",
                  background: isActive ? "rgba(59,130,246,0.06)" : "transparent",
                  padding: "10px 12px",
                }}
              >
                <div className="mono">{s.code}</div>
                <div>{s.group}</div>

                {/* ✅ description gets full width and wraps nicely */}
                <div className="muted" style={{ lineHeight: 1.25 }}>
                  {s.short}
                </div>

                {/* ✅ consistent Add button alignment */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      addScenario(s.id);
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

            );
          })}
        </div>

        {/* RIGHT: details */}
        <aside
          className="scenario-detail-card"
          style={{
            padding: 14,
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.75)",
          }}
        >
          {/* card header */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{activeScenario.code}</div>
              <div className="muted">{activeScenario.short}</div>
            </div>
            <button className="btn" onClick={() => addScenario(activeScenario.id)}>
              Add
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <span className="tag">{activeScenario.group}</span>
            {activeScenario.sources.map((t) => (
              <span key={t} className={`tag tag-${t}`}>
                {t}
              </span>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            {!canLoad ? (
              <div className="muted">Select a territory + year to load metrics.</div>
            ) : loading ? (
              <div className="muted">Loading metrics…</div>
            ) : error ? (
              <div className="muted">No data / error: {error}</div>
            ) : !data ? (
              <div className="muted">No response.</div>
            ) : (
              <>
                {/* Quick Index strip */}
                {quick.indexes.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0,1fr))",
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    {quick.indexes.slice(0, 3).map((m: any) => (
                      <div
                        key={m.key}
                        style={{
                          padding: 10,
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.08)",
                          background: "rgba(0,0,0,0.02)",
                        }}
                        title={m.key}
                      >
                        <div className="muted" style={{ fontSize: 12 }}>
                          {m.label}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>
                          {m.value == null ? "—" : fmtValue(m.value, "ratio", "ratio")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ✅ Full values: grouped */}
                <div style={{ fontWeight: 700, marginBottom: 8 }}>All parameters</div>

                <div style={{ display: "grid", gap: 10 }}>
                  {groups.map((g) => (
                    <section
                      key={g.group}
                      style={{
                        border: "1px solid rgba(0,0,0,0.08)",
                        borderRadius: 12,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          padding: "10px 12px",
                          fontWeight: 700,
                          background: "rgba(0,0,0,0.03)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{g.group}</span>
                        <span className="muted" style={{ fontWeight: 500, fontSize: 12 }}>
                          {g.items.length} items
                        </span>
                      </div>

                      <div style={{ padding: 10 }}>
                        <div style={{ display: "grid", gap: 8 }}>
                          {g.items.map((m) => (
                            <div
                              key={m.key}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 14,
                                alignItems: "baseline",
                              }}
                              title={m.key}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600 }}>{m.label}</div>
                                <div className="muted" style={{ fontSize: 12 }}>
                                  {m.key}
                                </div>
                              </div>

                              <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                <div style={{ fontWeight: 800 }}>
                                  {m.value == null ? "—" : fmtValue(m.value, m.unit, m.format)}
                                </div>
                                <div className="muted" style={{ fontSize: 12 }}>
                                  {m.unit || (m.format === "ratio" ? "ratio" : "")}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Optional: small helper */}
      <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
        Tip: scenario values are loaded only for the selected row (1 API call).
      </div>
    </div>
  );
}
