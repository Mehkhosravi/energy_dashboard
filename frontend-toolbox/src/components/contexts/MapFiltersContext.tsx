import React, { createContext, useContext, useMemo, useState } from "react";

export type DataTheme = "consumption" | "production" | "future_potential";
export type SpatialScale = "region" | "province" | "municipality";
export type TemporalResolution = "annual" | "monthly" | "daily" | "hourly";
export type ConstraintOverlay = "heritage" | "air_quality" | "high_altitude";

//handle the auto mode vs user manual selection//
export type ScaleMode = "auto" | "manual";

export type MapFilters = {
  theme: DataTheme;
  scale: SpatialScale;
  timeResolution: TemporalResolution;
  overlays: ConstraintOverlay[];
  scaleMode: ScaleMode; // New field for scale mode
};

type MapFiltersContextValue = {
  filters: MapFilters;
  setTheme: (t: DataTheme) => void;
  setScale: (s: SpatialScale) => void;
  setTimeResolution: (r: TemporalResolution) => void;
  toggleOverlay: (o: ConstraintOverlay) => void;
  setOverlays: (o: ConstraintOverlay[]) => void;
  resetFilters: () => void;
  setScaleMode: (m: ScaleMode) => void; // New setter for scale mode
};

const DEFAULT_FILTERS: MapFilters = {
  theme: "consumption",
  scale: "province",
  timeResolution: "annual",
  overlays: [],
  scaleMode: "auto",
};

const Ctx = createContext<MapFiltersContextValue | undefined>(undefined);

export function MapFiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);

  const value = useMemo<MapFiltersContextValue>(() => {
    return {
      filters,
      setScaleMode: (scaleMode) => {
      console.log("[setScaleMode called]", scaleMode);
      console.trace("[setScaleMode stack]");
      setFilters((p) => ({ ...p, scaleMode }));
      },
      setTheme: (theme) => setFilters((p) => ({ ...p, theme })),
      setScale: (scale) => {
      console.log("[setScale called]", scale);
      console.trace("[setScale stack]");
      setFilters((p) => ({ ...p, scale }));
      },
      setTimeResolution: (timeResolution) => setFilters((p) => ({ ...p, timeResolution })),
      toggleOverlay: (o) =>
        setFilters((p) => ({
          ...p,
          overlays: p.overlays.includes(o) ? p.overlays.filter((x) => x !== o) : [...p.overlays, o],
        })),
      setOverlays: (overlays) => setFilters((p) => ({ ...p, overlays })),
      resetFilters: () => setFilters(DEFAULT_FILTERS),
    };
  }, [filters]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMapFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMapFilters must be used within MapFiltersProvider");
  return ctx;
}
