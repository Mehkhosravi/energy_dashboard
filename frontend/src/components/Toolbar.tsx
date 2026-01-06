// src/components/Toolbar.tsx
import type { AppTab } from "../types/AppTab";

type ToolbarProps = {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
};

export default function Toolbar({ activeTab, onChangeTab }: ToolbarProps) {
  return (
    <aside className="toolbar">
      <div className="toolbar-top">
        <button
          className={`icon-btn ${activeTab === "home" ? "active" : ""}`}
          onClick={() => onChangeTab("home")}
          title="Home"
        >
          🏠
        </button>

        <button
          className={`icon-btn ${activeTab === "data-import" ? "active" : ""}`}
          onClick={() => onChangeTab("data-import")}
          title="Upload / Import data"
        >
          🗺
        </button>

        <button
          className={`icon-btn ${activeTab === "scenarios" ? "active" : ""}`}
          onClick={() => onChangeTab("scenarios")}
          title="Scenarios"
        >
          📊Scenario
        </button>
      </div>
    </aside>
  );
}
