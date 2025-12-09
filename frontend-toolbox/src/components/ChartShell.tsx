// src/components/ChartShell.tsx
import MonthlyChart from "./charts/MonthlyChart";
import { useSelectedProvince } from "./contexts/SelectedProvinceContext";
import { useMonthlyData } from "../hooks/useMonthlyData";
import { useDailyData } from "../hooks/useDailyData";
import DailyCharts from "./charts/DailyChart";
import WinterHourlyConsumptionChart from "./charts/WinterHourlyConsumptionChart";
import { useRef } from "react";
import DownloadReportButton from "./DownloadReportButton";

export default function ChartShell() {
  const { selectedProvince } = useSelectedProvince();
  const provCod = selectedProvince?.COD_PROV ?? null;
  const { data, provinceName, loading, error } = useMonthlyData(
    provCod
  );
  
  const {consumption, production, dailyLoading, dailyError} = useDailyData(
    provCod
  );
  const chartRefs = useRef<Record<string, HTMLElement | null>>({});

  return (
    <section className="charts">
      {/* Row 1 */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Monthly production and consumption</h3>
            <span className="chart-subtitle">
              In GWh, for the {selectedProvince?.DEN_UTS || "selected province"}
            </span>
          </div>
          <div className="chart-container chart-export-block" ref={(el) => {chartRefs.current["monthly production and consumption"] = el;}}>
            <MonthlyChart  
              data={data}
              loading={loading}
              error={error}
              provinceName={provinceName}
              hasProvince={!!selectedProvince}
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
              In GWh, for the {selectedProvince?.DEN_UTS || "selected province"}
            </span>
          </div>
          <div className="chart-container chart-export-block" ref={(el) => {chartRefs.current["daily consumption"] = el;}}>
            {consumption && production ? (
              <DailyCharts  
                consumption={consumption}
                production={production}
              />
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
      {/* Row 2 */}
      <div className="chart-row">
        <div className="chart-card">
          <div className="chart-header">
            <h3>Winter hourly consumption</h3>
            <span className="chart-subtitle">
              In GWh, for the {selectedProvince?.DEN_UTS || "selected province"}
            </span>
          </div>
          <div className="chart-container chart-export-block" ref={(el) => {chartRefs.current["hourly consumption (winter)"] = el;}}>
            <WinterHourlyConsumptionChart  
              provCod="TO"
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
        provinceName="Torino"
       />
    </section>
  );
}
