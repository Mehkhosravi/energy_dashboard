// src/components/contexts/SelectedTerritoryContext.tsx

import { createContext, useContext, useMemo, useState } from "react";
import type { TerritoryLevel } from "../TerritoryLevel";

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

export function SelectedTerritoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // ✅ no default
  const [selectedTerritory, setSelectedTerritory] =
    useState<SelectedTerritory | null>(null);

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
