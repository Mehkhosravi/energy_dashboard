// src/components/maps/hooks/mapFiltersToGeoArgs.ts
import type { SpatialScale } from "../../contexts/MapFiltersContext";

export type BackendLevel = "region" | "province" | "comune";
export type BackendResolution = "annual" | "monthly" | "hourly";
export type BackendDomain = "consumption" | "production" | "future_production";

// MapFilters.scale uses "municipality" but backend expects "comune"
export function scaleToBackendLevel(scale: SpatialScale): BackendLevel {
  if (scale === "region") return "region";
  if (scale === "province") return "province";
  return "comune"; // municipality -> comune
}

// MapFilters.theme uses "future_potential" but backend expects "future_production"
export function themeToBackendDomain(theme: string): BackendDomain {
  if (theme === "consumption") return "consumption";
  if (theme === "production") return "production";
  return "future_production"; // future_potential -> future_production
}

// Your useGeoData supports annual/monthly/hourly only.
// Panel has "daily" too => choose a deterministic fallback.
// Best: map "daily" -> "hourly" (closest granularity).
export function timeResolutionToBackendResolution(timeResolution: string): BackendResolution {
  if (timeResolution === "annual") return "annual";
  if (timeResolution === "monthly") return "monthly";
  if (timeResolution === "hourly") return "hourly";
  // daily -> hourly fallback
  return "hourly";
}
