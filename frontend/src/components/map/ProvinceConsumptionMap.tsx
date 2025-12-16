// src/components/maps/ProvinceConsumptionMap.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import Legend from "../Legend";
import { useSelectedTerritory } from "../contexts/SelectedTerritoryContext";
import type { Feature, Geometry, FeatureCollection } from "geojson";

type ProvinceProps = {
  // name (could vary by backend)
  DEN_UTS?: string;
  den_uts?: string;
  name?: string;

  // province code (could vary by backend)
  COD_PROV?: number | string;
  cod_prov?: number | string;

  // sometimes reg code exists
  COD_REG?: number | string;
  cod_reg?: number | string;
};

type ValuesRow = {
  cod_reg: number | string | null;
  cod_prov: number | string | null;
  pro_com: number | string | null;
  value_mwh: number | null;
  name?: string | null;
};

const GEO_URL = "http://localhost:5000/map/territories?level=province&simplify=0.005";
const VALUES_URL =
  "http://127.0.0.1:5000/charts/values?level=province&resolution=annual&year=2019&domain=consumption&scenario=0";

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

function getProvCode(p: any): number | null {
  // support both COD_PROV and cod_prov, number or string
  return toNum(p?.COD_PROV) ?? toNum(p?.cod_prov);
}

function getRegCode(p: any): number | null {
  return toNum(p?.COD_REG) ?? toNum(p?.cod_reg);
}

function getProvName(p: any): string {
  return (p?.DEN_UTS ?? p?.den_uts ?? p?.name ?? "").toString();
}

export default function ProvinceConsumptionMap() {
  const mapRef = useRef<LeafletMap | null>(null);
  const { selectedTerritory, setSelectedTerritory } = useSelectedTerritory();

  const [geo, setGeo] = useState<FeatureCollection<Geometry, any> | null>(null);
  const [valuesMap, setValuesMap] = useState<Map<number, number>>(new Map());
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [loadingVals, setLoadingVals] = useState(true);

  // 1) load province geometry
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoadingGeo(true);
      try {
        const res = await fetch(GEO_URL, { signal: controller.signal });
        if (!res.ok) throw new Error(`Geo load failed: ${res.status}`);
        const fc = (await res.json()) as FeatureCollection<Geometry, any>;
        setGeo(fc);
      } catch (e) {
        if ((e as any).name !== "AbortError") console.error(e);
        setGeo(null);
      } finally {
        setLoadingGeo(false);
      }
    })();
    return () => controller.abort();
  }, []);

  // 2) load province values (consumption annual 2019 scenario 0)
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoadingVals(true);
      try {
        const res = await fetch(VALUES_URL, { signal: controller.signal });
        if (!res.ok) throw new Error(`Values load failed: ${res.status}`);
        const rows = (await res.json()) as ValuesRow[];

        const m = new Map<number, number>();
        for (const r of rows) {
          const code = toNum(r.cod_prov);
          const v = typeof r.value_mwh === "number" ? r.value_mwh : null;
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
  }, []);

  // values array for breaks
  const values = useMemo(() => Array.from(valuesMap.values()), [valuesMap]);

  const { breaks, colors } = useMemo(() => {
    const b = quantileBreaks(values, PALETTE.length);
    return { breaks: b, colors: PALETTE };
  }, [values]);

  // debug join (optional but helpful)
  useEffect(() => {
    if (!geo) return;
    let matched = 0;
    for (const f of geo.features as any[]) {
      const code = getProvCode(f?.properties);
      if (code != null && valuesMap.has(code)) matched++;
    }
    console.log(
      `[ProvinceConsumptionMap] features=${geo.features.length} values=${valuesMap.size} matched=${matched}`
    );
    if (geo.features?.[0]?.properties) {
      console.log("[ProvinceConsumptionMap] sample keys:", Object.keys(geo.features[0].properties));
    }
  }, [geo, valuesMap]);

  const style = (feature: any) => {
    const p = feature?.properties as ProvinceProps;
    const prov = getProvCode(p);

    const v = prov != null ? valuesMap.get(prov) : undefined;

    const isSelected =
      selectedTerritory?.level === "province" &&
      typeof selectedTerritory.codes?.prov === "number" &&
      prov != null &&
      selectedTerritory.codes.prov === prov;

    return {
      color: isSelected ? "#000" : "#333",
      weight: isSelected ? 3 : 1,
      fillOpacity: isSelected ? 0.9 : 0.7,
      fillColor: colorForValue(v, breaks, colors),
    };
  };

  const onEachFeature = (feature: Feature<Geometry, ProvinceProps>, layer: any) => {
    const p = feature?.properties ?? ({} as ProvinceProps);
    const name = getProvName(p);
    const prov = getProvCode(p);

    if (name) {
      layer.bindTooltip(name, {
        permanent: true,
        direction: "center",
        className: "province-label",
      });
    }

    layer.on("click", () => {
      if (prov == null) return;

      const regFromGeo = getRegCode(p);
      const regFallback = selectedTerritory?.codes?.reg ?? 0;

      setSelectedTerritory({
        level: "province",
        name,
        codes: { reg: regFromGeo ?? regFallback, prov },
        parent: selectedTerritory?.parent,
      });

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

        {geo && <GeoJSON data={geo as any} style={style as any} onEachFeature={onEachFeature as any} />}

        {breaks.length > 1 && <Legend breaks={breaks} colors={colors} />}
      </MapContainer>
    </div>
  );
}
