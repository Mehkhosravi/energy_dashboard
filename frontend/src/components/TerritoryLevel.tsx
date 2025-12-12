// src/components/TerritoryIndex.ts

export type TerritoryLevel = "region" | "province" | "municipality";

export type TerritoryIndexRow = {
  id: string;
  level: TerritoryLevel;
  name: string;

  codes: {
    reg: number;
    prov?: number;
    mun?: number;
  };

  parent?: {
    region?: string;   // for province/municipality
    province?: string; // for municipality
  };

  search?: {
    normalized?: string;
    aliases?: string[];
  };
};


import rawData from "../data/territory_index.json";

export const TERRITORIES: TerritoryIndexRow[] = rawData as TerritoryIndexRow[];

// Helper to make search case-insensitive and accent-insensitive
function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function territorySearchHaystack(t: TerritoryIndexRow): string[] {
  const list: string[] = [];

  // primary name
  list.push(normalize(t.name));

  // optional precomputed normalized
  if (t.search?.normalized) list.push(normalize(t.search.normalized));

  // optional aliases
  if (t.search?.aliases?.length) {
    for (const a of t.search.aliases) list.push(normalize(a));
  }

  return Array.from(new Set(list));
}

// Search territories by name/aliases.
// Prefix matches first, then contains matches.
// Limit results (default 8).
export function searchTerritories(query: string, limit = 8): TerritoryIndexRow[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const matches = TERRITORIES.map((t) => {
    const hay = territorySearchHaystack(t);

    const starts = hay.some((h) => h.startsWith(q));
    const contains = !starts && hay.some((h) => h.includes(q));

    return { territory: t, starts, contains };
  }).filter((m) => m.starts || m.contains);

  matches.sort((a, b) => {
    if (a.starts !== b.starts) return a.starts ? -1 : 1;
    return a.territory.name.localeCompare(b.territory.name, "it");
  });

  return matches.slice(0, limit).map((m) => m.territory);
}

// Meta label for UI (your dropdown “Province · Piemonte”, etc.)
export function formatTerritoryMeta(t: TerritoryIndexRow): string {
  if (t.level === "region") return "Region";
  if (t.level === "province") return `Province · ${t.parent?.region ?? ""}`.trim();
  // municipality
  const prov = t.parent?.province;
  const reg = t.parent?.region;
  if (prov && reg) return `Municipality · ${prov}, ${reg}`;
  if (reg) return `Municipality · ${reg}`;
  return "Municipality";
}
