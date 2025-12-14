// src/components/Grid.tsx
import { useState, type ReactNode } from "react";
import "../index.css";
import Header from "./Header";
import Toolbar from "./Toolbar";
import SidePanel from "./SidePanel";
import MapShell from "./MapShell";
import ChartsShell from "./ChartShell";
import AdminPage from "./admin/AdminPage"; // Import the AdminPage
import DataImportPage from "./data-import/DataImportPage"; // Import Data Import page

type GridProps = {
  map: ReactNode;     // your Leaflet map component
  side?: ReactNode;   // optional custom side-panel content
};

export default function Grid({ map, side }: GridProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "admin">("dashboard"); // Manage active tab (dashboard/admin)

  const togglePanel = () => setPanelOpen((v) => !v);

  const handleOpenAdmin = () => {
    setActiveTab("admin");
  };

  return (
    <div className="page">
      <Header onOpenAdmin={handleOpenAdmin} />  {/* Pass callback to Header for switching to Admin view */}

      <div className="body">
        <Toolbar />

        <main className="main">
          {panelOpen && (
            <SidePanel onClose={togglePanel}>
              {side ?? <p>Side panel content…</p>}
            </SidePanel>
          )}

          <section className="content">
            {/* Render based on activeTab */}
            {activeTab === "dashboard" ? (
              <>
                <MapShell map={map} onTogglePanel={togglePanel} />
                <ChartsShell />
              </>
            ) : (
              <AdminPage />
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
