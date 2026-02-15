import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

type Props = {
  data: {
    label: string; // e.g. S1.1
    value: number; // 0..1
    color: string;
    fullLabel: string;
  }[];
  title: string;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const pt = payload[0].payload;
    return (
      <div
        style={{
          backgroundColor: "white",
          border: `1px solid ${pt.color}`,
          padding: "8px",
          borderRadius: "4px",
          fontSize: "12px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ fontWeight: 700, color: pt.color }}>{pt.label}</div>
        <div>{pt.fullLabel}</div>
        <div style={{ marginTop: 4 }}>
          value: {(pt.value * 100).toFixed(1)}%
        </div>
      </div>
    );
  }
  return null;
};

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  return (
    <circle cx={cx} cy={cy} r={6} fill={payload.color} stroke="none" />
  );
};

export default function ScenarioDotChart({ data, title }: Props) {
  return (
    <div style={{ width: "100%", height: 180, marginBottom: 24 }}>
      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{title}</div>
      <ResponsiveContainer>
        <LineChart margin={{ top: 20, right: 10, bottom: 0, left: 0 }} data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={0} padding={{ left: 20, right: 20 }} />
          <YAxis
            tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={35}
            // Add some padding to domain so top dot isn't cut off
            domain={[0, (max: number) => Math.min(1, Math.max(0.4, max * 1.1))]}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#eee", strokeWidth: 2 }} />
          
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="none" 
            dot={<CustomDot />} 
            activeDot={{ r: 8 }}
            isAnimationActive={false}
          >
             <LabelList
              dataKey="value"
              position="top"
              formatter={(v: any) => `${(Number(v) * 100).toFixed(0)}%`}
              style={{ fontSize: 11, fill: "#666" }}
              offset={10}
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
