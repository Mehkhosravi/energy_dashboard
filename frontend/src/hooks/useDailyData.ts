// src/hooks/useDailyData.ts
import { useEffect, useMemo, useState } from "react";

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

type DayType = "weekday" | "weekend";
type Domain = "consumption" | "production";

export type SeriesPoint = {
  x: number; // 1..12 (month)
  value_mwh: number;
};

export type ProvinceMonthlySeries = {
  province_code: number;
  domain: Domain;
  year: number;
  weekday: number[]; // length 12
  weekend: number[]; // length 12
};

const API_BASE = "http://localhost:5000";

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

async function fetchProvinceSeries(params: {
  level: "province";
  resolution: "monthly";
  domain: Domain;
  year: number;
  province_code: number;
  day_type: DayType;
}): Promise<SeriesPoint[]> {
  const url = new URL(`${API_BASE}/charts/series`);
  url.searchParams.set("level", params.level);
  url.searchParams.set("resolution", params.resolution);
  url.searchParams.set("domain", params.domain);
  url.searchParams.set("year", String(params.year));
  url.searchParams.set("province_code", String(params.province_code));
  url.searchParams.set("day_type", params.day_type);
  console.log("REQUEST:", url.toString());

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed /charts/series (${params.domain}, ${params.day_type}) ${res.status} ${text}`
    );
  }

  return (await res.json()) as SeriesPoint[];
}

export function useDailyData(
  provinceCode?: number | null,
  options?: { year?: number; domain?: Domain }
) {
  const year = options?.year ?? 2019;
  const domain = options?.domain ?? "consumption";

  const [series, setSeries] = useState<ProvinceMonthlySeries | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  useEffect(() => {
    if (!provinceCode) {
      setSeries(null);
      setDailyError(null);
      setDailyLoading(false);
      return;
    }

    const run = async () => {
      try {
        setDailyLoading(true);
        setDailyError(null);

        const [wkdayPoints, wkendPoints] = await Promise.all([
          fetchProvinceSeries({
            level: "province",
            resolution: "monthly",
            domain,
            year,
            province_code: provinceCode,
            day_type: "weekday",
          }),
          fetchProvinceSeries({
            level: "province",
            resolution: "monthly",
            domain,
            year,
            province_code: provinceCode,
            day_type: "weekend",
          }),
        ]);

        setSeries({
          province_code: provinceCode,
          domain,
          year,
          weekday: toSeries12(wkdayPoints),
          weekend: toSeries12(wkendPoints),
        });
      } catch (e: any) {
        console.error(e);
        setDailyError(e?.message || "Failed to load daily data");
        setSeries(null);
      } finally {
        setDailyLoading(false);
      }
    };

    run();
  }, [provinceCode, year, domain]);

  const chartData = useMemo(() => {
    if (!series) return [];
    return MONTHS.map(({ label }, idx) => ({
      month: label,
      weekday: series.weekday[idx] ?? 0,
      weekend: series.weekend[idx] ?? 0,
    }));
  }, [series]);

  return {
    series,        // raw 12-value arrays
    chartData,     // ready for recharts
    dailyLoading,
    dailyError,
  };
}
