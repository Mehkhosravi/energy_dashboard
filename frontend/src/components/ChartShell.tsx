// src/components/ChartShell.tsx
import { useEffect, useMemo, useState } from "react";
import { useSelectedTerritory } from "./contexts/SelectedTerritoryContext";
import { fetchDemoData, type DemoDataResult } from "./pages/scenarios/predefined/DemoData";
import ScenarioBarChart from "./pages/scenarios/ScenarioBarChart";
import ScenarioLineChart from "./pages/scenarios/ScenarioLineChart";

// Available Filters
const CONSUMPTION_FILTERS = [
  { id: "total", label: "Total" },
  { id: "residential", label: "Residential" },
  { id: "primary", label: "Primary" },
  { id: "secondary", label: "Secondary" },
  { id: "tertiary", label: "Tertiary" },
];

const PRODUCTION_FILTERS = [
  { id: "total", label: "Total" },
  { id: "solar", label: "Solar" },
  { id: "wind", label: "Wind" },
  { id: "hydroelectric", label: "Hydro" },
  { id: "geothermal", label: "Geo" },
  { id: "biomass", label: "Biomass" },
];

const FUTURE_FILTERS = [
  { id: "solar", label: "Solar" },
  { id: "wind", label: "Wind" },
];

export default function ChartShell() {
  const { selectedTerritory } = useSelectedTerritory();

  // --- Local State for filters ---
  const [consFilter, setConsFilter] = useState("total");
  const [prodFilter, setProdFilter] = useState("total");
  const [futFilter, setFutFilter] = useState("solar");

  // --- Data State ---
  const [consData, setConsData] = useState<DemoDataResult>({ monthly: null, hourly: null, loading: false });
  const [prodData, setProdData] = useState<DemoDataResult>({ monthly: null, hourly: null, loading: false });
  const [futData, setFutData] = useState<DemoDataResult>({ monthly: null, hourly: null, loading: false });

  // Resolve Codes
  const territoryCode = useMemo(() => {
    if (!selectedTerritory) return null;
    if (selectedTerritory.level === "region") return selectedTerritory.codes.reg ?? null;
    if (selectedTerritory.level === "province") return selectedTerritory.codes.prov ?? null;
    return selectedTerritory.codes.mun ?? null; 
  }, [selectedTerritory]);
  
  const level = selectedTerritory?.level ?? "province"; // frontend level

  // Known demo territories
  const isDemoTerritory = useMemo(() => {
    if (!territoryCode) return false;
    // Province 1 (Torino), Comune 1001, Comune 1002
    return [1, 1001, 1002].includes(territoryCode);
  }, [territoryCode]);

  // --- Data Fetching ---
  
  // Consumption
  useEffect(() => {
    if (!isDemoTerritory || !territoryCode) {
        setConsData({ monthly: null, hourly: null, loading: false });
        return;
    }
    setConsData(prev => ({ ...prev, loading: true }));
    fetchDemoData(territoryCode, level, "consumption", consFilter)
      .then(setConsData);
  }, [territoryCode, level, consFilter, isDemoTerritory]);

  // Production
  useEffect(() => {
    if (!isDemoTerritory || !territoryCode) {
        setProdData({ monthly: null, hourly: null, loading: false });
        return;
    }
    setProdData(prev => ({ ...prev, loading: true }));
    fetchDemoData(territoryCode, level, "production", prodFilter)
      .then(setProdData);
  }, [territoryCode, level, prodFilter, isDemoTerritory]);

  // Future
  useEffect(() => {
    if (!isDemoTerritory || !territoryCode) {
        setFutData({ monthly: null, hourly: null, loading: false });
        return;
    }
    setFutData(prev => ({ ...prev, loading: true }));
    fetchDemoData(territoryCode, level, "future", futFilter)
      .then(setFutData);
  }, [territoryCode, level, futFilter, isDemoTerritory]);


  const renderColumn = (
    title: string, 
    filters: { id: string; label: string }[], 
    activeFilter: string, 
    setFilter: (v: string) => void,
    data: DemoDataResult,
    color: string
  ) => {
    return (
      <div className="chart-column" 
           style={{ 
             background: "#fff", 
             borderRadius: 12, 
             border: "1px solid #e5e7eb", 
             padding: 16,
             display: "flex",
             flexDirection: "column",
             gap: 16
           }}>
        
        {/* Header + Filter */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>{title}</div>
            
            {/* Filter Pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {filters.map(f => {
                    const active = f.id === activeFilter;
                    return (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            style={{
                                border: "none",
                                background: active ? "#2563eb" : "#f3f4f6",
                                color: active ? "#fff" : "#4b5563",
                                padding: "4px 10px",
                                borderRadius: 16,
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "all 0.2s"
                            }}
                        >
                            {f.label}
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Content */}
        {!territoryCode ? (
             <div className="muted" style={{ marginTop: 20 }}>Select a territory</div>
        ) : !isDemoTerritory ? (
             <div className="muted" style={{ marginTop: 20, fontStyle: "italic" }}>
                 Data not available for this territory in demo. <br/>
                 Try <span style={{fontWeight: 600}}>Torino (Prov)</span>, <span style={{fontWeight: 600}}>Agliè</span>, or <span style={{fontWeight: 600}}>Airasca</span>.
             </div>
        ) : data.loading ? (
             <div className="muted" style={{ marginTop: 20 }}>Loading...</div>
        ) : (
             <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                 {/* Row 1: Monthly */}
                 <div>
                     <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#374151" }}>Monthly</div>
                     {data.monthly ? (
                        <ScenarioBarChart 
                            data={data.monthly} 
                            color={color} 
                            unit="MWh"
                        />
                     ) : (
                        <div className="muted" style={{ fontSize: 12 }}>No monthly data available</div>
                     )}
                 </div>

                 {/* Row 2: Hourly */}
                 <div>
                     <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#374151" }}>Hourly (Typical Day)</div>
                     {data.hourly ? (
                        <ScenarioLineChart 
                            data={data.hourly} 
                            color={color}
                            unit="MWh"
                            seriesName1="Weekday"
                        />
                     ) : (
                        <div className="muted" style={{ fontSize: 12 }}>No hourly data available for this selection.</div>
                     )}
                 </div>
             </div>
        )}

      </div>
    );
  };

  return (
    <section className="charts" style={{ display: "block" }}>
      {/* 3 Column Grid */}
      <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))", 
          gap: 16,
          alignItems: "start",
          marginBottom: 32
      }}>
         {renderColumn("Consumption", CONSUMPTION_FILTERS, consFilter, setConsFilter, consData, "#3b82f6")}
         {renderColumn("Production", PRODUCTION_FILTERS, prodFilter, setProdFilter, prodData, "#10b981")}
         {renderColumn("Future Production", FUTURE_FILTERS, futFilter, setFutFilter, futData, "#8b5cf6")}
      </div>
    </section>
  );
}
