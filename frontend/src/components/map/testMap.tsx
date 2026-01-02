// src/components/maps/TestMap.tsx
import { useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, Geometry } from "geojson";

import Legend from "../Legend";
import { useGeoData } from "../../hooks/useGeoData";

// ---------- Types ----------
type BackendLevel = "region" | "province" | "comune";

// ---------- Minimal helpers (only for visualization) ----------
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

// Code extractors (minimum viable: just to map valuesMap onto geo features)
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

// ---------- Component ----------
export default function TestMap() {
  // Simple UI controls so you can quickly verify all levels read correctly
  const [level, setLevel] = useState<BackendLevel>("region");
  const [domain, setDomain] = useState<string>("consumption");
  const [resolution, setResolution] = useState<"annual" | "monthly" | "hourly">("monthly");

  const year = 2019;
  const scenario = 0;

  const { geo, valuesMap, loading, error, debug } = useGeoData({
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

    // Lightweight popup only (tooltips are expensive especially on comuni)
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
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      {/* Debug + quick controls */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 2000,
          background: "white",
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 8,
          padding: 10,
          fontSize: 12,
          width: 340,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>TestMap — GeoData sanity check</div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 8, alignItems: "center" }}>
            <span>Level</span>
            <select value={level} onChange={(e) => setLevel(e.target.value as BackendLevel)}>
              <option value="region">region</option>
              <option value="province">province</option>
              <option value="comune">comune</option>
            </select>
          </label>

          <label style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 8, alignItems: "center" }}>
            <span>Domain</span>
            <select value={domain} onChange={(e) => setDomain(e.target.value)}>
              <option value="consumption">consumption</option>
              <option value="production">production</option>
              <option value="future_production">future_production</option>
            </select>
          </label>

          <label style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 8, alignItems: "center" }}>
            <span>Resolution</span>
            <select value={resolution} onChange={(e) => setResolution(e.target.value as any)}>
              <option value="annual">annual</option>
              <option value="monthly">monthly</option>
              <option value="hourly">hourly</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: 10, lineHeight: 1.4 }}>
          <div>loading: {String(loading)}</div>
          <div>error: {error ?? "—"}</div>
          <div>geo features: {debug.geoFeatures}</div>
          <div>values mapped: {debug.valuesMapped}</div>
        </div>

        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer" }}>URLs + samples</summary>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600 }}>Geo URL</div>
            <div style={{ wordBreak: "break-all" }}>{debug.geoUrl}</div>

            <div style={{ fontWeight: 600, marginTop: 8 }}>Values URL</div>
            <div style={{ wordBreak: "break-all" }}>{debug.valuesUrl}</div>

            <div style={{ fontWeight: 600, marginTop: 8 }}>Geo sample props (first 5)</div>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {JSON.stringify(debug.geoSampleProps, null, 2)}
            </pre>

            <div style={{ fontWeight: 600, marginTop: 8 }}>Values sample (first 5 pairs)</div>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {JSON.stringify(debug.valuesSamplePairs, null, 2)}
            </pre>
          </div>
        </details>
      </div>

      {/* Loading overlay */}
      {loading && (
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
