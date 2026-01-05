// src/components/ProvinceProductionMonthlyChart.tsx
// (you can keep the filename, but now it's territory-generic)

import React from "react";
import type { CombinedChartPoint } from "../../hooks/useMonthlyData";

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

const UNIT_LABEL = "GWh";

function formatValueGWh(value: number): string {
  return `${value.toFixed(2)} ${UNIT_LABEL}`;
}

type TerritoryLabel = "region" | "province" | "municipality";

interface MonthlyChartProps {
  data: CombinedChartPoint[];
  loading: boolean;
  error: string | null;

  // ✅ generic territory props
  territoryName?: string | null;
  territoryLabel: TerritoryLabel;
  hasTerritory: boolean;
}

const MonthlyChart: React.FC<MonthlyChartProps> = ({
  data,
  loading,
  error,
  territoryName,
  territoryLabel,
  hasTerritory,
}) => {
  if (!hasTerritory) {
    return (
      <div className="chart-placeholder">
        Select a {territoryLabel} to see monthly production and consumption.
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
        No data available for this {territoryLabel}
        {territoryName ? ` (${territoryName})` : ""}.
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
            <Legend
              verticalAlign="top"
              height={24}
              formatter={(name) =>
                name === "totalProduction"
                  ? "Total production"
                  : name === "totalConsumption"
                  ? "Total consumption"
                  : (name as string)
              }
            />
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
            <Legend verticalAlign="top" align="center" height={80} />

            {/* STACKED Bar – production */}
            <Bar dataKey="solar" stackId="prod" name="Solar production" fill="#facc15" stroke="#facc15" barSize={20} />
            <Bar dataKey="wind" stackId="prod" name="Wind production" fill="#22c55e" stroke="#22c55e" barSize={20} />
            <Bar dataKey="hydroelectric" stackId="prod" name="Hydroelectric production" fill="#0ea5e9" stroke="#0ea5e9" barSize={20} />
            <Bar dataKey="geothermal" stackId="prod" name="Geothermal production" fill="#8b5cf6" stroke="#8b5cf6" barSize={20} />
            <Bar dataKey="biomass" stackId="prod" name="Biomass production" fill="#92400e" stroke="#92400e" barSize={20} />

            {/* Sector lines – consumption */}
            <Line type="monotone" dataKey="residential" name="Residential consumption" stroke="#f7d22d" strokeWidth={2} dot={{ r: 2 }} legendType="line" />
            <Line type="monotone" dataKey="primary" name="Primary consumption" stroke="#14b8a6" strokeWidth={2} dot={{ r: 2 }} legendType="line" />
            <Line type="monotone" dataKey="secondary" name="Secondary consumption" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} legendType="line" />
            <Line type="monotone" dataKey="tertiary" name="Tertiary consumption" stroke="#ec4899" strokeWidth={2} dot={{ r: 2 }} legendType="line" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonthlyChart;
