// src/components/maps/MapRefBinder.tsx
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";

export default function MapRefBinder({
  mapRef,
}: {
  mapRef: React.MutableRefObject<LeafletMap | null>;
}) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);

  return null;
}
