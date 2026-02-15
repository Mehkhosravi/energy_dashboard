// src/components/data-import/ImportContextPanel.tsx
import { useMemo, useState } from "react";

type SpatialLevel = "region" | "province" | "municipality";
type EnergyDomain = "consumption" | "production" | "future_production";

export default function ImportContextPanel() {
  const [spatialLevel, setSpatialLevel] = useState<SpatialLevel | "">("");
  const [energyDomain, setEnergyDomain] = useState<EnergyDomain | "">("");
  const [energyType, setEnergyType] = useState<string>(""); // consumer type OR source type
  const [timeResolution, setTimeResolution] = useState<string>("");
  const [year, setYear] = useState<string>("");

  const isConsumption = energyDomain === "consumption";
  const isProduction = energyDomain === "production";
  const isFutureProduction = energyDomain === "future_production";

  const energyTypeLabel = isConsumption ? "Consumer type" : "Source type";
  const energyTypePlaceholder = isConsumption
    ? "Select the consumer type"
    : "Select the source type";

  const energyTypeOptions = useMemo(() => {
    if (isConsumption) {
      return [
        { value: "residential", label: "Residential" },
        { value: "primary", label: "Primary sector" },
        { value: "secondary", label: "Secondary sector" },
        { value: "tertiary", label: "Tertiary sector" },
      ];
    }
    if (isProduction) {
      return [
        { value: "solar", label: "Solar" },
        { value: "wind", label: "Wind" },
        { value: "hydroelectric", label: "Hydroelectric" },
        { value: "geothermal", label: "Geothermal" },
        { value: "biomass", label: "Biomass" },
      ];
    }
    if (isFutureProduction) {
      return [
        { value: "wind", label: "Wind" },
        { value: "biomass", label: "Biomass" },
      ];
    }
    return [];
  }, [isConsumption, isProduction, isFutureProduction]);

  const onChangeDomain = (v: EnergyDomain | "") => {
    setEnergyDomain(v);
    setEnergyType("");
  };

  return (
    <div className="side-section">
      <button className="side-section-header" type="button">
        <span className="side-section-title">Import context</span>
      </button>

      <div className="side-section-body">
        <div className="side-option-group">
          <label className="side-option side-option--inline">
            <span className="side-option-label">Spatial level</span>
            <select
              className="search"
              value={spatialLevel}
              onChange={(e) =>
                setSpatialLevel(e.target.value as SpatialLevel | "")
              }
            >
              <option value="" disabled hidden>
                Select the spatial level
              </option>
              <option value="region">Region</option>
              <option value="province">Province</option>
              <option value="municipality">Municipality</option>
            </select>
          </label>

          <label className="side-option side-option--inline">
            <span className="side-option-label">Energy domain</span>
            <select
              className="search"
              value={energyDomain}
              onChange={(e) =>
                onChangeDomain(e.target.value as EnergyDomain | "")
              }
            >
              <option value="" disabled hidden>
                Select the energy domain
              </option>
              <option value="consumption">Consumption</option>
              <option value="production">Production</option>
              <option value="future_production">Future production</option>
            </select>
          </label>

          <label className="side-option side-option--inline">
            <span className="side-option-label">{energyTypeLabel}</span>
            <select
              className="search"
              value={energyType}
              onChange={(e) => setEnergyType(e.target.value)}
              disabled={!energyDomain}
            >
              <option value="" disabled hidden>
                {energyTypePlaceholder}
              </option>
              {energyTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="side-option side-option--inline">
            <span className="side-option-label">Time resolution</span>
            <select
              className="search"
              value={timeResolution}
              onChange={(e) => setTimeResolution(e.target.value)}
            >
              <option value="" disabled hidden>
                Select the time resolution
              </option>
              <option value="annual">Annual</option>
              <option value="monthly">Monthly</option>
              <option value="daily">Daily</option>
              <option value="hourly">Hourly</option>
            </select>
          </label>

          <label className="side-option side-option--inline">
            <span className="side-option-label">Year</span>
            <input
              type="number"
              className="search"
              placeholder="Select the year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
