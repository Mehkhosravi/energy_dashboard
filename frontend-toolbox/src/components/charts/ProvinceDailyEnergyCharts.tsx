// src/components/ProvinceDailyEnergyCharts.tsx

import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  Line,
} from "recharts";
import type {
  ProvinceDailyConsumptionResponse,
  ProvinceDailyProductionResponse,
  DailyFields,
} from "../../hooks/useDailyData";
import { MONTHS } from "../../hooks/useDailyData";

type Mode = "wkday" | "wkend";

interface ProvinceDailyEnergyChartsProps {
  consumption: ProvinceDailyConsumptionResponse;
  production: ProvinceDailyProductionResponse;
}

type MainMode = "consumption" | "production";

interface DualBarPoint {
  month: string;
  weekday: number;
  weekend: number;
  trend?: number;
}

function buildCategoryDualBarDataset(
  items: Record<string, DailyFields>,
  categoryKey: string
): DualBarPoint[] {
  const values = items[categoryKey];
  if (!values) return [];

  return MONTHS.map(({ key, label }) => {
    const wkdayKey = `${key}_wkday` as keyof DailyFields;
    const wkendKey = `${key}_wkend` as keyof DailyFields;

    const weekday = Number(values[wkdayKey] ?? 0);
    const weekend = Number(values[wkendKey] ?? 0);

    return {
      month: label,
      weekday,
      weekend,
    };
  });
}

function normalizeDualBarDataset(data: DualBarPoint[]): DualBarPoint[] {
  const maxVal = data.reduce((max, d) => {
    return Math.max(max, d.weekday, d.weekend);
  }, 0);

  if (!maxVal || maxVal === 0) return data;

  return data.map((d) => ({
    ...d,
    weekday: (d.weekday / maxVal) * 100,
    weekend: (d.weekend / maxVal) * 100,
  }));
}

function getSeriesKeys(obj: Record<string, DailyFields>): string[] {
  return Object.keys(obj).sort();
}

function formatCategoryLabel(key: string): string {
  if (!key) return "";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

const ProvinceDailyEnergyCharts: React.FC<ProvinceDailyEnergyChartsProps> = ({
  consumption,
  production,
}) => {
  const consumptionKeys = useMemo(
    () => getSeriesKeys(consumption.sectors),
    [consumption.sectors]
  );
  const productionKeys = useMemo(
    () => getSeriesKeys(production.energy_types),
    [production.energy_types]
  );

  const [mainMode, setMainMode] = useState<MainMode>("consumption");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    consumptionKeys[0] ?? ""
  );
  const [normalize, setNormalize] = useState<boolean>(false);
  const [showTrend, setShowTrend] = useState<boolean>(false);
  const [showAllCategories, setShowAllCategories] = useState<boolean>(false);

  // Keep selectedCategory valid when switching between consumption / production
  React.useEffect(() => {
    if (mainMode === "consumption") {
      setSelectedCategory((prev) =>
        prev && consumptionKeys.includes(prev)
          ? prev
          : consumptionKeys[0] ?? ""
      );
    } else {
      setSelectedCategory((prev) =>
        prev && productionKeys.includes(prev)
          ? prev
          : productionKeys[0] ?? ""
      );
    }
  }, [mainMode, consumptionKeys, productionKeys]);

  const isConsumption = mainMode === "consumption";
  const currentItems = isConsumption
    ? consumption.sectors
    : production.energy_types;
  const currentKeys = isConsumption ? consumptionKeys : productionKeys;
  const provName = isConsumption ? consumption.prov_name : production.prov_name;

  // MAIN CHART DATA (single category)
  const mainChartData: DualBarPoint[] = useMemo(() => {
    if (!selectedCategory) return [];

    const raw = buildCategoryDualBarDataset(currentItems, selectedCategory);
    const processed = normalize ? normalizeDualBarDataset(raw) : raw;

    return processed.map((d) => ({
      ...d,
      trend: (d.weekday + d.weekend) / 2,
    }));
  }, [currentItems, selectedCategory, normalize]);

  // SMALL MULTIPLES DATA (all categories)
  const smallMultiplesData = useMemo(
    () =>
      currentKeys.map((key) => {
        const raw = buildCategoryDualBarDataset(currentItems, key);
        const processed = normalize ? normalizeDualBarDataset(raw) : raw;
        return {
          key,
          label: formatCategoryLabel(key),
          data: processed.map((d) => ({
            ...d,
            trend: (d.weekday + d.weekend) / 2,
          })),
        };
      }),
    [currentItems, currentKeys, normalize]
  );

  return (
    <div>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        {/* Mode toggle: Consumption / Production */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.9rem" }}>Dataset:</span>
          <button
            type="button"
            onClick={() => setMainMode("consumption")}
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              border:
                mainMode === "consumption"
                  ? "1px solid #111827"
                  : "1px solid #d1d5db",
              background:
                mainMode === "consumption" ? "#111827" : "transparent",
              color: mainMode === "consumption" ? "#ffffff" : "#111827",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Consumption
          </button>
          <button
            type="button"
            onClick={() => setMainMode("production")}
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              border:
                mainMode === "production"
                  ? "1px solid #111827"
                  : "1px solid #d1d5db",
              background:
                mainMode === "production" ? "#111827" : "transparent",
              color: mainMode === "production" ? "#ffffff" : "#111827",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Production
          </button>
        </div>

        {/* Category dropdown */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.9rem" }}>Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: "0.3rem 0.5rem",
              borderRadius: "0.375rem",
              border: "1px solid #d1d5db",
              fontSize: "0.85rem",
            }}
          >
            {currentKeys.map((key) => (
              <option key={key} value={key}>
                {formatCategoryLabel(key)}
              </option>
            ))}
          </select>
        </div>

        {/* Normalize toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.85rem",
          }}
        >
          <input
            type="checkbox"
            checked={normalize}
            onChange={(e) => setNormalize(e.target.checked)}
          />
          Normalize to %
        </label>

        {/* Trend line toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.85rem",
          }}
        >
          <input
            type="checkbox"
            checked={showTrend}
            onChange={(e) => setShowTrend(e.target.checked)}
          />
          Show trend line
        </label>

        {/* Compare all categories toggle */}
        <button
          type="button"
          onClick={() => setShowAllCategories((prev) => !prev)}
          style={{
            marginLeft: "auto",
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            border: "1px solid #d1d5db",
            background: showAllCategories ? "#111827" : "transparent",
            color: showAllCategories ? "#ffffff" : "#111827",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          {showAllCategories ? "Hide comparison" : "Compare all categories"}
        </button>
      </div>

      {/* PRIMARY: Clustered Dual-Bar Chart */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h3
          style={{
            marginBottom: "0.5rem",
            fontSize: "1rem",
            fontWeight: 600,
          }}
        >
          {provName} – Daily{" "}
          {isConsumption ? "Consumption" : "Production"} (Weekday vs Weekend) –{" "}
          {formatCategoryLabel(selectedCategory)}
        </h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={mainChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis
              label={
                normalize
                  ? { value: "% of max", angle: -90, position: "insideLeft" }
                  : undefined
              }
            />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="weekday"
              name="Weekday"
              // Recharts will assign colors automatically unless overridden
            />
            <Bar dataKey="weekend" name="Weekend" />
            {showTrend && (
              <Line
                type="monotone"
                dataKey="trend"
                name="Trend (avg)"
                dot={false}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* SECONDARY: Small Multiples grid (all categories) */}
      {showAllCategories && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {smallMultiplesData.map((panel) => (
            <div key={panel.key}>
              <h4
                style={{
                  marginBottom: "0.4rem",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                {formatCategoryLabel(panel.label)}
              </h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={panel.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    label={
                      normalize
                        ? {
                            value: "%",
                            angle: -90,
                            position: "insideLeft",
                            fontSize: 10,
                          }
                        : undefined
                    }
                  />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="weekday" name="Weekday" />
                  <Bar dataKey="weekend" name="Weekend" />
                  {showTrend && (
                    <Line
                      type="monotone"
                      dataKey="trend"
                      name="Trend"
                      dot={false}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProvinceDailyEnergyCharts;
