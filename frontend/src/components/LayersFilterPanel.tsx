// src/components/LayersFiltersPanel.tsx
import { useEffect, useState, useMemo, type ReactNode } from "react";
import { useMapFilters, type SpatialScale } from "./contexts/MapFiltersContext";

import {
  type ProductionType,
  type ConsumptionSector,
  CONSUMPTION_SWATCH,
  PRODUCTION_SWATCH,
  CONSUMPTION_LABEL,
  PRODUCTION_LABEL,
  PRODUCTION_ICON,
  makeSequentialFromBase,
} from "./LayersFilters.assets";

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

/** QGIS-like tree node with connectors + checkbox + optional icon + swatch + children */
type TreeNodeProps = {
  label: string;
  checked?: boolean;
  onCheck?: () => void;
  defaultOpen?: boolean;
  swatchColor?: string | null;
  icon?: ReactNode;
  isLast?: boolean;
  children?: ReactNode;
};

function TreeNode({
  label,
  checked = false,
  onCheck,
  defaultOpen = true,
  swatchColor,
  icon,
  isLast = false,
  children,
}: TreeNodeProps) {
  const hasChildren = Boolean(children);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (hasChildren && checked) setOpen(true);
  }, [checked, hasChildren]);

  const nodeClassName = [
    "qgis-node",
    isLast ? "is-last" : "",
    hasChildren && open ? "has-open-children" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={nodeClassName}>
      <div className="qgis-row">
        {hasChildren ? (
          <button
            type="button"
            className="qgis-toggle"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Collapse" : "Expand"}
          >
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="qgis-toggle-placeholder" />
        )}

        <span className="qgis-check-anchor">
          <input type="checkbox" checked={checked} onChange={onCheck} />
        </span>

        {/* icon slot (production children) */}
        {icon ? <span className="qgis-icon">{icon}</span> : null}

        {swatchColor ? (
          <span className="qgis-swatch" style={{ background: swatchColor }} />
        ) : (
          <span className="qgis-swatch qgis-swatch--empty" />
        )}

        <span className="qgis-label">{label}</span>
      </div>

      {hasChildren && open && <div className="qgis-children">{children}</div>}
    </div>
  );
}

function ConsumptionSequentialLegend({
  baseColor,
  title,
}: {
  baseColor: string;
  title: string;
}) {
  const colors = makeSequentialFromBase(baseColor);

  return (
    <div className="consumption-seq">
      <div className="consumption-seq-title">{title}</div>
      <div className="consumption-seq-bar">
        {colors.map((c) => (
          <span
            key={c}
            className="consumption-seq-step"
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="consumption-seq-hint">Low → High intensity</div>
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
    setBaseGroup,
  } = useMapFilters();

  // Derived state from context
  const productionType = (filters.theme === "production" && filters.baseGroup) 
    ? (filters.baseGroup as ProductionType) 
    : "all";

  const consumptionSector = useMemo(() => {
    if (filters.theme !== "consumption") return "all";
    if (!filters.baseGroup) return "all";
    if (filters.baseGroup === "domestic") return "residential";
    return filters.baseGroup as ConsumptionSector;
  }, [filters.theme, filters.baseGroup]);

  // Removed local state effect


  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScale(e.target.value as SpatialScale);
  };

  const selectConsumption = (v: ConsumptionSector) => {
    if (v === "all") {
      setBaseGroup(null);
    } else if (v === "residential") {
      setBaseGroup("domestic");
    } else {
      setBaseGroup(v as "primary" | "secondary" | "tertiary");
    }
  };

  const selectProduction = (v: ProductionType) => {
    if (v === "all") setBaseGroup(null);
    else setBaseGroup(v as any);
  };
  
  const handleThemeChange = (newTheme: "consumption" | "production" | "future_potential") => {
    setTheme(newTheme);
    setBaseGroup(null); // Reset filter when switching theme
  };

  return (
    <div className="layers-filters-panel">
      <Section
        title="Energy category"
        info="Choose whether to analyse consumption, production or future potential."
      >
        <div className="qgis-tree">
          {/* Root 1 */}
          <TreeNode
            label="Consumption"
            checked={filters.theme === "consumption"}
            onCheck={() => handleThemeChange("consumption")}
            defaultOpen={true}
          >
            <TreeNode
              label={CONSUMPTION_LABEL.all}
              checked={consumptionSector === "all"}
              onCheck={() => selectConsumption("all")}
              swatchColor={CONSUMPTION_SWATCH.all}
            />
            <TreeNode
              label={CONSUMPTION_LABEL.residential}
              checked={consumptionSector === "residential"}
              onCheck={() => selectConsumption("residential")}
              swatchColor={CONSUMPTION_SWATCH.residential}
            />
            <TreeNode
              label={CONSUMPTION_LABEL.primary}
              checked={consumptionSector === "primary"}
              onCheck={() => selectConsumption("primary")}
              swatchColor={CONSUMPTION_SWATCH.primary}
            />
            <TreeNode
              label={CONSUMPTION_LABEL.secondary}
              checked={consumptionSector === "secondary"}
              onCheck={() => selectConsumption("secondary")}
              swatchColor={CONSUMPTION_SWATCH.secondary}
            />
            <TreeNode
              label={CONSUMPTION_LABEL.tertiary}
              checked={consumptionSector === "tertiary"}
              onCheck={() => selectConsumption("tertiary")}
              swatchColor={CONSUMPTION_SWATCH.tertiary}
              isLast
            />

            {/* ✅ sequential legend ONLY for consumption + specific sector */}
            {filters.theme === "consumption" &&
              consumptionSector !== "all" &&
              CONSUMPTION_SWATCH[consumptionSector] && (
                <ConsumptionSequentialLegend
                  baseColor={CONSUMPTION_SWATCH[consumptionSector]!}
                  title={`Scale for ${CONSUMPTION_LABEL[consumptionSector]}`}
                />
              )}
          </TreeNode>

          {/* Root 2 */}
          <TreeNode
            label="Production"
            checked={filters.theme === "production"}
            onCheck={() => handleThemeChange("production")}
            defaultOpen={true}
          >
            <TreeNode
              label={PRODUCTION_LABEL.all}
              checked={productionType === "all"}
              onCheck={() => selectProduction("all")}
              swatchColor={PRODUCTION_SWATCH.all}
              icon={PRODUCTION_ICON.all}
            />
            <TreeNode
              label={PRODUCTION_LABEL.solar}
              checked={productionType === "solar"}
              onCheck={() => selectProduction("solar")}
              swatchColor={PRODUCTION_SWATCH.solar}
              icon={PRODUCTION_ICON.solar}
            />
            <TreeNode
              label={PRODUCTION_LABEL.wind}
              checked={productionType === "wind"}
              onCheck={() => selectProduction("wind")}
              swatchColor={PRODUCTION_SWATCH.wind}
              icon={PRODUCTION_ICON.wind}
            />
            <TreeNode
              label={PRODUCTION_LABEL.hydroelectric}
              checked={productionType === "hydroelectric"}
              onCheck={() => selectProduction("hydroelectric")}
              swatchColor={PRODUCTION_SWATCH.hydroelectric}
              icon={PRODUCTION_ICON.hydroelectric}
            />
            <TreeNode
              label={PRODUCTION_LABEL.geothermal}
              checked={productionType === "geothermal"}
              onCheck={() => selectProduction("geothermal")}
              swatchColor={PRODUCTION_SWATCH.geothermal}
              icon={PRODUCTION_ICON.geothermal}
            />
            <TreeNode
              label={PRODUCTION_LABEL.biomass}
              checked={productionType === "biomass"}
              onCheck={() => selectProduction("biomass")}
              swatchColor={PRODUCTION_SWATCH.biomass}
              icon={PRODUCTION_ICON.biomass}
              isLast
            />
          </TreeNode>

          {/* Root 3 */}
          <TreeNode
            label="Future potential"
            checked={filters.theme === "future_potential"}
            onCheck={() => handleThemeChange("future_potential")}
            defaultOpen={false}
            isLast
          />
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
