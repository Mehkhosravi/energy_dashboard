// src/components/layersFilters.assets.ts
import type React from "react";
export type ProductionType =
  | "all"
  | "solar"
  | "wind"
  | "hydroelectric"
  | "geothermal"
  | "biomass";

export type ConsumptionSector =
  | "all"
  | "residential"
  | "primary"
  | "secondary"
  | "tertiary";

export type NodeIcon = React.ReactNode | null;

/* ---- Colors (swatches) ---- */

export const CONSUMPTION_SWATCH: Record<ConsumptionSector, string | null> = {
  all:  "#a50f15",
  residential: "#facc15",
  primary: "#c4a484",
  secondary: "#a3a3a3",
  tertiary: "#f59e0b",
};

export const PRODUCTION_SWATCH: Record<ProductionType, string | null> = {
  all: "#22c55e",        // green (aggregate / overview)
  solar: "#eab308",      // yellow-500
  wind: "#0ea5e9",       // sky-500
  hydroelectric: "#3b82f6", // blue-500
  geothermal: "#ef4444", // red-500
  biomass: "#16a34a",    // green-600
};


/* ---- Labels ---- */

export const CONSUMPTION_LABEL: Record<ConsumptionSector, string> = {
  all: "All",
  residential: "Residential",
  primary: "Primary",
  secondary: "Secondary",
  tertiary: "Tertiary",
};

export const PRODUCTION_LABEL: Record<ProductionType, string> = {
  all: "All",
  solar: "Solar",
  wind: "Wind",
  hydroelectric: "Hydro-electric",
  geothermal: "Geothermal",
  biomass: "Biomass",
};

/* ---- Icons (ONLY production) ----
   Dependency-free emojis (safe + fast).
   If later you switch to lucide-react or SVGs, replace these values.
*/
export const PRODUCTION_ICON: Record<ProductionType, NodeIcon> = {
  all: null,      
  solar: "☀️",
  wind: "🌬️",
  hydroelectric: "💧",
  geothermal: "♨️",
  biomass: "🌿",
};



/* the map color fixe */
// src/components/layersFilters.assets.ts

export function makeSequentialFromBase(baseHex: string): string[] {
  // 5 steps: light -> dark around the base color
  // simple, stable, no deps
  const clamp = (n: number) => Math.max(0, Math.min(255, n));

  const hexToRgb = (hex: string) => {
    const h = hex.replace("#", "");
    const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const r = parseInt(v.slice(0, 2), 16);
    const g = parseInt(v.slice(2, 4), 16);
    const b = parseInt(v.slice(4, 6), 16);
    return { r, g, b };
  };

  const rgbToHex = (r: number, g: number, b: number) =>
    "#" +
    [r, g, b]
      .map((x) => clamp(Math.round(x)).toString(16).padStart(2, "0"))
      .join("");

  const mix = (a: number, b: number, t: number) => a + (b - a) * t;

  const { r, g, b } = hexToRgb(baseHex);

  // 2 lighter (towards white), base, 2 darker (towards black)
  const steps = [
    { w: 0.80, k: 0.00 }, // very light
    { w: 0.55, k: 0.00 }, // light
    { w: 0.00, k: 0.00 }, // base
    { w: 0.00, k: 0.25 }, // dark
    { w: 0.00, k: 0.45 }, // very dark
  ];

  return steps.map(({ w, k }) => {
    // first mix with white, then darken
    const rw = mix(r, 255, w);
    const gw = mix(g, 255, w);
    const bw = mix(b, 255, w);

    const rd = mix(rw, 0, k);
    const gd = mix(gw, 0, k);
    const bd = mix(bw, 0, k);

    return rgbToHex(rd, gd, bd);
  });
}
