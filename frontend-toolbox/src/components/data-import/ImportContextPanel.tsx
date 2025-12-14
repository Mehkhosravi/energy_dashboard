// src/components/data-import/ImportContextPanel.tsx
export default function ImportContextPanel() {
  return (
    <div className="side-section">
      <button className="side-section-header" type="button">
        <span className="side-section-title">Import context</span>
      </button>

      <div className="side-section-body">
        <div className="side-option-group">
          <label className="side-option">
            <span>Spatial level</span>
            <select className="search">
              <option>Region</option>
              <option>Province</option>
              <option>Municipality</option>
            </select>
          </label>

          <label className="side-option">
            <span>Energy domain</span>
            <select className="search">
              <option>Consumption</option>
              <option>Production</option>
              <option>Future production</option>
            </select>
          </label>

          <label className="side-option">
            <span>Energy source</span>
            <select className="search">
              <option>Solar</option>
              <option>Wind</option>
              <option>Hydro</option>
              <option>Biomass</option>
              <option>Geothermal</option>
            </select>
          </label>

          <label className="side-option">
            <span>Time resolution</span>
            <select className="search">
              <option>Annual</option>
              <option>Monthly</option>
              <option>Daily</option>
              <option>Hourly</option>
            </select>
          </label>

          <label className="side-option">
            <span>Year</span>
            <input
              type="number"
              className="search"
              placeholder="2019"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
