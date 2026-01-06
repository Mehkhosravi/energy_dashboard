// src/components/Grid.tsx
import { useState, type ReactNode } from "react";
import "../index.css";

import SidePanel from "./SidePanel";
import MapShell from "./MapShell";
import ChartShell from "./ChartShell";

type GridProps = {
  map: ReactNode;
  side?: ReactNode;
};

export default function Grid({ map, side }: GridProps) {
  const [panelOpen, setPanelOpen] = useState(true);

  const togglePanel = () => setPanelOpen((v) => !v);

  return (
    <>
      {panelOpen && (
        <SidePanel onClose={togglePanel}>
          {side ?? <p>Side panel content…</p>}
        </SidePanel>
      )}

      <section className="content">
        <MapShell map={map} onTogglePanel={togglePanel} />
        <ChartShell />
      </section>
    </>
  );
}
