import React from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import type { ComuneMonthlyEnergyPoint } from "../../hooks/useComuneMonthlyEnergy";

interface Props {
  data: ComuneMonthlyEnergyPoint[];
  loading: boolean;
  error: string | null;
  comune?: string | null;
}

const UNIT_LABEL = "GWh";

const ComuneMonthlyConsumptionChart: React.FC<Props> = ({
  data,
  loading,
  error,
  comune,
}) => {
  if (!comune) {
    return (
      <div className="chart-placeholder">
        Select a municipality to see monthly consumption.
      </div>
    );
  }

  if (loading) {
    return <div className="chart-placeholder">Loading data…</div>;
  }

  if (error) {
    return (
      <div className="chart-placeholder text-red-600">Error: {error}</div>
    );
  }

  if (!data.length) {
    return (
      <div className="chart-placeholder">
        No data available for this municipality.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 15, left: 5, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tickMargin={8} />
          <YAxis
            label={{
              value: UNIT_LABEL,
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip
            formatter={(value: any, name) => [
              `${(value as number).toFixed(2)} ${UNIT_LABEL}`,
              name as string,
            ]}
          />
          <Legend verticalAlign="top" height={32} />

          <Bar
            dataKey="domestic"
            name="Domestic"
            stackId="cons"
          />
          <Bar
            dataKey="primary"
            name="Primary"
            stackId="cons"
          />
          <Bar
            dataKey="secondary"
            name="Secondary"
            stackId="cons"
          />
          <Bar
            dataKey="tertiary"
            name="Tertiary"
            stackId="cons"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ComuneMonthlyConsumptionChart;
