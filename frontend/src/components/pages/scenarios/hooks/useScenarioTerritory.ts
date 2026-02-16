// src/hooks/useScenarioTerritory.ts
import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5000";

export type BackendLevel = "region" | "province" | "comune";

export type ScenarioTerritoryResponse = {
  scenario: string;
  year: number;
  territory: {
    level: BackendLevel;
    name: string;
    territory_id: number;
    reg_cod: number | null;
    prov_cod: number | null;
    mun_cod: number | null;
  };
  values: Record<
    string,
    {
      unit?: string;
      value: number | null;
      meta?: {
        format?: string; // "ratio" | "number"
        group?: string;  // "Indexes" | "Energy (MWh)" | ...
        label?: string;
        unit?: string;
      };
    }
  >;
};

function pickTerritoryCodeParam(level: BackendLevel) {
  if (level === "province") return "province_code";
  if (level === "region") return "region_code";
  return "comune_code";
}

import { getJSON } from "../../../../api/client";

async function fetchScenarioTerritory(args: {
  level: BackendLevel;
  year: number;
  territoryCode: number;
  scenario: string;
}): Promise<ScenarioTerritoryResponse> {
  const { level, year, territoryCode, scenario } = args;
  const codeParam = pickTerritoryCodeParam(level);

  return getJSON<ScenarioTerritoryResponse>("/scenarios/territory", {
    params: {
      level,
      [codeParam]: territoryCode,
      scenario,
      year: String(year),
    },
  });
}

export function useScenarioTerritory(args: {
  enabled: boolean;
  level: BackendLevel;
  year: number | null;
  territoryCode: number | null;
  scenarioId: string | null;
}) {
  const { enabled, level, year, territoryCode, scenarioId } = args;

  const [data, setData] = useState<ScenarioTerritoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reqIdRef = useRef(0);

  const key = useMemo(
    () => `${enabled ? 1 : 0}|${level}|${year ?? ""}|${territoryCode ?? ""}|${scenarioId ?? ""}`,
    [enabled, level, year, territoryCode, scenarioId]
  );

  useEffect(() => {
    const canRun = enabled && !!year && !!territoryCode && !!scenarioId;

    if (!canRun) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(null);

    fetchScenarioTerritory({
      level,
      year: year!,
      territoryCode: territoryCode!,
      scenario: scenarioId!,
    })
      .then((res) => {
        if (reqIdRef.current !== reqId) return;
        setData(res);
      })
      .catch((e) => {
        if (reqIdRef.current !== reqId) return;
        setError(String(e?.message ?? e));
        setData(null);
      })
      .finally(() => {
        if (reqIdRef.current !== reqId) return;
        setLoading(false);
      });
  }, [key]);

  return { data, loading, error };
}

export function splitMetrics(resp: ScenarioTerritoryResponse | null) {
  const values = resp?.values ?? {};
  const items = Object.entries(values).map(([key, v]) => ({
    key,
    value: v?.value ?? null,
    unit: v?.meta?.unit ?? v?.unit ?? "",
    label: v?.meta?.label ?? key,
    group: v?.meta?.group ?? "",
    format: v?.meta?.format ?? "",
  }));

  const indexes = items.filter((x) => x.group === "Indexes" || x.format === "ratio");
  const energy = items.filter((x) => x.group !== "Indexes" && x.format !== "ratio");

  indexes.sort((a, b) => a.label.localeCompare(b.label));
  energy.sort((a, b) => a.label.localeCompare(b.label));

  return { indexes, energy };
}
