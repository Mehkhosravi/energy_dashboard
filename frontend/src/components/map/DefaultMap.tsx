// src/components/maps/MainMap.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { useSelectedTerritory } from "../contexts/SelectedTerritoryContext";
import type { FeatureCollection, Feature, Geometry } from "geojson";

// -----------------------------
// Config
// -----------------------------
type TerritoryLevel = "region" | "province" | "comune";
type AnyFC = FeatureCollection<Geometry, any>;

const GEO_API = "http://localhost:5000/map/territories";
const VALUES_API = "http://127.0.0.1:5000/charts/values";

// fixed for now (wire these later)
const FIXED = {
  resolution: "annual",
  year: 2019,
  domain: "consumption",
  scenario: 0,
} as const;

const PALETTE = ["#FFFFB2", "#FECC5C", "#FD8D3C", "#F03B20", "#BD0026", "#800026"];

// zoom → level logic
const Z_REGION_MAX = 6;
const Z_PROVINCE_MAX = 9;

function levelForZoom(z: number): TerritoryLevel {
  if (z <= Z_REGION_MAX) return "region";
  if (z <= Z_PROVINCE_MAX) return "province";
  return "comune";
}

function simplifyFor(level: TerritoryLevel) {
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

// -----------------------------
// Map behavior (zoom tracking + zoom-to-selected)
// -----------------------------
function MapBehavior({
  onZoomChange,
  currentGeo,
  currentLevel,
  mapRef,
}: {
  onZoomChange: (z: number) => void;
  currentGeo: AnyFC | null;
  currentLevel: TerritoryLevel;
  mapRef: React.MutableRefObject<LeafletMap | null>;
}) {
  const { selectedTerritory } = useSelectedTerritory();
  const lastFit = useRef<string>("");

  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  });

  // keep ref synced (no whenReady/whenCreated)
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  // zoom to searched territory (when geometry matches the selected level)
  useEffect(() => {
    if (!selectedTerritory || !currentGeo) return;
    if (selectedTerritory.level !== currentLevel) return;

    const sig = JSON.stringify(selectedTerritory);
    if (sig === lastFit.current) return;

    const code =
      selectedTerritory.level === "region"
        ? selectedTerritory.codes?.reg
        : selectedTerritory.level === "province"
        ? selectedTerritory.codes?.prov
        : selectedTerritory.codes?.mun;

    if (typeof code !== "number") return;

    const feature = currentGeo.features.find((f: any) => {
      const p = f.properties ?? {};
      return p.COD_REG === code || p.COD_PROV === code || p.PRO_COM === code;
    }) as Feature<Geometry> | undefined;

    if (!feature) return;

    const bounds = L.geoJSON(feature).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
      lastFit.current = sig;
    }
  }, [selectedTerritory, currentGeo, currentLevel, map]);

  return null;
}

// -----------------------------
// Main component
// -----------------------------
type ValuesRow = {
  cod_reg: number | null;
  cod_prov: number | null;
  pro_com: number | null;
  value_mwh: number | null;
  name?: string | null;
};

export default function MainMap() {
  const mapRef = useRef<LeafletMap | null>(null);
  const { selectedTerritory, setSelectedTerritory } = useSelectedTerritory();

  const [zoom, setZoom] = useState(6);
  const currentLevel = useMemo(() => levelForZoom(zoom), [zoom]);

  const [geo, setGeo] = useState<AnyFC | null>(null);
  const [valuesMap, setValuesMap] = useState<Map<number, number>>(new Map()); // code -> value
  const [loading, setLoading] = useState(true);

  // fetch geometry for current level
  useEffect(() => {
    const controller = new AbortController();
    async function loadGeo() {
      try {
        const url = `${GEO_API}?level=${currentLevel}&simplify=${simplifyFor(currentLevel)}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`GeoJSON load failed: ${res.status}`);
        setGeo(await res.json());
      } catch (e) {
        if ((e as any).name !== "AbortError") console.error(e);
        setGeo(null);
      }
    }
    loadGeo();
    return () => controller.abort();
  }, [currentLevel]);

  // fetch values for current level
  useEffect(() => {
    const controller = new AbortController();
    async function loadValues() {
      setLoading(true);
      try {
        const qs = new URLSearchParams({
          level: currentLevel,
          resolution: FIXED.resolution,
          year: String(FIXED.year),
          domain: FIXED.domain,
          scenario: String(FIXED.scenario),
        });

        const res = await fetch(`${VALUES_API}?${qs.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Values load failed: ${res.status}`);

        const rows = (await res.json()) as ValuesRow[];

        // Build code->value map based on level
        const m = new Map<number, number>();
        for (const r of rows) {
          const v = typeof r.value_mwh === "number" ? r.value_mwh : null;
          if (v == null || Number.isNaN(v)) continue;

          const code =
            currentLevel === "region"
              ? r.cod_reg
              : currentLevel === "province"
              ? r.cod_prov
              : r.pro_com;

          if (typeof code === "number") m.set(code, v);
        }

        setValuesMap(m);
      } catch (e) {
        if ((e as any).name !== "AbortError") console.error(e);
        setValuesMap(new Map());
      } finally {
        setLoading(false);
      }
    }

    loadValues();
    return () => controller.abort();
  }, [currentLevel]);

  // compute breaks from returned values
  const breaks = useMemo(() => {
    const vals = Array.from(valuesMap.values());
    return quantileBreaks(vals, PALETTE.length);
  }, [valuesMap]);

  const style = (feature: any) => {
    const p = feature?.properties ?? {};

    const code =
      currentLevel === "region"
        ? p.COD_REG
        : currentLevel === "province"
        ? p.COD_PROV
        : p.PRO_COM;

    const v = typeof code === "number" ? valuesMap.get(code) : undefined;

    const isSelected =
      (currentLevel === "region" && selectedTerritory?.codes?.reg === p.COD_REG) ||
      (currentLevel === "province" && selectedTerritory?.codes?.prov === p.COD_PROV) ||
      (currentLevel === "comune" && selectedTerritory?.codes?.mun === p.PRO_COM);

    return {
      color: isSelected ? "#000" : "#333",
      weight: isSelected ? 3 : 1,
      fillOpacity: 0.75,
      fillColor: colorForValue(v, breaks, PALETTE),
    };
  };

  const onEachFeature = (feature: Feature<Geometry, any>, layer: any) => {
    const p = feature.properties ?? {};
    const name = p.DEN_REG || p.DEN_UTS || p.DEN_COM || "";

    // tooltip includes value (optional)
    const code =
      currentLevel === "region"
        ? p.COD_REG
        : currentLevel === "province"
        ? p.COD_PROV
        : p.PRO_COM;

    const v = typeof code === "number" ? valuesMap.get(code) : undefined;
    const vText = Number.isFinite(v) ? ` — ${Number(v).toLocaleString()} MWh` : "";

    if (name) {
      layer.bindTooltip(`${name}${vText}`, {
        permanent: currentLevel !== "comune",
        direction: "center",
        className: `${currentLevel}-label`,
      });
    }

    layer.on("click", () => {
      if (currentLevel === "region") {
        setSelectedTerritory({ level: "region", name, codes: { reg: p.COD_REG } });
      } else if (currentLevel === "province") {
        setSelectedTerritory({
          level: "province",
          name,
          codes: { reg: p.COD_REG, prov: p.COD_PROV },
        });
      } else {
        setSelectedTerritory({
          level: "municipality",
          name,
          codes: { reg: p.COD_REG, prov: p.COD_PROV, mun: p.PRO_COM },
        });
      }

      mapRef.current?.fitBounds(layer.getBounds(), { padding: [20, 20] });
    });
  };

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      {(loading || !geo) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.6)",
            fontSize: 14,
          }}
        >
          Loading…
        </div>
      )}

      <MapContainer
        center={[41.9, 12.5]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef as any}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles © Esri"
        />

        <MapBehavior
          onZoomChange={setZoom}
          currentGeo={geo}
          currentLevel={currentLevel}
          mapRef={mapRef}
        />

        {geo && (
          <GeoJSON
            key={currentLevel}
            data={geo as any}
            style={style as any}
            onEachFeature={onEachFeature as any}
          />
        )}
      </MapContainer>
    </div>
  );
}
