// src/components/maps/MainMap.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import Legend from "../Legend";
import { useSelectedTerritory } from "../contexts/SelectedTerritoryContext";
import { useMapFilters } from "../contexts/MapFiltersContext";
import type { FeatureCollection, Feature, Geometry } from "geojson";

// -----------------------------
// Types
// -----------------------------
type BackendLevel = "region" | "province" | "comune";
type AnyFC = FeatureCollection<Geometry, any>;

/**
 * VALUES API sample (you gave):
 * region rows:   { cod_reg: 16, cod_prov: null, pro_com: null, value_mwh: ... }
 * province rows: { cod_reg: 20, cod_prov: 95,  pro_com: null, value_mwh: ... }
 * comune rows:   { cod_reg: 1,  cod_prov: 1,   pro_com: 1001, value_mwh: ... }
 */
type ValuesRow = {
  cod_reg: number | string | null;
  cod_prov: number | string | null;
  pro_com: number | string | null;
  value_mwh: number | null;
  name?: string | null;
};

// -----------------------------
// APIs
// -----------------------------
const GEO_API = "http://localhost:5000/map/territories";
const VALUES_API = "http://127.0.0.1:5000/charts/values";

// fixed for now (as you said)
const FIXED = {
  resolution: "annual",
  year: 2019,
  domain: "consumption",
  scenario: 0,
} as const;

const PALETTE = ["#FFFFB2", "#FECC5C", "#FD8D3C", "#F03B20", "#BD0026", "#800026"];

// -----------------------------
// Helpers
// -----------------------------
function toNum(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function simplifyFor(level: BackendLevel) {
  // geometry simplify only (doesn't affect codes)
  if (level === "region") return 0.02;
  if (level === "province") return 0.005;
  return 0.0025;
}

function quantileBreaks(values: number[], classes: number) {
  const sorted = [...values].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return [];
  const n = sorted.length;
  const b: number[] = [];
  for (let i = 0; i <= classes; i++) {
    const idx = Math.floor((i / classes) * (n - 1));
    b.push(sorted[idx]);
  }
  return b;
}

function colorForValue(v: number | null | undefined, breaks: number[], colors: string[]) {
  if (!Number.isFinite(v as number) || breaks.length < 2) return "#ccc";
  const val = v as number;

  for (let i = 0; i < breaks.length - 1; i++) {
    const from = breaks[i];
    const to = breaks[i + 1];

    if (i === breaks.length - 2) {
      if (val >= from && val <= to) return colors[i] ?? colors[colors.length - 1];
    } else if (val >= from && val < to) {
      return colors[i] ?? colors[colors.length - 1];
    }
  }
  return colors[colors.length - 1];
}

/**
 * ✅ IMPORTANT:
 * These extract the "join key" from GeoJSON feature.properties.
 * If these return null -> you will get matched=0 -> map shows gray.
 *
 * You MUST ensure these match the property names your /map/territories returns.
 */
function getRegionCode(p: any): number | null {
  // You said "for region by reg_cod" (so we include reg_cod too)
  return (
    toNum(p?.COD_REG) ??
    toNum(p?.cod_reg) ??
    toNum(p?.REG_COD) ??
    toNum(p?.reg_cod) ??
    toNum(p?.regcode) ??
    null
  );
}
function getProvinceCode(p: any): number | null {
  return (
    toNum(p?.COD_PROV) ??
    toNum(p?.cod_prov) ??
    toNum(p?.PROV_COD) ??
    toNum(p?.prov_cod) ??
    null
  );
}
function getComuneCode(p: any): number | null {
  return (
    toNum(p?.PRO_COM) ??
    toNum(p?.pro_com) ??
    toNum(p?.COD_COM) ??
    toNum(p?.cod_com) ??
    toNum(p?.ISTAT) ??
    toNum(p?.istat) ??
    toNum(p?.ISTAT_COM) ??
    toNum(p?.istat_com) ??
    null
  );
}

function codeForFeature(level: BackendLevel, p: any): number | null {
  if (level === "region") return getRegionCode(p);
  if (level === "province") return getProvinceCode(p);
  return getComuneCode(p);
}

function getNameFor(level: BackendLevel, p: any): string {
  if (level === "region") return (p?.DEN_REG ?? p?.den_reg ?? p?.name ?? "").toString();
  if (level === "province") return (p?.DEN_UTS ?? p?.den_uts ?? p?.name ?? "").toString();
  return (p?.DEN_COM ?? p?.den_com ?? p?.name ?? "").toString();
}

function backendLevelFromScale(scale: "region" | "province" | "municipality"): BackendLevel {
  // UI uses "municipality", backend uses "comune"
  return scale === "municipality" ? "comune" : scale;
}

function wantedCodeFromSelection(level: BackendLevel, sel: any): number | null {
  // SelectedTerritoryContext type:
  // codes: { reg: number; prov?: number; mun?: number }
  if (!sel?.codes) return null;
  if (level === "region") return typeof sel.codes.reg === "number" ? sel.codes.reg : null;
  if (level === "province") return typeof sel.codes.prov === "number" ? sel.codes.prov : null;
  return typeof sel.codes.mun === "number" ? sel.codes.mun : null;
}

// -----------------------------
// Fit-to-selection
// -----------------------------
function FitToSelection({
  geo,
  level,
  mapRef,
}: {
  geo: AnyFC | null;
  level: BackendLevel;
  mapRef: React.MutableRefObject<LeafletMap | null>;
}) {
  const map = useMap();
  const { selectedTerritory } = useSelectedTerritory();
  const lastSig = useRef<string>("");

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  useEffect(() => {
    if (!geo || !selectedTerritory) return;

    // SelectedTerritoryContext uses: "municipality"
    const selLevel: BackendLevel =
      selectedTerritory.level === "municipality"
        ? "comune"
        : (selectedTerritory.level as "region" | "province");

    // only fit when selection level == rendered level
    if (selLevel !== level) return;

    const wantedCode = wantedCodeFromSelection(level, selectedTerritory);
    if (wantedCode == null) return;

    const sig = `${level}:${wantedCode}`;
    if (sig === lastSig.current) return;

    const feat = (geo.features as any[]).find((f) => {
      const p = f?.properties ?? {};
      return codeForFeature(level, p) === wantedCode;
    });

    if (!feat) return;

    const bounds = L.geoJSON(feat).getBounds();
    if (bounds.isValid()) {
      // ✅ This is why municipality makes map "small":
      // a comune polygon is small => bounds small => zoom in a lot.
      // If you want, add maxZoom here:
      map.fitBounds(bounds, { padding: [20, 20] /*, maxZoom: 10 */ });
      lastSig.current = sig;
    }
  }, [geo, level, selectedTerritory, map]);

  return null;
}

// -----------------------------
// Main component
// -----------------------------
export default function MainMap() {
  const mapRef = useRef<LeafletMap | null>(null);

  const { selectedTerritory, setSelectedTerritory } = useSelectedTerritory();
  const { filters } = useMapFilters();

  /**
   * ✅ LEVEL DECISION:
   * - If user selected something in search:
   *   - region -> render region layer and fetch region geometry + region values
   *   - province -> render province layer and fetch province geometry + province values
   *   - municipality -> render comune layer and fetch comune geometry + comune values
   * - Otherwise use side panel scale (default province)
   *
   * This means: changing selectedTerritory DOES trigger refetch,
   * because it changes "level" which is dependency of both useEffects.
   */
  const level: BackendLevel = useMemo(() => {
    if (selectedTerritory?.level === "region") return "region";
    if (selectedTerritory?.level === "province") return "province";
    if (selectedTerritory?.level === "municipality") return "comune";
    return backendLevelFromScale(filters.scale);
  }, [selectedTerritory, filters.scale]);

  const [geo, setGeo] = useState<AnyFC | null>(null);

  /**
   * valuesMap is our JOIN TABLE in frontend:
   * Map<CODE, value_mwh>
   *
   * - region:   CODE = cod_reg (from values API)
   * - province: CODE = cod_prov
   * - comune:   CODE = pro_com
   *
   * Then for each geometry feature we extract CODE from feature.properties
   * and lookup value_mwh from valuesMap.
   */
  const [valuesMap, setValuesMap] = useState<Map<number, number>>(new Map());

  const [loadingGeo, setLoadingGeo] = useState(true);
  const [loadingVals, setLoadingVals] = useState(true);

  // --------------------------------
  // 1) Load geometry (borders)
  // --------------------------------
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoadingGeo(true);
      try {
        // TARGET:
        //   region:   /map/territories?level=region
        //   province: /map/territories?level=province
        //   comune:   /map/territories?level=comune
        const url = `${GEO_API}?level=${level}&simplify=${simplifyFor(level)}`;

        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Geo load failed: ${res.status}`);

        const fc = (await res.json()) as AnyFC;
        setGeo(fc);

        // DEBUG: print one feature properties keys (THIS TELLS YOU THE REAL JOIN KEY NAMES)
        const first = fc?.features?.[0] as any;
        if (first?.properties) {
          console.log(`[Geo] level=${level} sample properties keys:`, Object.keys(first.properties));
          console.log(`[Geo] level=${level} sample properties:`, first.properties);
        }
      } catch (e) {
        if ((e as any).name !== "AbortError") console.error(e);
        setGeo(null);
      } finally {
        setLoadingGeo(false);
      }
    })();

    return () => controller.abort();
  }, [level]);

  // --------------------------------
  // 2) Load values (value_mwh)
  // --------------------------------
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setLoadingVals(true);
      try {
        // TARGET:
        //   region:   /charts/values?level=region -> use cod_reg
        //   province: /charts/values?level=province -> use cod_prov
        //   comune:   /charts/values?level=comune -> use pro_com
        const qs = new URLSearchParams({
          level,
          resolution: FIXED.resolution,
          year: String(FIXED.year),
          domain: FIXED.domain,
          scenario: String(FIXED.scenario),
        });

        const url = `${VALUES_API}?${qs.toString()}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Values load failed: ${res.status}`);

        const rows = (await res.json()) as ValuesRow[];

        // DEBUG: show one row (this confirms the "values" join key you must use)
        console.log(`[Values] level=${level} sample row:`, rows?.[0]);

        const m = new Map<number, number>();

        for (const r of rows) {
          // TARGET based on your samples:
          // region:   code = r.cod_reg
          // province: code = r.cod_prov
          // comune:   code = r.pro_com
          const code =
            level === "region"
              ? toNum(r.cod_reg)
              : level === "province"
              ? toNum(r.cod_prov)
              : toNum(r.pro_com);

          const v = typeof r.value_mwh === "number" ? r.value_mwh : null;
          if (code == null || v == null || Number.isNaN(v)) continue;

          m.set(code, v);
        }

        setValuesMap(m);

        // DEBUG: print few codes from valuesMap
        const firstCodes = Array.from(m.keys()).slice(0, 10);
        console.log(`[Values] level=${level} codes sample:`, firstCodes);
      } catch (e) {
        if ((e as any).name !== "AbortError") console.error(e);
        setValuesMap(new Map());
      } finally {
        setLoadingVals(false);
      }
    })();

    return () => controller.abort();
  }, [level]);

  // --------------------------------
  // 3) Breaks for choropleth
  // --------------------------------
  const breaks = useMemo(() => {
    const vals = Array.from(valuesMap.values());
    return quantileBreaks(vals, PALETTE.length);
  }, [valuesMap]);

  // --------------------------------
  // 4) Debug JOIN result
  // --------------------------------
  useEffect(() => {
    if (!geo) return;

    let matched = 0;
    let firstUnmatched: any = null;

    for (const f of geo.features as any[]) {
      const p = f?.properties ?? {};
      const code = codeForFeature(level, p);

      if (code != null && valuesMap.has(code)) matched++;
      else if (!firstUnmatched) firstUnmatched = { code, props: p };
    }

    console.log(
      `[JOIN] level=${level} features=${geo.features.length} values=${valuesMap.size} matched=${matched}`
    );

    if (matched === 0 && firstUnmatched) {
      console.warn(`[JOIN] matched=0. Example feature code extracted:`, firstUnmatched.code);
      console.warn(
        `[JOIN] matched=0. Example feature props (keys):`,
        Object.keys(firstUnmatched.props || {})
      );
      console.warn(`[JOIN] matched=0. Example feature props:`, firstUnmatched.props);
      console.warn(
        `[JOIN] matched=0. This means codeForFeature() is reading the WRONG property name for ${level}.`
      );
    }
  }, [geo, valuesMap, level]);

  // --------------------------------
  // 5) Style uses JOIN:
  // --------------------------------
  const style = (feature: any) => {
    const p = feature?.properties ?? {};

    // TARGET:
    // region:   code = properties.COD_REG / reg_cod / ...
    // province: code = properties.COD_PROV / ...
    // comune:   code = properties.PRO_COM / ...
    const code = codeForFeature(level, p);

    // TARGET:
    // value = valuesMap.get(code) where valuesMap was built from value_mwh
    const v = code != null ? valuesMap.get(code) : undefined;

    const isSelected =
      (level === "region" && selectedTerritory?.level === "region" && selectedTerritory.codes?.reg === code) ||
      (level === "province" && selectedTerritory?.level === "province" && selectedTerritory.codes?.prov === code) ||
      (level === "comune" && selectedTerritory?.level === "municipality" && selectedTerritory.codes?.mun === code);

    return {
      color: isSelected ? "#000" : "#333",
      weight: isSelected ? 3 : 1,
      fillOpacity: isSelected ? 0.9 : 0.7,
      fillColor: colorForValue(v, breaks, PALETTE),
    };
  };

  const onEachFeature = (feature: Feature<Geometry, any>, layer: any) => {
    const p = feature?.properties ?? {};
    const name = getNameFor(level, p);
    const code = codeForFeature(level, p);

    if (name) {
      layer.bindTooltip(name, {
        permanent: level !== "comune",
        direction: "center",
        className: `${level}-label`,
      });
    }

    layer.on("click", () => {
      if (code == null) return;

      if (level === "region") {
        setSelectedTerritory({ level: "region", name, codes: { reg: code } });
      } else if (level === "province") {
        const reg = getRegionCode(p) ?? selectedTerritory?.codes?.reg ?? 0;
        setSelectedTerritory({ level: "province", name, codes: { reg, prov: code } });
      } else {
        const reg = getRegionCode(p) ?? selectedTerritory?.codes?.reg ?? 0;
        const prov = getProvinceCode(p) ?? selectedTerritory?.codes?.prov ?? 0;
        setSelectedTerritory({ level: "municipality", name, codes: { reg, prov, mun: code } });
      }

      mapRef.current?.fitBounds(layer.getBounds(), { padding: [20, 20] });
    });
  };

  const loading = loadingGeo || loadingVals || !geo;

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.7)",
            fontSize: 14,
          }}
        >
          Loading…
        </div>
      )}

      <MapContainer center={[41.9, 12.5]} zoom={6} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles © Esri"
        />

        {/* This is what causes municipality to zoom a lot (small bounds). */}
        <FitToSelection geo={geo} level={level} mapRef={mapRef} />

        {geo && (
          <GeoJSON
            key={level}
            data={geo as any}
            style={style as any}
            onEachFeature={onEachFeature as any}
          />
        )}

        {breaks.length > 1 && <Legend breaks={breaks} colors={PALETTE} />}
      </MapContainer>
    </div>
  );
}

