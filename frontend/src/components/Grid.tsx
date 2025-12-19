// src/components/Grid.tsx
import { useState, type ReactNode } from "react";
import "../index.css";
import Header from "./Header";
import Toolbar from "./Toolbar";
import SidePanel from "./SidePanel";
import MapShell from "./MapShell";
import ChartsShell from "./ChartShell";
import AdminPanel from "./admin/AdminPanel";
import AdminContent from "./admin/AdminContent";
import ChartShell from "./ChartShell";

type GridProps = {
  map: ReactNode;
  side?: ReactNode;
};

type AdminSection = "account" | "upload" | "validate";

export default function Grid({ map, side }: GridProps) {
  const [panelOpen, setPanelOpen] = useState(true);

  // NEW admin state
  const [adminMode, setAdminMode] = useState(false);
  const [adminSection, setAdminSection] = useState<AdminSection>("account");

  const togglePanel = () => setPanelOpen((v) => !v);

  // Compatible with your old Grid/Header behavior
  const handleOpenAdmin = () => {
    setAdminMode(true);
    setAdminSection("account"); // default landing
  };

  const handleCloseAdmin = () => {
    setAdminMode(false);
  };

  return (
    <div className="page">
      <Header onOpenAdmin={handleOpenAdmin} onCloseAdmin={handleCloseAdmin} />

      <div className="body">
        <Toolbar />

        <main className="main">
          {/* LEFT PANEL */}
          {adminMode ? (
            <AdminPanel active={adminSection} onChange={setAdminSection} />
          ) : (
            panelOpen && (
              <SidePanel onClose={togglePanel}>
                {side ?? <p>Side panel content…</p>}
              </SidePanel>
            )
          )}

          {/* MAIN CONTENT */}
          <section className="content">
            {adminMode ? (
              <AdminContent section={adminSection} />
            ) : (
              <>
                <MapShell map={map} onTogglePanel={togglePanel} />
                <ChartShell />
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
