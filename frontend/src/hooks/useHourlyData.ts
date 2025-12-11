// src/hooks/useHourlyData.ts
import { useMemo } from "react";
import rawHourlyData from "../data/Torino_hourly_data.json";

// ---- Types ----

export type DayType = "weekday" | "weekend";

export interface HourlyDayValues {
  residential: number;
  primary: number;
  secondary: number;
  tertiary: number;
}

export interface HourlyRow {
  hour: number;
  hour_label: string;
  weekday: HourlyDayValues;
  weekend: HourlyDayValues;
}

export interface HourlySeasonRecord {
  prov_cod: string;
  prov_name: string;
  month: string;   // e.g. "jan", "feb", "mar"
  season: string;  // "winter" | "spring" | "summer" | "autumn"
  unit: string;    // "MWh"
  timezone: string;
  sectors: string[];
  day_types: DayType[];
  data: HourlyRow[];
}

export interface WinterHourlyChartPoint {
  hour: number;
  hour_label: string;
  residential_weekday?: number;
  primary_weekday?: number;
  secondary_weekday?: number;
  tertiary_weekday?: number;
  residential_weekend?: number;
  primary_weekend?: number;
  secondary_weekend?: number;
  tertiary_weekend?: number;
}

// ---- Internal: parse static JSON ----

const hourlyData: HourlySeasonRecord[] = rawHourlyData as HourlySeasonRecord[];

// ---- Builders ----

/**
 * Build the winter hourly series (0–23), for a given province.
 * For now it uses the first "winter" record for that province (e.g. January).
 * Later you can extend this to average Jan–Feb–Mar if you add them.
 */
export function buildWinterHourlySeries(
  provCod: string
): WinterHourlyChartPoint[] {
  const winterRecord = hourlyData.find(
    (rec) => rec.prov_cod === provCod && rec.season === "winter"
  );

  if (!winterRecord) return [];

  return winterRecord.data.map((row) => ({
    hour: row.hour,
    hour_label: row.hour_label,
    residential_weekday: row.weekday.residential,
    primary_weekday: row.weekday.primary,
    secondary_weekday: row.weekday.secondary,
    tertiary_weekday: row.weekday.tertiary,
    residential_weekend: row.weekend.residential,
    primary_weekend: row.weekend.primary,
    secondary_weekend: row.weekend.secondary,
    tertiary_weekend: row.weekend.tertiary,
  }));
}

// ---- Main hook ----

/**
 * Hook to access hourly data for a given province.
 * - allSeasons: raw JSON records (all seasons)
 * - winterSeries: processed 0–23 hourly series for winter (for charts)
 */
export function useHourlyData(provCod: string) {
  const allSeasons = hourlyData;

  const winterSeries = useMemo(
    () => buildWinterHourlySeries(provCod),
    [provCod]
  );

  const winterMeta = useMemo(
    () =>
      allSeasons.find(
        (rec) => rec.prov_cod === provCod && rec.season === "winter"
      ) || null,
    [allSeasons, provCod]
  );

  return {
    allSeasons,
    winterSeries,
    winterMeta,
  };
}
