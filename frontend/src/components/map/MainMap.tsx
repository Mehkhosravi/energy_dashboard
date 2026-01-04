// src/components/maps/MainMap.tsx
import { useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, Geometry } from "geojson";

import Legend from "../Legend";
import { useGeoData } from "./hooks/useGeoData";
import { useMapFilters } from "../contexts/MapFiltersContext";
import {
  scaleToBackendLevel,
  themeToBackendDomain,
  timeResolutionToBackendResolution,
  type BackendLevel,
} from "./hooks/mapFiltersToGeoArgs";

// ---------- Minimal helpers (same as TestMap) ----------
const PALETTE = ["#FFFFB2", "#FECC5C", "#FD8D3C", "#F03B20", "#BD0026", "#800026"];

function toNum(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
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

// ---- Code extractors (same as TestMap) ----
function getRegionCode(p: any): number | null {
  return (
    toNum(p?.COD_REG) ??
    toNum(p?.cod_reg) ??
    toNum(p?.REG_COD) ??
    toNum(p?.reg_cod) ??
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
    toNum(p?.id_prov) ??
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
    toNum(p?.id_mun) ??
    toNum(p?.id) ??
    null
  );
}

function codeForFeature(level: BackendLevel, p: any): number | null {
  if (level === "region") return getRegionCode(p);
  if (level === "province") return getProvinceCode(p);
  return getComuneCode(p);
}

function nameFor(level: BackendLevel, p: any): string {
  if (level === "region") return (p?.DEN_REG ?? p?.den_reg ?? p?.name ?? "").toString();
  if (level === "province") return (p?.DEN_UTS ?? p?.den_uts ?? p?.name ?? "").toString();
  return (p?.DEN_COM ?? p?.den_com ?? p?.name ?? "").toString();
}

export default function MainMap() {
  const { filters } = useMapFilters();

  // ✅ SINGLE SOURCE OF TRUTH (like TestMap)
  const level = useMemo(() => scaleToBackendLevel(filters.scale), [filters.scale]);
  const domain = useMemo(() => themeToBackendDomain(filters.theme), [filters.theme]);
  const resolution = useMemo(
    () => timeResolutionToBackendResolution(filters.timeResolution),
    [filters.timeResolution]
  );

  // Keep these as you do in your app (replace if you have state/URL params)
  const year = 2019;
  const scenario = 0;

  const { geo, valuesMap, loadingGeo, error, debug } = useGeoData({
    level,
    domain,
    resolution,
    year,
    scenario,
  });

  const breaks = useMemo(() => {
    const vals = Array.from(valuesMap.values());
    return quantileBreaks(vals, PALETTE.length);
  }, [valuesMap]);

  const style = (feature: any) => {
    const p = feature?.properties ?? {};
    const code = codeForFeature(level, p);
    const v = code != null ? valuesMap.get(code) : undefined;

    return {
      color: "rgba(0,0,0,0.25)",
      weight: level === "comune" ? 0.35 : 1,
      fillOpacity: 0.75,
      fillColor: colorForValue(v, breaks, PALETTE),
    };
  };

  const onEachFeature = (feature: Feature<Geometry, any>, layer: any) => {
    const p = feature?.properties ?? {};
    const nm = nameFor(level, p);
    const code = codeForFeature(level, p);
    const val = code != null ? valuesMap.get(code) : undefined;

    layer.on("click", () => {
      layer.bindPopup(
        `<div style="font-size:12px">
          <div><b>${nm || "—"}</b></div>
          <div>code: ${code ?? "—"}</div>
          <div>value: ${val ?? "—"}</div>
        </div>`
      );
      layer.openPopup();
    });
  };

  return (
    // <div style={{ height: "100%", width: "100%", position: "relative" }}>
    //   {/* Optional: tiny debug overlay (like TestMap) */}
    //   <div
    //     style={{
    //       position: "absolute",
    //       bottom: 10,
    //       left: 10,
    //       zIndex: 2000,
    //       background: "white",
    //       border: "1px solid rgba(0,0,0,0.12)",
    //       borderRadius: 8,
    //       padding: 8,
    //       fontSize: 12,
    //       maxWidth: 360,
    //     }}
    //   >
    //     <div>filters.scale: {filters.scale} → level: {level}</div>
    //     <div>filters.theme: {filters.theme} → domain: {domain}</div>
    //     <div>filters.timeResolution: {filters.timeResolution} → resolution: {resolution}</div>
    //     <div>loading: {String(loadingGeo)} | error: {error ?? "—"}</div>
    //     <div>geo: {debug.geoFeatures} | values: {debug.valuesMapped}</div>
    //   </div>

    
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      {loadingGeo && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.75)",
            fontSize: 14,
            pointerEvents: "none",
          }}
        >
          Loading…
        </div>
      )}

      <MapContainer center={[41.9, 12.5]} zoom={6} style={{ height: "100%", width: "100%" }} preferCanvas>
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles © Esri"
        />

        {geo && (
          <GeoJSON
            // ✅ key forces proper rerender when filters change (same trick as TestMap)
            key={`${level}-${domain}-${resolution}`}
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
