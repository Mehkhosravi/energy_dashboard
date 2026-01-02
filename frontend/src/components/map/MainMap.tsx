// src/components/maps/MainMap.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, Geometry } from "geojson";

import Legend from "../Legend";
import { useSelectedTerritory } from "../contexts/SelectedTerritoryContext";
import { useMapFilters } from "../contexts/MapFiltersContext";

import MapRefBinder from "./utils/MapRefBinder";
import FitToSelection from "./utils/FitToSelection";
import { useGeoData } from "../../hooks/useGeoData";

// -----------------------------
// Types
// -----------------------------
type BackendLevel = "region" | "province" | "comune";

// -----------------------------
// Config
// -----------------------------
const PALETTE = ["#FFFFB2", "#FECC5C", "#FD8D3C", "#F03B20", "#BD0026", "#800026"];

const LEVEL_ZOOM: Record<BackendLevel, { maxZoom: number }> = {
  region: { maxZoom: 8 },
  province: { maxZoom: 10 },
  comune: { maxZoom: 13 },
};

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

function normalizeScale(scale: any): BackendLevel {
  if (scale === "municipality") return "comune";
  if (scale === "comune") return "comune";
  if (scale === "province") return "province";
  return "region";
}

function backendDomainFromTheme(theme: "consumption" | "production" | "future_potential") {
  return theme === "future_potential" ? "future_production" : theme;
}

function backendResolutionFromTimeResolution(
  r: "annual" | "monthly" | "daily" | "hourly"
): "annual" | "monthly" | "hourly" {
  if (r === "daily") return "monthly";
  return r;
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

// -----------------------------
// Feature accessors
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
// Main
// -----------------------------
export default function MainMap() {
  const mapRef = useRef<LeafletMap | null>(null);

  const { selectedTerritory, setSelectedTerritory } = useSelectedTerritory();
  const { filters, setScale } = useMapFilters();

  const level: BackendLevel = useMemo(() => normalizeScale(filters.scale), [filters.scale]);

  // keep scale synced with selection only in AUTO mode
  useEffect(() => {
    if (filters.scaleMode !== "auto") return;
    if (!selectedTerritory) return;

    const wantedScale =
      selectedTerritory.level === "municipality" ? "municipality" : selectedTerritory.level;

    if (filters.scale !== wantedScale) setScale(wantedScale);
  }, [filters.scaleMode, selectedTerritory, filters.scale, setScale]);

  const backendDomain = useMemo(() => backendDomainFromTheme(filters.theme), [filters.theme]);
  const backendResolution = useMemo(
    () => backendResolutionFromTimeResolution(filters.timeResolution),
    [filters.timeResolution]
  );

  const year = 2019;
  const scenario = 0;

  // ✅ All fetching is inside the hook
  const { geo, valuesMap, phase, error } = useGeoData({
    level,
    domain: backendDomain,
    resolution: backendResolution,
    year,
    scenario,
  });

  // force clean remount for GeoJSON when params change
  const [layerVersion, setLayerVersion] = useState(0);
  useEffect(() => {
    setLayerVersion((v) => v + 1);
  }, [level, backendDomain, backendResolution]);

  // clamp zoom when switching level
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const max = LEVEL_ZOOM[level].maxZoom;
    if (map.getZoom() > max) map.setZoom(max, { animate: true });
  }, [level]);

  const breaks = useMemo(() => {
    const vals = Array.from(valuesMap.values());
    return quantileBreaks(vals, PALETTE.length);
  }, [valuesMap]);

  const style = (feature: any) => {
    const p = feature?.properties ?? {};
    const code = codeForFeature(level, p);

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

    const isComune = level === "comune";
    const v = phase === "ready" && code != null ? valuesMap.get(code) : undefined;

    return {
      color: isSelected ? "#000" : isComune ? "rgba(0,0,0,0.12)" : "#333",
      weight: isSelected ? 2 : isComune ? 0.35 : 1,
      fillOpacity: isSelected ? 0.9 : isComune ? 0.75 : 0.7,
      fillColor: phase === "ready" ? colorForValue(v, breaks, PALETTE) : "#e0e0e0",
    };
  };

  const onEachFeature = (feature: Feature<Geometry, any>, layer: any) => {
    const p = feature?.properties ?? {};
    const name = getNameFor(level, p);
    const code = codeForFeature(level, p);

    // skip tooltips for comuni (performance)
    if (name && level !== "comune") {
      layer.bindTooltip(name, {
        permanent: true,
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
        const prov = getProvinceCode(p) ?? selectedTerritory?.codes?.prov;

        setSelectedTerritory({
          level: "municipality",
          name,
          codes: { reg, prov, mun: code },
          parent: {
            region: selectedTerritory?.parent?.region,
            province: selectedTerritory?.parent?.province,
          },
        });
      }
    });
  };

  const showOverlay =
    phase === "geo_loading" || phase === "values_loading" || phase === "error";

  const overlayText =
    phase === "geo_loading"
      ? "Loading geometry…"
      : phase === "values_loading"
      ? "Geometry ready — loading values…"
      : phase === "error"
      ? `Error: ${error ?? "unknown"}`
      : null;

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      {showOverlay && overlayText && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.85)",
            fontSize: 14,
            pointerEvents: "none",
            padding: 16,
            textAlign: "center",
          }}
        >
          <div>{overlayText}</div>
        </div>
      )}

      <MapContainer
        center={[41.9, 12.5]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        preferCanvas
      >
        <MapRefBinder mapRef={mapRef} />

        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles © Esri"
        />

        <FitToSelection geo={geo} level={level} mapRef={mapRef} />

        {geo && (
          <GeoJSON
            key={`${layerVersion}-${level}-${backendDomain}-${backendResolution}`}
            data={geo as any}
            style={style as any}
            onEachFeature={onEachFeature as any}
          />
        )}

        {phase === "ready" && breaks.length > 1 && <Legend breaks={breaks} colors={PALETTE} />}
      </MapContainer>
    </div>
  );
}
