// src/components/LayersFiltersPanel.tsx
import { useState, type ReactNode } from "react";
import { useMapFilters, type SpatialScale } from "./contexts/MapFiltersContext";

type SectionProps = {
  title: string;
  info?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

function Section({ title, info, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="side-section">
      <button
        type="button"
        className="side-section-header"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="side-section-title-wrap">
          <span className="side-section-title">{title}</span>
          {info && <span className="side-section-subtitle">{info}</span>}
        </div>
        <span className="side-section-toggle">{open ? "▾" : "▸"}</span>
      </button>

      {open && <div className="side-section-body">{children}</div>}
    </div>
  );
}

export default function LayersFiltersPanel() {
  const {
    filters,
    setTheme,
    setScale,
    setTimeResolution,
    toggleOverlay,
  } = useMapFilters();

  // Note: removed automatic sync with SelectedTerritory to avoid coupling between selection and filters.

  const handleManualScaleChange = (target: SpatialScale) => {
    setScale(target);
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleManualScaleChange(e.target.value as SpatialScale);
  };

  return (
    <div className="layers-filters-panel">
      <Section
        title="Energy category"
        info="Choose whether to analyse consumption, production or future potential."
      >
        <div className="side-option-group">
          <label className="side-option">
            <input
              type="radio"
              name="dataTheme"
              checked={filters.theme === "consumption"}
              onChange={() => setTheme("consumption")}
            />
            <span>Consumption</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="dataTheme"
              checked={filters.theme === "production"}
              onChange={() => setTheme("production")}
            />
            <span>Production</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="dataTheme"
              checked={filters.theme === "future_potential"}
              onChange={() => setTheme("future_potential")}
            />
            <span>Future potential</span>
          </label>
        </div>
      </Section>

      <Section
        title="Spatial level"
        info="Select the territorial aggregation: region, province or municipality."
      >
        <div className="side-option-group">
          <label className="side-option">
            <input
              type="radio"
              name="scale"
              value="region"
              checked={filters.scale === "region"}
              onChange={handleScaleChange}
            />
            <span>Region</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="scale"
              value="province"
              checked={filters.scale === "province"}
              onChange={handleScaleChange}
            />
            <span>Province</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="scale"
              value="municipality"
              checked={filters.scale === "municipality"}
              onChange={handleScaleChange}
            />
            <span>Municipality</span>
          </label>
        </div>
      </Section>

      <Section
        title="Time scale"
        info="Control how the data is aggregated in time (annual, monthly, daily, hourly)."
      >
        <div className="side-option-group">
          <label className="side-option">
            <input
              type="radio"
              name="timeResolution"
              checked={filters.timeResolution === "annual"}
              onChange={() => setTimeResolution("annual")}
            />
            <span>Annual</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="timeResolution"
              checked={filters.timeResolution === "monthly"}
              onChange={() => setTimeResolution("monthly")}
            />
            <span>Monthly</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="timeResolution"
              checked={filters.timeResolution === "daily"}
              onChange={() => setTimeResolution("daily")}
            />
            <span>Daily</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="timeResolution"
              checked={filters.timeResolution === "hourly"}
              onChange={() => setTimeResolution("hourly")}
            />
            <span>Hourly</span>
          </label>
        </div>
      </Section>

      <Section
        title="Context & constraints"
        info="Toggle additional map overlays that highlight constraints or sensitive areas."
      >
        <div className="side-option-group">
          <label className="side-option">
            <input
              type="checkbox"
              checked={filters.overlays.includes("heritage")}
              onChange={() => toggleOverlay("heritage")}
            />
            <span>Cultural heritage zones</span>
          </label>

          <label className="side-option">
            <input
              type="checkbox"
              checked={filters.overlays.includes("air_quality")}
              onChange={() => toggleOverlay("air_quality")}
            />
            <span>Air quality risk areas</span>
          </label>

          <label className="side-option">
            <input
              type="checkbox"
              checked={filters.overlays.includes("high_altitude")}
              onChange={() => toggleOverlay("high_altitude")}
            />
            <span>High-altitude zones</span>
          </label>
        </div>
      </Section>
    </div>
  );
}
