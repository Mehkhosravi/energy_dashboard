// src/hooks/useDailyData.ts
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

export type MonthKey =
  | "jan" | "feb" | "mar" | "apr" | "may" | "jun"
  | "jul" | "aug" | "sep" | "oct" | "nov" | "dec";

export const MONTHS: { key: MonthKey; label: string; monthNum: number }[] = [
  { key: "jan", label: "Jan", monthNum: 1 },
  { key: "feb", label: "Feb", monthNum: 2 },
  { key: "mar", label: "Mar", monthNum: 3 },
  { key: "apr", label: "Apr", monthNum: 4 },
  { key: "may", label: "May", monthNum: 5 },
  { key: "jun", label: "Jun", monthNum: 6 },
  { key: "jul", label: "Jul", monthNum: 7 },
  { key: "aug", label: "Aug", monthNum: 8 },
  { key: "sep", label: "Sep", monthNum: 9 },
  { key: "oct", label: "Oct", monthNum: 10 },
  { key: "nov", label: "Nov", monthNum: 11 },
  { key: "dec", label: "Dec", monthNum: 12 },
];

export type Domain = "consumption" | "production";

// ✅ backend level values
export type BackendLevel = "region" | "province" | "comune";

export type SeriesPoint = {
  x: number; // 1..12 (month)
  value_mwh: number;
};

export type TerritoryDailySeries = {
  level: BackendLevel;
  territory_code: number; // region_code | province_code | comune_code (normalized)
  domain: Domain;
  year: number;
  weekday: number[]; // length 12
  weekend: number[]; // length 12
};

function empty12(): number[] {
  return Array.from({ length: 12 }, () => 0);
}

function toSeries12(points: SeriesPoint[]): number[] {
  const arr = empty12();

  for (const p of points ?? []) {
    const m = Number(p?.x);
    if (!Number.isFinite(m) || m < 1 || m > 12) continue;

    const v = Number(p?.value_mwh);
    arr[m - 1] = Number.isFinite(v) ? v : 0;
  }

  return arr;
}

function codeParamKey(level: BackendLevel): "region_code" | "province_code" | "comune_code" {
  if (level === "region") return "region_code";
  if (level === "province") return "province_code";
  return "comune_code";
}



/**
 * Generic daily hook (weekday/weekend monthly series) for:
 * - region:   level="region"  + region_code
 * - province: level="province"+ province_code
 * - comune:   level="comune"  + comune_code
 */
export function useDailyData(
  level: BackendLevel,
  territoryCode?: number | null,
  options?: { year?: number; domain?: Domain }
) {
  const year = options?.year ?? 2019;
  const domain = options?.domain ?? "consumption";

  const [series, setSeries] = useState<TerritoryDailySeries | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  useEffect(() => {
    if (!territoryCode) {
      setSeries(null);
      setDailyError(null);
      setDailyLoading(false);
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      try {
        setDailyLoading(true);
        setDailyError(null);

        const key = codeParamKey(level);
        const baseParams: Record<string, any> = {
            level,
            resolution: "monthly",
            domain,
            year,
        };
        baseParams[key] = territoryCode!;

        const [wkdayPoints, wkendPoints] = await Promise.all([
          api.getChartSeries<SeriesPoint[]>({ ...baseParams, day_type: "weekday" }, controller.signal),
          api.getChartSeries<SeriesPoint[]>({ ...baseParams, day_type: "weekend" }, controller.signal),
        ]);

        setSeries({
          level,
          territory_code: territoryCode,
          domain,
          year,
          weekday: toSeries12(wkdayPoints),
          weekend: toSeries12(wkendPoints),
        });
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error(e);
        setDailyError(e?.message || "Failed to load daily data");
        setSeries(null);
      } finally {
        setDailyLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [level, territoryCode, year, domain]);

  const chartData = useMemo(() => {
    if (!series) return [];
    return MONTHS.map(({ label }, idx) => ({
      month: label,
      weekday: series.weekday[idx] ?? 0,
      weekend: series.weekend[idx] ?? 0,
    }));
  }, [series]);

  return {
    series, // raw 12-value arrays
    chartData, // ready for recharts
    dailyLoading,
    dailyError,
  };
}
