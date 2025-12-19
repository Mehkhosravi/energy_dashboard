import { useEffect, useState } from "react";
import { api } from "../api/client";

type BaseGroup = "domestic" | "primary" | "secondary" | "tertiary";

export interface ComuneMonthlyEnergyRow {
  month: number;
  base_group: BaseGroup;
  value_mwh: number | string;
}

export interface ComuneMonthlyEnergyPoint {
  month: string; // "Jan", "Feb", ...
  domestic?: number;
  primary?: number;
  secondary?: number;
  tertiary?: number;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function useComuneMonthlyEnergy(
  comune: string | null,
  year: number,
  domain: "consumption" | "production" = "consumption"
) {
  const [data, setData] = useState<ComuneMonthlyEnergyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!comune) {
      setData([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getComuneMonthlyEnergy<ComuneMonthlyEnergyRow[]>({
        comune,
        year,
        domain,
      })
      .then((rows) => {
        if (cancelled) return;

        const byMonth: Record<number, ComuneMonthlyEnergyPoint> = {};

        for (const row of rows) {
          const m = row.month;
          if (!byMonth[m]) {
            byMonth[m] = {
              month: MONTH_LABELS[m - 1] ?? String(m),
            };
          }

          const key = row.base_group as BaseGroup;
          const valueGWh = Number(row.value_mwh) / 1000; // MWh → GWh

          byMonth[m][key] = (byMonth[m][key] ?? 0) + valueGWh;
        }

        const points = Object.keys(byMonth)
          .map((m) => Number(m))
          .sort((a, b) => a - b)
          .map((m) => byMonth[m]);

        setData(points);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        setError(err.message ?? "Failed to load energy data");
        setData([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [comune, year, domain]);
   console.log("FINAL HOOK DATA:", data);
  return { data, loading, error };
  

}
