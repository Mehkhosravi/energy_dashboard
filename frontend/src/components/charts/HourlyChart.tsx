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
  months: number[]; // 1..12
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
  const m = MONTH_SHORT[month] ?? `M${month}`;
  return `${m} ${year}`;
}

function domainTitle(domain: Props["domain"]) {
  if (domain === "production") return "Hourly production";
  if (domain === "future_production") return "Hourly future production";
  return "Hourly consumption";
}

function formatHourTick(x: any) {
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x);
  return String(Math.max(1, Math.min(24, n))).padStart(2, "0");
}

function formatTooltipLabel(x: any) {
  const n = Number(x);
  if (!Number.isFinite(n)) return `Hour: ${String(x)}`;
  const hh = Math.max(1, Math.min(24, n));
  return `Hour: ${String(hh).padStart(2, "0")}:00`;
}

function toNum(v: any): number {
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : 0;
}

function backendLevel(level: SelectedTerritory["level"]) {
  return level === "municipality" ? "comune" : level;
}

function getTerritoryParam(t: SelectedTerritory): { key: string; value: number | null } {
  if (t.level === "region") {
    return { key: "region_code", value: t.codes.reg };
  }
  if (t.level === "province") {
    return { key: "province_code", value: t.codes.prov ?? null };
  }
  // municipality OR comune
  return { key: "municipality_code", value: t.codes.mun ?? null };
}

function MonthChart({
  year,
  month,
  scenario,
  domain,
}: {
  year: number;
  month: number; // 1..12
  scenario: number;
  domain: "consumption" | "production" | "future_production";
}) {
  const { selectedTerritory } = useSelectedTerritory();

  const [data, setData] = useState<MonthHourPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedTerritory) {
      setData([]);
      setError(null);
      return;
    }

    const territoryParam = getTerritoryParam(selectedTerritory);
    if (territoryParam.value == null) {
      setData([]);
      setError("No valid territory code found for the selected territory.");
      return;
    }

    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setError(null);

      try {
        // If backend uses a different param name than "month", change it here only.
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
        for (const p of wk) {
          wkMap.set(toNum((p as any).x), toNum((p as any).value_mwh));
        }

        const weMap = new Map<number, number>();
        for (const p of we) {
          weMap.set(toNum((p as any).x), toNum((p as any).value_mwh));
        }

        const merged: MonthHourPoint[] = [];
        for (let x = 1; x <= 24; x++) {
          merged.push({
            x,
            weekday_mwh: wkMap.has(x) ? (wkMap.get(x) as number) : null,
            weekend_mwh: weMap.has(x) ? (weMap.get(x) as number) : null,
          });
        }

        setData(merged);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message ?? "Failed to load monthly hourly series");
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [selectedTerritory, year, month, scenario, domain]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h3>{monthTitle(month, year)}</h3>
        <div className="chart-subtitle">
          Hours 01–24 · Weekday vs Weekend {loading ? "· Loading…" : ""}
        </div>
        {error ? (
          <div className="chart-subtitle" style={{ color: "#dc2626" }}>
            {error}
          </div>
        ) : null}
      </div>

      <div className="chart-container">
        <LineChart
          style={{
            width: "100%",
            maxWidth: "700px",
            maxHeight: "70vh",
            aspectRatio: 1.618,
          }}
          responsive
          data={data}
          margin={{ top: 15, right: 0, left: 8, bottom: 5 }} // ✅ left margin helps show Y ticks
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" tickFormatter={formatHourTick} interval={2} />
          <YAxis width={56} tick={{ fontSize: 11 }} /> {/* ✅ fixed width shows numbers */}
          <Tooltip
            labelFormatter={formatTooltipLabel}
            formatter={(v: any) =>
              typeof v === "number" ? `${v.toFixed(2)} MWh` : String(v)
            }
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="weekday_mwh"
            name="Weekday"
            stroke="#8884d8"
            strokeDasharray="5 5"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="weekend_mwh"
            name="Weekend"
            stroke="#82ca9d"
            strokeDasharray="3 4 5 2"
            dot={false}
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

  if (!selectedTerritory) {
    return (
      <div className="charts">
        <div className="chart-header">
          <h3>{domainTitle(domain)}</h3>
          <div className="chart-subtitle">Select a territory to see charts.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="charts">
      <div className="chart-header">
        <h3>
          {domainTitle(domain)} — {selectedTerritory.name}
        </h3>
        <div className="chart-subtitle">
          Year {year} · Scenario {scenario} · One chart per month · Two lines: Weekday + Weekend
        </div>
      </div>

      {seasons.map((season) => (
        <div
          key={season.key}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div className="chart-subtitle" style={{ fontSize: 12 }}>
            <b style={{ color: "#111827" }}>{season.label}</b>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
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
