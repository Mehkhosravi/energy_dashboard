// src/components/LayersFiltersPanel.tsx
import { useEffect, useState, type ReactNode } from "react";
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

/** QGIS-like tree node with connectors + checkbox + optional color swatch + children */
type TreeNodeProps = {
  label: string;
  checked?: boolean;
  onCheck?: () => void;
  defaultOpen?: boolean;
  swatchColor?: string;
  isLast?: boolean; // for connector drawing (spine stop)
  children?: ReactNode;
};

function TreeNode({
  label,
  checked = false,
  onCheck,
  defaultOpen = true,
  swatchColor,
  isLast = false,
  children,
}: TreeNodeProps) {
  const hasChildren = Boolean(children);
  const [open, setOpen] = useState(defaultOpen);

  // nice UX: if the group becomes checked, expand it
  useEffect(() => {
    if (hasChildren && checked) setOpen(true);
  }, [checked, hasChildren]);

  return (
    <div className={`qgis-node ${isLast ? "is-last" : ""}`}>
      <div className="qgis-row">
        {/* ✅ toggle column ALWAYS reserved (aligns elbows) */}
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

        <input type="checkbox" checked={checked} onChange={onCheck} />

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

type ProductionType =
  | "all"
  | "solar"
  | "wind"
  | "hydroelectric"
  | "geothermal"
  | "biomass";

type ConsumptionSector =
  | "all"
  | "residential"
  | "primary"
  | "secondary"
  | "tertiary";

export default function LayersFiltersPanel() {
  const {
    filters,
    setTheme,
    setScale,
    setTimeResolution,
    toggleOverlay,
    setConsumptionBaseGroup,
  } = useMapFilters();

  const [productionType, setProductionType] = useState<ProductionType>("all");
  const [consumptionSector, setConsumptionSector] =
    useState<ConsumptionSector>("all");

  // reset sub-filters when switching main theme (good UX)
  useEffect(() => {
    if (filters.theme === "production") setProductionType("all");
    if (filters.theme === "consumption") setConsumptionSector("all");
  }, [filters.theme]);

  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScale(e.target.value as SpatialScale);
  };

  const selectConsumption = (v: ConsumptionSector) => {
    setConsumptionSector(v);

    // maps to backend base_group for consumption
    if (v === "all") {
      setConsumptionBaseGroup(null);
    } else if (v === "residential") {
      setConsumptionBaseGroup("domestic");
    } else {
      setConsumptionBaseGroup(v as "primary" | "secondary" | "tertiary");
    }
  };

  const selectProduction = (v: ProductionType) => {
    setProductionType(v);
    // UI-only for now (later: setProductionBaseGroup(...) in context)
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
            onCheck={() => setTheme("consumption")}
            defaultOpen={true}
          >
            <TreeNode
              label="All"
              checked={consumptionSector === "all"}
              onCheck={() => selectConsumption("all")}
              swatchColor="#9ca3af"
            />
            <TreeNode
              label="Residential"
              checked={consumptionSector === "residential"}
              onCheck={() => selectConsumption("residential")}
              swatchColor="#facc15" // yellow
            />
            <TreeNode
              label="Primary"
              checked={consumptionSector === "primary"}
              onCheck={() => selectConsumption("primary")}
              swatchColor="#c4a484" // light brown
            />
            <TreeNode
              label="Secondary"
              checked={consumptionSector === "secondary"}
              onCheck={() => selectConsumption("secondary")}
              swatchColor="#a3a3a3"
            />
            <TreeNode
              label="Tertiary"
              checked={consumptionSector === "tertiary"}
              onCheck={() => selectConsumption("tertiary")}
              swatchColor="#f59e0b" // orange
              isLast
            />
          </TreeNode>

          {/* Root 2 */}
          <TreeNode
            label="Production"
            checked={filters.theme === "production"}
            onCheck={() => setTheme("production")}
            defaultOpen={true}
          >
            <TreeNode
              label="All"
              checked={productionType === "all"}
              onCheck={() => selectProduction("all")}
              swatchColor="#9ca3af"
            />
            <TreeNode
              label="Solar"
              checked={productionType === "solar"}
              onCheck={() => selectProduction("solar")}
              swatchColor="#fbbf24"
            />
            <TreeNode
              label="Wind"
              checked={productionType === "wind"}
              onCheck={() => selectProduction("wind")}
              swatchColor="#60a5fa"
            />
            <TreeNode
              label="Hydro-electric"
              checked={productionType === "hydroelectric"}
              onCheck={() => selectProduction("hydroelectric")}
              swatchColor="#34d399"
            />
            <TreeNode
              label="Geothermal"
              checked={productionType === "geothermal"}
              onCheck={() => selectProduction("geothermal")}
              swatchColor="#fb7185"
            />
            <TreeNode
              label="Biomass"
              checked={productionType === "biomass"}
              onCheck={() => selectProduction("biomass")}
              swatchColor="#a78bfa"
              isLast
            />
          </TreeNode>

          {/* Root 3 (last root) */}
          <TreeNode
            label="Future potential"
            checked={filters.theme === "future_potential"}
            onCheck={() => setTheme("future_potential")}
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
