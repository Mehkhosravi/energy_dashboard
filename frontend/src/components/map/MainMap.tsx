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
 * ✅ Flexible values row:
 * backend might return cod_prov OR prov_cod, etc.
 */
type ValuesRow = {
  cod_reg?: number | string | null;
  reg_cod?: number | string | null;

  cod_prov?: number | string | null;
  prov_cod?: number | string | null;

  pro_com?: number | string | null;
  mun_cod?: number | string | null;
  cod_com?: number | string | null;

  value_mwh: number | string | null;
  name?: string | null;
};

// -----------------------------
// APIs
// -----------------------------
const GEO_API = "http://localhost:5000/map/territories";
const VALUES_API = "http://127.0.0.1:5000/charts/values";

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
  if (level === "region") return 0.02;
  if (level === "province") return 0.005;
  return 0.0025; // comune
}

const LEVEL_ZOOM = {
  region: { maxZoom: 8 },
  province: { maxZoom: 10 },
  comune: { maxZoom: 13 },
} as const;

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

// -----------------------------
// Code extractors (GeoJSON props)
// -----------------------------
function getRegionCode(p: any): number | null {
  return (
    toNum(p?.COD_REG) ??
    toNum(p?.cod_reg) ??
    toNum(p?.REG_COD) ??
    toNum(p?.reg_cod) ??
    toNum(p?.REGION_CODE) ??
    toNum(p?.region_code) ??
    toNum(p?.id_reg) ??
    toNum(p?.id) ??
    null
  );
}

function getProvinceCode(p: any): number | null {
  return (
    toNum(p?.COD_PROV) ??
    toNum(p?.cod_prov) ??
    toNum(p?.PROV_COD) ??
    toNum(p?.prov_cod) ??
    toNum(p?.COD_UTS) ??
    toNum(p?.cod_uts) ??
    toNum(p?.UTS_CODE) ??
    toNum(p?.uts_code) ??
    toNum(p?.id_prov) ??
    toNum(p?.province_id) ??
    toNum(p?.id) ??
    null
  );
}

function getComuneCode(p: any): number | null {
  return (
    toNum(p?.PRO_COM) ??
    toNum(p?.pro_com) ??
    toNum(p?.MUN_COD) ??
    toNum(p?.mun_cod) ??
    toNum(p?.COD_COM) ??
    toNum(p?.cod_com) ??
    toNum(p?.ISTAT) ??
    toNum(p?.istat) ??
    toNum(p?.ISTAT_COM) ??
    toNum(p?.istat_com) ??
    toNum(p?.id_mun) ??
    toNum(p?.municipality_id) ??
    toNum(p?.id) ??
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

// -----------------------------
// Scale normalization (compat with older "municipality")
// -----------------------------
function normalizeScale(scale: any): BackendLevel {
  if (scale === "municipality") return "comune";
  if (scale === "comune") return "comune";
  if (scale === "province") return "province";
  return "region";
}

// -----------------------------
// MapFilters -> backend params
// -----------------------------
function backendDomainFromTheme(theme: "consumption" | "production" | "future_potential") {
  return theme === "future_potential" ? "future_production" : theme;
}

function backendResolutionFromTimeResolution(
  r: "annual" | "monthly" | "daily" | "hourly"
): "annual" | "monthly" | "hourly" {
  if (r === "daily") return "monthly";
  return r;
}

// -----------------------------
// Fit-to-selection (for search-driven selection, etc.)
// -----------------------------
function wantedCodeFromSelection(level: BackendLevel, sel: any): number | null {
  if (!sel?.codes) return null;
  if (level === "region") return typeof sel.codes.reg === "number" ? sel.codes.reg : null;
  if (level === "province") return typeof sel.codes.prov === "number" ? sel.codes.prov : null;
  return typeof sel.codes.mun === "number" ? sel.codes.mun : null;
}

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

    // selection levels in your app can still be "municipality"
    const selLevel: BackendLevel =
      selectedTerritory.level === "municipality"
        ? "comune"
        : (selectedTerritory.level as "region" | "province");

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
      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: LEVEL_ZOOM[level].maxZoom,
      });
      lastSig.current = sig;
    }
  }, [geo, level, selectedTerritory, map]);

  return null;
}

// -----------------------------
// Auto switch level based on zoom (only when nothing is selected)
// -----------------------------
function ScaleFromZoom({
  activeLevel,
  onLevelChange,
}: {
  activeLevel: BackendLevel;
  onLevelChange: (lvl: BackendLevel) => void;
}) {
  const map = useMap();
  const { selectedTerritory } = useSelectedTerritory();

  useEffect(() => {
    const handler = () => {
      // ✅ do not auto-switch while user has a selection (prevents fights)
      if (selectedTerritory) return;

      const z = map.getZoom();
      const next: BackendLevel = z >= 11 ? "comune" : z >= 8 ? "province" : "region";
      if (next !== activeLevel) onLevelChange(next);
    };

    map.on("zoomend", handler);
    return () => {
      map.off("zoomend", handler);
    };
  }, [map, activeLevel, onLevelChange, selectedTerritory]);

  return null;
}

// -----------------------------
// Main component
// -----------------------------
export default function MainMap() {
  const mapRef = useRef<LeafletMap | null>(null);

  const { selectedTerritory, setSelectedTerritory } = useSelectedTerritory();
  const { filters, setScale } = useMapFilters();

  /**
   * ✅ Map layer level should be controlled by filters.scale only.
   * (Selection should NOT override and cause unexpected reloads.)
   */
  const level: BackendLevel = useMemo(() => normalizeScale(filters.scale), [filters.scale]);

  const backendDomain = useMemo(() => backendDomainFromTheme(filters.theme), [filters.theme]);
  const backendResolution = useMemo(
    () => backendResolutionFromTimeResolution(filters.timeResolution),
    [filters.timeResolution]
  );

  // Fixed for now (you can put these in filters later)
  const year = 2019;
  const scenario = 0;

  useEffect(() => {
    if (filters.timeResolution === "daily") {
      console.warn("[Map] 'daily' not supported by backend yet. Falling back to 'monthly'.");
    }
  }, [filters.timeResolution]);

  const [geo, setGeo] = useState<AnyFC | null>(null);
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
        const url = `${GEO_API}?level=${level}&simplify=${simplifyFor(level)}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Geo load failed: ${res.status}`);

        const fc = (await res.json()) as AnyFC;
        setGeo(fc);
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
        const qs = new URLSearchParams({
          level,
          resolution: backendResolution,
          year: String(year),
          domain: backendDomain,
          scenario: String(scenario),
        });

        const url = `${VALUES_API}?${qs.toString()}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Values load failed: ${res.status}`);

        const rows = (await res.json()) as ValuesRow[];

        const m = new Map<number, number>();

        for (const r of rows) {
          const code =
            level === "region"
              ? toNum((r as any).cod_reg ?? (r as any).reg_cod)
              : level === "province"
              ? toNum((r as any).cod_prov ?? (r as any).prov_cod)
              : toNum((r as any).pro_com ?? (r as any).mun_cod ?? (r as any).cod_com);

          const v = typeof r.value_mwh === "number" ? r.value_mwh : toNum((r as any).value_mwh);

          if (code == null || v == null || Number.isNaN(v)) continue;
          m.set(code, v);
        }

        setValuesMap(m);
      } catch (e) {
        if ((e as any).name !== "AbortError") console.error(e);
        setValuesMap(new Map());
      } finally {
        setLoadingVals(false);
      }
    })();

    return () => controller.abort();
  }, [level, backendDomain, backendResolution, year, scenario]);

  // --------------------------------
  // 3) Breaks for choropleth
  // --------------------------------
  const breaks = useMemo(() => {
    const vals = Array.from(valuesMap.values());
    return quantileBreaks(vals, PALETTE.length);
  }, [valuesMap]);

  // --------------------------------
  // 4) Style uses JOIN
  // --------------------------------
  const style = (feature: any) => {
    const p = feature?.properties ?? {};
    const code = codeForFeature(level, p);
    const v = code != null ? valuesMap.get(code) : undefined;

    const isSelected =
      (level === "region" &&
        selectedTerritory?.level === "region" &&
        selectedTerritory.codes?.reg === code) ||
      (level === "province" &&
        selectedTerritory?.level === "province" &&
        selectedTerritory.codes?.prov === code) ||
      (level === "comune" &&
        selectedTerritory?.level === "municipality" &&
        selectedTerritory.codes?.mun === code);

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

      mapRef.current?.fitBounds(layer.getBounds(), {
        padding: [20, 20],
        maxZoom: LEVEL_ZOOM[level].maxZoom,
      });
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
            pointerEvents: "none", // ✅ IMPORTANT: don't block map interaction
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

        {/* ✅ Auto change level based on zoom (only when nothing is selected) */}
        <ScaleFromZoom
          activeLevel={level}
          onLevelChange={(lvl) => {
            // keep compatibility with your context values
            setScale(lvl === "comune" ? "municipality" : lvl);
          }}
        />

        {/* ✅ Fit when selection exists (search-driven or external selection) */}
        <FitToSelection geo={geo} level={level} mapRef={mapRef} />

        {geo && (
          <GeoJSON
            key={`${level}-${backendDomain}-${backendResolution}`} // safer re-mount when data changes
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
