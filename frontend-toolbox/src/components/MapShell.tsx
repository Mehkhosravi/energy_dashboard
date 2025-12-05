// src/components/MapShell.tsx
import { type ReactNode, useState } from "react";
import { MapInfo } from "./MapInfo";
import {
  searchTerritories,
  type Territory,
} from "./TerritoryLevel";

type MapShellProps = {
  map: ReactNode;
  onTogglePanel: () => void;
  // later, you can use this to zoom the map to the selected territory
  onTerritorySelected?: (territory: Territory) => void;
};

export default function MapShell({
  map,
  onTogglePanel,
  onTerritorySelected,
}: MapShellProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Territory[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearchChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setSearchTerm(value);
    setResults(searchTerritories(value));
    setShowResults(true);
  };

  const handleSelect = (territory: Territory) => {
    setSearchTerm(territory.name);
    setShowResults(false);
    onTerritorySelected?.(territory);
  };

  const handleBlur = () => {
    // small delay so click on item still works
    setTimeout(() => setShowResults(false), 150);
  };

  const formatMeta = (t: Territory): string => {
    if (t.level === "region") {
      return "Region";
    }
    if (t.level === "province") {
      return `Province · ${t.region}`;
    }
    // municipality
    if (t.province) {
      return `Municipality · ${t.province}, ${t.region}`;
    }
    return `Municipality · ${t.region}`;
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
                  <span className="suggestion-meta">
                    {formatMeta(t)}
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
          <button className="icon-btn-sm">✋</button>
          <button className="icon-btn-sm">⬇</button>
        </div>
      </div>

      <div className="map-main">
        <div className="map-view">{map}</div>
        <MapInfo />
      </div>
    </section>
  );
}
