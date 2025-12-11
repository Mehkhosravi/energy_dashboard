// src/components/Grid.tsx
import { useState, type ReactNode } from "react";
import "../index.css";
import Header from "./Header";
import Toolbar from "./Toolbar";
import SidePanel from "./SidePanel";
import MapShell from "./MapShell";
import ChartsShell from "./ChartShell";

type GridProps = {
  map: ReactNode;     // your Leaflet map component
  side?: ReactNode;   // optional custom side-panel content
};

export default function Grid({ map, side }: GridProps) {
  const [panelOpen, setPanelOpen] = useState(true);

  const togglePanel = () => setPanelOpen((v) => !v);

  return (
    <div className="page">
      <Header />

      <div className="body">
        <Toolbar />

        <main className="main">
          {panelOpen && (
            <SidePanel onClose={togglePanel}>
              {side ?? <p>Side panel content…</p>}
            </SidePanel>
          )}

          <section className="content">
            <MapShell map={map} onTogglePanel={togglePanel} />
            <ChartsShell />

          </section>
        </main>
      </div>
    </div>
  );
}
