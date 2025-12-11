// src/components/DailyCharts.tsx
// or ProvinceDailyEnergyCharts.tsx if you prefer that name

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  ComposedChart,
  Area,
} from "recharts";
import type {
  ProvinceDailyConsumptionResponse,
  ProvinceDailyProductionResponse,
  DailyFields,
} from "../../hooks/useDailyData";
import { MONTHS } from "../../hooks/useDailyData";

interface DailyChartsProps {
  consumption: ProvinceDailyConsumptionResponse;
  production: ProvinceDailyProductionResponse;
}

interface AggregatedPoint {
  month: string;
  cons_weekday: number;
  cons_weekend: number;
  prod_weekday: number;
  prod_weekend: number;
}

// Wh → MWh
const DIVIDER_WH_TO_MWH = 1_000_000;

// Color palette for sectors
const SERIES_COLORS = [
  "#1f2937", // slate
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#6366f1", // indigo
  "#ef4444", // red
];

function sumFieldOverItems(
  items: Record<string, DailyFields>,
  fieldKey: keyof DailyFields
): number {
  let totalWh = 0;

  for (const values of Object.values(items)) {
    const val = values[fieldKey];
    if (val != null) {
      const num = Number(val);
      if (!Number.isNaN(num)) totalWh += num;
    }
  }

  // Convert Wh → MWh with 3-decimal precision
  return Number((totalWh / DIVIDER_WH_TO_MWH).toFixed(3));
}

// Aggregated totals across all sectors / energy types
function buildAggregatedDataset(
  consumption: ProvinceDailyConsumptionResponse,
  production: ProvinceDailyProductionResponse
): AggregatedPoint[] {
  return MONTHS.map(({ key, label }) => {
    const wkdayKey = `${key}_wkday` as keyof DailyFields;
    const wkendKey = `${key}_wkend` as keyof DailyFields;

    const cons_weekday = sumFieldOverItems(consumption.sectors, wkdayKey);
    const cons_weekend = sumFieldOverItems(consumption.sectors, wkendKey);

    const prod_weekday = sumFieldOverItems(production.energy_types, wkdayKey);
    const prod_weekend = sumFieldOverItems(production.energy_types, wkendKey);

    return {
      month: label,
      cons_weekday,
      cons_weekend,
      prod_weekday,
      prod_weekend,
    };
  });
}

// Per-sector weekday/weekend values (for consumption only)
function buildConsumptionSectorsDataset(
  sectors: Record<string, DailyFields>,
  sectorKeys: string[]
): Array<Record<string, number | string>> {
  return MONTHS.map(({ key, label }) => {
    const row: Record<string, number | string> = { month: label };
    const wkdayKey = `${key}_wkday` as keyof DailyFields;
    const wkendKey = `${key}_wkend` as keyof DailyFields;

    sectorKeys.forEach((name) => {
      const values = sectors[name];
      const weekdayWh = values?.[wkdayKey] ?? 0;
      const weekendWh = values?.[wkendKey] ?? 0;

      const weekdayMWh = Number(
        (Number(weekdayWh) / DIVIDER_WH_TO_MWH).toFixed(3)
      );
      const weekendMWh = Number(
        (Number(weekendWh) / DIVIDER_WH_TO_MWH).toFixed(3)
      );

      row[`${name}_wkday`] = weekdayMWh;
      row[`${name}_wkend`] = weekendMWh;
    });

    return row;
  });
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const DailyCharts: React.FC<DailyChartsProps> = ({
  consumption,
  production,
}) => {
  const aggregatedData = useMemo(
    () => buildAggregatedDataset(consumption, production),
    [consumption, production]
  );

  const consumptionSectorKeys = useMemo(
    () => Object.keys(consumption.sectors),
    [consumption.sectors]
  );

  const consumptionTypesData = useMemo(
    () =>
      buildConsumptionSectorsDataset(
        consumption.sectors,
        consumptionSectorKeys
      ),
    [consumption.sectors, consumptionSectorKeys]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
        height: "100%",
      }}
    >
      {/* 1. SMALLER AGGREGATED CHART (top) */}
      <div>
        <h4
          style={{
            margin: "0 0 4px",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          Aggregated daily profile (total consumption vs production)
        </h4>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={aggregatedData}>
            <CartesianGrid strokeDasharray="3 3" />

            <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 10 }} />

            <XAxis dataKey="month" />
            <YAxis
              label={{
                value: "MWh",
                angle: -90,
                position: "insideLeft",
                offset: 10,
              }}
              tickFormatter={(val) => val.toFixed(3)}
            />

            <Tooltip formatter={(val: number) => `${val.toFixed(3)} MWh`} />

            {/* Weekday (blue tones) */}
            <Line
              type="monotone"
              dataKey="cons_weekday"
              name="Consumption – Weekday"
              stroke="#1f2937"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="prod_weekday"
              name="Production – Weekday"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
            />

            {/* Weekend (red/orange highlight) */}
            <Line
              type="monotone"
              dataKey="cons_weekend"
              name="Consumption – Weekend"
              stroke="#dc2626"
              strokeWidth={2.2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="prod_weekend"
              name="Production – Weekend"
              stroke="#f97316"
              strokeWidth={2.2}
              strokeDasharray="4 2"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 2. MAIN FOCUS CHART: CONSUMPTION BY SECTOR (weekday & weekend) */}
      {/* 2. MAIN FOCUS CHART: CONSUMPTION BY SECTOR (weekday & weekend, with highlight) */}
      <div>
        <h4
          style={{
            margin: "0 0 4px",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          Consumption by sector – Weekday vs Weekend
        </h4>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={consumptionTypesData}>
            <CartesianGrid strokeDasharray="3 3" />
            <Legend
              verticalAlign="top"
              height={80}
              wrapperStyle={{ fontSize: 10 }}
            />
            <XAxis dataKey="month" />
            <YAxis
              tickFormatter={(val) => val.toFixed(3)}
              label={{
                value: "MWh",
                angle: -90,
                position: "insideLeft",
                fontSize: 10,
              }}
            />
            <Tooltip formatter={(val: number) => `${val.toFixed(3)} MWh`} />

            {/* HIGHLIGHT AREAS AROUND EACH SECTOR (weekday curve) */}
            {consumptionSectorKeys.map((key, idx) => {
              const color = SERIES_COLORS[idx % SERIES_COLORS.length];
              return (
                <Area
                  key={`${key}-area`}
                  type="monotone"
                  dataKey={`${key}_wkday`}
                  fill={color}
                  fillOpacity={0.12}   // soft halo effect
                  stroke="none"
                  activeDot={false}
                />
              );
            })}

            {/* Weekday lines (solid) */}
            {consumptionSectorKeys.map((key, idx) => {
              const color = SERIES_COLORS[idx % SERIES_COLORS.length];
              const label = formatLabel(key);
              return (
                <Line
                  key={`${key}-wkday`}
                  type="monotone"
                  dataKey={`${key}_wkday`}
                  name={`${label} – Weekday`}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                />
              );
            })}

            {/* Weekend lines (dashed) */}
            {consumptionSectorKeys.map((key, idx) => {
              const color = SERIES_COLORS[idx % SERIES_COLORS.length];
              const label = formatLabel(key);
              return (
                <Line
                  key={`${key}-wkend`}
                  type="monotone"
                  dataKey={`${key}_wkend`}
                  name={`${label} – Weekend`}
                  stroke={color}
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={false}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>

  );
};

export default DailyCharts;