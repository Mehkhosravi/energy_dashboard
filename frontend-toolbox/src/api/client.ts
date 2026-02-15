// src/api/client.ts

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function getJSON<T>(path: string): Promise<T> {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `API error ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`
    );
  }

  return res.json() as Promise<T>;
}

export const api = {
  // GET /consumption/province/monthly/{sector}/{provCod}
  getProvinceMonthlyConsumptionSector: <T>(
    sector: "residential" | "primary" | "secondary" | "tertiary",
    provCod: number
  ) => getJSON<T>(`/consumption/province/monthly/${sector}/${provCod}`),

  // GET /production/monthly/{provCod}
  getProvinceMonthlyProduction: <T>(provCod: number) =>
    getJSON<T>(`/production/monthly/${provCod}`),

   //  consumption: monthly sectors by province + sector
  getProvinceMonthlySector: <T>(
    sector: "residential" | "primary" | "secondary" | "tertiary",
    provCod: number
  ) => getJSON<T>(`/consumption/province/monthly/${sector}/${provCod}`),

  //  production: summary by province (single row with solar/wind/…)
  getProvinceProductionSummaryannual: <T>(provCod: number) =>
    getJSON<T>(`/production/${provCod}`),

};
