// src/components/MapShell.tsx

import { type ReactNode, useState } from "react";
import PlaceInfo from "./PlaceInfo";

// New module that matches the simplified JSON format:
// - TerritoryIndexRow has: level, name, codes{reg/prov/mun}, parent{region/province}
// - searchTerritories() searches by name/aliases
// - formatTerritoryMeta() prints "Province · Piemonte", etc.
import {
  searchTerritories,
  formatTerritoryMeta,
  type TerritoryIndexRow,
} from "./TerritoryLevel";

// NEW unified context
import { useSelectedTerritory } from "./contexts/SelectedTerritoryContext";

type MapShellProps = {
  map: ReactNode;
  onTogglePanel: () => void;

  // Optional callback: lets parent do extra behavior (e.g., analytics, map zoom,
  // custom routing, etc.). We keep it, but now it receives TerritoryIndexRow.
  onTerritorySelected?: (territory: TerritoryIndexRow) => void;
};

export default function MapShell({
  map,
  onTogglePanel,
  onTerritorySelected,
}: MapShellProps) {
  // Local UI state: search string and suggestion list
  // Keeping these local is correct: they are purely UI concerns.
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<TerritoryIndexRow[]>([]);
  const [showResults, setShowResults] = useState(false);

  // Global app state (single source of truth):
  // Any component (map, charts, summary cards) can read selectedTerritory
  // and decide what to fetch/render.
  const { setSelectedTerritory, clearSelectedTerritory } = useSelectedTerritory();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Update input value immediately for responsive typing
    setSearchTerm(value);

    // Search results come from the territory index:
    // It's fast (in-memory) and gives you region/province/municipality together.
    setResults(searchTerritories(value));

    // show dropdown as user types
    setShowResults(true);

    // Optional behavior:
    // if user clears the input, clear the global selected territory too,
    // otherwise UI says "nothing selected" but app still keeps old selection.
    if (value.trim() === "") {
      clearSelectedTerritory();
    }
  };

  const handleSelect = (t: TerritoryIndexRow) => {
    // 1) Set input to selected territory name
    setSearchTerm(t.name);

    // 2) Close the dropdown
    setShowResults(false);

    // 3) Notify parent if needed (optional)
    onTerritorySelected?.(t);

    // 4) Update the unified context
    // Why we store the whole object:
    // - It already contains hierarchy information (parent names)
    // - It contains codes needed for backend queries (reg/prov/mun)
    // - It avoids recomputing later and keeps downstream logic simple
    setSelectedTerritory({
      level: t.level,
      name: t.name,
      codes: t.codes,
      parent: t.parent,
    });
  };

  const handleBlur = () => {
    // Small delay so a click on a suggestion still registers
    // (because blur happens before onMouseDown finishes)
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
                  // onMouseDown (not onClick) avoids losing selection due to blur
                  onMouseDown={() => handleSelect(t)}
                >
                  <span className="suggestion-name">{t.name}</span>

                  {/* Meta uses hierarchy:
                      - Region -> "Region"
                      - Province -> "Province · <Region>"
                      - Municipality -> "Municipality · <Province>, <Region>"
                      This comes from TerritoryIndex.formatTerritoryMeta()
                   */}
                  <span className="suggestion-meta">
                    {formatTerritoryMeta(t)}
                  </span>
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
