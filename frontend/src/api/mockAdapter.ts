// src/api/mockAdapter.ts

// 1. Load all mocks eagerly
const mocks = import.meta.glob("/src/data/mocks/*.json", { eager: true });

// Helper to find a mock file
function findMockData(filename: string): any {
  // Try exact match
  const key = `/src/data/mocks/${filename}`;
  if (mocks[key]) {
    return (mocks[key] as any).default;
  }
  return null;
}

function parseParams(path: string, explicitParams?: Record<string, any>): Record<string, any> {
  const merged = { ...explicitParams };
  if (path.includes("?")) {
    const [, qs] = path.split("?");
    const usp = new URLSearchParams(qs);
    usp.forEach((val, key) => {
      merged[key] = val;
    });
  }
  return merged;
}

export async function getMockData(path: string, explicitParams?: Record<string, any>): Promise<any | null> {
  const params = parseParams(path, explicitParams);
  // console.log("[MockAdapter] Checking:", path, params);

  // 1. Map Territories (GeoJSON)
  if (path.includes("/map/territories")) {
    const level = params.level || "province";
    return findMockData(`map_${level}.json`);
  }

  // 2. Map Values (Annual)
  if (path.includes("/values")) {
    const level = params.level || "province";
    const domain = params.domain || "consumption";
    // We only captured annual 2019
    let suffix = "";
    // Check for base_group (used for Production sources AND possibly consumption categories if frontend sends it)
    if (params.base_group) {
        suffix = `_${params.base_group}`;
    }
    
    // Check if category_code exists (just in case frontend sends it for consumption)
    // Priority: base_group > category_code
    else if (params.category_code) {
        suffix = `_${params.category_code}`;
    }

    return findMockData(`values_${level}_${domain}${suffix}.json`);
  }

  // 3. Charts Series
  if (path.includes("/series")) {
    const level = params.level;
    const resolution = params.resolution;
    const domain = params.domain;
    
    let code: number | string = "";
    if (level === "province") code = params.province_code;
    else if (level === "comune") code = params.comune_code;
    else if (level === "region") code = params.region_code;

    // A. Monthly Series
    if (resolution === "monthly") {
      // breakdown categories
      let suffix = "";
      if (params.category_code) suffix = `_${params.category_code}`;
      else if (params.base_group) suffix = `_${params.base_group}`;
      else if (params.day_type) suffix = `_${params.day_type}`;

      const filename = `series_${level}_${code}_${domain}_monthly${suffix}.json`;
      const data = findMockData(filename);
      if (data) return data;
    }

    // B. Hourly Series
    if (resolution === "hourly") {
      const month = params.month;
      const dayType = params.day_type;
      const filename = `series_${level}_${code}_${domain}_hourly_${month}_${dayType}.json`;
      
      let data = findMockData(filename);
      
      // FALLBACK for Agliè/Airasca hourly data (missing in backend) -> Use Torino Scaled
      if (!data && (code == 1001 || code == 1002) && level === "comune") {
        // Find cached Torino data
        const fallbackFilename = `series_province_1_${domain}_hourly_${month}_${dayType}.json`;
        const fallbackData = findMockData(fallbackFilename);
        
        if (fallbackData && Array.isArray(fallbackData)) {
          // Scale down by factor of ~500 for municipality
          // Agliè is small.
          const scale = 1 / 500;
          return fallbackData.map((p: any) => ({
            ...p,
            value_mwh: (p.value_mwh || 0) * scale
          }));
        }
      }
      
      if (data) return data;
    }
  }

  // 4. Scenarios
  if (path.includes("/scenarios/territory")) {
    const scenario = params.scenario || "0";
    const level = params.level || "province";
    // Generate deterministic-ish random data based on scenario string
    // simple hash
    let hash = 0;
    for (let i = 0; i < scenario.length; i++) hash = scenario.charCodeAt(i) + ((hash << 5) - hash);
    const rand = (formatted: boolean) => {
        const x = Math.abs(Math.sin(hash++) * 10000) % 1;
        return formatted ? x : x; 
    };

    // Baseline (S0) is usually lower stats
    const baseOffset = scenario === "0" ? 0.2 : 0.5;
    
    // SSI: 0.2 ... 0.9
    const ssi = Math.min(0.95, Math.max(0.1, baseOffset + (rand(false) as number) * 0.4));
    // SCI: 0.2 ... 0.9
    const sci = Math.min(0.95, Math.max(0.1, 0.9 - (rand(false) as number) * 0.5)); // inverse correl usually?

    return {
        scenario,
        year: 2019,
        territory: {
            level,
            name: "Mock Territory",
            territory_id: 123
        },
        values: {
            self_sufficiency_index: {
                value: ssi,
                meta: { label: "SSI (Self-sufficiency index)", group: "Indexes", format: "ratio" }
            },
            self_consumption_index: {
                value: sci,
                meta: { label: "SCI (Self-consumption index)", group: "Indexes", format: "ratio" }
            },
            consumption_mwh: {
                value: 10000 + (rand(false) as number) * 5000,
                unit: "MWh",
                meta: { label: "Consumption", group: "Energy (MWh)" }
            },
            production_mwh: {
                value: 8000 + (rand(false) as number) * 5000,
                unit: "MWh",
                meta: { label: "Production", group: "Energy (MWh)" }
            }
        }
    };
  }

  return null;
}
