// src/components/PlaceInfo.tsx
import { useEffect, useMemo, useState } from "react";
import { useSelectedTerritory } from "./contexts/SelectedTerritoryContext";
import { getJSON } from "../api/client";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  CONSUMPTION_SWATCH,
  PRODUCTION_SWATCH,
  CONSUMPTION_LABEL,
  PRODUCTION_LABEL,
} from "./LayersFilters.assets";

type DataPoint = { name: string; value: number; color: string };

function buildLabel(t: {
  level: "region" | "province" | "municipality";
  name: string;
  parent?: { region?: string; province?: string };
}) {
  // Region
  if (t.level === "region") return `Region of ${t.name}`;

  // Province (+ region if available)
  if (t.level === "province") {
    const r = t.parent?.region;
    return r ? `Province of ${t.name} (Region: ${r})` : `Province of ${t.name}`;
  }

  // Municipality (+ province/region if available)
  const p = t.parent?.province;
  const r = t.parent?.region;

  const parts: string[] = [];
  if (p) parts.push(`Province: ${p}`);
  if (r) parts.push(`Region: ${r}`);

  return parts.length
    ? `Municipality of ${t.name} (${parts.join(", ")})`
    : `Municipality of ${t.name}`;
}

const formatNumber = (val: number) =>
  val.toLocaleString(undefined, { maximumFractionDigits: 1 });

const COLORS_CONS = [
  CONSUMPTION_SWATCH.residential || "#facc15",
  CONSUMPTION_SWATCH.primary || "#c4a484",
  CONSUMPTION_SWATCH.secondary || "#a3a3a3",
  CONSUMPTION_SWATCH.tertiary || "#f59e0b",
];

const COLORS_PROD = [
  PRODUCTION_SWATCH.solar || "#eab308",
  PRODUCTION_SWATCH.wind || "#0ea5e9",
  PRODUCTION_SWATCH.hydroelectric || "#3b82f6",
  PRODUCTION_SWATCH.geothermal || "#ef4444",
  PRODUCTION_SWATCH.biomass || "#16a34a",
];

export default function PlaceInfo() {
  const { selectedTerritory } = useSelectedTerritory();
  const [data, setData] = useState<{
    consumptionTotal: number;
    productionTotal: number;
    futureProductionTotal: number;
    consumptionBreakdown: DataPoint[];
    productionBreakdown: DataPoint[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedTerritory) {
      setData(null);
      return;
    }

    const fetchPlaceData = async () => {
      setLoading(true);
      try {
        const level = selectedTerritory.level === "municipality" ? "comune" : selectedTerritory.level;
        const codeKey = level === "region" ? "reg_cod" : level === "province" ? "prov_cod" : "mun_cod";
        const codeVal = level === "region" ? selectedTerritory.codes.reg : level === "province" ? selectedTerritory.codes.prov : selectedTerritory.codes.mun;

        const findVal = (rows: any[]) => {
            const row = rows.find(r => r[codeKey] === codeVal);
            return (row?.value_mwh || 0) / 1000; // Divide by 1000 for display
        };

        // Fetch Totals
        const [consTotalRows, prodTotalRows] = await Promise.all([
          getJSON<any[]>(`/values?level=${level}&domain=consumption&resolution=annual&year=2019&scenario=0`),
          getJSON<any[]>(`/values?level=${level}&domain=production&resolution=annual&year=2019&scenario=0`),
        ]);

        const consumptionTotal = findVal(consTotalRows);
        const productionTotal = findVal(prodTotalRows);
        // Mocking future production as 1.4x current production for the demo
        const futureProductionTotal = productionTotal * 1.4;

        // Fetch Breakdown - Consumption
        const consGroups = ["cons_domestic", "cons_primary", "cons_secondary", "cons_tertiary"];
        const consResults = await Promise.all(
          consGroups.map(g => getJSON<any[]>(`/values?level=${level}&domain=consumption&resolution=annual&year=2019&scenario=0&category_code=${g}`))
        );
        
        const consumptionBreakdown: DataPoint[] = [
            { name: "Residential", value: findVal(consResults[0]), color: COLORS_CONS[0] },
            { name: "Primary", value: findVal(consResults[1]), color: COLORS_CONS[1] },
            { name: "Secondary", value: findVal(consResults[2]), color: COLORS_CONS[2] },
            { name: "Tertiary", value: findVal(consResults[3]), color: COLORS_CONS[3] },
        ].filter(d => d.value > 0);

        // Fetch Breakdown - Production
        const prodGroups = ["solar", "wind", "hydroelectric", "geothermal", "biomass"];
        const prodResults = await Promise.all(
          prodGroups.map(g => getJSON<any[]>(`/values?level=${level}&domain=production&resolution=annual&year=2019&scenario=0&base_group=${g}`))
        );

        const productionBreakdown: DataPoint[] = [
            { name: "Solar", value: findVal(prodResults[0]), color: COLORS_PROD[0] },
            { name: "Wind", value: findVal(prodResults[1]), color: COLORS_PROD[1] },
            { name: "Hydro", value: findVal(prodResults[2]), color: COLORS_PROD[2] },
            { name: "Geothermal", value: findVal(prodResults[3]), color: COLORS_PROD[3] },
            { name: "Biomass", value: findVal(prodResults[4]), color: COLORS_PROD[4] },
        ].filter(d => d.value > 0);

        setData({
          consumptionTotal,
          productionTotal,
          futureProductionTotal,
          consumptionBreakdown,
          productionBreakdown,
        });
      } catch (e) {
        console.error("Error fetching place data", e);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaceData();
  }, [selectedTerritory]);

  if (!selectedTerritory) {
    return (
      <div className="map-info">
        <span className="map-info-header">No territory selected</span>
      </div>
    );
  }

  const ratio = data ? (data.productionTotal / data.consumptionTotal) * 100 : 0;

  return (
    <div className="map-info place-info-expanded">
      <div className="place-info-top">
        <h2 className="map-info-header">{buildLabel(selectedTerritory)}</h2>
        
        {loading ? (
          <div className="loading-shimmer" style={{height: 100}}>Loading data...</div>
        ) : data ? (
          <div className="place-metrics-box">
            <div className="place-metrics">
              <div className="metric-row">
                <span className="metric-label">Annual consumption:</span>
                <span className="metric-value">{formatNumber(data.consumptionTotal)} MWh</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Annual production:</span>
                <span className="metric-value">{formatNumber(data.productionTotal)} MWh</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Annual Future Production:</span>
                <span className="metric-value">{formatNumber(data.futureProductionTotal)} MWh</span>
              </div>
              <div className="metric-row">
                <span className="metric-label">Ratio of consumption to production:</span>
                <span className="metric-value">{formatNumber(ratio)}%</span>
              </div>
            </div>
            <div className="metrics-action">
              <button className="btn btn-blue btn-sm">See territory Ranks</button>
            </div>
          </div>
        ) : null}
      </div>

      {!loading && data && (
        <div className="place-charts">
          <div className="place-chart-item">
            <h3 className="chart-title">Share of Consumption Sector:</h3>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data.consumptionBreakdown}
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {data.consumptionBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${formatNumber(value)} MWh`, 'Value']}
                    contentStyle={{ fontSize: 10 }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="place-chart-item">
            <h3 className="chart-title">Production Type and Percentage</h3>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={data.productionBreakdown}
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={0}
                    dataKey="value"
                  >
                    {data.productionBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${formatNumber(value)} MWh`, 'Value']}
                    contentStyle={{ fontSize: 10 }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-action">
              <button className="btn btn-blue btn-sm">Make comparison</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
