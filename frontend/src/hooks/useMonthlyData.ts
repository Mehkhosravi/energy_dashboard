import { useEffect, useState } from "react";
import { api } from "../api/client";

export type EnergyType = "solar" | "wind" | "hydroelectric" | "geothermal" | "biomass";

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

export interface ProductionApiRow {
  prov_cod: number;
  prov_name: string;
  energy_type: EnergyType;
  year?: number;
  annual: number;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

export interface MonthlySectorResponse {
  prov_cod: number;
  prov_name: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

export type CombinedChartPoint = {
  month: string;
  solar: number;
  wind: number;
  hydroelectric: number;
  geothermal: number;
  biomass: number;
  totalProduction: number;
  residential: number;
  primary: number;
  secondary: number;
  tertiary: number;
  totalConsumption: number;
};

const MONTH_KEYS: MonthKey[] = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

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

const PRODUCTION_SCALE_FACTOR = 1_000_000;
const CONSUMPTION_SCALE_FACTOR = 1_000_000;
const API_BASE = "http://localhost:8000";

const toNumber = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function useMonthlyData(provCod?: number | null) {
  const [data, setData] = useState<CombinedChartPoint[]>([]);
  const [provinceName, setProvinceName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!provCod) {
      setData([]);
      setProvinceName(null);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Production by energy type
        const productionRows =
          await api.getProvinceMonthlyProduction<ProductionApiRow[]>(provCod);

        const [
          residentialRes,
          primaryRes,
          secondaryRes,
          tertiaryRes,
          totalConsumptionRes,
        ] = await Promise.all([
          fetch(`${API_BASE}/consumption/province/monthly/residential/${provCod}`),
          fetch(`${API_BASE}/consumption/province/monthly/primary/${provCod}`),
          fetch(`${API_BASE}/consumption/province/monthly/secondary/${provCod}`),
          fetch(`${API_BASE}/consumption/province/monthly/tertiary/${provCod}`),
          fetch(`${API_BASE}/consumption/province/monthly/total/${provCod}`),
        ]);

        if (
          !residentialRes.ok ||
          !primaryRes.ok ||
          !secondaryRes.ok ||
          !tertiaryRes.ok
        ) {
          throw new Error("One of the consumption API calls failed");
        }

        const residential: MonthlySectorResponse = await residentialRes.json();
        const primary: MonthlySectorResponse = await primaryRes.json();
        const secondary: MonthlySectorResponse = await secondaryRes.json();
        const tertiary: MonthlySectorResponse = await tertiaryRes.json();
        const totalConsumption: MonthlySectorResponse =
          await totalConsumptionRes.json();

        // In case production array is not empty, use its province name
        if (productionRows.length > 0) {
          setProvinceName(productionRows[0].prov_name);
        } else {
          setProvinceName(residential.prov_name);
        }

        const chartData: CombinedChartPoint[] = MONTH_LABELS.map((label) => ({
          month: label,
          solar: 0,
          wind: 0,
          hydroelectric: 0,
          geothermal: 0,
          biomass: 0,
          totalProduction: 0,
          residential: 0,
          primary: 0,
          secondary: 0,
          tertiary: 0,
          totalConsumption: 0,
        }));

        // Fill production
        productionRows.forEach((row) => {
          const energyType = row.energy_type;
          MONTH_KEYS.forEach((monthKey, idx) => {
            const raw = (row as any)[monthKey] ?? 0;
            const valueGWh = raw / PRODUCTION_SCALE_FACTOR;
            chartData[idx][energyType] = valueGWh;
          });
        });

        // Total production
        chartData.forEach((p) => {
          p.totalProduction =
            p.solar + p.wind + p.hydroelectric + p.geothermal + p.biomass;
        });

        // Fill consumption (by sector + total)
        MONTH_KEYS.forEach((monthKey, idx) => {
          const r =
            toNumber((residential as any)[monthKey]) /
            CONSUMPTION_SCALE_FACTOR;
          const pr =
            toNumber((primary as any)[monthKey]) / CONSUMPTION_SCALE_FACTOR;
          const s =
            toNumber((secondary as any)[monthKey]) / CONSUMPTION_SCALE_FACTOR;
          const t =
            toNumber((tertiary as any)[monthKey]) / CONSUMPTION_SCALE_FACTOR;
          const tot =
            toNumber((totalConsumption as any)[monthKey]) /
            CONSUMPTION_SCALE_FACTOR;

          chartData[idx].residential = r;
          chartData[idx].primary = pr;
          chartData[idx].secondary = s;
          chartData[idx].tertiary = t;
          chartData[idx].totalConsumption = tot || r + pr + s + t;
        });

        setData(chartData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load monthly production/consumption");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [provCod]);

  return {
    data,
    provinceName,
    loading,
    error,
  };
}