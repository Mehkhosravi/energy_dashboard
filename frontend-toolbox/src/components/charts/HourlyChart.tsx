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
import { useSelectedTerritory } from "../contexts/SelectedTerritoryContext";
import { useHourlyData } from "../../hooks/useHourlyData";

type Props = {
  year: number;
  scenario: number;
  domain?: "consumption" | "production" | "future_production";
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

function monthTitle(month: number, year: number) {
  return `${MONTH_SHORT[month]} ${year}`;
}

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

function toChartData(
  weekday: { hour: number; value_mwh: number }[],
  weekend: { hour: number; value_mwh: number }[]
) {
  const wk = new Map<number, number>();
  const we = new Map<number, number>();

  for (const p of weekday) wk.set(p.hour + 1, p.value_mwh); // 0..23 -> 1..24
  for (const p of weekend) we.set(p.hour + 1, p.value_mwh);

  const out: Array<{ x: number; weekday_mwh: number | null; weekend_mwh: number | null }> = [];
  for (let x = 1; x <= 24; x++) {
    out.push({
      x,
      weekday_mwh: wk.get(x) ?? null,
      weekend_mwh: we.get(x) ?? null,
    });
  }
  return out;
}

function MonthMiniChart({
  year,
  scenario,
  domain,
  month,
}: {
  year: number;
  scenario: number;
  domain: "consumption" | "production" | "future_production";
  month: number; // 1..12
}) {
  // ✅ new API supports month=...
  const wk = useHourlyData({ year, scenario, domain, dayType: "weekday", month });
  const we = useHourlyData({ year, scenario, domain, dayType: "weekend", month });

  const chartData = useMemo(() => toChartData(wk.data, we.data), [wk.data, we.data]);

  const loading = wk.loading || we.loading;
  const error = wk.error || we.error;

  return (
    <div className="chart-card" style={{ border: "none", boxShadow: "none" }}>
      <div className="chart-header">
        <h3>{monthTitle(month, year)}</h3>
        <div className="chart-subtitle">
          Weekday vs Weekend {loading ? "· Loading…" : ""}
        </div>
        {error ? (
          <div className="chart-subtitle" style={{ color: "#dc2626" }}>
            {error}
          </div>
        ) : null}
      </div>

      <div style={{ width: "100%", height: 90 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 2, right: 6, left: 8, bottom: 0 }}>
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

export default function HourlyChart({ year, scenario, domain = "consumption" }: Props) {
  const { selectedTerritory } = useSelectedTerritory();

  const seasons: SeasonRow[] = useMemo(
    () => [
      { key: "winter", label: "Winter", months: [1, 2, 3] },
      { key: "spring", label: "Spring", months: [4, 5, 6] },
      { key: "summer", label: "Summer", months: [7, 8, 9] },
      { key: "autumn", label: "Autumn", months: [10, 11, 12] },
    ],
    []
  );

  if (!selectedTerritory) return null;

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
            {season.months.map((m) => (
              <MonthMiniChart
                key={`${season.key}-${m}`}
                year={year}
                month={m}
                scenario={scenario}
                domain={domain}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
