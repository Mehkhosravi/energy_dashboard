import os
import json
import urllib.request
import urllib.parse
from pathlib import Path

BASE_URL = "http://localhost:5000"
OUTPUT_DIR = Path("frontend/src/data/mocks")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Configuration
YEAR = 2019
SCENARIO = 0

# Sample Cases for DETAILED charts
# (Torino Province, Agliè, Airasca)
DETAILED_CASES = [
    {"level": "province", "code": 1, "name": "Torino"},
    {"level": "comune", "code": 1001, "name": "Agliè"},
    {"level": "comune", "code": 1002, "name": "Airasca"},
]

# Map Levels to capture (geometry + annual values)
MAP_LEVELS = ["region", "province"]

def fetch_json(url):
    print(f"Fetching: {url}")
    try:
        with urllib.request.urlopen(url) as response:
            if response.status == 200:
                return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching {url}: {e}")
    return None

def save_json(filename, data):
    path = OUTPUT_DIR / filename
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Saved: {path}")

def main():
    # 1. Capture Map Geometry
    for level in MAP_LEVELS:
        url = f"{BASE_URL}/map/territories?level={level}"
        data = fetch_json(url)
        if data:
            save_json(f"map_{level}.json", data)

    # 2. Capture Map Values (Annual 2019)
    # We need annual values for the choropleth map for ALL regions/provinces.
    for level in MAP_LEVELS:
        # Consumption
        url = f"{BASE_URL}/energy/values?level={level}&resolution=annual&year={YEAR}&domain=consumption&scenario={SCENARIO}"
        data = fetch_json(url)
        if data:
            save_json(f"values_{level}_consumption.json", data)
        
        # Production
        url = f"{BASE_URL}/energy/values?level={level}&resolution=annual&year={YEAR}&domain=production&scenario={SCENARIO}"
        data = fetch_json(url)
        if data:
            save_json(f"values_{level}_production.json", data)

    # 3. Capture Detailed Charts for Specific Cases
    for case in DETAILED_CASES:
        level = case["level"]
        code = case["code"]
        name = case["name"]
        
        # Helper to build params
        def get_params(domain="consumption"):
            p = {
                "level": level,
                "year": YEAR,
                "domain": domain,
                "scenario": SCENARIO,
            }
            if level == "province":
                p["province_code"] = code
            elif level == "comune":
                p["comune_code"] = code
            elif level == "region":
                p["region_code"] = code
            return p

        # 3a. Monthly Series (Consumption & Production breakdown)
        # We need multiple series requests to rebuild `useMonthlyData` structure.
        # But `useMonthlyData` makes separate calls. We should capture each one.
        # Structure: mocks/series_{level}_{code}_{domain}_{resolution}_{optional_cat}.json
        
        domains = ["consumption", "production"]
        
        # We will store a dictionary of "url_suffix" -> "response" to easier mocking
        # OR just save distinct files. Let's save distinct files and handle mapping in client.ts.
        # Actually, simpler: client.ts logic is complex. 
        # Better strategy: Save a single index file or consistent naming convention.
        
        # Let's perform the exact fetches `useMonthlyData` does.
        # Total Cons/Prod
        for d in domains:
            qs = urllib.parse.urlencode({**get_params(d), "resolution": "monthly"})
            url = f"{BASE_URL}/charts/series?{qs}"
            data = fetch_json(url)
            if data:
                save_json(f"series_{level}_{code}_{d}_monthly.json", data)

        # Consumption Categories
        cons_cats = ["cons_domestic", "cons_primary", "cons_secondary", "cons_tertiary"]
        for cat in cons_cats:
            qs = urllib.parse.urlencode({**get_params("consumption"), "resolution": "monthly", "category_code": cat})
            url = f"{BASE_URL}/charts/series?{qs}"
            data = fetch_json(url)
            if data:
                save_json(f"series_{level}_{code}_consumption_monthly_{cat}.json", data)

        # Production Sources (base_group)
        prod_groups = ["solar", "wind", "hydroelectric", "geothermal", "biomass"]
        for grp in prod_groups:
            qs = urllib.parse.urlencode({**get_params("production"), "resolution": "monthly", "base_group": grp})
            url = f"{BASE_URL}/charts/series?{qs}"
            data = fetch_json(url)
            if data:
                save_json(f"series_{level}_{code}_production_monthly_{grp}.json", data)

        # 3b. Daily Series (Weekday/Weekend)
        # Used by `useDailyData`. Fetch consumption & production? Hook defaults to consumption but supports prod.
        # Let's fetch consumption for now.
        for day_type in ["weekday", "weekend"]:
            qs = urllib.parse.urlencode({**get_params("consumption"), "resolution": "monthly", "day_type": day_type})
            url = f"{BASE_URL}/charts/series?{qs}"
            data = fetch_json(url)
            if data:
                 save_json(f"series_{level}_{code}_consumption_monthly_{day_type}.json", data)

        # 3c. Hourly Series (Weekday/Weekend, for each month)
        # Used by `useHourlyCalendarData`. This makes 12 * 2 = 24 requests!
        # Only fetch for "consumption" currently used.
        # We will save them as `series_{level}_{code}_consumption_hourly_{month}_{day_type}.json`
        for month in range(1, 13):
             for day_type in ["weekday", "weekend"]:
                p = get_params("consumption")
                p["resolution"] = "hourly"
                p["month"] = month
                p["day_type"] = day_type
                qs = urllib.parse.urlencode(p)
                url = f"{BASE_URL}/charts/series?{qs}"
                data = fetch_json(url)
                if data:
                    save_json(f"series_{level}_{code}_consumption_hourly_{month}_{day_type}.json", data)


    print("Done capturing data.")

if __name__ == "__main__":
    main()
