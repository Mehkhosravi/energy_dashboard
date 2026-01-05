// src/components/ChartShell.tsx
import { useMemo, useRef } from "react";

import DailyCharts from "./charts/DailyChart"; // <-- confirm this path is real
import HourlyChart from "./charts/HourlyChart";
import DownloadReportButton from "./DownloadReportButton";

import { useSelectedTerritory } from "./contexts/SelectedTerritoryContext";
import { useDailyData } from "../hooks/useDailyData";
import useMonthlyData, { type BackendLevel } from "../hooks/useMonthlyData";
import { useHourlyCalendarData } from "../hooks/useHourlyCalendarData";

import MonthlyChart from "./charts/MonthlyChart";
import type { TerritoryLevel } from "./TerritoryLevel";

// Map frontend TerritoryLevel -> backend API level
function toBackendLevel(level: TerritoryLevel): BackendLevel {
  return level === "municipality" ? "comune" : level;
}

export default function ChartShell() {
  const { selectedTerritory } = useSelectedTerritory();

  const chartRefs = useRef<Record<string, HTMLElement | null>>({});
  const titlePlace = selectedTerritory?.name ?? "selected territory";

  // -----------------------------
  // Monthly (multi-level)
  // -----------------------------
  const monthlyLabel: TerritoryLevel = selectedTerritory?.level ?? "province";

  const monthlyBackendLevel: BackendLevel = selectedTerritory
    ? toBackendLevel(selectedTerritory.level)
    : "province";

  const monthlyTerritoryCode = useMemo(() => {
    if (!selectedTerritory) return null;
    if (selectedTerritory.level === "region") return selectedTerritory.codes.reg ?? null;
    if (selectedTerritory.level === "province") return selectedTerritory.codes.prov ?? null;
    return selectedTerritory.codes.mun ?? null; // municipality -> comune_code
  }, [selectedTerritory]);

  const monthly = useMonthlyData(monthlyBackendLevel, monthlyTerritoryCode, 2019, 0);

  // -----------------------------
  // Daily (multi-level)
  // -----------------------------
  const dailyBackendLevel: BackendLevel = selectedTerritory
    ? toBackendLevel(selectedTerritory.level)
    : "province";

  const dailyTerritoryCode = useMemo(() => {
    if (!selectedTerritory) return null;
    if (selectedTerritory.level === "region") return selectedTerritory.codes.reg ?? null;
    if (selectedTerritory.level === "province") return selectedTerritory.codes.prov ?? null;
    return selectedTerritory.codes.mun ?? null; // municipality -> comune_code
  }, [selectedTerritory]);

  const {
    chartData: chartDailyData,
    dailyLoading,
    dailyError,
  } = useDailyData(dailyBackendLevel, dailyTerritoryCode, {
    year: 2019,
    domain: "consumption",
  });

  // -----------------------------
  // Hourly (multi-level)
  // -----------------------------
   const hourlyBackendLevel: BackendLevel = selectedTerritory
    ? toBackendLevel(selectedTerritory.level)
    : "province";

  const hourlyTerritoryCode = useMemo(() => {
    if (!selectedTerritory) return null;
    if (selectedTerritory.level === "region") return selectedTerritory.codes.reg ?? null;
    if (selectedTerritory.level === "province") return selectedTerritory.codes.prov ?? null;
    return selectedTerritory.codes.mun ?? null;
  }, [selectedTerritory]);

  const {
    chartData: chartHourlyData,
    hourlyLoading,
    hourlyError,
  } = useHourlyCalendarData(hourlyBackendLevel, hourlyTerritoryCode, {
    year: 2019,
    scenario: 0,
    domain: "consumption",
  });

  return (
    <section className="charts">
      {/* Monthly row */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Monthly production and consumption</h3>
            <span className="chart-subtitle">In GWh, for the {titlePlace}</span>
          </div>

          <div
            className="chart-container chart-export-block"
            ref={(el) => {
              chartRefs.current["monthly production and consumption"] = el;
            }}
          >
            <MonthlyChart
              data={monthly.data}
              loading={monthly.loading}
              error={monthly.error}
              hasTerritory={monthly.hasTerritory}
              territoryLabel={monthlyLabel}
              territoryName={selectedTerritory?.name ?? null}
            />
          </div>
        </div>

        <div className="chart-insight">
          <h4 className="chart-insight-title">Key Insights - Shares</h4>
          <p className="chart-insight-text">
            Explain which renewable source is dominant, which ones contribute less,
            and how this compares to total consumption.
          </p>
        </div>
      </div>

      {/* Daily row */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Daily production and consumption</h3>
            <span className="chart-subtitle">In GWh, for the {titlePlace}</span>
          </div>

          <div
            className="chart-container chart-export-block"
            style={{ minHeight: 360 }}
            ref={(el) => {
              chartRefs.current["daily consumption"] = el;
            }}
          >
            {dailyTerritoryCode == null ? (
              <div className="chart-placeholder">
                Select a territory to see weekday vs weekend profile.
              </div>
            ) : dailyLoading ? (
              <div className="chart-placeholder">Loading...</div>
            ) : dailyError ? (
              <div className="chart-placeholder text-red-600">Error: {dailyError}</div>
            ) : chartDailyData.length === 0 ? (
              <div className="chart-placeholder">No daily data available.</div>
            ) : (
              <DailyCharts data={chartDailyData} />
            )}
          </div>
        </div>

        <div className="chart-insight">
          <h4 className="chart-insight-title">Key Insights - Shares</h4>
          <p className="chart-insight-text">
            Explain which renewable source is dominant, which ones contribute less,
            and how this compares to total consumption.
          </p>
        </div>
      </div>

      {/* Hourly row */}
            {/* Hourly row */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Hourly production and consumption</h3>
            <span className="chart-subtitle">In GWh, for the {titlePlace}</span>
          </div>

          <div
            className="chart-container chart-export-block"
            ref={(el) => {
              chartRefs.current["hourly production and consumption"] = el;
            }}
          >
            {hourlyTerritoryCode == null ? (
              <div className="chart-placeholder">
                Select a territory to see hourly profiles.
              </div>
            ) : hourlyLoading ? (
              <div className="chart-placeholder">Loading...</div>
            ) : hourlyError ? (
              <div className="chart-placeholder text-red-600">Error: {hourlyError}</div>
            ) : chartHourlyData.length === 0 ? (
              <div className="chart-placeholder">No hourly data available.</div>
            ) : (
              <HourlyChart data={chartHourlyData} />
            )}
          </div>
        </div>

        <div className="chart-insight">
          <h4 className="chart-insight-title">Key Insights - Shares</h4>
          <p className="chart-insight-text">
            Explain which renewable source is dominant, which ones contribute less,
            and how this compares to total consumption.
          </p>
        </div>
      </div>

    </section>
  );
}
