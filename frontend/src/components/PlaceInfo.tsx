// src/components/PlaceInfo.tsx
import { useSelectedTerritory } from "./contexts/SelectedTerritoryContext";

function buildLabel(t: {
  level: "region" | "province" | "municipality";
  name: string;
  parent?: { region?: string; province?: string };
}) {
  // Region
  if (t.level === "region") return `Region of ${t.name}`;

  // Province (+ region if available)
  if (t.level === "province") {
    const r = t.parent?.region;
    return r ? `Province of ${t.name} (Region: ${r})` : `Province of ${t.name}`;
  }

  // Municipality (+ province/region if available)
  const p = t.parent?.province;
  const r = t.parent?.region;

  const parts: string[] = [];
  if (p) parts.push(`Province: ${p}`);
  if (r) parts.push(`Region: ${r}`);

  return parts.length
    ? `Municipality of ${t.name} (${parts.join(", ")})`
    : `Municipality of ${t.name}`;
}

export default function PlaceInfo() {
  // Single source of truth for the selected place
  const { selectedTerritory } = useSelectedTerritory();

  // Empty state (nothing selected yet)
  if (!selectedTerritory) {
    return (
      <div className="map-info">
        <span className="map-info-header">No territory selected</span>
      </div>
    );
  }

  return (
    <div className="map-info">
      {/* Human-readable label derived from level + parent hierarchy */}
      <span className="map-info-header">{buildLabel(selectedTerritory)}</span>
    </div>
  );
}
