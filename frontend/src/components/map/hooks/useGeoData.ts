import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";
import { getJSON } from "../../../api/client";

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

function normalizeLevel(level: unknown): BackendLevel | null {
  if (level === "region" || level === "province" || level === "comune") return level;

  // common frontend label → backend label
  if (level === "municipality") return "comune";

  // allow string-ish values
  if (typeof level === "string") {
    const v = level.trim().toLowerCase();
    if (v === "region") return "region";
    if (v === "province") return "province";
    if (v === "comune") return "comune";
    if (v === "municipality") return "comune";
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
  // 🔥 changed: tolerate runtime undefined / UI labels
  level: BackendLevel | "municipality" | string | null | undefined;

  domain: string;
  resolution: "annual" | "monthly" | "hourly";
  year: number;
  scenario: number;
  baseGroup?: string | null;
};

export type UseGeoDataResult = {
  geo: AnyFC | null;
  valuesMap: Map<number, number>;

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
  baseGroup,
}: UseGeoDataArgs): UseGeoDataResult {
  const normalizedLevel = useMemo(() => normalizeLevel(level), [level]);
  const enabled = normalizedLevel != null;

  const [geo, setGeo] = useState<AnyFC | null>(null);
  const [valuesMap, setValuesMap] = useState<Map<number, number>>(new Map());

  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingValues, setLoadingValues] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [phase, setPhase] = useState<UseGeoDataResult["phase"]>("idle");

  // monotonically increasing request id to ignore stale responses
  const reqIdRef = useRef(0);

  const geoUrl = useMemo(() => {
    if (!normalizedLevel) return "";
    const qs = new URLSearchParams({
      level: normalizedLevel,
      simplify: String(simplifyFor(normalizedLevel)),
    });
    return `${GEO_API}?${qs.toString()}`;
  }, [normalizedLevel]);

  const valuesUrl = useMemo(() => {
    if (!normalizedLevel) return "";
    const qs = new URLSearchParams({
      level: normalizedLevel,
      resolution,
      year: String(year),
      domain,
      scenario: String(scenario),
    });
    if (baseGroup) {
      qs.append("base_group", baseGroup);
    }
    return `${VALUES_API}?${qs.toString()}`;
  }, [normalizedLevel, resolution, year, domain, scenario, baseGroup]);

  // ✅ Ordered pipeline: geo -> render -> values -> recolor
  useEffect(() => {
    // 🔥 HARD GUARD: never fetch with invalid level
    if (!enabled) {
      // Do not nuke existing data; just go idle.
      setLoadingGeo(false);
      setLoadingValues(false);
      setPhase("idle");
      setError(null);

      console.warn("[PIPE] skip: invalid level", { level, normalizedLevel });
      return;
    }

    const controller = new AbortController();
    const myReqId = ++reqIdRef.current;

    (async () => {
      // reset for a clean run (only when enabled)
      setError(null);
      setGeo(null);
      setValuesMap(new Map());

      setLoadingGeo(true);
      setLoadingValues(false);
      setPhase("geo_loading");

      try {
        console.log("[PIPE] geo:", geoUrl);
        // Replace fetch with getJSON
        const fc = await getJSON<AnyFC>(geoUrl);

        // ignore stale responses
        if (reqIdRef.current !== myReqId) return;

        setGeo(fc);
        setLoadingGeo(false);
        setPhase("geo_ready");

        // Now fetch values (after geo is visible)
        setLoadingValues(true);
        setPhase("values_loading");

        console.log("[PIPE] values:", valuesUrl);
        const rows = await getJSON<ValuesRow[]>(valuesUrl);
        const m = new Map<number, number>();

        for (const r of rows) {
          const code = codeFromValuesRow(normalizedLevel, r);
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
    // important: geoUrl/valuesUrl already encode normalizedLevel
  }, [enabled, geoUrl, valuesUrl, level, normalizedLevel]);

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
