// src/components/maps/FitToSelection.tsx
import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";

import { useSelectedTerritory } from "../../contexts/SelectedTerritoryContext";

// keep local type to avoid circular deps
type BackendLevel = "region" | "province" | "comune";
type AnyFC = GeoJSON.FeatureCollection<GeoJSON.Geometry, any>;

function toNum(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// ---- code extractors (same logic as MainMap) ----
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

function wantedCodeFromSelection(level: BackendLevel, sel: any): number | null {
  if (!sel?.codes) return null;
  if (level === "region") return toNum(sel.codes.reg);
  if (level === "province") return toNum(sel.codes.prov);
  return toNum(sel.codes.mun);
}

// ---- Component ----
export default function FitToSelection({
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

  // prevents refitting on every render
  const lastSig = useRef<string>("");

  // ensure ref is always set
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  useEffect(() => {
    if (!geo || !selectedTerritory) return;

    const selLevel: BackendLevel =
      selectedTerritory.level === "municipality"
        ? "comune"
        : selectedTerritory.level;

    if (selLevel !== level) return;

    const wantedCode = wantedCodeFromSelection(level, selectedTerritory);
    if (wantedCode == null) return;

    const sig = `${level}:${wantedCode}`;
    if (sig === lastSig.current) return;

    const feat = geo.features.find((f: any) => {
      const p = f?.properties ?? {};
      return codeForFeature(level, p) === wantedCode;
    });

    if (!feat) return;

    const bounds = L.geoJSON(feat).getBounds();
    if (!bounds.isValid()) return;

    map.fitBounds(bounds, { padding: [20, 20] });
    lastSig.current = sig;
  }, [geo, level, selectedTerritory, map]);

  return null;
}
