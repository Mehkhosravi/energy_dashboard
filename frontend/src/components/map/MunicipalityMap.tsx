import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L, { GeoJSON as LeafletGeoJSON } from "leaflet";
import React, { useEffect, useRef, useState } from "react";
import * as GeoJSONType from "geojson";

type MunicipalityMapProps = {
  /** Name of the selected comune, e.g. "Torino" */
  selectedComune?: string;
  /** CSS height of the map container */
  height?: string;
};

type FeatureCollection = GeoJSONType.FeatureCollection;

const DEFAULT_CENTER: L.LatLngExpression = [41.8719, 12.5674]; // Rough center of Italy
const DEFAULT_ZOOM = 6;

/**
 * Small helper component that fits map bounds when data changes.
 */
const FitBoundsOnData: React.FC<{
  geoJsonLayerRef: React.RefObject<LeafletGeoJSON | null>;
}> = ({ geoJsonLayerRef }) => {
  const map = useMap();

  useEffect(() => {
    const layer = geoJsonLayerRef.current;
    if (!layer) return;

    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [geoJsonLayerRef, map]);

  return null;
};

const MunicipalityMap: React.FC<MunicipalityMapProps> = ({
  selectedComune,
  height = "450px",
}) => {
  const [data, setData] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geoJsonLayerRef = useRef<LeafletGeoJSON | null>(null);

  useEffect(() => {
    if (!selectedComune || selectedComune.trim() === "") {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const encoded = encodeURIComponent(selectedComune.trim());

    fetch(`/api/map_data/${encoded}`)
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(
            text || `Errore nella risposta del server (${response.status})`
          );
        }
        return response.json();
      })
      .then((json: FeatureCollection) => {
        if (json.type !== "FeatureCollection") {
          throw new Error("La risposta non è una FeatureCollection GeoJSON valida.");
        }
        setData(json);
      })
      .catch((err: unknown) => {
        console.error("[MunicipalityMap] Error fetching GeoJSON:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Errore sconosciuto durante il caricamento dei dati."
        );
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedComune]);

  const handleEachFeature = (
    feature: GeoJSONType.Feature,
    layer: L.Layer
  ) => {
    if (!feature.properties) return;

    const props = feature.properties as {
      comune?: string;
      comune_name?: string;
      comune_code?: number | string;
    };

    const name = props.comune || props.comune_name || selectedComune || "";
    const code = props.comune_code ?? "";

    const popupContent =
      code !== "" ? `${name} (${code})` : name || "Comune";

    (layer as L.Path).bindPopup(popupContent);
  };

  const layerStyle = (): L.PathOptions => ({
    color: "#1f2937",       // dark gray border
    weight: 1.5,
    fillColor: "#3b82f6",   // blue fill
    fillOpacity: 0.35,
  });

  return (
    <div className="municipality-map-wrapper" style={{ height }}>
      {/* Optional status bar above the map */}
      <div
        style={{
          marginBottom: "0.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.875rem",
        }}
      >
        <div>
          {selectedComune ? (
            <span>
              Comune selezionato: <strong>{selectedComune}</strong>
            </span>
          ) : (
            <span>Seleziona un comune per visualizzare la mappa.</span>
          )}
        </div>
        <div>
          {loading && <span>Caricamento geometria…</span>}
          {error && (
            <span style={{ color: "#b91c1c" }}>
              Errore: {error}
            </span>
          )}
          {!loading && !error && selectedComune && !data && (
            <span>Nessuna geometria trovata.</span>
          )}
        </div>
      </div>

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {data && (
          <>
            <GeoJSON
              data={data as any}
              style={layerStyle}
              onEachFeature={handleEachFeature}
              ref={geoJsonLayerRef as any}
            />
            <FitBoundsOnData geoJsonLayerRef={geoJsonLayerRef} />
          </>
        )}
      </MapContainer>
    </div>
  );
};

export default MunicipalityMap;
