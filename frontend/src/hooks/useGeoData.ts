// src/components/maps/hooks/useGeoData.ts
import { useEffect, useMemo, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";

type BackendLevel = "region" | "province" | "comune";

type AnyFC = FeatureCollection<Geometry, any>;

type ValuesRow = {
  cod_reg?: number | string | null;
  reg_cod?: number | string | null;

  cod_prov?: number | string | null;
  prov_cod?: number | string | null;

  pro_com?: number | string | null;
  mun_cod?: number | string | null;
  cod_com?: number | string | null;

  value_mwh: number | string | null;
};

const GEO_API = "http://localhost:5000/map/territories";
const VALUES_API = "http://127.0.0.1:5000/charts/values";

// keep simple: only the bits required to prove "data is readable"
function toNum(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function simplifyFor(level: BackendLevel) {
  if (level === "region") return 0.02;
  if (level === "province") return 0.005;
  return 0.01; // comune (all Italy can be heavy)
}

function codeFromValuesRow(level: BackendLevel, r: ValuesRow): number | null {
  if (level === "region") return toNum((r as any).cod_reg ?? (r as any).reg_cod);
  if (level === "province") return toNum((r as any).cod_prov ?? (r as any).prov_cod);
  return toNum((r as any).pro_com ?? (r as any).mun_cod ?? (r as any).cod_com);
}

function valueFromRow(r: ValuesRow): number | null {
  if (typeof r.value_mwh === "number") return Number.isFinite(r.value_mwh) ? r.value_mwh : null;
  return toNum(r.value_mwh);
}

export type UseGeoDataArgs = {
  level: BackendLevel;
  domain: string; // "consumption" | "production" | ...
  resolution: "annual" | "monthly" | "hourly";
  year: number;
  scenario: number;
};

export type UseGeoDataResult = {
  geo: AnyFC | null;
  valuesMap: Map<number, number>;

  loading: boolean;
  error: string | null;

  // 👇 what you asked for: easy proof that whole dataset can be read
  debug: {
    geoUrl: string;
    valuesUrl: string;

    geoFeatures: number;
    valuesRows: number;
    valuesMapped: number;

    // a few samples so you can sanity check quickly
    geoSampleProps: any[];
    valuesSamplePairs: Array<{ code: number; value: number }>;
  };
};

export function useGeoData({
  level,
  domain,
  resolution,
  year,
  scenario,
}: UseGeoDataArgs): UseGeoDataResult {
  const [geo, setGeo] = useState<AnyFC | null>(null);
  const [valuesMap, setValuesMap] = useState<Map<number, number>>(new Map());

  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingVals, setLoadingVals] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geoUrl = useMemo(() => {
    const qs = new URLSearchParams({
      level,
      simplify: String(simplifyFor(level)),
    });
    return `${GEO_API}?${qs.toString()}`;
  }, [level]);

  const valuesUrl = useMemo(() => {
    const qs = new URLSearchParams({
      level,
      resolution,
      year: String(year),
      domain,
      scenario: String(scenario),
    });
    return `${VALUES_API}?${qs.toString()}`;
  }, [level, resolution, year, domain, scenario]);

  // Fetch geometry
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoadingGeo(true);
      setError(null);
      try {
        console.log("[GeoFetch]", geoUrl);
        const res = await fetch(geoUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`Geo load failed: ${res.status}`);
        const fc = (await res.json()) as AnyFC;
        setGeo(fc);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error(e);
          setError(e?.message ?? "Geo fetch error");
          setGeo(null);
        }
      } finally {
        setLoadingGeo(false);
      }
    })();

    return () => controller.abort();
  }, [geoUrl]);

  // Fetch values
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoadingVals(true);
      setError(null);
      try {
        console.log("[ValuesFetch]", valuesUrl);
        const res = await fetch(valuesUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`Values load failed: ${res.status}`);

        const rows = (await res.json()) as ValuesRow[];
        const m = new Map<number, number>();

        for (const r of rows) {
          const code = codeFromValuesRow(level, r);
          const val = valueFromRow(r);
          if (code == null || val == null) continue;
          m.set(code, val);
        }

        setValuesMap(m);
      } catch (e: any) {
        if (e?.name !== "AbortError") {
          console.error(e);
          setError(e?.message ?? "Values fetch error");
          setValuesMap(new Map());
        }
      } finally {
        setLoadingVals(false);
      }
    })();

    return () => controller.abort();
  }, [valuesUrl, level]);

  const loading = loadingGeo || loadingVals;

  const debug = useMemo(() => {
    const geoFeatures = geo?.features?.length ?? 0;
    const valuesMapped = valuesMap.size;

    // for fast sanity checks:
    const geoSampleProps = (geo?.features ?? [])
      .slice(0, 5)
      .map((f: any) => f?.properties ?? {});

    const valuesSamplePairs = Array.from(valuesMap.entries())
      .slice(0, 5)
      .map(([code, value]) => ({ code, value }));

    // we can only know "valuesRows" if we store it; simplest is infer from mapped size
    // (mapped size <= rows count)
    return {
      geoUrl,
      valuesUrl,
      geoFeatures,
      valuesRows: -1, // intentionally omitted to keep state minimal
      valuesMapped,
      geoSampleProps,
      valuesSamplePairs,
    };
  }, [geo, valuesMap, geoUrl, valuesUrl]);

  return { geo, valuesMap, loading, error, debug };
}
