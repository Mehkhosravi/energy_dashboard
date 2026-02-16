import csv
import json
import os

CSV_PATH = '/home/appmng/my-webapp/frontend/src/data/raw_actual_production/ALL_hourly_production.csv'
MOCKS_DIR = '/home/appmng/my-webapp/frontend/src/data/mocks'

MUN_MAP = {
    'Agliè': [1001],
    'Airasca': [1002],
    'Torino': [1, 1272]
}

MONTH_MAP = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
}

SOURCE_MAP = {
    'Biomass': 'biomass',
    'Geothermal': 'geothermal',
    'Hydro': 'hydroelectric',
    'Solar': 'solar',
    'Wind': 'wind'
}

def generate_mocks():
    data = {}
    
    with open(CSV_PATH, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            mun = row['Municipality']
            if mun not in MUN_MAP:
                continue
            
            codes = MUN_MAP[mun]
            month = MONTH_MAP[row['Month']]
            source = SOURCE_MAP[row['Energy_Source']]
            hour = int(row['Hour'])
            value = float(row['Value'])
            
            for code in codes:
                key = (code, source, month)
                if key not in data:
                    data[key] = [0.0] * 24
                
                # Hour in CSV is 1-24, map to 0-23
                data[key][hour - 1] = value

    # Generate individual source files
    for (code, source, month), values in data.items():
        # Decide if it's comune or province based on code
        level = "province" if code < 1000 else "comune"
        filename = f"series_{level}_{code}_production_hourly_{source}_{month}_weekday.json"
        filepath = os.path.join(MOCKS_DIR, filename)
        
        json_data = [{"value_mwh": val, "x": i + 1} for i, val in enumerate(values)]
        
        with open(filepath, 'w', encoding='utf-8') as out_f:
            json.dump(json_data, out_f, indent=2)
            
    # Generate "total" production files
    total_data = {}
    for (code, source, month), values in data.items():
        total_key = (code, month)
        if total_key not in total_data:
            total_data[total_key] = [0.0] * 24
        
        for i, val in enumerate(values):
            total_data[total_key][i] += val
            
    for (code, month), values in total_data.items():
        level = "province" if code < 1000 else "comune"
        filename = f"series_{level}_{code}_production_hourly_total_{month}_weekday.json"
        filepath = os.path.join(MOCKS_DIR, filename)
        
        json_data = [{"value_mwh": val, "x": i + 1} for i, val in enumerate(values)]
        
        with open(filepath, 'w', encoding='utf-8') as out_f:
            json.dump(json_data, out_f, indent=2)

if __name__ == "__main__":
    generate_mocks()
    print("Mocks generated successfully.")
