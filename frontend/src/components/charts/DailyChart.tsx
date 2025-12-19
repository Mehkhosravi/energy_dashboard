// src/components/DailyCharts.tsx
import React from "react";
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

type Point = {
  month: string;
  weekday: number;
  weekend: number;
};

interface DailyChartsProps {
  data: Point[]; // useDailyData().chartData
  title?: string;
}

const DailyCharts: React.FC<DailyChartsProps> = ({
  data,
  title = "Monthly profile — Weekday vs Weekend",
}) => {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <h4 style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600 }}>
        {title}
      </h4>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: 10 }} />
          <XAxis dataKey="month" />
          <YAxis
            label={{ value: "MWh", angle: -90, position: "insideLeft", offset: 8 }}
          />
          <Tooltip formatter={(val: number) => `${Number(val).toFixed(3)} MWh`} />

          <Line
            type="monotone"
            dataKey="weekday"
            name="Weekday"
            stroke="#1f2937"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="weekend"
            name="Weekend"
            stroke="#dc2626"
            strokeWidth={2}
            dot={false}
            strokeDasharray="4 2"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DailyCharts;
