// src/components/charts/HourlyChart.tsx
import { useMemo } from "react";
import {
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import type { HourlyMonthChart } from "../../hooks/useHourlyCalendarData";

type Props = {
  data: HourlyMonthChart[];
};

type SeasonRow = {
  key: "winter" | "spring" | "summer" | "autumn";
  label: string;
  months: number[]; // 1..12
};

const MONTH_SHORT: Record<number, string> = {
  1: "Jan",
  2: "Feb",
  3: "Mar",
  4: "Apr",
  5: "May",
  6: "Jun",
  7: "Jul",
  8: "Aug",
  9: "Sep",
  10: "Oct",
  11: "Nov",
  12: "Dec",
};

function formatHourTick(x: any) {
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x);
  return String(n).padStart(2, "0");
}

function formatTooltipLabel(x: any) {
  const n = Number(x);
  if (!Number.isFinite(n)) return `Hour ${x}`;
  return `Hour ${String(n).padStart(2, "0")}:00`;
}

function MonthMiniChart({ title, data }: { title: string; data: any[] }) {
  return (
    <div className="chart-card" style={{ border: "none", boxShadow: "none" }}>
      <div className="chart-header">
        <h3>{title}</h3>
        <div className="chart-subtitle">Weekday vs Weekend</div>
      </div>

      <div style={{ width: "100%", height: 90 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 2, right: 6, left: 8, bottom: 0 }}>
            <XAxis
              dataKey="x"
              tickFormatter={formatHourTick}
              interval={5}
              tick={{ fontSize: 10 }}
              axisLine
              tickLine
            />
            <YAxis width={52} tick={{ fontSize: 10 }} axisLine tickLine />
            <Tooltip labelFormatter={formatTooltipLabel} />

            <Line
              type="monotone"
              dataKey="weekday_mwh"
              name="Weekday"
              stroke="#8884d8"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="weekend_mwh"
              name="Weekend"
              stroke="#82ca9d"
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-subtitle" style={{ display: "flex", gap: 10, marginTop: 2 }}>
        <span style={{ color: "#8884d8" }}>— Weekday</span>
        <span style={{ color: "#82ca9d" }}>— Weekend</span>
      </div>
    </div>
  );
}

export default function HourlyChart({ data }: Props) {
  const seasons: SeasonRow[] = useMemo(
    () => [
      { key: "winter", label: "Winter", months: [1, 2, 3] },
      { key: "spring", label: "Spring", months: [4, 5, 6] },
      { key: "summer", label: "Summer", months: [7, 8, 9] },
      { key: "autumn", label: "Autumn", months: [10, 11, 12] },
    ],
    []
  );

  const byMonth = useMemo(() => {
    const m = new Map<number, HourlyMonthChart>();
    for (const row of data) m.set(row.month, row);
    return m;
  }, [data]);

  return (
    <div>
      {seasons.map((season) => (
        <div key={season.key} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="chart-subtitle">
            <b>{season.label}</b>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {season.months.map((month) => {
              const row = byMonth.get(month);
              return (
                <MonthMiniChart
                  key={`${season.key}-${month}`}
                  title={`${MONTH_SHORT[month]}`}
                  data={row?.data ?? []}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
