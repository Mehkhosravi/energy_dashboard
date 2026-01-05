// src/hooks/useMonthlyData.ts
import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:5000";

// ✅ Backend uses "comune"
export type BackendLevel = "region" | "province" | "comune";

export type SeriesPoint = { x: number; value_mwh: number };

export type CombinedChartPoint = {
  month: string; // "Jan".."Dec"

  // totals (GWh)
  totalConsumption?: number;
  totalProduction?: number;

  // production breakdown (stacked bars) (GWh)
  solar?: number;
  wind?: number;
  hydroelectric?: number;
  geothermal?: number;
  biomass?: number;

  // consumption breakdown (lines) (GWh)
  residential?: number;
  primary?: number;
  secondary?: number;
  tertiary?: number;
};

const MONTH_LABELS = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
];

function mwhToGwh(mwh: number): number {
  return mwh / 1000;
}

function buildSeriesUrl(params: Record<string, string | number | undefined>) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    usp.set(k, String(v));
  });
  return `${API_BASE}/charts/series?${usp.toString()}`;
}

async function fetchSeries(url: string, signal: AbortSignal): Promise<SeriesPoint[]> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Failed: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`
    );
  }
  const json = (await res.json()) as SeriesPoint[];
  return Array.isArray(json) ? json : [];
}

// ✅ backend param names confirmed by you
function codeParamKey(level: BackendLevel): "region_code" | "province_code" | "comune_code" {
  if (level === "region") return "region_code";
  if (level === "province") return "province_code";
  return "comune_code";
}

export default function useMonthlyData(
  level: BackendLevel,
  territoryCode: number | null | undefined,
  year: number,
  scenario = 0
) {
  const [data, setData] = useState<CombinedChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasTerritory = !!territoryCode;

  const empty = useMemo<CombinedChartPoint[]>(
    () =>
      MONTH_LABELS.map((m) => ({
        month: m,
        totalConsumption: 0,
        totalProduction: 0,
        solar: 0,
        wind: 0,
        hydroelectric: 0,
        geothermal: 0,
        biomass: 0,
        residential: 0,
        primary: 0,
        secondary: 0,
        tertiary: 0,
      })),
    []
  );

  useEffect(() => {
    if (!territoryCode) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function run() {
      try {
        setLoading(true);
        setError(null);

        const key = codeParamKey(level);

        const baseParams: Record<string, string | number | undefined> = {
          level,
          resolution: "monthly",
          year,
          scenario,
          [key]: territoryCode,
        };

        // totals
        const totalConsUrl = buildSeriesUrl({
          ...baseParams,
          domain: "consumption",
        });

        const totalProdUrl = buildSeriesUrl({
          ...baseParams,
          domain: "production",
        });

        // consumption categories
        const consResidentialUrl = buildSeriesUrl({
          ...baseParams,
          domain: "consumption",
          category_code: "cons_domestic",
        });

        const consPrimaryUrl = buildSeriesUrl({
          ...baseParams,
          domain: "consumption",
          category_code: "cons_primary",
        });

        const consSecondaryUrl = buildSeriesUrl({
          ...baseParams,
          domain: "consumption",
          category_code: "cons_secondary",
        });

        const consTertiaryUrl = buildSeriesUrl({
          ...baseParams,
          domain: "consumption",
          category_code: "cons_tertiary",
        });

        // production base_groups
        const prodSolarUrl = buildSeriesUrl({
          ...baseParams,
          domain: "production",
          base_group: "solar",
        });

        const prodWindUrl = buildSeriesUrl({
          ...baseParams,
          domain: "production",
          base_group: "wind",
        });

        const prodHydroUrl = buildSeriesUrl({
          ...baseParams,
          domain: "production",
          base_group: "hydroelectric",
        });

        const prodGeoUrl = buildSeriesUrl({
          ...baseParams,
          domain: "production",
          base_group: "geothermal",
        });

        const prodBiomassUrl = buildSeriesUrl({
          ...baseParams,
          domain: "production",
          base_group: "biomass",
        });

        const [
          totalCons,
          totalProd,
          consResidential,
          consPrimary,
          consSecondary,
          consTertiary,
          prodSolar,
          prodWind,
          prodHydro,
          prodGeo,
          prodBiomass,
        ] = await Promise.all([
          fetchSeries(totalConsUrl, controller.signal),
          fetchSeries(totalProdUrl, controller.signal),
          fetchSeries(consResidentialUrl, controller.signal),
          fetchSeries(consPrimaryUrl, controller.signal),
          fetchSeries(consSecondaryUrl, controller.signal),
          fetchSeries(consTertiaryUrl, controller.signal),
          fetchSeries(prodSolarUrl, controller.signal),
          fetchSeries(prodWindUrl, controller.signal),
          fetchSeries(prodHydroUrl, controller.signal),
          fetchSeries(prodGeoUrl, controller.signal),
          fetchSeries(prodBiomassUrl, controller.signal),
        ]);

        const byMonth = new Map<number, CombinedChartPoint>();
        for (let i = 1; i <= 12; i++) byMonth.set(i, { ...empty[i - 1] });

        const apply = (series: SeriesPoint[], key: keyof CombinedChartPoint) => {
          for (const p of series) {
            const m = p.x; // 1..12
            const row = byMonth.get(m);
            if (!row) continue;
            (row[key] as number) = mwhToGwh(p.value_mwh ?? 0);
          }
        };

        apply(totalCons, "totalConsumption");
        apply(totalProd, "totalProduction");

        apply(consResidential, "residential");
        apply(consPrimary, "primary");
        apply(consSecondary, "secondary");
        apply(consTertiary, "tertiary");

        apply(prodSolar, "solar");
        apply(prodWind, "wind");
        apply(prodHydro, "hydroelectric");
        apply(prodGeo, "geothermal");
        apply(prodBiomass, "biomass");

        setData(Array.from(byMonth.values()));
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Failed to load monthly series");
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    run();
    return () => controller.abort();
  }, [level, territoryCode, year, scenario, empty]);

  return { data, loading, error, hasTerritory };
}
