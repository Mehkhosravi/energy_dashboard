import pandas as pd
import os
import json
from shapely import wkt
from utils.db_utils import fetch_query

# === Mapping & Constants ===

month_map = {
    "gen": "Jan", "feb": "Feb", "mar": "Mar", "apr": "Apr", "mag": "May",
    "giu": "Jun", "lug": "Jul", "ago": "Aug", "set": "Sep", "ott": "Oct", "nov": "Nov", "dic": "Dec"
}

season_months = {
    'winter': ['dic', 'gen', 'feb'],
    'spring': ['mar', 'apr', 'mag'],
    'summer': ['giu', 'lug', 'ago'],
    'autumn': ['set', 'ott', 'nov']
}

# === Generic Data Query by Table ===

def get_data_by_comune(table_name, comune_code):
    query = f"SELECT * FROM {table_name} WHERE comune_code = %s"
    rows = fetch_query(query, (comune_code,))
    return pd.DataFrame(rows)

# === Named Helper Functions for Specific Tables ===

# Consumption
def get_residential_consumption(comune_code):
    return get_data_by_comune("co_dom_com_o_table", comune_code)

def get_industrial_consumption(comune_code):
    return get_data_by_comune("co_pri_com_o_table", comune_code)

def get_agricultural_consumption(comune_code):
    return get_data_by_comune("co_sec_com_o_table", comune_code)

def get_commercial_consumption(comune_code):
    return get_data_by_comune("co_ter_com_o_table", comune_code)

# Actual Production
def get_solar_production(comune_code):
    return get_data_by_comune("ap_sol_com_o_table", comune_code)

def get_wind_production(comune_code):
    return get_data_by_comune("ap_eol_com_o_table", comune_code)

def get_hydro_production(comune_code):
    return get_data_by_comune("ap_idr_com_o_table", comune_code)

def get_geo_production(comune_code):
    return get_data_by_comune("ap_geo_com_o_table", comune_code)

def get_bio_production(comune_code):
    return get_data_by_comune("ap_bio_com_o_table", comune_code)

# Future Production
def get_future_bio(comune_code):
    return get_data_by_comune("fp_bio_com_o_table", comune_code)

def get_future_wind_v52(comune_code):
    return get_data_by_comune("fp_eol_v52_com_o_table", comune_code)

def get_future_wind_v80(comune_code):
    return get_data_by_comune("fp_eol_v80_com_o_table", comune_code)

# Scenario Table
def get_scenario_options(comune_code):
    return get_data_by_comune("scenario_five_op_table", comune_code)

# === Geometry & Comuni ===

def get_geojson_for_comune(comune_name):
    query = "SELECT wkt, comune_name FROM commune_geometry WHERE LOWER(comune_name) = LOWER(%s)"
    rows = fetch_query(query, (comune_name,))
    if not rows:
        return None

    features = []
    for row in rows:
        geometry = wkt.loads(row["wkt"])
        feature = {
            "type": "Feature",
            "geometry": json.loads(json.dumps(geometry.__geo_interface__)),
            "properties": {"comune": row["comune_name"]}
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features
    }

def get_unique_comuni_from_db():
    query = "SELECT DISTINCT comune_name FROM commune_geometry ORDER BY comune_name"
    rows = fetch_query(query)
    return [row["comune_name"] for row in rows]
