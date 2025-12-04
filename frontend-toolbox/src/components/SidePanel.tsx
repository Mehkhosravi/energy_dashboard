// src/components/SidePanel.tsx
import { type ReactNode } from "react";

type SidePanelProps = {
  onClose: () => void;
  children: ReactNode;
};

export default function SidePanel({ onClose, children }: SidePanelProps) {
  return (
    <aside className="side-panel">
      <div className="side-header">
        <span>Layers & Filters</span>
        <button className="icon-btn-sm" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="side-body">{children}</div>
    </aside>
  );
}
