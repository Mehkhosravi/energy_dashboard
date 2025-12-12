// src/components/maps/ProvinceConsumptionMap.tsx
import { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import Legend from "../Legend";
import { useSelectedTerritory } from "../contexts/SelectedTerritoryContext";
import type { Feature, Geometry } from "geojson";

// Minimal props we actually use from the GeoJSON
type ProvinceProps = {
  DEN_UTS?: string;     // province name
  COD_PROV: number;     // province code
  CONS_ANNO?: number;   // value for choropleth
};

export default function ProvinceConsumptionMap() {
  const [geo, setGeo] = useState<any | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  // unified selection
  const { selectedTerritory, setSelectedTerritory } = useSelectedTerritory();

  useEffect(() => {
    fetch("/data/prov_cons_ann.geojson")
      .then((res) => res.json())
      .then((data) => setGeo(data))
      .catch((err) => {
        console.error("Error loading GeoJSON", err);
        setGeo(null);
      });
  }, []);

  // values used for choropleth breaks
  const values: number[] = useMemo(() => {
    if (!geo) return [];
    return geo.features
      .map((f: any) => f.properties?.CONS_ANNO as number)
      .filter((v: number) => typeof v === "number" && !Number.isNaN(v));
  }, [geo]);

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
    const n = sorted.length || 1;
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

  const style = (feature: any) => {
    const props = feature?.properties as ProvinceProps;
    const consVal = props?.CONS_ANNO ?? 0;

    // highlight only if selected territory is a province and codes match
    const isSelected =
      selectedTerritory?.level === "province" &&
      selectedTerritory.codes.prov === props.COD_PROV;

    return {
      color: isSelected ? "#000" : "#333",
      weight: isSelected ? 3 : 1,
      fillOpacity: isSelected ? 0.9 : 0.7,
      fillColor: getColor(consVal),
    };
  };

  const onEachFeature = (feature: Feature<Geometry, ProvinceProps>, layer: any) => {
    const name = feature?.properties?.DEN_UTS ?? "";
    if (!name) return;

    layer.bindTooltip(name, {
      permanent: true,
      direction: "center",
      className: "province-label",
    });

    layer.on("click", () => {
      const props = feature.properties;

      // keep current region code if it exists; otherwise fallback 0
      const reg = selectedTerritory?.codes.reg ?? 0;

      setSelectedTerritory({
        level: "province",
        name,
        codes: { reg, prov: props.COD_PROV },
        // keep hierarchy if already known from search selection
        parent: selectedTerritory?.parent,
      });

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
        ref={mapRef}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles © Esri"
        />

        {geo && <GeoJSON data={geo} style={style} onEachFeature={onEachFeature} />}

        {breaks.length > 1 && <Legend breaks={breaks} colors={colors} />}
      </MapContainer>
    </div>
  );
}
