// src/components/charts/HourlyChart.tsx
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useSelectedTerritory } from "../contexts/SelectedTerritoryContext";
import { api } from "../../api/client";
import type { ChartSeriesPoint } from "../../api/client";
import type { SelectedTerritory } from "../contexts/SelectedTerritoryContext";

type Props = {
  year: number;
  scenario: number;
  domain?: "consumption" | "production" | "future_production";
};

type SeasonRow = {
  key: "winter" | "spring" | "summer" | "autumn";
  label: string;
  months: number[];
};

type MonthHourPoint = {
  x: number; // 1..24
  weekday_mwh: number | null;
  weekend_mwh: number | null;
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

function domainTitle(domain: Props["domain"]) {
  if (domain === "production") return "Hourly production";
  if (domain === "future_production") return "Hourly future production";
  return "Hourly consumption";
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

function toNum(v: any): number {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function backendLevel(level: SelectedTerritory["level"]) {
  return level === "municipality" ? "comune" : level;
}

function getTerritoryParam(t: SelectedTerritory) {
  if (t.level === "region") return { key: "region_code", value: t.codes.reg };
  if (t.level === "province")
    return { key: "province_code", value: t.codes.prov ?? null };
  return { key: "municipality_code", value: t.codes.mun ?? null };
}

function MonthChart({
  year,
  month,
  scenario,
  domain,
}: {
  year: number;
  month: number;
  scenario: number;
  domain: "consumption" | "production" | "future_production";
}) {
  const { selectedTerritory } = useSelectedTerritory();
  const [data, setData] = useState<MonthHourPoint[]>([]);

  useEffect(() => {
    if (!selectedTerritory) return;

    const territoryParam = getTerritoryParam(selectedTerritory);
    if (territoryParam.value == null) return;

    const controller = new AbortController();

    async function run() {
      const baseParams: Record<string, any> = {
        level: backendLevel(selectedTerritory.level),
        resolution: "hourly",
        domain,
        year,
        scenario,
        month,
        [territoryParam.key]: territoryParam.value,
      };

      const [wk, we] = await Promise.all([
        api.getChartSeries<ChartSeriesPoint[]>(
          { ...baseParams, day_type: "weekday" },
          controller.signal
        ),
        api.getChartSeries<ChartSeriesPoint[]>(
          { ...baseParams, day_type: "weekend" },
          controller.signal
        ),
      ]);

      const wkMap = new Map<number, number>();
      const weMap = new Map<number, number>();

      wk.forEach((p) => wkMap.set(toNum((p as any).x), toNum((p as any).value_mwh)));
      we.forEach((p) => weMap.set(toNum((p as any).x), toNum((p as any).value_mwh)));

      const merged: MonthHourPoint[] = [];
      for (let x = 1; x <= 24; x++) {
        merged.push({
          x,
          weekday_mwh: wkMap.get(x) ?? null,
          weekend_mwh: weMap.get(x) ?? null,
        });
      }

      setData(merged);
    }

    run();
    return () => controller.abort();
  }, [selectedTerritory, year, month, scenario, domain]);

  return (
    <div className="chart-card" style={{ border: "none", boxShadow: "none" }}>
      <div className="chart-header">
        <h3>{monthTitle(month, year)}</h3>
        <div className="chart-subtitle">Weekday vs Weekend</div>
      </div>

      <div className="chart-container">
        <LineChart
          style={{
            width: "100%",
            height: 50,              // ✅ fixed small height
          }}
          data={data}
          margin={{ top: 6, right: 0, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" tickFormatter={formatHourTick} interval={3} />
          <YAxis width={48} tick={{ fontSize: 10 }} />
          <Tooltip labelFormatter={formatTooltipLabel} />
          <Legend />
          <Line
            type="monotone"
            dataKey="weekday_mwh"
            name="Weekday"
            stroke="#8884d8"
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="weekend_mwh"
            name="Weekend"
            stroke="#82ca9d"
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      </div>
    </div>
  );
}

export default function HourlyChart({
  year,
  scenario,
  domain = "consumption",
}: Props) {
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
    <div className="charts">
      <div className="chart-header">
        <h3>
          {domainTitle(domain)} — {selectedTerritory.name}
        </h3>
        <div className="chart-subtitle">
          {year} · Scenario {scenario}
        </div>
      </div>

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
              <MonthChart
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
