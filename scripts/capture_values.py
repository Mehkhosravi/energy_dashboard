
import urllib.request
import json
import os
import time

API_BASE = "http://127.0.0.1:5000"
OUTPUT_DIR = "frontend/src/data/mocks"

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Define what we want to capture
LEVELS = ["region", "province", "comune"]
DOMAINS = ["consumption", "production"]
YEAR = 2019
SCENARIO = 0

# Breakdowns
# Production uses base_group
PROD_GROUPS = ["solar", "wind", "hydroelectric", "geothermal", "biomass"]
# Consumption might use base_group or category_code in backend, 
# but frontend sends 'base_group'. We'll try to capture using 'base_group' 
# if that fails/empty, we can investigate, but we suspect backend maps them or 
# frontend logic relies on them being base_groups.
CONS_GROUPS = ["cons_domestic", "cons_primary", "cons_secondary", "cons_tertiary"]

def fetch_json(url):
    try:
        with urllib.request.urlopen(url) as response:
            if response.status == 200:
                return json.loads(response.read().decode())
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def save_mock(filename, data):
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Saved {path}")

def capture_values():
    for level in LEVELS:
        for domain in DOMAINS:
            # 1. Capture Total (No breakdown)
            url = f"{API_BASE}/charts/values?level={level}&resolution=annual&year={YEAR}&domain={domain}&scenario={SCENARIO}"
            data = fetch_json(url)
            if data:
                save_mock(f"values_{level}_{domain}.json", data)
            
            # 2. Capture Breakdowns
            groups = PROD_GROUPS if domain == "production" else CONS_GROUPS
            
            for group in groups:
                # Based on investigation:
                # Production uses base_group
                # Consumption uses category_code
                
                if domain == "production":
                    full_url = f"{url}&base_group={group}"
                else:
                    full_url = f"{url}&category_code={group}"
                
                data = fetch_json(full_url)
                
                if data:
                    # We'll name it with suffix matching what mockAdapter expects
                    # mockAdapter expects _base_group or _category_code suffix
                    save_mock(f"values_{level}_{domain}_{group}.json", data)
                
                time.sleep(0.1)

if __name__ == "__main__":
    print("Starting Values Capture...")
    capture_values()
    print("Done.")
