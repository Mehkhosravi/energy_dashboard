// src/data/territoryIndex.ts

export type TerritoryLevel = "region" | "province" | "municipality";

export interface Territory {
  id: string;
  level: TerritoryLevel;
  name: string;
  // this may or may not be in your JSON, but it's okay if it is
  normalized_name?: string;

  reg_cod: number;
  region: string;

  prov_cod: number | null;
  province: string | null;

  mun_cod: number | null;
}

// If TS complains about JSON imports, ensure tsconfig.json has:
// "resolveJsonModule": true, "esModuleInterop": true
import rawData from "../data/territory_index.json";

export const TERRITORIES: Territory[] = rawData as Territory[];

// Helper to make search case-insensitive and accent-insensitive
function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase();
}

// Main search function
export function searchTerritories(
  query: string,
  limit = 8
): Territory[] {
  const q = normalizeForSearch(query.trim());
  if (!q) return [];

  return TERRITORIES.filter((t) =>
    normalizeForSearch(t.name).includes(q)
  ).slice(0, limit);
}
