// src/components/MapShell.tsx
import React, { type ReactNode, useState } from "react";
import PlaceInfo from "./PlaceInfo";

import {
  searchTerritories,
  formatTerritoryMeta,
  type TerritoryIndexRow,
} from "./TerritoryLevel";

import { useSelectedTerritory } from "./contexts/SelectedTerritoryContext";

type MapShellProps = {
  map: ReactNode;
  onTogglePanel: () => void;
  onTerritorySelected?: (territory: TerritoryIndexRow) => void;
};

export default function MapShell({
  map,
  onTogglePanel,
  onTerritorySelected,
}: MapShellProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<TerritoryIndexRow[]>([]);
  const [showResults, setShowResults] = useState(false);

  const { setSelectedTerritory, clearSelectedTerritory } = useSelectedTerritory();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    setResults(searchTerritories(value));
    setShowResults(true);

    if (value.trim() === "") clearSelectedTerritory();
  };

  const handleSelect = (t: TerritoryIndexRow) => {
    console.log("SELECTED:", t.level, t.name, t.codes);
    setSearchTerm(t.name);
    setShowResults(false);
    onTerritorySelected?.(t);

    // ✅ codes are guaranteed by territory_index.json structure
    setSelectedTerritory({
      level: t.level, // "region" | "province" | "municipality"
      name: t.name,
      codes: {
        reg: t.codes.reg,
        ...(t.codes.prov != null ? { prov: t.codes.prov } : {}),
        ...(t.codes.mun != null ? { mun: t.codes.mun } : {}),
      },
      parent: {
        region: t.parent?.region,
        province: t.parent?.province,
      },
    });
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
