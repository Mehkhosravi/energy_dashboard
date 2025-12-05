import { useState, type ReactNode } from "react";

type DataTheme = "consumption" | "production" | "future_potential";
type SpatialScale = "region" | "province" | "municipality";
type TemporalResolution = "annual" | "monthly" | "daily" | "hourly";
type ConstraintOverlay = "heritage" | "air_quality" | "high_altitude";

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
  // defaults:
  // - theme: consumption
  // - spatial level: province
  // - time scale: annual
  // - constraints: none
  const [theme, setTheme] = useState<DataTheme>("consumption");
  const [scale, setScale] = useState<SpatialScale>("province");
  const [timeResolution, setTimeResolution] =
    useState<TemporalResolution>("annual");
  const [overlays, setOverlays] = useState<ConstraintOverlay[]>([]);

  const toggleOverlay = (o: ConstraintOverlay) => {
    setOverlays((prev) =>
      prev.includes(o) ? prev.filter((v) => v !== o) : [...prev, o]
    );
  };

  return (
    <div className="layers-filters-panel">
      {/* Energy category (single select) */}
      <Section
        title="Energy category"
        info="Choose whether to analyse consumption, production or future potential."
      >
        <div className="side-option-group">
          <label className="side-option">
            <input
              type="radio"
              name="dataTheme"
              checked={theme === "consumption"}
              onChange={() => setTheme("consumption")}
            />
            <span>Consumption</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="dataTheme"
              checked={theme === "production"}
              onChange={() => setTheme("production")}
            />
            <span>Production</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="dataTheme"
              checked={theme === "future_potential"}
              onChange={() => setTheme("future_potential")}
            />
            <span>Future potential</span>
          </label>
        </div>
      </Section>

      {/* Spatial level */}
      <Section
        title="Spatial level"
        info="Select the territorial aggregation: region, province or municipality."
      >
        <div className="side-option-group">
          <label className="side-option">
            <input
              type="radio"
              name="scale"
              checked={scale === "region"}
              onChange={() => setScale("region")}
            />
            <span>Region</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="scale"
              checked={scale === "province"}
              onChange={() => setScale("province")}
            />
            <span>Province</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="scale"
              checked={scale === "municipality"}
              onChange={() => setScale("municipality")}
            />
            <span>Municipality</span>
          </label>
        </div>
      </Section>

      {/* Time scale */}
      <Section
        title="Time scale"
        info="Control how the data is aggregated in time (annual, monthly, daily, hourly)."
      >
        <div className="side-option-group">
          <label className="side-option">
            <input
              type="radio"
              name="timeResolution"
              checked={timeResolution === "annual"}
              onChange={() => setTimeResolution("annual")}
            />
            <span>Annual</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="timeResolution"
              checked={timeResolution === "monthly"}
              onChange={() => setTimeResolution("monthly")}
            />
            <span>Monthly</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="timeResolution"
              checked={timeResolution === "daily"}
              onChange={() => setTimeResolution("daily")}
            />
            <span>Daily</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="timeResolution"
              checked={timeResolution === "hourly"}
              onChange={() => setTimeResolution("hourly")}
            />
            <span>Hourly</span>
          </label>
        </div>
      </Section>

      {/* Context & constraints */}
      <Section
        title="Context & constraints"
        info="Toggle additional map overlays that highlight constraints or sensitive areas."
      >
        <div className="side-option-group">
          <label className="side-option">
            <input
              type="checkbox"
              checked={overlays.includes("heritage")}
              onChange={() => toggleOverlay("heritage")}
            />
            <span>Cultural heritage zones</span>
          </label>

          <label className="side-option">
            <input
              type="checkbox"
              checked={overlays.includes("air_quality")}
              onChange={() => toggleOverlay("air_quality")}
            />
            <span>Air quality risk areas</span>
          </label>

          <label className="side-option">
            <input
              type="checkbox"
              checked={overlays.includes("high_altitude")}
              onChange={() => toggleOverlay("high_altitude")}
            />
            <span>High-altitude zones</span>
          </label>
        </div>
      </Section>
    </div>
  );
}
