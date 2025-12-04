// src/components/MapShell.tsx
import { type ReactNode } from "react";
import { MapInfo } from "./MapInfo";


type MapShellProps = {
  map: ReactNode;
  onTogglePanel: () => void;
};

export default function MapShell({ map, onTogglePanel }: MapShellProps) {
  return (
    <section className="map-wrap">
      <div className="map-top">
        <div className="map-search">
          <input
            className="search"
            type="text"
            placeholder="Search location or province…"
          />
        </div>
        <div className="map-controls">
          {/* toggle side-panel */}
          <button className="icon-btn-sm" onClick={onTogglePanel}>
            ☰
          </button>
          {/* interaction mode button */}
          <button className="icon-btn-sm">✋</button>
          {/* download */}
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
