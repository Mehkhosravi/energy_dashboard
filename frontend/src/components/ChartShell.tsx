// src/components/ChartShell.tsx
import { useRef } from "react";
import DailyCharts from "./charts/DailyChart";
import DownloadReportButton from "./DownloadReportButton";
import { useSelectedTerritory } from "./contexts/SelectedTerritoryContext";
import { useDailyData } from "../hooks/useDailyData";
import ProvinceMonthlyChartContainer from "./charts/ProvinceMonthlyChartContainer";
import HourlyChart from "./charts/HourlyChart";

export default function ChartShell() {
  const { selectedTerritory } = useSelectedTerritory();

  // ✅ ALWAYS call hooks before any conditional returns
  const chartRefs = useRef<Record<string, HTMLElement | null>>({});

  const titlePlace =
    selectedTerritory?.level === "region"
      ? selectedTerritory.name
      : selectedTerritory?.level === "province"
      ? selectedTerritory.name
      : selectedTerritory?.level === "municipality"
      ? selectedTerritory.name
      : "selected territory";

  // province code for now
  const provCod =
    selectedTerritory?.level === "province"
      ? selectedTerritory.codes.prov ?? null
      : null;

  const { chartData, dailyLoading, dailyError } = useDailyData(provCod, {
    year: 2019,
    domain: "consumption",
  });

  // ✅ returns are fine now (all hooks already called)
  if (dailyLoading) return <div>Loading…</div>;
  if (dailyError) return <div>{dailyError}</div>;
  if (chartData && !chartData.length) return null;

  const unsupported = selectedTerritory && selectedTerritory.level !== "province";

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
            <ProvinceMonthlyChartContainer />
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

      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Daily production and consumption</h3>
            <span className="chart-subtitle">In GWh, for the {titlePlace}</span>
          </div>

          <div
            className="chart-container chart-export-block"
            ref={(el) => {
              chartRefs.current["daily consumption"] = el;
            }}
          >
            <DailyCharts data={chartData} />
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
      <div className="chart-row">
        <div className="chart-card">
          <div
            className="chart-container chart-export-block"
            ref={(el) => {
              chartRefs.current["hourly production and consumption"] = el;
            }}
          >
            <HourlyChart 
              year={2019}
              scenario={0}
              domain="consumption" 
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

      <DownloadReportButton
        chartRefs={chartRefs.current}
        provinceName={selectedTerritory?.name ?? "Unknown"}
      />
    </section>
  );
}
