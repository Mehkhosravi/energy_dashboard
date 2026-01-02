// src/components/maps/hooks/useGeoData.ts
import { useEffect, useMemo, useRef, useState } from "react";
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
  return 0.01;
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
  domain: string;
  resolution: "annual" | "monthly" | "hourly";
  year: number;
  scenario: number;
};

export type UseGeoDataResult = {
  geo: AnyFC | null;
  valuesMap: Map<number, number>;

  // phases: control what to show
  phase: "idle" | "geo_loading" | "geo_ready" | "values_loading" | "ready" | "error";

  loadingGeo: boolean;
  loadingValues: boolean;
  error: string | null;

  debug: {
    geoUrl: string;
    valuesUrl: string;
    geoFeatures: number;
    valuesMapped: number;
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
  const [loadingValues, setLoadingValues] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<UseGeoDataResult["phase"]>("idle");

  // monotonically increasing request id to ignore stale responses
  const reqIdRef = useRef(0);

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

  // ✅ Ordered pipeline: geo -> render -> values -> recolor
  useEffect(() => {
    const controller = new AbortController();
    const myReqId = ++reqIdRef.current;

    (async () => {
      // reset for a clean run
      setError(null);
      setGeo(null);
      setValuesMap(new Map());

      setLoadingGeo(true);
      setLoadingValues(false);
      setPhase("geo_loading");

      try {
        console.log("[PIPE] geo:", geoUrl);
        const resGeo = await fetch(geoUrl, { signal: controller.signal });
        if (!resGeo.ok) throw new Error(`Geo load failed: ${resGeo.status}`);

        const fc = (await resGeo.json()) as AnyFC;

        // ignore stale responses
        if (reqIdRef.current !== myReqId) return;

        setGeo(fc);
        setLoadingGeo(false);
        setPhase("geo_ready");

        // Now fetch values (after geo is visible)
        setLoadingValues(true);
        setPhase("values_loading");

        console.log("[PIPE] values:", valuesUrl);
        const resVals = await fetch(valuesUrl, { signal: controller.signal });
        if (!resVals.ok) throw new Error(`Values load failed: ${resVals.status}`);

        const rows = (await resVals.json()) as ValuesRow[];
        const m = new Map<number, number>();
        for (const r of rows) {
          const code = codeFromValuesRow(level, r);
          const val = valueFromRow(r);
          if (code == null || val == null) continue;
          m.set(code, val);
        }

        if (reqIdRef.current !== myReqId) return;

        setValuesMap(m);
        setLoadingValues(false);
        setPhase("ready");
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        console.error(e);

        if (reqIdRef.current !== myReqId) return;

        setError(e?.message ?? "Fetch error");
        setLoadingGeo(false);
        setLoadingValues(false);
        setPhase("error");
      }
    })();

    return () => controller.abort();
  }, [geoUrl, valuesUrl, level]);

  const debug = useMemo(() => {
    const geoFeatures = geo?.features?.length ?? 0;
    const valuesMapped = valuesMap.size;

    const geoSampleProps = (geo?.features ?? [])
      .slice(0, 5)
      .map((f: any) => f?.properties ?? {});

    const valuesSamplePairs = Array.from(valuesMap.entries())
      .slice(0, 5)
      .map(([code, value]) => ({ code, value }));

    return {
      geoUrl,
      valuesUrl,
      geoFeatures,
      valuesMapped,
      geoSampleProps,
      valuesSamplePairs,
    };
  }, [geo, valuesMap, geoUrl, valuesUrl]);

  return {
    geo,
    valuesMap,
    phase,
    loadingGeo,
    loadingValues,
    error,
    debug,
  };
}
