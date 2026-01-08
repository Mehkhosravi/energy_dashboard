// src/hooks/useScenarioTerritoryBatch.ts
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
        format?: string;
        group?: string;
        label?: string;
        unit?: string;
      };
    }
  >;
};

function pickTerritoryCodeParam(level: BackendLevel) {
  // confirmed from your example: province_code
  if (level === "province") return "province_code";
  if (level === "region") return "region_code";
  return "comune_code";
}

async function getScenarioTerritory(args: {
  level: BackendLevel;
  year: number;
  scenario: string;
  territoryCode: number;
}): Promise<ScenarioTerritoryResponse> {
  const { level, year, scenario, territoryCode } = args;

  const codeParam = pickTerritoryCodeParam(level);

  const url = new URL(API_BASE + "/scenarios/territory");
  url.searchParams.set("level", level);
  url.searchParams.set("scenario", scenario);
  url.searchParams.set("year", String(year));
  url.searchParams.set(codeParam, String(territoryCode));

  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${text}`.trim());
  }
  return (await res.json()) as ScenarioTerritoryResponse;
}

export type ScenarioTerritoryBatchResult = {
  byScenarioId: Record<string, ScenarioTerritoryResponse | null>;
  errorsByScenarioId: Record<string, string>; // only failed ones
  loading: boolean;
};

export function useScenarioTerritoryBatch(args: {
  enabled: boolean;
  level: BackendLevel;
  year: number | null;
  territoryCode: number | null;
  scenarioIds: string[];
}): ScenarioTerritoryBatchResult {
  const { enabled, level, year, territoryCode, scenarioIds } = args;

  const [byScenarioId, setByScenarioId] = useState<Record<string, ScenarioTerritoryResponse | null>>(
    {}
  );
  const [errorsByScenarioId, setErrorsByScenarioId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const reqIdRef = useRef(0);

  const key = useMemo(() => {
    const ids = [...scenarioIds].sort().join(",");
    return `${enabled ? "1" : "0"}|${level}|${year ?? ""}|${territoryCode ?? ""}|${ids}`;
  }, [enabled, level, year, territoryCode, scenarioIds]);

  useEffect(() => {
    const canRun = enabled && !!year && !!territoryCode && scenarioIds.length > 0;

    if (!canRun) {
      setByScenarioId({});
      setErrorsByScenarioId({});
      setLoading(false);
      return;
    }

    const reqId = ++reqIdRef.current;
    setLoading(true);

    (async () => {
      const nextBy: Record<string, ScenarioTerritoryResponse | null> = {};
      const nextErr: Record<string, string> = {};

      const settled = await Promise.allSettled(
        scenarioIds.map(async (scenario) => {
          const data = await getScenarioTerritory({
            level,
            year: year!,
            scenario,
            territoryCode: territoryCode!,
          });
          return [scenario, data] as const;
        })
      );

      if (reqIdRef.current !== reqId) return;

      for (let i = 0; i < settled.length; i++) {
        const scenario = scenarioIds[i];
        const r = settled[i];

        if (r.status === "fulfilled") {
          const [, data] = r.value;
          nextBy[scenario] = data;
        } else {
          nextBy[scenario] = null;
          nextErr[scenario] = String(r.reason?.message ?? r.reason ?? "Unknown error");
        }
      }

      setByScenarioId(nextBy);
      setErrorsByScenarioId(nextErr);
      setLoading(false);
    })();
  }, [key]);

  return { byScenarioId, errorsByScenarioId, loading };
}

/** Index metrics only (same logic you need for cards) */
export function extractIndexMetrics(resp: ScenarioTerritoryResponse | null) {
  if (!resp?.values) return [];

  const items = Object.entries(resp.values)
    .map(([key, v]) => ({
      key,
      value: v?.value ?? null,
      label: v?.meta?.label ?? key,
      group: v?.meta?.group ?? "",
      format: v?.meta?.format ?? "",
    }))
    .filter((x) => x.group === "Indexes" || x.format === "ratio");

  items.sort((a, b) => a.label.localeCompare(b.label));
  return items;
}
