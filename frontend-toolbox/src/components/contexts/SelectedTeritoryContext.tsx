import React, { createContext, useContext, useMemo, useState } from "react";

export type TerritoryLevel = "region" | "province" | "municipality";

export type SelectedTerritory = {
  level: TerritoryLevel;
  name: string;

  reg_cod: number;
  region: string;

  prov_cod: number | null;
  province: string | null;

  mun_cod: number | null;
};

type Ctx = {
  selectedTerritory: SelectedTerritory | null;
  setSelectedTerritory: (t: SelectedTerritory | null) => void;
};

const SelectedTerritoryContext = createContext<Ctx | undefined>(undefined);

export function SelectedTerritoryProvider({ children }: { children: React.ReactNode }) {
  const [selectedTerritory, setSelectedTerritory] = useState<SelectedTerritory | null>(null);

  const value = useMemo(
    () => ({ selectedTerritory, setSelectedTerritory }),
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
  if (!ctx) throw new Error("useSelectedTerritory must be used inside SelectedTerritoryProvider");
  return ctx;
}
