// src/App.tsx
import { useState } from "react";

import Header from "./components/Header";
import Toolbar from "./components/Toolbar";
import Grid from "./components/Grid";

import MainMap from "./components/map/MainMap";
import DataImportPage from "./components/pages/data-import/DataImportPage";
import ScenariosPage from "./components/pages/scenarios/ScenarioPage";

import type { AppTab } from "./types/AppTab";

function SidePanelMock() {
  return (
    <div>
      <h3>Map panel</h3>
      <p>Here we will put Layers / Legend etc.</p>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("home");

  return (
    <div className="page">
      {/* Header no longer controls admin */}
      <Header />

      <div className="body">
        <Toolbar activeTab={activeTab} onChangeTab={setActiveTab} />

        {/* Must be main.main for your CSS */}
        <main className="main">
          {activeTab === "home" && <Grid map={<MainMap />} side={<SidePanelMock />} />}

          {activeTab === "data-import" && <DataImportPage />}

          {activeTab === "scenarios" && <ScenariosPage />}
        </main>
      </div>
    </div>
  );
}
