// src/hooks/useHourlyCalendarData.ts
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { ChartSeriesPoint } from "../api/client";

export type BackendLevel = "region" | "province" | "comune";
export type Domain = "consumption" | "production" | "future_production";
export type DayType = "weekday" | "weekend";

export type HourlyPoint = {
  hour: number; // 0..23
  value_mwh: number;
};

export type HourlyMonthChartPoint = {
  x: number; // 1..24
  weekday_mwh: number | null;
  weekend_mwh: number | null;
};

export type HourlyMonthChart = {
  month: number; // 1..12
  data: HourlyMonthChartPoint[];
};

type Args = {
  year: number;
  scenario: number;
  domain?: Domain;
};

function toNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function normalizeHourlySeries(raw: unknown): HourlyPoint[] {
  if (!Array.isArray(raw)) return [];

  const byHour = new Map<number, number>();

  for (const r of raw as ChartSeriesPoint[]) {
    const x = toNumber((r as any)?.x);
    const v = toNumber((r as any)?.value_mwh);
    if (x == null || v == null) continue;

    // backend hour likely 1..24 -> convert to 0..23
    const hour = x - 1;
    if (hour >= 0 && hour <= 23) byHour.set(hour, v);
  }

  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    value_mwh: byHour.get(h) ?? 0,
  }));
}

function toMonthChartData(weekday: HourlyPoint[], weekend: HourlyPoint[]): HourlyMonthChartPoint[] {
  const wk = new Map<number, number>();
  const we = new Map<number, number>();

  for (const p of weekday) wk.set(p.hour + 1, p.value_mwh); // 0..23 -> 1..24
  for (const p of weekend) we.set(p.hour + 1, p.value_mwh);

  const out: HourlyMonthChartPoint[] = [];
  for (let x = 1; x <= 24; x++) {
    out.push({
      x,
      weekday_mwh: wk.get(x) ?? null,
      weekend_mwh: we.get(x) ?? null,
    });
  }
  return out;
}

function territoryKey(level: BackendLevel): "region_code" | "province_code" | "municipality_code" {
  if (level === "region") return "region_code";
  if (level === "province") return "province_code";
  return "municipality_code"; // comune
}

export function useHourlyCalendarData(
  level: BackendLevel,
  territoryCode: number | string | null,
  { year, scenario, domain = "consumption" }: Args
) {
  const [chartData, setChartData] = useState<HourlyMonthChart[]>([]);
  const [hourlyLoading, setHourlyLoading] = useState(false);
  const [hourlyError, setHourlyError] = useState<string | null>(null);

  const hasTerritory = territoryCode != null;

  const levelKey = useMemo(() => territoryKey(level), [level]);

  useEffect(() => {
    if (!hasTerritory) {
      setChartData([]);
      setHourlyError(null);
      return;
    }

    const controller = new AbortController();

    (async () => {
      setHourlyLoading(true);
      setHourlyError(null);

      try {
        // fetch 12 months, each month fetch weekday + weekend
        const months: HourlyMonthChart[] = [];

        for (let month = 1; month <= 12; month++) {
          const baseParams: Record<string, any> = {
            level,
            resolution: "hourly",
            domain,
            year,
            scenario,
            month,
            [levelKey]: territoryCode,
          };

          const [wkRaw, weRaw] = await Promise.all([
            api.getChartSeries<ChartSeriesPoint[]>(
              { ...baseParams, day_type: "weekday" },
              controller.signal
            ),
            api.getChartSeries<ChartSeriesPoint[]>(
              { ...baseParams, day_type: "weekend" },
              controller.signal
            ),
          ]);

          const wk = normalizeHourlySeries(wkRaw);
          const we = normalizeHourlySeries(weRaw);

          months.push({
            month,
            data: toMonthChartData(wk, we),
          });
        }

        setChartData(months);
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setHourlyError(e?.message ?? "Failed to load hourly series");
        setChartData([]);
      } finally {
        setHourlyLoading(false);
      }
    })();

    return () => controller.abort();
  }, [hasTerritory, level, levelKey, territoryCode, year, scenario, domain]);

  return { chartData, hourlyLoading, hourlyError, hasTerritory };
}
