// src/components/ChartShell.tsx
//
// Updated to use SelectedTerritoryContext (region/province/municipality).
// Key idea:
// - Charts should read ONE selection: selectedTerritory
// - We derive "level + code" from that selection
// - We pass those to hooks (you will update hooks next if they only accept provCod)

import { useRef } from "react";
import MonthlyChart from "./charts/MonthlyChart";
import DailyCharts from "./charts/DailyChart";
import WinterHourlyConsumptionChart from "./charts/WinterHourlyConsumptionChart";
import DownloadReportButton from "./DownloadReportButton";

import { useSelectedTerritory } from "./contexts/SelectedTerritoryContext";

// NOTE: these hooks currently accept provCod only in your old code.
// After this refactor, update them to accept (level, code) or a selector object.
import { useMonthlyData } from "../hooks/useMonthlyData";
import { useDailyData } from "../hooks/useDailyData";

export default function ChartShell() {
  const { selectedTerritory } = useSelectedTerritory();

  // Small helpers for UI
  const titlePlace =
    selectedTerritory?.level === "region"
      ? selectedTerritory.name
      : selectedTerritory?.level === "province"
      ? selectedTerritory.name
      : selectedTerritory?.level === "municipality"
      ? selectedTerritory.name
      : "selected territory";

  // Decide which numeric code to send to backend based on level
  // (You will mirror this on backend: /energy?level=...&reg/prov/mun=...)
  const selector =
    !selectedTerritory
      ? null
      : selectedTerritory.level === "region"
      ? { level: "region" as const, code: selectedTerritory.codes.reg }
      : selectedTerritory.level === "province"
      ? { level: "province" as const, code: selectedTerritory.codes.prov ?? null }
      : { level: "municipality" as const, code: selectedTerritory.codes.mun ?? null };

  // TEMP compatibility layer:
  // If your hooks still require provCod only, we only call them when a province is selected.
  const provCod = selectedTerritory?.level === "province" ? (selectedTerritory.codes.prov ?? null) : null;

  const { data, provinceName, loading, error } = useMonthlyData(provCod);
  const { consumption, production, dailyLoading, dailyError } = useDailyData(provCod);

  // Refs used by DownloadReportButton
  const chartRefs = useRef<Record<string, HTMLElement | null>>({});

  // If user selected region/municipality, show a friendly message for now
  // (Once hooks accept selector, remove this and use selector everywhere.)
  const unsupported =
    selectedTerritory && selectedTerritory.level !== "province";

  return (
    <section className="charts">
      {unsupported && (
        <div className="chart-card" style={{ marginBottom: 16 }}>
          <div className="chart-header">
            <h3>Charts not yet enabled for this level</h3>
            <span className="chart-subtitle">
              Selected: {selectedTerritory.level} of {selectedTerritory.name}. For now charts work only for provinces.
            </span>
          </div>
        </div>
      )}

      {/* Row 1 */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Monthly production and consumption</h3>
            <span className="chart-subtitle">
              In GWh, for the {titlePlace}
            </span>
          </div>

          <div
            className="chart-container chart-export-block"
            ref={(el) => {
              chartRefs.current["monthly production and consumption"] = el;
            }}
          >
            <MonthlyChart
              data={data}
              loading={loading}
              error={error}
              provinceName={provinceName}
              hasProvince={selectedTerritory?.level === "province"}
            />
          </div>
        </div>

        <div className="chart-insight">
          <h4 className="chart-insight-title">Key Insights – Shares</h4>
          <p className="chart-insight-text">
            Explain which renewable source is dominant, which ones contribute
            less, and how this compares to total consumption.
          </p>
        </div>
      </div>

      {/* Row 2 */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Daily production and consumption</h3>
            <span className="chart-subtitle">
              In GWh, for the {titlePlace}
            </span>
          </div>

          <div
            className="chart-container chart-export-block"
            ref={(el) => {
              chartRefs.current["daily consumption"] = el;
            }}
          >
            {!dailyLoading && !dailyError && consumption && production ? (
              <DailyCharts consumption={consumption} production={production} />
            ) : null}
          </div>
        </div>

        <div className="chart-insight">
          <h4 className="chart-insight-title">Key Insights – Shares</h4>
          <p className="chart-insight-text">
            Explain which renewable source is dominant, which ones contribute
            less, and how this compares to total consumption.
          </p>
        </div>
      </div>

      {/* Row 3 */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Winter hourly consumption</h3>
            <span className="chart-subtitle">
              In GWh, for the {titlePlace}
            </span>
          </div>

          <div
            className="chart-container chart-export-block"
            ref={(el) => {
              chartRefs.current["hourly consumption (winter)"] = el;
            }}
          >
            {/* TODO: update this chart to accept territory selector too */}
            <WinterHourlyConsumptionChart provCod="TO" />
          </div>
        </div>

        <div className="chart-insight">
          <h4 className="chart-insight-title">Key Insights – Shares</h4>
          <p className="chart-insight-text">
            Explain which renewable source is dominant, which ones contribute
            less, and how this compares to total consumption.
          </p>
        </div>
      </div>

      <DownloadReportButton
        chartRefs={chartRefs.current}
        // for now keep old prop name; later rename to territoryName
        provinceName={selectedTerritory?.name ?? "Unknown"}
      />
    </section>
  );
}
