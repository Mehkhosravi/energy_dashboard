// src/components/WinterHourlyConsumptionChart.tsx

import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useHourlyData } from "../../hooks/useHourlyData";

interface WinterHourlyConsumptionChartProps {
  provCod: string; // e.g. from selectedProvince
}

const sectorColors: Record<string, string> = {
  residential: "#1f2937", // dark slate
  primary: "#3b82f6",     // blue
  secondary: "#10b981",   // green
  tertiary: "#f59e0b",    // amber
};

const WinterHourlyConsumptionChart: React.FC<WinterHourlyConsumptionChartProps> = ({
  provCod,
}) => {
  const [showWeekday, setShowWeekday] = useState(true);
  const [showWeekend, setShowWeekend] = useState(true);

  const { winterSeries, winterMeta } = useHourlyData(provCod);
  const provName = winterMeta?.prov_name ?? provCod;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
        height: "100%",
      }}
    >
      {/* Header + controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div>
          <h4
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Winter hourly profile – {provName}
          </h4>
          <span
            style={{
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            January–March · 0–23h · Sectors: Residential, Primary, Secondary, Tertiary
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 11,
            alignItems: "center",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="checkbox"
              checked={showWeekday}
              onChange={(e) => setShowWeekday(e.target.checked)}
            />
            Weekday
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="checkbox"
              checked={showWeekend}
              onChange={(e) => setShowWeekend(e.target.checked)}
            />
            Weekend
          </label>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={winterSeries}>
          <CartesianGrid strokeDasharray="3 3" />
          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10 }} />

          <XAxis
            dataKey="hour"
            tickFormatter={(h) => `${h}`}
            label={{
              value: "Hour of day",
              position: "insideBottom",
              offset: -4,
              fontSize: 11,
            }}
          />
          <YAxis
            tickFormatter={(v) => v.toFixed(2)}
            label={{
              value: "MWh",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              fontSize: 11,
            }}
          />
          <Tooltip
            formatter={(val: number) => `${val.toFixed(3)} MWh`}
            labelFormatter={(h) => `Hour ${h}:00–${Number(h) + 1}:00`}
          />

          {/* WEEKDAY LINES (solid) */}
          {showWeekday && (
            <>
              <Line
                type="monotone"
                dataKey="residential_weekday"
                name="Residential – Weekday"
                stroke={sectorColors.residential}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="primary_weekday"
                name="Primary – Weekday"
                stroke={sectorColors.primary}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="secondary_weekday"
                name="Secondary – Weekday"
                stroke={sectorColors.secondary}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="tertiary_weekday"
                name="Tertiary – Weekday"
                stroke={sectorColors.tertiary}
                strokeWidth={2}
                dot={false}
              />
            </>
          )}

          {/* WEEKEND LINES (dashed) */}
          {showWeekend && (
            <>
              <Line
                type="monotone"
                dataKey="residential_weekend"
                name="Residential – Weekend"
                stroke={sectorColors.residential}
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="primary_weekend"
                name="Primary – Weekend"
                stroke={sectorColors.primary}
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="secondary_weekend"
                name="Secondary – Weekend"
                stroke={sectorColors.secondary}
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="tertiary_weekend"
                name="Tertiary – Weekend"
                stroke={sectorColors.tertiary}
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WinterHourlyConsumptionChart;
