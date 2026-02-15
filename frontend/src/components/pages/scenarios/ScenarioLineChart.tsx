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
  data: any[];
  series: {
    dataKey: string;
    name: string;
    color: string;
  }[];
  title?: string;
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
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color }}>
            {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : p.value} {unit}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function ScenarioLineChart({
  data,
  series,
  title,
  unit = "MWh",
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
            interval="preserveStartEnd"
            axisLine={false} 
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => 
               v >= 1000 ? `${(v / 1000).toFixed(0)}k` : Number.isInteger(v) ? v.toFixed(0) : v.toFixed(2)
            }
            tick={{ fontSize: 10, fill: "#888" }}
            axisLine={false}
            tickLine={false}
            width={42}
            label={{ value: unit, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#999' }, dy: 20 }}
          />
          <Tooltip content={<CustomTooltip unit={unit} />} />
          {/* Always show legend if there's at least one series?? Or only if multiple? 
              User said "make the button of it blue when selected... toggle". 
              The legend helps identify lines. Let's show it. */}
          <Legend iconType="circle" style={{ fontSize: 11 }} wrapperStyle={{ paddingTop: 10 }} />
          
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
