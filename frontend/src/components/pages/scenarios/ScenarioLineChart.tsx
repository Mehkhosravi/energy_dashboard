import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Props = {
  data: {
    label: string; // e.g. 00, 01...
    value: number; // primary series
    value2?: number; // secondary series (e.g. weekend)
  }[];
  title?: string;
  color?: string; // for primary
  color2?: string; // for secondary
  seriesName1?: string;
  seriesName2?: string;
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
        <div style={{ fontWeight: 700 }}>Hour {label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color }}>
            {p.name}: {p.value.toFixed(1)} {unit}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ScenarioLineChart({
  data,
  title,
  color = "#0ea5e9", // sky-500
  color2 = "#a855f7", // purple-500
  seriesName1 = "Weekday",
  seriesName2 = "Weekend",
  unit = "kWh",
}: Props) {
  return (
    <div style={{ width: "100%", height: 200, marginBottom: 12 }}>
      {title && <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>{title}</div>}
      <ResponsiveContainer>
        <LineChart margin={{ top: 10, right: 10, bottom: 0, left: 0 }} data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 10 }} 
            interval={3} // show every 4th label (00, 04, 08...)
            axisLine={false} 
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => v.toFixed(0)}
            tick={{ fontSize: 10, fill: "#888" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          <Legend iconType="circle" style={{ fontSize: 11 }} wrapperStyle={{ paddingTop: 10 }} />
          
          <Line
            type="monotone"
            dataKey="value"
            name={seriesName1}
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          {data.some(d => d.value2 !== undefined) && (
            <Line
              type="monotone"
              dataKey="value2"
              name={seriesName2}
              stroke={color2}
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
