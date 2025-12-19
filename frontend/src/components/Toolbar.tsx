// src/components/Toolbar.tsx
import  type {AppTab} from "../types/AppTab";

type ToolbarProps = {
  activeTab: AppTab;
  onChangeTab: (tab: AppTab) => void;
};

export default function Toolbar({ activeTab, onChangeTab }: ToolbarProps) {
  return (
    <aside className="toolbar">
      <div className="toolbar-top">
        <button className="icon-btn active">🏠</button>
        <button 
        className={`icon-btn ${activeTab === "data-import" ? "active" : ""}`}
          onClick={() => {console.log("Switched to data-import tab");
            onChangeTab("data-import");
                          }
          }
        
        >🗺</button>
        <button className="icon-btn">📊</button>
      </div>
      <div className="toolbar-bottom">
        <button className="icon-btn">⚙️</button>
      </div>
    </aside>
  );
}
