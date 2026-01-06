// src/pages/scenarios/compare/CompareScenariosPanel.tsx
type Props = {
  state: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
};

export default function CompareScenariosPanel({ state }: Props) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Compare scenarios</div>
          <div className="panel-subtitle">
            Compare selected scenarios for current Level/Year/Metric
          </div>
        </div>
        <button className="btn">Refresh</button>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Dot / ranking chart</div>
          <div className="chart-placeholder">Dot chart placeholder</div>
        </div>
        <div className="card">
          <div className="card-title">Table</div>
          <div className="table-placeholder">
            Scenario rows with values + deltas vs baseline + sorted columns
          </div>
        </div>
      </div>
    </div>
  );
}
