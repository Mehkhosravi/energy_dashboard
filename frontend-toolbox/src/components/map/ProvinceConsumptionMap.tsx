import { useEffect, useRef, useState, useMemo } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import Legend from "../Legend";
import { useSelectedProvince } from "../contexts/SelectedProvinceContext";
import type { Province } from "../contexts/Types";
import type { Feature, Geometry } from "geojson";

export default function ProvinceConsumptionMap() {
  const [geo, setGeo] = useState<any | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const { selectedProvince, setSelectedProvince } = useSelectedProvince();

  useEffect(() => {
    fetch("/data/prov_cons_ann.geojson")
      .then((res) => res.json())
      .then((data) => setGeo(data))
      .catch((err) => {
        console.error("Error loading GeoJSON", err);
        setGeo(null);
      });
  }, []);

  // --- values from geo (always call this hook, even if geo is null) ---
  const values: number[] = useMemo(() => {
    if (!geo) return [];
    return geo.features
      .map((f: any) => f.properties?.CONS_ANNO as number)
      .filter((v: number) => typeof v === "number" && !Number.isNaN(v));
  }, [geo]);

    const { breaks, colors } = useMemo(() => {
  // Yellow → Red choropleth (YlOrRd style)
    const palette = [
      "#FFFFB2", // pale yellow (lowest)
      "#FECC5C", // light yellow-orange
      "#FD8D3C", // orange
      "#F03B20", // strong orange-red
      "#BD0026", // deep red
      "#800026", // darkest red (highest)
    ];


    if (values.length === 0) {
      return { breaks: [], colors: palette };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length || 1;
    const numClasses = palette.length; // 6 classes

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

      // Include upper bound in last class
      if (i === breaks.length - 2) {
        if (v >= from && v <= to) return colors[i];
      } else if (v >= from && v < to) {
        return colors[i];
      }
    }
    return colors[colors.length - 1];
  };

  const style = (feature: any) => {
    const cons_val = feature?.properties?.CONS_ANNO as number;

    const isSelected =
      selectedProvince &&
      feature.properties.COD_PROV === selectedProvince.COD_PROV;

    return {
      color: isSelected ? "#000" : "#333",
      weight: isSelected ? 3 : 1,
      fillOpacity: isSelected ? 0.9 : 0.7,
      fillColor: getColor(cons_val),
    };
  };

  const onEachFeature = (feature: Feature<Geometry, Province>, layer: any) => {
    const name = feature?.properties?.DEN_UTS ?? "";
    if (!name) return;

    layer.bindTooltip(name, {
      permanent: true,
      direction: "center",
      className: "province-label",
    });

    layer.on("click", () => {
      const props = feature.properties as Province;
      console.log("Selected layer:", props.DEN_UTS);
      setSelectedProvince(props);

      if (mapRef.current) {
        const bounds = layer.getBounds();
        mapRef.current.fitBounds(bounds);
      }
    });
  };

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      {/* Loading overlay instead of early return */}
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

        {geo && (
          <GeoJSON data={geo} style={style} onEachFeature={onEachFeature} />
        )}

        {/* Legend only if we have proper breaks */}
        {breaks.length > 1 && <Legend breaks={breaks} colors={colors} />}
      </MapContainer>
    </div>
  );
}
