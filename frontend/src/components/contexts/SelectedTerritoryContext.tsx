// src/components/contexts/SelectedTerritoryContext.tsx
//
// Default selection: Province of Torino

import { createContext, useContext, useMemo, useState } from "react";
import type { TerritoryLevel } from "../TerritoryLevel";
import { TERRITORIES } from "../TerritoryLevel";

export type SelectedTerritory = {
  level: TerritoryLevel;
  name: string;
  codes: {
    reg: number;
    prov?: number;
    mun?: number;
  };
  parent?: {
    region?: string;
    province?: string;
  };
};

type SelectedTerritoryContextValue = {
  selectedTerritory: SelectedTerritory | null;
  setSelectedTerritory: (t: SelectedTerritory | null) => void;
  clearSelectedTerritory: () => void;
};

const SelectedTerritoryContext = createContext<
  SelectedTerritoryContextValue | undefined
>(undefined);

// ✅ Exact match for your Torino entry
function getDefaultTorinoProvince(): SelectedTerritory | null {
  const torino = TERRITORIES.find(
    (t) => t.level === "province" && t.name === "Torino"
  );

  if (!torino) return null;

  return {
    level: torino.level,
    name: torino.name,
    codes: torino.codes,
    parent: torino.parent,
  };
}

export function SelectedTerritoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ Default is Torino province (codes.reg=1, codes.prov=1)
  const [selectedTerritory, setSelectedTerritory] =
    useState<SelectedTerritory | null>(() => getDefaultTorinoProvince());

  const value = useMemo(
    () => ({
      selectedTerritory,
      setSelectedTerritory,
      clearSelectedTerritory: () => setSelectedTerritory(null),
    }),
    [selectedTerritory]
  );

  return (
    <SelectedTerritoryContext.Provider value={value}>
      {children}
    </SelectedTerritoryContext.Provider>
  );
}

export function useSelectedTerritory() {
  const ctx = useContext(SelectedTerritoryContext);
  if (!ctx) {
    throw new Error(
      "useSelectedTerritory must be used within SelectedTerritoryProvider"
    );
  }
  return ctx;
}
