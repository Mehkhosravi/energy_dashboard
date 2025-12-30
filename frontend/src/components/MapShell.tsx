// src/components/MapShell.tsx
import { type ReactNode, useState } from "react";
import PlaceInfo from "./PlaceInfo";

import {
  searchTerritories,
  formatTerritoryMeta,
  type TerritoryIndexRow,
} from "./TerritoryLevel";

import { useMapFilters } from "./contexts/MapFiltersContext";


import { useSelectedTerritory } from "./contexts/SelectedTerritoryContext";

type MapShellProps = {
  map: ReactNode;
  onTogglePanel: () => void;
  onTerritorySelected?: (territory: TerritoryIndexRow) => void;
};

// If your app uses "municipality" in the index, keep it.
// MainMap I gave you expects "comune". If your context is still "municipality",
// keep it here; otherwise switch to "comune".
type AppLevel = "region" | "province" | "municipality";

function normalizeLevel(level: TerritoryIndexRow["level"]): AppLevel {
  if (level === "region") return "region";
  if (level === "province") return "province";
  return "municipality";
}

function toNum(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string") {
    const n = Number(x.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export default function MapShell({
  map,
  onTogglePanel,
  onTerritorySelected,
}: MapShellProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<TerritoryIndexRow[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { setScale, setScaleMode } = useMapFilters();// NEW: setScaleMode


  const { setSelectedTerritory, clearSelectedTerritory } = useSelectedTerritory();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    setResults(searchTerritories(value));
    setShowResults(true);

    if (value.trim() === "") clearSelectedTerritory();
  };

  const handleSelect = (t: TerritoryIndexRow) => {
    setSearchTerm(t.name);
    setShowResults(false);
    onTerritorySelected?.(t);

    const lvl = normalizeLevel(t.level);

    // Pull codes from the index; if missing, fall back to parent codes.
    // IMPORTANT: reg MUST exist because your context type requires it.
    const reg =
      toNum(t.codes?.reg) ??
      toNum((t.parent as any)?.codes?.reg) ?? // if your parent includes codes
      0;

    const prov =
      toNum(t.codes?.prov) ??
      toNum((t.parent as any)?.codes?.prov) ??
      null;

    const mun = toNum(t.codes?.mun) ?? null;

    // Build codes object EXACTLY matching your context type:
    // { reg: number; prov?: number; mun?: number }
    const codes: { reg: number; prov?: number; mun?: number } = {
      reg,
      ...(lvl !== "region" && prov != null ? { prov } : {}),
      ...(lvl === "municipality" && mun != null ? { mun } : {}),
    };

    setSelectedTerritory({
      level: lvl,
      name: t.name,
      codes,
      parent: t.parent,
    });
    // zooming auto
    setScaleMode("auto");
    setScale(lvl);
  };

  const handleBlur = () => {
    setTimeout(() => setShowResults(false), 150);
  };

  return (
    <section className="map-wrap">
      <div className="map-top">
        <div className="map-search">
          <input
            className="search"
            type="text"
            placeholder="Search municipality, province, or region…"
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setShowResults(true)}
            onBlur={handleBlur}
          />

          {showResults && results.length > 0 && (
            <ul className="search-suggestions">
              {results.map((t) => (
                <li
                  key={t.id}
                  className="search-suggestion-item"
                  onMouseDown={() => handleSelect(t)}
                >
                  <span className="suggestion-name">{t.name}</span>
                  <span className="suggestion-meta">{formatTerritoryMeta(t)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="map-controls">
          <button className="icon-btn-sm" onClick={onTogglePanel}>
            ☰
          </button>
          <button className="btn">download map ⬇</button>
        </div>
      </div>

      <div className="map-main">
        <div className="map-view">{map}</div>
        <PlaceInfo />
      </div>
    </section>
  );
}
