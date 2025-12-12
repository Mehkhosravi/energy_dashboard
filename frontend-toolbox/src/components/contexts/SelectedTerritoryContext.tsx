// src/components/contexts/SelectedTerritoryContext.tsx
//
// Why this context exists:
// - You need ONE single “source of truth” for what the user selected from the search bar.
// - The user can select: region / province / municipality.
// - Map + charts + KPI cards should all react to the same selection.
// - Storing the selected territory in one place prevents conflicts like:
//   “search selected municipality but charts still show previous province”.

import React, { createContext, useContext, useMemo, useState } from "react";
import type { TerritoryLevel } from "../TerritoryLevel";

// This is the exact object you will store globally after a user selects
// something in the search bar.
export type SelectedTerritory = {
  level: TerritoryLevel;
  name: string;

  // Codes are what your backend will use to query energy + geometry
  // without relying on string matching.
  codes: {
    reg: number;
    prov?: number; // present when level is province or municipality
    mun?: number;  // present when level is municipality
  };

  // Parent names are UI-friendly metadata for displaying hierarchy.
  // (not strictly required for querying, but very useful for meta labels)
  parent?: {
    region?: string;
    province?: string;
  };
};

type SelectedTerritoryContextValue = {
  // The currently selected territory (or null if nothing selected yet)
  selectedTerritory: SelectedTerritory | null;

  // Set the selected territory (called by MapShell when user selects an item)
  setSelectedTerritory: (t: SelectedTerritory | null) => void;

  // Convenience helper for clearing selection (optional, but handy)
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
  const [selectedTerritory, setSelectedTerritory] =
    useState<SelectedTerritory | null>(null);

  // useMemo prevents re-renders of consumers when the object identity would
  // otherwise change unnecessarily.
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
