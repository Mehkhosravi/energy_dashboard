
// Map of known data files for the demo
// We use dynamic imports to avoid bundling everything if not needed, 
// though for a small demo eager import is also fine.

/*
  Territories:
  - Province 1 (Torino)
  - Municipality 1001 (Agliè)
  - Municipality 1002 (Airasca)

  Files pattern:
  - series_{level}_{code}_consumption_monthly_{filter}.json
  - series_{level}_{code}_consumption_hourly_{month}_{type}.json (complex, maybe simplify for demo)
*/

export type ChartData = {
  label: string;
  value: number;
  value2?: number; // secondary series
}[];

export type DemoDataResult = {
  monthly: ChartData | null;
  hourly: ChartData | null;
  loading: boolean;
};

// Simple cache
const CACHE: Record<string, any> = {};

async function loadJson(path: string) {
  if (CACHE[path]) return CACHE[path];
  
  try {
    // Determine if it is province or comune based on the path string we constructed
    // This is a bit hacky but works for the specific demo files we saw in the file list
    // verification: 
    // frontend/src/data/mocks/series_province_1_consumption_monthly.json
    // frontend/src/data/mocks/series_comune_1001_consumption_monthly.json
    
    // We use Vite's import glob to get all jsons in mocks
    // This is the most reliable way to dynamically import in Vite without knowing exact paths at compile time
    // But since we are inside a component, let's just use a large switch or object for the demo to be safe and explicit.
    
    const modules = import.meta.glob('../../../../../data/mocks/*.json');
    
    // Normalize path to match glob keys
    // glob keys are relative to THIS file? No, relative to where glob is called usually, or distinct.
    // Actually import.meta.glob keys are relative to the current file.
    // So if this file is in src/components/pages/scenarios/predefined/
    // and mocks are in src/data/mocks/
    // Path should be ../../../../../data/mocks/${filename}
    
    const relativePath = `../../../../../data/mocks/${path}`;
    
    if (modules[relativePath]) {
        const mod: any = await modules[relativePath]();
        CACHE[path] = mod.default || mod;
        return CACHE[path];
    } else {
        console.warn("DemoData: File not found", relativePath);
        return null;
    }
  } catch (err) {
    console.error("DemoData: Error loading", path, err);
    return null;
  }
}

export async function fetchDemoData(
  territoryCode: number, 
  level: string, // "province" | "municipality" -> mapped to "province" | "comune"
  column: "consumption" | "production" | "future", 
  filter: string
): Promise<DemoDataResult> {
    
  // 1. Resolve level string for filename
  const lvl = level === "municipality" ? "comune" : "province";
  
  // 2. Resolve filename parts
  // Consumption filters: total (default), domestic, primary, secondary, tertiary
  // Production filters: total (default), solar, wind, hydroelectric, geothermal, biomass
  
  let filenameBase = `series_${lvl}_${territoryCode}_${column === 'future' ? 'production' : column}_monthly`;
  
  // Apply filter suffix
  if (filter !== "total") {
      // mapping "residential" -> "cons_domestic"
      // mapping "tertiary" -> "cons_tertiary"
      // others are direct
      let suffix = filter;
      if (column === "consumption") {
          if (filter === "residential") suffix = "cons_domestic";
          else if (filter === "primary") suffix = "cons_primary";
          else if (filter === "secondary") suffix = "cons_secondary";
          else if (filter === "tertiary") suffix = "cons_tertiary";
      }
      
      filenameBase += `_${suffix}`;
  }
  
  const monthlyFile = `${filenameBase}.json`;
  
  // Hourly data: For the demo, we try to find a "typical" monthly/hourly file
  // or just use one specific file we saw: e.g. series_province_1_consumption_hourly_1_weekday.json
  // For production, we often don't have hourly in the mocks list I saw? 
  // I saw 'series_province_1_consumption_hourly...' but not production hourly.
  // We will return null for hourly if not found.
  
  let hourlyFile = "";
  if (column === "consumption") {
      // Just pick January (1) as representative
      hourlyFile = `series_${lvl}_${territoryCode}_consumption_hourly_1_weekday.json`; 
      // Note: we also have weekend. For the LineChart we might want both or just weekday.
      // Let's try to load both if possible, but start with weekday.
  }
  
  const [monthlyRaw, hourlyRaw] = await Promise.all([
      loadJson(monthlyFile),
      hourlyFile ? loadJson(hourlyFile) : Promise.resolve(null)
  ]);
  
  // Format Monthly
  let monthly: ChartData | null = null;
  if (monthlyRaw && Array.isArray(monthlyRaw)) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      monthly = monthlyRaw.map((item: any, idx: number) => ({
          label: months[idx % 12],
          value: item.value_mwh ?? item.value ?? 0
      })).slice(0, 12);
  }
  
  // Format Hourly
  let hourly: ChartData | null = null;
  if (hourlyRaw && Array.isArray(hourlyRaw)) {
      hourly = hourlyRaw.map((item: any) => ({
          label: String(item.x).padStart(2, '0'), // hour
          value: item.value_mwh ?? item.value ?? 0,
          // We could try to load weekend and add it as value2, but let's keep simple first
      }));
  }
  
  return {
    monthly,
    hourly,
    loading: false
  };
}
