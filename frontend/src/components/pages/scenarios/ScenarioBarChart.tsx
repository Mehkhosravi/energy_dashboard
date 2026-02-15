import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type Props = {
  data: {
    label: string; // e.g. Jan
    value: number;
  }[];
  title?: string;
  color?: string;
  unit?: string;
};

const CustomTooltip = ({ active, payload, label, unit }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: "white",
          border: "1px solid #ddd",
          padding: "8px",
          borderRadius: "4px",
          fontSize: "12px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ fontWeight: 700 }}>{label}</div>
        <div>
          {payload[0].value.toLocaleString()} {unit}
        </div>
      </div>
    );
  }
  return null;
};

export default function ScenarioBarChart({ data, title, color = "#3b82f6", unit = "MWh" }: Props) {
  return (
    <div style={{ width: "100%", height: 200, marginBottom: 12 }}>
      {title && <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>{title}</div>}
      <ResponsiveContainer>
        <BarChart margin={{ top: 10, right: 10, bottom: 0, left: 0 }} data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 10 }} 
            interval={0} 
            axisLine={false} 
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => 
               v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)
            }
            tick={{ fontSize: 10, fill: "#888" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
