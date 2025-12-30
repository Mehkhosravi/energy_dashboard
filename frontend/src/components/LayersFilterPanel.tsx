// src/components/LayersFiltersPanel.tsx
import { useEffect, useState, type ReactNode } from "react";
import { useSelectedTerritory } from "./contexts/SelectedTerritoryContext";
import { useMapFilters } from "./contexts/MapFiltersContext";

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

/**
 * Professional UX behavior:
 * When user changes the spatial scale manually, keep context by "promoting" selection:
 *  - municipality -> province / region
 *  - province -> region
 *  - region -> (cannot expand), keep selection unchanged
 */
function promoteSelectionToScale(
  current: ReturnType<typeof useSelectedTerritory>["selectedTerritory"],
  targetScale: "region" | "province" | "municipality"
) {
  if (!current) return null;

  // already matches
  if (current.level === targetScale) return current;

  // --- Promote down? (region -> province/municipality) is not safe without extra info.
  // Keep selection unchanged.
  if (current.level === "region" && targetScale !== "region") {
    return current;
  }

  // municipality -> province
  if (current.level === "municipality" && targetScale === "province") {
    const reg = current.codes?.reg;
    const prov = current.codes?.prov;

    if (typeof reg !== "number" || typeof prov !== "number") return current;

    return {
      level: "province" as const,
      name: current.parent?.province ?? current.name, // best effort label
      codes: { reg, prov },
      parent: { region: current.parent?.region, province: current.parent?.province },
    };
  }

  // municipality -> region
  if (current.level === "municipality" && targetScale === "region") {
    const reg = current.codes?.reg;
    if (typeof reg !== "number") return current;

    return {
      level: "region" as const,
      name: current.parent?.region ?? "Region",
      codes: { reg },
      parent: { region: current.parent?.region },
    };
  }

  // province -> region
  if (current.level === "province" && targetScale === "region") {
    const reg = current.codes?.reg;
    if (typeof reg !== "number") return current;

    return {
      level: "region" as const,
      name: current.parent?.region ?? "Region",
      codes: { reg },
      parent: { region: current.parent?.region },
    };
  }

  return current;
}

export default function LayersFiltersPanel() {
  const { selectedTerritory, setSelectedTerritory } = useSelectedTerritory();
  const {
    filters,
    setTheme,
    setScale,
    setTimeResolution,
    setScaleMode,
    toggleOverlay,
  } = useMapFilters();

  // ✅ AUTO mode: scale follows selection level
  useEffect(() => {
    if (filters.scaleMode !== "auto") return;

    const nextScale =
      selectedTerritory?.level === "region"
        ? "region"
        : selectedTerritory?.level === "province"
        ? "province"
        : selectedTerritory?.level === "municipality"
        ? "municipality"
        : null;

    if (!nextScale) return;
    if (filters.scale === nextScale) return;

    setScale(nextScale);
  }, [selectedTerritory?.level, filters.scaleMode, filters.scale, setScale]);

  // ✅ MANUAL mode handler (professional UX)
  const handleManualScaleChange = (target: "region" | "province" | "municipality") => {
    setScaleMode("manual");

    // Promote selection if needed (don’t lose user context)
    const promoted = promoteSelectionToScale(selectedTerritory, target);
    if (promoted && promoted !== selectedTerritory) {
      setSelectedTerritory(promoted);
    }

    setScale(target);
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
              checked={filters.scale === "region"}
              onChange={() => handleManualScaleChange("region")}
            />
            <span>Region</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="scale"
              checked={filters.scale === "province"}
              onChange={() => handleManualScaleChange("province")}
            />
            <span>Province</span>
          </label>

          <label className="side-option">
            <input
              type="radio"
              name="scale"
              checked={filters.scale === "municipality"}
              onChange={() => handleManualScaleChange("municipality")}
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
