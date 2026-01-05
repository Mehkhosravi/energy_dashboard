// src/hooks/useHourlyData.ts
import { useEffect, useMemo, useState } from "react";
import { useSelectedTerritory } from "../components/contexts/SelectedTerritoryContext";
import { api } from "../api/client";
import type { ChartSeriesPoint } from "../api/client";

export type DayType = "weekday" | "weekend";

export type HourlyPoint = {
  hour: number; // 0..23
  value_mwh: number;
};

type Domain = "consumption" | "production" | "future_production";

type UseHourlyDataArgs = {
  year: number;
  scenario: number;
  domain?: Domain;
  dayType?: DayType;
  month?: number; // 1..12 (optional)
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

type BackendLevel = "region" | "province" | "comune";

function toBackendLevel(frontendLevel: string): BackendLevel {
  if (frontendLevel === "municipality") return "comune";
  if (frontendLevel === "comune") return "comune";
  if (frontendLevel === "province") return "province";
  return "region";
}

// ✅ FIX: backend expects `comune` for municipality/comune level
type TerritoryParam =
  | { ok: true; key: "region_code" | "province_code" | "comune"; value: number | string }
  | { ok: false; message: string };

function getTerritoryParam(selectedTerritory: any): TerritoryParam {
  if (!selectedTerritory) return { ok: false, message: "No territory selected." };

  const level = selectedTerritory.level as string;
  const codes = selectedTerritory.codes ?? {};

  if (level === "region") {
    const reg = codes.reg ?? codes.reg_cod ?? codes.region_code;
    if (reg == null) return { ok: false, message: "Missing region code in selected territory." };
    return { ok: true, key: "region_code", value: reg };
  }

  if (level === "province") {
    const prov = codes.prov ?? codes.prov_cod ?? codes.province_code;
    if (prov == null) return { ok: false, message: "Missing province code in selected territory." };
    return { ok: true, key: "province_code", value: prov };
  }

  // municipality / comune
  const mun = codes.mun ?? codes.mun_cod ?? codes.municipality_code ?? codes.comune;
  if (mun == null) return { ok: false, message: "Missing municipality code in selected territory." };

  // 🔥 This is the important change:
  // backend wants ?comune=<id>
  return { ok: true, key: "comune", value: mun };
}

export function useHourlyData({
  year,
  scenario,
  domain = "consumption",
  dayType,
  month,
}: UseHourlyDataArgs) {
  const { selectedTerritory } = useSelectedTerritory();

  const [data, setData] = useState<HourlyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestShape = useMemo(() => {
    if (!selectedTerritory) return null;

    const level = toBackendLevel(selectedTerritory.level);
    const tp = getTerritoryParam(selectedTerritory);

    return { level, tp };
  }, [selectedTerritory]);

  useEffect(() => {
    if (!requestShape) {
      setData([]);
      setError(null);
      return;
    }

    const { level, tp } = requestShape;

    if (!tp.ok) {
      setData([]);
      setError(tp.message);
      return;
    }

    if (month != null && (month < 1 || month > 12)) {
      setData([]);
      setError("Invalid month (must be 1..12).");
      return;
    }

    const controller = new AbortController();

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const params: Record<string, any> = {
          level,
          resolution: "hourly",
          domain,
          year,
          scenario,
        };

        // ✅ set correct territory param
        params[tp.key] = tp.value;

        // ✅ optional filters
        if (dayType) params.day_type = dayType;
        if (month != null) params.month = month;

        // ✅ EXTRA COMPAT (optional but helps if backend still supports old keys somewhere)
        // if level is comune, also send a couple aliases. Backend can ignore extras.
        if (level === "comune") {
          params.municipality_code = tp.value;
          params.mun_cod = tp.value;
        }

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
  }, [requestShape, year, scenario, domain, dayType, month]);

  return { data, loading, error };
}
