// src/components/ChartShell.tsx
import { useEffect, useMemo, useState } from "react";
import { useSelectedTerritory } from "./contexts/SelectedTerritoryContext";
import { fetchDemoData, type DemoDataResult } from "./pages/scenarios/predefined/DemoData";
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

const FUTURE_CATEGORIES = [
  { 
      id: "solar_c1", 
      label: "Solar C1", 
      options: [
          { id: "solar_c1_total", label: "Total" },
          { id: "solar_c1_residential", label: "Residential" },
          { id: "solar_c1_agriculture", label: "Primary" },
          { id: "solar_c1_industrial", label: "Secondary" },
          { id: "solar_c1_services", label: "Tertiary" },
      ]
  },
  { 
      id: "solar_c2", 
      label: "Solar C2", 
      options: [
          { id: "solar_c2_total", label: "Total" },
          { id: "solar_c2_residential", label: "Residential" },
          { id: "solar_c2_agriculture", label: "Primary" },
          { id: "solar_c2_industrial", label: "Secondary" },
          { id: "solar_c2_services", label: "Tertiary" },
      ]
  },
  { 
      id: "wind_v52", 
      label: "Wind V52", 
      options: [{ id: "wind_v52", label: "Total" }] 
  },
  { 
      id: "wind_v80", 
      label: "Wind V80", 
      options: [{ id: "wind_v80", label: "Total" }] 
  },
  { 
      id: "biomass", 
      label: "Biomass", 
      options: [{ id: "biomass", label: "Total" }] 
  },
];

const FILTER_COLORS: Record<string, string> = {
    // Consumption
    "total": "#3b82f6", // Blue
    "residential": "#f97316", // Orange
    "primary": "#10b981", // Emerald
    "secondary": "#8b5cf6", // Violet
    "tertiary": "#ec4899", // Pink
    
    // Production
    "solar": "#eab308", // Yellow
    "wind": "#06b6d4", // Cyan
    "hydroelectric": "#3b82f6", // Blue
    "geothermal": "#ef4444", // Red
    // biomass: reused

    // Future (Solar C1)
    "solar_c1_total": "#eab308", // Yellow
    "solar_c1_residential": "#f97316", // Orange
    "solar_c1_agriculture": "#84cc16", // Lime
    "solar_c1_industrial": "#6366f1", // Indigo
    "solar_c1_services": "#ec4899", // Pink
    
    // Future (Solar C2) - use dashed or slightly different? Reusing colors for simplicity, legend helps.
    "solar_c2_total": "#facc15", // Yellow-400
    "solar_c2_residential": "#fb923c", // Orange-400
    "solar_c2_agriculture": "#a3e635", // Lime-400
    "solar_c2_industrial": "#818cf8", // Indigo-400
    "solar_c2_services": "#f472b6", // Pink-400
    
    // Future (Wind)
    "wind_v52": "#06b6d4", // Cyan
    "wind_v80": "#22d3ee", // Cyan-400
    
    "biomass": "#84cc16", // Lime
};

const getFilterLabel = (id: string, filters: any[]) => filters.find(f => f.id === id)?.label || id;

export default function ChartShell() {
  const { selectedTerritory } = useSelectedTerritory();

  // --- Local State for filters ---
  // --- Local State for filters (Arrays for multi-select) ---
  const [consFilters, setConsFilters] = useState<string[]>(["total"]);
  const [prodFilters, setProdFilters] = useState<string[]>(["total"]);
  
  // Future Production State
  const [futCategory, setFutCategory] = useState("solar_c1");
  const [futFilters, setFutFilters] = useState<string[]>(["solar_c1_total"]);
  
  // --- Local State for Hourly Month (1-12) — one per column ---
  const [consMonth, setConsMonth] = useState(1);
  const [prodMonth, setProdMonth] = useState(1);
  const [futMonth, setFutMonth] = useState(1);

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
    // Province 1 (Torino), Comune 1001 (Agliè), Comune 1002 (Airasca), Municipality 1272 (Torino)
    return [1, 1001, 1002, 1272].includes(territoryCode);
  }, [territoryCode]);

  // --- Data Fetching ---

  const toggleFilter = (
    currentFilters: string[], 
    setFilters: (f: string[]) => void, 
    id: string
  ) => {
      // Logic:
      // 1. If clicking "total": clear others, set ["total"]
      // 2. If clicking other:
      //    - If "total" is in list, remove it.
      //    - Toggle selection.
      //    - If list becomes empty, revert to ["total"]? Or enforce at least one?
      //      Let's enforce at least one by not allowing deselect if it's the last one? 
      //      Or revert to Total. Revert to Total is safer.
      
      let newFilters = [...currentFilters];
      
      if (id === "total" || id.includes("_total")) { 
          // Treat any "_total" like "total" (e.g. solar_c1_total)? 
          // Actually "solar_c1_total" is a specific sub-total.
          // Let's stick to the specific "total" ID for consumption/production logic.
          if (id === "total") {
              setFilters(["total"]);
              return;
          }
      }

      // If "total" was selected and we click something else, remove "total" first
      if (newFilters.includes("total")) {
          newFilters = newFilters.filter(f => f !== "total");
      }

      if (newFilters.includes(id)) {
          newFilters = newFilters.filter(f => f !== id);
      } else {
          newFilters.push(id);
      }

      if (newFilters.length === 0) {
          setFilters(id === "total" ? ["total"] : ["total"]); // Fallback
          // Assuming "total" exists in that group. For Future, "solar_c1_total" is default.
          // We might need a default param.
          // Simplified: just set default if empty.
      } else {
          setFilters(newFilters);
      }

  };

  const handleFutCategoryChange = (catId: string) => {
      setFutCategory(catId);
      // Reset filters to the default for this category
      const cat = FUTURE_CATEGORIES.find(c => c.id === catId);
      if (cat && cat.options.length > 0) {
          setFutFilters([cat.options[0].id]);
      } else {
          setFutFilters([]);
      }
  };
  
  // Consumption
  useEffect(() => {
    if (!isDemoTerritory || !territoryCode) {
        setConsData({ monthly: null, hourly: null, loading: false });
        return;
    }
    setConsData(prev => ({ ...prev, loading: true }));
    fetchDemoData(territoryCode, level, "consumption", consFilters, consMonth)
      .then(setConsData);
  }, [territoryCode, level, consFilters, consMonth, isDemoTerritory]);

  // Production
  useEffect(() => {
    if (!isDemoTerritory || !territoryCode) {
        setProdData({ monthly: null, hourly: null, loading: false });
        return;
    }
    setProdData(prev => ({ ...prev, loading: true }));
    fetchDemoData(territoryCode, level, "production", prodFilters, prodMonth)
      .then(setProdData);
  }, [territoryCode, level, prodFilters, prodMonth, isDemoTerritory]);

  // Future
  useEffect(() => {
    if (!isDemoTerritory || !territoryCode) {
        setFutData({ monthly: null, hourly: null, loading: false });
        return;
    }
    setFutData(prev => ({ ...prev, loading: true }));
    fetchDemoData(territoryCode, level, "future", futFilters, futMonth)
      .then(setFutData);
  }, [territoryCode, level, futFilters, futMonth, isDemoTerritory]);


  const renderColumn = (
    title: string, 
    filters: { id: string; label: string; group?: string }[], 
    activeFilters: string[], 
    setFilters: (v: string[]) => void,
    data: DemoDataResult,
    defaultColor: string,
    monthValue: number,
    setMonthValue: (v: number) => void
  ) => {
    
    // Generate Series definitions for charts
    const series = activeFilters.map(id => ({
        dataKey: id,
        name: getFilterLabel(id, filters),
        color: FILTER_COLORS[id] || defaultColor
    }));

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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>{title}</div>
            </div>
            
            {/* Filter: pills (multi-select) */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {filters.map(f => {
                    const active = activeFilters.includes(f.id);
                    const color = FILTER_COLORS[f.id] || defaultColor;
                    return (
                        <button
                            key={f.id}
                            onClick={() => toggleFilter(activeFilters, setFilters, f.id)}
                            style={{
                                border: active ? `1px solid ${color}` : "1px solid transparent",
                                background: active ? color : "#f3f4f6",
                                color: active ? "#fff" : "#4b5563",
                                padding: "4px 10px",
                                borderRadius: 16,
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "all 0.2s",
                                marginBottom: 4
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
                 {/* Row 1: Monthly - NOW LINE CHART */}
                 <div>
                     <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#374151" }}>Monthly</div>
                     {data.monthly ? (
                        <ScenarioLineChart 
                            data={data.monthly} 
                            series={series}
                            unit="MWh"
                        />
                     ) : (
                        <div className="muted" style={{ fontSize: 12 }}>No monthly data available</div>
                     )}
                 </div>

                 {/* Row 2: Hourly */}
                 <div>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                         <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Hourly</div>
                         <select 
                            value={monthValue} 
                            onChange={(e) => setMonthValue(Number(e.target.value))}
                            style={{ 
                                fontSize: 11, 
                                padding: "2px 4px", 
                                borderRadius: 4, 
                                border: "1px solid #ddd" 
                            }}
                         >
                            {[ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ].map((m, i) => (
                                <option key={m} value={i+1}>{m}</option>
                            ))}
                         </select>
                     </div>
                     
                     {data.hourly ? (
                        <ScenarioLineChart 
                            data={data.hourly} 
                            series={series}
                            unit="MWh"
                        />
                     ) : (
                        <div className="muted" style={{ fontSize: 12 }}>No hourly data available for {monthValue}/{new Date().getFullYear()}.</div>
                     )}
                 </div>
             </div>
        )}

      </div>
    );

  };

  const renderFutureColumn = () => {
    const currentCatOptions = FUTURE_CATEGORIES.find(c => c.id === futCategory)?.options || [];
    const defaultColor = "#8b5cf6"; // Violet
    
    // Generate Series definitions
    const series = futFilters.map(id => ({
        dataKey: id,
        name: currentCatOptions.find(o => o.id === id)?.label || id,
        color: FILTER_COLORS[id] || defaultColor
    }));

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
        
        {/* Header + Dropdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>Future Production</div>
            </div>
            
            {/* Category Dropdown */}
            <select
                value={futCategory}
                onChange={(e) => handleFutCategoryChange(e.target.value)}
                style={{
                    fontSize: 13,
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                    background: "#f9fafb",
                    cursor: "pointer",
                    width: "100%",
                }}
            >
                {FUTURE_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
            </select>

            {/* Sub-category Buttons */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {currentCatOptions.map(f => {
                    const active = futFilters.includes(f.id);
                    const color = FILTER_COLORS[f.id] || defaultColor;
                    return (
                        <button
                            key={f.id}
                            onClick={() => toggleFilter(futFilters, setFutFilters, f.id)}
                            style={{
                                border: active ? `1px solid ${color}` : "1px solid transparent",
                                background: active ? color : "#f3f4f6",
                                color: active ? "#fff" : "#4b5563",
                                padding: "4px 10px",
                                borderRadius: 16,
                                fontSize: 11,
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
                 Data not available for this territory in demo.
             </div>
        ) : futData.loading ? (
             <div className="muted" style={{ marginTop: 20 }}>Loading...</div>
        ) : (
             <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                 {/* Monthly */}
                 <div>
                     <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#374151" }}>Monthly</div>
                     {futData.monthly ? (
                        <ScenarioLineChart 
                            data={futData.monthly} 
                            series={series}
                            unit="MWh"
                        />
                     ) : (
                        <div className="muted" style={{ fontSize: 12 }}>No monthly data available</div>
                     )}
                 </div>

                 {/* Hourly */}
                 <div>
                     <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                         <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Hourly</div>
                         <select 
                            value={futMonth} 
                            onChange={(e) => setFutMonth(Number(e.target.value))}
                            style={{ 
                                fontSize: 11, 
                                padding: "2px 4px", 
                                borderRadius: 4, 
                                border: "1px solid #ddd" 
                            }}
                         >
                            {[ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ].map((m, i) => (
                                <option key={m} value={i+1}>{m}</option>
                            ))}
                         </select>
                     </div>
                     
                     {futData.hourly ? (
                        <ScenarioLineChart 
                            data={futData.hourly} 
                            series={series}
                            unit="MWh"
                        />
                     ) : (
                        <div className="muted" style={{ fontSize: 12 }}>No hourly data available for {futMonth}/{new Date().getFullYear()}.</div>
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
         {renderColumn("Consumption", CONSUMPTION_FILTERS, consFilters, setConsFilters, consData, "#3b82f6", consMonth, setConsMonth)}
         {renderColumn("Production", PRODUCTION_FILTERS, prodFilters, setProdFilters, prodData, "#10b981", prodMonth, setProdMonth)}
         {renderFutureColumn()}
      </div>
    </section>
  );
}
