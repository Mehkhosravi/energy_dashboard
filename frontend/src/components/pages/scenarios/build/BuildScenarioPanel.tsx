// src/pages/scenarios/build/BuildScenarioPanel.tsx
type Props = {
  state: any;
  setState: React.Dispatch<React.SetStateAction<any>>;
};

export default function BuildScenarioPanel({ state: _state, setState: _setState }: Props) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">Build scenario</div>
          <div className="panel-subtitle">Create a custom scenario from parameter edits</div>
        </div>
        <button className="btn primary">Create</button>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">Parameter editor</div>
          <div className="hint">
            This will be your “sheet-like” editable table: param_key, value, units,
            description.
          </div>
          <div className="table-placeholder">Editable table placeholder</div>
        </div>

        <div className="card">
          <div className="card-title">Preview</div>
          <div className="hint">
            Quick summary: uplift %, expected production/consumption deltas, warnings.
          </div>
          <div className="chart-placeholder">Preview chart placeholder</div>
        </div>
      </div>
    </div>
  );
}
