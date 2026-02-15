import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";


// Hourly data: X axis 00..23, values in MWh
const data: Array<{ hour: string; weekdayMWh: number; weekendMWh: number }> = [
  { hour: "00", weekdayMWh: 120, weekendMWh: 95 },
  { hour: "01", weekdayMWh: 110, weekendMWh: 90 },
  { hour: "02", weekdayMWh: 105, weekendMWh: 88 },
  { hour: "03", weekdayMWh: 102, weekendMWh: 86 },
  { hour: "04", weekdayMWh: 104, weekendMWh: 87 },
  { hour: "05", weekdayMWh: 115, weekendMWh: 92 },
  { hour: "06", weekdayMWh: 140, weekendMWh: 105 },
  { hour: "07", weekdayMWh: 175, weekendMWh: 125 },
  { hour: "08", weekdayMWh: 210, weekendMWh: 150 },
  { hour: "09", weekdayMWh: 230, weekendMWh: 165 },
  { hour: "10", weekdayMWh: 240, weekendMWh: 175 },
  { hour: "11", weekdayMWh: 250, weekendMWh: 185 },
  { hour: "12", weekdayMWh: 255, weekendMWh: 190 },
  { hour: "13", weekdayMWh: 252, weekendMWh: 192 },
  { hour: "14", weekdayMWh: 248, weekendMWh: 195 },
  { hour: "15", weekdayMWh: 245, weekendMWh: 198 },
  { hour: "16", weekdayMWh: 250, weekendMWh: 205 },
  { hour: "17", weekdayMWh: 265, weekendMWh: 215 },
  { hour: "18", weekdayMWh: 280, weekendMWh: 230 },
  { hour: "19", weekdayMWh: 270, weekendMWh: 235 },
  { hour: "20", weekdayMWh: 240, weekendMWh: 220 },
  { hour: "21", weekdayMWh: 210, weekendMWh: 200 },
  { hour: "22", weekdayMWh: 175, weekendMWh: 170 },
  { hour: "23", weekdayMWh: 145, weekendMWh: 140 },
];

type Props = {
  title?: string;
  unit?: string; // default "MWh"
};

export default function HourlyEnergyWeekdayWeekendChart({
  title = "Hourly Energy Profile",
  unit = "MWh",
}: Props) {
  return (
    <div style={{ width: "100%", maxWidth: 900 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>{title}</div>

      <div style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 16, left: 8, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="hour"
              tickMargin={8}
              interval={0}
              label={{ value: "Hour of day", position: "insideBottom", offset: -6 }}
            />
            <YAxis
              tickMargin={8}
              width={56}
              label={{ value: unit, angle: -90, position: "insideLeft" }}
            />

            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} ${unit}`,
                name === "weekdayMWh" ? "Weekday" : "Weekend",
              ]}
              labelFormatter={(label) => `Hour ${label}`}
            />
            <Legend
              formatter={(value) =>
                value === "weekdayMWh" ? "Weekday" : "Weekend"
              }
            />

            <Line
              type="monotone"
              dataKey="weekdayMWh"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="weekendMWh"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
