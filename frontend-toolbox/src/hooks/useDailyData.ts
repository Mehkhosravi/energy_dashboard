// src/hooks/useDailyData.ts

import { useEffect, useState } from "react";

export type MonthKey =
  | "jan"
  | "feb"
  | "mar"
  | "apr"
  | "may"
  | "jun"
  | "jul"
  | "aug"
  | "sep"
  | "oct"
  | "nov"
  | "dec";

export type DailyFields = {
  jan_wkday: number;
  jan_wkend: number;
  feb_wkday: number;
  feb_wkend: number;
  mar_wkday: number;
  mar_wkend: number;
  apr_wkday: number;
  apr_wkend: number;
  may_wkday: number;
  may_wkend: number;
  jun_wkday: number;
  jun_wkend: number;
  jul_wkday: number;
  jul_wkend: number;
  aug_wkday: number;
  aug_wkend: number;
  sep_wkday: number;
  sep_wkend: number;
  oct_wkday: number;
  oct_wkend: number;
  nov_wkday: number;
  nov_wkend: number;
  dec_wkday: number;
  dec_wkend: number;
};

export type ProvinceDailyConsumptionResponse = {
  prov_cod: number;
  prov_name: string;
  sectors: Record<string, DailyFields>; // primary, secondary, ...
};

export type ProvinceDailyProductionResponse = {
  prov_cod: number;
  prov_name: string;
  energy_types: Record<string, DailyFields>; // solar, wind, ...
};

export const MONTHS: { key: MonthKey; label: string }[] = [
  { key: "jan", label: "Jan" },
  { key: "feb", label: "Feb" },
  { key: "mar", label: "Mar" },
  { key: "apr", label: "Apr" },
  { key: "may", label: "May" },
  { key: "jun", label: "Jun" },
  { key: "jul", label: "Jul" },
  { key: "aug", label: "Aug" },
  { key: "sep", label: "Sep" },
  { key: "oct", label: "Oct" },
  { key: "nov", label: "Nov" },
  { key: "dec", label: "Dec" },
];

const API_BASE = "http://localhost:8000";

export function useDailyData(provCod?: number | null) {
  const [consumption, setConsumption] =
    useState<ProvinceDailyConsumptionResponse | null>(null);
  const [production, setProduction] =
    useState<ProvinceDailyProductionResponse | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  useEffect(() => {
    if (!provCod) {
      setConsumption(null);
      setProduction(null);
      setDailyError(null);
      setDailyLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setDailyLoading(true);
        setDailyError(null);

        const [consRes, prodRes] = await Promise.all([
          fetch(`${API_BASE}/consumption/province/daily/${provCod}`),
          fetch(`${API_BASE}/production/province/daily/${provCod}`),
          // if your production endpoint is different, adjust this line
        ]);

        if (!consRes.ok) {
          throw new Error("Failed to load daily consumption");
        }
        if (!prodRes.ok) {
          throw new Error("Failed to load daily production");
        }

        const consJson: ProvinceDailyConsumptionResponse = await consRes.json();
        const prodJson: ProvinceDailyProductionResponse = await prodRes.json();

        setConsumption(consJson);
        setProduction(prodJson);
      } catch (err: any) {
        console.error(err);
        setDailyError(err.message || "Failed to load daily data");
        setConsumption(null);
        setProduction(null);
      } finally {
        setDailyLoading(false);
      }
    };

    fetchData();
  }, [provCod]);

  return {
    consumption,
    production,
    dailyLoading,
    dailyError,
  };
}
