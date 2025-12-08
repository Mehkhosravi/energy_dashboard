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
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Search territories by name, returning those that match the query.
// Matches that start with the query come first, then others.
// Limit the number of results returned (default 8).
export function searchTerritories(
  query: string,
  limit = 8
): Territory[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const matches = TERRITORIES.map((t) => {
    const normName = normalize(t.name);
    const starts = normName.startsWith(q);
    const contains = !starts && normName.includes(q);
    return { territory: t, starts, contains };
  }).filter((m) => m.starts || m.contains);

  // sort: prefix matches first, then others alphabetically
  matches.sort((a, b) => {
    if (a.starts !== b.starts) {
      return a.starts ? -1 : 1; // true (startsWith) comes first
    }
    return a.territory.name.localeCompare(b.territory.name, "it");
  });

  return matches.slice(0, limit).map((m) => m.territory);
}
