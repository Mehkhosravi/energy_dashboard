// src/components/ChartShell.tsx
import MonthlyChart from "./charts/MonthlyChart";
import { useSelectedProvince } from "./contexts/SelectedProvinceContext";

export default function ChartShell() {
  const { selectedProvince } = useSelectedProvince();
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
          <div className="chart-container">
            <MonthlyChart />
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
    </section>
  );
}
