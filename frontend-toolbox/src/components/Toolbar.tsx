// src/components/Toolbar.tsx

export default function Toolbar() {
  return (
    <aside className="toolbar">
      <div className="toolbar-top">
        <button className="icon-btn active">🏠</button>
        <button className="icon-btn">🗺</button>
        <button className="icon-btn">📊</button>
      </div>
      <div className="toolbar-bottom">
        <button className="icon-btn">⚙️</button>
      </div>
    </aside>
  );
}
