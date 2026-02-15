// src/components/maps/ProvinceConsumptionMap.tsx

import { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import Legend from "../Legend";
import { useSelectedTerritory } from "../contexts/SelectedTerritoryContext";
import type { Feature, Geometry } from "geojson";

// Minimal province properties used from GeoJSON
type ProvinceProps = {
  DEN_UTS?: string;     // Province name
  COD_PROV: number;    // Province code
  CONS_ANNO?: number;  // Consumption value
};

export default function ProvinceConsumptionMap() {
  const [geo, setGeo] = useState<any | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  // Unified global selection
  const { selectedTerritory, setSelectedTerritory } = useSelectedTerritory();

  // Load province GeoJSON once
  useEffect(() => {
    fetch("/data/prov_cons_ann.geojson")
      .then((res) => res.json())
      .then(setGeo)
      .catch((err) => {
        console.error("Error loading GeoJSON", err);
        setGeo(null);
      });
  }, []);

  // Values used to compute choropleth classes
  const values: number[] = useMemo(() => {
    if (!geo) return [];
    return geo.features
      .map((f: any) => f.properties?.CONS_ANNO as number)
      .filter((v: number) => typeof v === "number" && !Number.isNaN(v));
  }, [geo]);

  // Class breaks + colors
  const { breaks, colors } = useMemo(() => {
    const palette = [
      "#FFFFB2",
      "#FECC5C",
      "#FD8D3C",
      "#F03B20",
      "#BD0026",
      "#800026",
    ];

    if (values.length === 0) return { breaks: [], colors: palette };

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const numClasses = palette.length;

    const b: number[] = [];
    for (let i = 0; i <= numClasses; i++) {
      const idx = Math.floor((i / numClasses) * (n - 1));
      b.push(sorted[idx]);
    }

    return { breaks: b, colors: palette };
  }, [values]);

  const getColor = (v: number) => {
    if (!breaks.length) return "#ccc";

    for (let i = 0; i < breaks.length - 1; i++) {
      const from = breaks[i];
      const to = breaks[i + 1];

      if (i === breaks.length - 2) {
        if (v >= from && v <= to) return colors[i];
      } else if (v >= from && v < to) {
        return colors[i];
      }
    }
    return colors[colors.length - 1];
  };

  // Style per province
  const style = (feature: any) => {
    const props = feature.properties as ProvinceProps;

    const isSelected =
      selectedTerritory?.level === "province" &&
      selectedTerritory.codes.prov === props.COD_PROV;

    return {
      color: isSelected ? "#000" : "#333",
      weight: isSelected ? 3 : 1,
      fillOpacity: isSelected ? 0.9 : 0.7,
      fillColor: getColor(props.CONS_ANNO ?? 0),
    };
  };

  // Per-feature logic
  const onEachFeature = (
    feature: Feature<Geometry, ProvinceProps>,
    layer: any
  ) => {
    const props = feature.properties;
    const name = props?.DEN_UTS ?? "";
    if (!name) return;

    // Province label
    layer.bindTooltip(name, {
      permanent: true,
      direction: "center",
      className: "province-label",
    });

    layer.on("click", () => {
      // Preserve region code if already known
      setSelectedTerritory({
        level: "province",
        name,
        codes: {
          reg: selectedTerritory?.codes.reg ?? 0,
          prov: props.COD_PROV,
        },
        parent: selectedTerritory?.parent,
      });

      // Zoom to province
      if (mapRef.current) {
        mapRef.current.fitBounds(layer.getBounds());
      }
    });
  };

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      {!geo && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.7)",
          }}
        >
          Loading…
        </div>
      )}

      <MapContainer
        center={[41.9, 12.5]}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles © Esri"
        />

        {geo && (
          <GeoJSON data={geo} style={style} onEachFeature={onEachFeature} />
        )}

        {breaks.length > 1 && <Legend breaks={breaks} colors={colors} />}
      </MapContainer>
    </div>
  );
}
