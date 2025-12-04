// src/components/ProvinceProductionMonthlyChart.tsx

import React, { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useSelectedProvince } from "../contexts/SelectedProvinceContext";
import { api } from "../../api/client";

type EnergyType = "solar" | "wind" | "hydroelectric" | "geothermal" | "biomass";

type MonthKey =
  | "jan"
  | "feb"
  | "mar"
  | "apr"
  | "may"
  | "jun"
  | "jul"
  | "aug"
  | "sep"
  | "oct"
  | "nov"
  | "dec";

interface ProductionApiRow {
  prov_cod: number;
  prov_name: string;
  energy_type: EnergyType;
  year?: number;
  annual: number;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

interface MonthlySectorResponse {
  prov_cod: number;
  prov_name: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

type CombinedChartPoint = {
  month: string;
  solar: number;
  wind: number;
  hydroelectric: number;
  geothermal: number;
  biomass: number;
  totalProduction: number;
  residential: number;
  primary: number;
  secondary: number;
  tertiary: number;
  totalConsumption: number;
};

const MONTH_KEYS: MonthKey[] = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const PRODUCTION_SCALE_FACTOR = 1_000_000;
const CONSUMPTION_SCALE_FACTOR = 1_000_000;
const UNIT_LABEL = "GWh";
const API_BASE = "http://localhost:8000";

function formatValueGWh(value: number): string {
  return `${value.toFixed(2)} ${UNIT_LABEL}`;
}

// Which series belong to which side of the legend
const PRODUCTION_KEYS = [
  "solar",
  "wind",
  "hydroelectric",
  "geothermal",
  "biomass",
  "totalProduction",
];

const CONSUMPTION_KEYS = [
  "residential",
  "primary",
  "secondary",
  "tertiary",
  "totalConsumption",
];

// Simple custom legend: production left, consumption right
// const renderSplitLegend = (props: any) => {
//   const { payload } = props;
//   if (!payload || !payload.length) return null;

//   const productionItems = payload.filter((item: any) =>
//     PRODUCTION_KEYS.includes(item.dataKey)
//   );
//   const consumptionItems = payload.filter((item: any) =>
//     CONSUMPTION_KEYS.includes(item.dataKey)
//   );

//   const renderItem = (entry: any) => {
//     const isLine = entry.type === "line";
//     return (
//       <span
//         key={entry.dataKey}
//         style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
//       >
//         <svg width={14} height={10}>
//           {isLine ? (
//             <line
//               x1={0}
//               y1={5}
//               x2={14}
//               y2={5}
//               stroke={entry.color}
//               strokeWidth={2}
//             />
//           ) : (
//             <rect x={1} y={2} width={12} height={6} fill={entry.color} />
//           )}
//         </svg>
//         <span style={{ color: "#111827" }}>{entry.value}</span>
//       </span>
//     );
//   };

//   return (
//     <div
//       style={{
//         display: "flex",
//         justifyContent: "space-between",
//         padding: "4px 12px 12px",
//         fontSize: 12,
//         flexWrap: "wrap",
//         gap: 8,
//       }}
//     >
//       {/* LEFT – Production */}
//       <div
//         style={{
//           display: "flex",
//           gap: 8,
//           alignItems: "center",
//           flexWrap: "wrap",
//         }}
//       >
//         {productionItems.map(renderItem)}
//       </div>

//       {/* RIGHT – Consumption */}
//       <div
//         style={{
//           display: "flex",
//           gap: 8,
//           alignItems: "center",
//           flexWrap: "wrap",
//         }}
//       >
//         {consumptionItems.map(renderItem)}
//       </div>
//     </div>
//   );
// };

const MonthlyChart: React.FC = () => {
  const { selectedProvince } = useSelectedProvince();
  const [data, setData] = useState<CombinedChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProvince) {
      setData([]);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const productionRows = await api.getProvinceMonthlyProduction<
          ProductionApiRow[]
        >(selectedProvince.COD_PROV);

        const [
          residentialRes,
          primaryRes,
          secondaryRes,
          tertiaryRes,
          totalConsumptionRes,
        ] = await Promise.all([
          fetch(
            `${API_BASE}/consumption/province/monthly/residential/${selectedProvince.COD_PROV}`
          ),
          fetch(
            `${API_BASE}/consumption/province/monthly/primary/${selectedProvince.COD_PROV}`
          ),
          fetch(
            `${API_BASE}/consumption/province/monthly/secondary/${selectedProvince.COD_PROV}`
          ),
          fetch(
            `${API_BASE}/consumption/province/monthly/tertiary/${selectedProvince.COD_PROV}`
          ),
          fetch(
            `${API_BASE}/consumption/province/monthly/total/${selectedProvince.COD_PROV}`
          ),
        ]);

        if (
          !residentialRes.ok ||
          !primaryRes.ok ||
          !secondaryRes.ok ||
          !tertiaryRes.ok
        ) {
          throw new Error("One of the consumption API calls failed");
        }

        const residential: MonthlySectorResponse = await residentialRes.json();
        const primary: MonthlySectorResponse = await primaryRes.json();
        const secondary: MonthlySectorResponse = await secondaryRes.json();
        const tertiary: MonthlySectorResponse = await tertiaryRes.json();
        const totalConsumption: MonthlySectorResponse =
          await totalConsumptionRes.json();

        const chartData: CombinedChartPoint[] = MONTH_LABELS.map((label) => ({
          month: label,
          solar: 0,
          wind: 0,
          hydroelectric: 0,
          geothermal: 0,
          biomass: 0,
          totalProduction: 0,
          residential: 0,
          primary: 0,
          secondary: 0,
          tertiary: 0,
          totalConsumption: 0,
        }));

        // fill production (by type)
        productionRows.forEach((row) => {
          const energyType = row.energy_type;
          MONTH_KEYS.forEach((monthKey, idx) => {
            const raw = row[monthKey] ?? 0;
            const valueGWh = raw / PRODUCTION_SCALE_FACTOR;
            chartData[idx][energyType] = valueGWh;
          });
        });

        // compute total production
        chartData.forEach((p) => {
          p.totalProduction =
            p.solar + p.wind + p.hydroelectric + p.geothermal + p.biomass;
        });

        const toNumber = (v: unknown) => {
          const n = Number(v ?? 0);
          return Number.isFinite(n) ? n : 0;
        };

        // fill consumption (by sector + total)
        MONTH_KEYS.forEach((monthKey, idx) => {
          const r =
            toNumber((residential as any)[monthKey]) /
            CONSUMPTION_SCALE_FACTOR;
          const pr =
            toNumber((primary as any)[monthKey]) / CONSUMPTION_SCALE_FACTOR;
          const s =
            toNumber((secondary as any)[monthKey]) / CONSUMPTION_SCALE_FACTOR;
          const t =
            toNumber((tertiary as any)[monthKey]) / CONSUMPTION_SCALE_FACTOR;
          const tot =
            toNumber((totalConsumption as any)[monthKey]) /
            CONSUMPTION_SCALE_FACTOR;

          chartData[idx].residential = r;
          chartData[idx].primary = pr;
          chartData[idx].secondary = s;
          chartData[idx].tertiary = t;
          chartData[idx].totalConsumption = tot || r + pr + s + t;
        });

        setData(chartData);
      } catch (err: any) {
        console.error(err);
        setError(
          err.message || "Failed to load monthly production/consumption"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedProvince]);

  if (!selectedProvince) {
    return (
      <div className="chart-placeholder">
        Select a province to see monthly production and consumption.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chart-placeholder">
        Loading monthly production &amp; consumption…
      </div>
    );
  }

  if (error) {
    return <div className="chart-placeholder text-red-600">Error: {error}</div>;
  }

  if (!data.length) {
    return (
      <div className="chart-placeholder">
        No data available for this province.
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: 500,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* TOP: TOTALS ONLY – production vs consumption */}
      <div style={{ flex: "0 0 140px" }}>
        <ResponsiveContainer>
          <LineChart
            data={data}
            margin={{ top: 5, right: 15, left: 15, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tickMargin={4} />
            <YAxis
              tick={{ fontSize: 10 }}
              width={40}
              label={{
                value: UNIT_LABEL,
                angle: -90,
                position: "insideLeft",
                offset: 5,
              }}
            />
            <Tooltip
              formatter={(value: any, name) => [
                formatValueGWh(value as number),
                name as string,
              ]}
            />
            <Legend verticalAlign="top" height={24} />
            <Line
              type="monotone"
              dataKey="totalProduction"
              name="Total production"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="totalConsumption"
              name="Total consumption"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* BOTTOM: detailed stacked bars + sector lines */}
      <div style={{ flex: "1 1 0" }}>
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 15, left: 5, bottom: 15 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tickMargin={8} />
            <YAxis
              label={{
                value: `Energy (${UNIT_LABEL})`,
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip
              formatter={(value: any, name) => [
                formatValueGWh(value as number),
                name as string,
              ]}
            />

            <Legend
              verticalAlign="top"
              align="center"
              height={80}
              //content={renderSplitLegend}
            />

            {/* STACKED Bar – production */}
            <Bar
              dataKey="solar"
              stackId="prod"
              name="Solar production"
              fill="#facc15"
              stroke="#facc15"
              barSize={20}
            />
            <Bar
              dataKey="wind"
              stackId="prod"
              name="Wind production"
              fill="#22c55e"
              stroke="#22c55e"
              barSize={20}
            />
            <Bar
              dataKey="hydroelectric"
              stackId="prod"
              name="Hydroelectric production"
              fill="#0ea5e9"
              stroke="#0ea5e9"
              barSize={20}
            />
            <Bar
              dataKey="geothermal"
              stackId="prod"
              name="Geothermal production"
              fill="#8b5cf6"
              stroke="#8b5cf6"
              barSize={20}
            />
            <Bar
              dataKey="biomass"
              stackId="prod"
              name="Biomass production"
              fill="#92400e"
              stroke="#92400e"
              barSize={20}
            />

            {/* Solid sector lines – consumption */}
            <Line
              type="monotone"
              dataKey="residential"
              name="Residential consumption"
              stroke="#f7d22dff"
              strokeWidth={2}
              dot={{ r: 2 }}
              legendType="line"
            />
            <Line
              type="monotone"
              dataKey="primary"
              name="Primary consumption"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={{ r: 2 }}
              legendType="line"
            />
            <Line
              type="monotone"
              dataKey="secondary"
              name="Secondary consumption"
              stroke="#f97316"
              strokeWidth={2}
              dot={{ r: 2 }}
              legendType="line"
            />
            <Line
              type="monotone"
              dataKey="tertiary"
              name="Tertiary consumption"
              stroke="#ec4899"
              strokeWidth={2}
              dot={{ r: 2 }}
              legendType="line"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyChart;
