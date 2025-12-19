// src/hooks/useHourlyData.ts
import { useEffect, useMemo, useState } from "react";
import { useSelectedTerritory } from "../components/contexts/SelectedTerritoryContext";
import { api } from "../api/client";
import type { ChartSeriesPoint } from "../api/client";

export type DayType = "weekday" | "weekend";

export type HourlyPoint = {
  hour: number;      // 0..23
  value_mwh: number;
};

type UseHourlyDataArgs = {
  year: number;
  scenario: number;
  domain?: "consumption" | "production" | "future_production";
  dayType?: DayType;
};

function toNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : null;
}

function normalizeHourlySeries(raw: any): HourlyPoint[] {
  if (!Array.isArray(raw)) return [];

  const byHour = new Map<number, number>();
  for (const r of raw as ChartSeriesPoint[]) {
    const x = toNumber((r as any)?.x);
    const v = toNumber((r as any)?.value_mwh);
    if (x == null || v == null) continue;

    const hour = x - 1; // 1..24 -> 0..23
    if (hour >= 0 && hour <= 23) byHour.set(hour, v);
  }

  const full: HourlyPoint[] = [];
  for (let h = 0; h < 24; h++) full.push({ hour: h, value_mwh: byHour.get(h) ?? 0 });
  return full;
}

function backendLevel(level: string) {
  return level === "municipality" ? "comune" : level;
}

export function useHourlyData({
  year,
  scenario,
  domain = "consumption",
  dayType,
}: UseHourlyDataArgs) {
  const { selectedTerritory } = useSelectedTerritory();

  const [data, setData] = useState<HourlyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const territoryParam = useMemo(() => {
    if (!selectedTerritory) return null;

    if (selectedTerritory.level === "region") {
      return { key: "region_code", value: selectedTerritory.codes.reg };
    }
    if (selectedTerritory.level === "province") {
      return { key: "province_code", value: selectedTerritory.codes.prov ?? null };
    }
    // comune OR municipality
    return { key: "municipality_code", value: selectedTerritory.codes.mun ?? null };
  }, [selectedTerritory]);

  useEffect(() => {
    if (!selectedTerritory) {
      setData([]);
      setError(null);
      return;
    }
    if (!territoryParam || territoryParam.value == null) {
      setData([]);
      setError("No valid territory code found for the selected territory.");
      return;
    }

    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const params: Record<string, any> = {
          level: backendLevel(selectedTerritory.level),
          resolution: "hourly",
          domain,
          year,
          scenario,
          [territoryParam.key]: territoryParam.value,
        };

        if (dayType) params.day_type = dayType;

        const res = await api.getChartSeries<ChartSeriesPoint[]>(
          params,
          controller.signal
        );

        setData(normalizeHourlySeries(res));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message ?? "Failed to load hourly series");
        setData([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [
    selectedTerritory,
    territoryParam?.key,
    territoryParam?.value,
    year,
    scenario,
    domain,
    dayType,
  ]);

  return { data, loading, error };
}
