#!/usr/bin/env python3
"""
Convert raw future production CSVs into mock JSON files for the frontend demo.

Monthly CSV -> per-municipality/source monthly JSON files  
Hourly CSV  -> per-municipality/source/month/daytype hourly JSON files

Output naming convention (matches existing mocks):
  Monthly: future_comune_{code}_{source}_monthly.json
  Hourly:  future_comune_{code}_{source}_hourly_{monthNum}_{daytype}.json

Where {source} is one of:
  solar_c1_total, solar_c1_residential, solar_c1_agriculture, solar_c1_industrial, solar_c1_services
  solar_c2_total, solar_c2_residential, solar_c2_agriculture, solar_c2_industrial, solar_c2_services
  wind_v52, wind_v80, biomass
"""

import csv
import json
import os

MOCKS_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'data', 'mocks')
RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'data', 'raw_future_production')

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTH_TO_NUM = {m: i+1 for i, m in enumerate(MONTH_NAMES)}

# Mapping from CSV Energy_Source to clean filename key
SOURCE_MAP = {
    "Solar_C1_Total": "solar_c1_total",
    "Solar_C1_Residential": "solar_c1_residential",
    "Solar_C1_Agriculture": "solar_c1_agriculture",
    "Solar_C1_Industrial": "solar_c1_industrial",
    "Solar_C1_Services": "solar_c1_services",
    "Solar_C2_Total": "solar_c2_total",
    "Solar_C2_Residential": "solar_c2_residential",
    "Solar_C2_Agriculture": "solar_c2_agriculture",
    "Solar_C2_Industrial": "solar_c2_industrial",
    "Solar_C2_Services": "solar_c2_services",
    "Wind_VESTAS_V52": "wind_v52",
    "Wind_VESTAS_V80": "wind_v80",
    "Biomass": "biomass",
}

# Municipality name -> code
MUN_CODE = {
    "Agliè": 1001,
    "Airasca": 1002,
    "Torino": 1272,
}

def convert_monthly():
    """Convert monthly CSV to individual JSON files."""
    csv_path = os.path.join(RAW_DIR, 'ALL_monthly_producibility_EN.csv')
    count = 0
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            source_raw = row['Energy_Source'].strip()
            mun_name = row['Municipality'].strip()
            pro_com = int(row['PRO_COM'].strip())
            
            source_key = SOURCE_MAP.get(source_raw)
            if not source_key:
                print(f"WARNING: Unknown source '{source_raw}', skipping")
                continue
            
            # Extract 12 monthly values
            monthly_values = []
            for m in MONTH_NAMES:
                val = row.get(m, '0') or '0'
                monthly_values.append({
                    "label": m,
                    "value_mwh": round(float(val) / 1e6, 4)  # Convert Wh to MWh
                })
            
            filename = f"future_comune_{pro_com}_{source_key}_monthly.json"
            filepath = os.path.join(MOCKS_DIR, filename)
            with open(filepath, 'w') as out:
                json.dump(monthly_values, out, indent=2)
            count += 1
    
    print(f"Created {count} monthly JSON files")


def convert_hourly():
    """Convert hourly CSV to individual JSON files."""
    csv_path = os.path.join(RAW_DIR, 'ALL_hourly_producibility_EN.csv')
    
    # Group: (source_key, mun_code, month_num, daytype) -> list of {hour, value}
    groups = {}
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            source_raw = row['Energy_Source'].strip()
            mun_name = row['Municipality'].strip()
            month_name = row['Month'].strip()
            day_type = row['Day_Type'].strip().lower()  # "weekday" or "weekend"
            hour = int(row['Hour'].strip())
            value = float(row['Value'].strip() or '0')
            
            source_key = SOURCE_MAP.get(source_raw)
            if not source_key:
                continue
            
            mun_code = MUN_CODE.get(mun_name)
            if not mun_code:
                continue
            
            month_num = MONTH_TO_NUM.get(month_name)
            if not month_num:
                continue
            
            key = (source_key, mun_code, month_num, day_type)
            if key not in groups:
                groups[key] = []
            
            groups[key].append({
                "x": hour,
                "value_mwh": round(value / 1e6, 6)  # Convert Wh to MWh
            })
    
    count = 0
    for (source_key, mun_code, month_num, day_type), entries in groups.items():
        # Sort by hour
        entries.sort(key=lambda e: e['x'])
        
        filename = f"future_comune_{mun_code}_{source_key}_hourly_{month_num}_{day_type}.json"
        filepath = os.path.join(MOCKS_DIR, filename)
        with open(filepath, 'w') as out:
            json.dump(entries, out, indent=2)
        count += 1
    
    print(f"Created {count} hourly JSON files")


if __name__ == '__main__':
    os.makedirs(MOCKS_DIR, exist_ok=True)
    convert_monthly()
    convert_hourly()
    print("Done!")
