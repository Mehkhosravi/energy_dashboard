// src/api/client.ts

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

type GetJSONOptions = {
  params?: Record<string, any>;
  signal?: AbortSignal;
};

function buildQuery(params?: Record<string, any>) {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

async function getJSON<T>(path: string, opts: GetJSONOptions = {}): Promise<T> {
  const urlBase = path.startsWith("http")
    ? path
    : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const url = `${urlBase}${buildQuery(opts.params)}`;

  const res = await fetch(url, { signal: opts.signal });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `API error ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`
    );
  }

  return res.json() as Promise<T>;
}

// ---- Types for /charts/series
export type ChartSeriesPoint = { x: number; value_mwh: number };

export const api = {
  // existing endpoints (unchanged)
  getProvinceMonthlyConsumptionSector: <T>(
    sector: "residential" | "primary" | "secondary" | "tertiary",
    provCod: number
  ) => getJSON<T>(`/consumption/province/monthly/${sector}/${provCod}`),

  getProvinceMonthlyProduction: <T>(provCod: number) =>
    getJSON<T>(`/production/monthly/${provCod}`),

  getProvinceMonthlySector: <T>(
    sector: "residential" | "primary" | "secondary" | "tertiary",
    provCod: number
  ) => getJSON<T>(`/consumption/province/monthly/${sector}/${provCod}`),

  getProvinceProductionSummaryannual: <T>(provCod: number) =>
    getJSON<T>(`/production/${provCod}`),

  getComuneMonthlyEnergy: <T>(params: {
    comune: string;
    year: number;
    domain?: "consumption" | "production";
  }) => {
    const domain = params.domain ?? "consumption";
    return getJSON<T>(`/api/energy/monthly`, {
      params: {
        comune: params.comune,
        year: params.year,
        domain,
      },
    });
  },

  // ✅ NEW: generic charts series endpoint (hourly/daily/etc)
  // GET /charts/series?...query...
  getChartSeries: <T = ChartSeriesPoint[]>(
    params: Record<string, any>,
    signal?: AbortSignal
  ) => getJSON<T>(`/charts/series`, { params, signal }),
};
