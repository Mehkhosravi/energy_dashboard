# === functions.py (CLEANED) ===
import pandas as pd
import os
import json
from shapely import wkt

# === Paths and Configuration ===
DATA_PATH = "data/"

# File mappings
consumption_files = {
    "residential": "co_dom_com_o_table.csv",
    "industrial": "co_pri_com_o_table.csv",
    "agricultural": "co_sec_com_o_table.csv",
    "commercial": "co_ter_com_o_table.csv"
}

actual_files = {
    "solar": "ap_sol_com_o_table.csv",
    "wind": "ap_eol_com_o_table.csv",
    "hydroelectric": "ap_idr_com_o_table.csv",
    "geothermal": "ap_geo_com_o_table.csv",
    "biomass": "ap_bio_com_o_table.csv"
}

future_files = {
    "solar": "fp_bio_com_o_table.csv",
    "wind_v52": "fp_eol_v52_com_o_table.csv",
    "wind_v80": "fp_eol_v80_com_o_table.csv"
}

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

# === Helper Functions ===
def safe_read_csv(filename):
    """Safely reads a CSV file from the data folder."""
    try:
        df = pd.read_csv(os.path.join(DATA_PATH, filename))
        df.columns = df.columns.str.lower().str.strip()
        if 'comune' in df.columns:
            df['comune'] = df['comune'].str.lower().str.strip()
        return df
    except Exception as e:
        print(f"Error loading {filename}: {e}")
        return pd.DataFrame()

def get_unique_comuni(df):
    """Returns a sorted list of unique comuni from a DataFrame."""
    if "comune" in df.columns:
        return sorted(df['comune'].dropna().unique())
    return []

def filter_data(df, comune=None):
    """Filters the DataFrame by comune."""
    if comune and "comune" in df.columns:
        df["comune"] = df["comune"].str.strip().str.lower()
        df = df[df["comune"] == comune.strip().lower()]
    return df

# === GeoJSON Helper ===
def get_geojson_for_comune(comune_name):
    """Returns GeoJSON feature collection for a given comune."""
    df = safe_read_csv("Italy_commune_wkt.csv")
    df = df[df['comune'] == comune_name.lower()]
    if df.empty:
        return None

    feature_list = []
    for _, row in df.iterrows():
        geometry = wkt.loads(row['geometry'])
        feature = {
            "type": "Feature",
            "geometry": json.loads(json.dumps(geometry.__geo_interface__)),
            "properties": {
                "comune": row['comune']
            }
        }
        feature_list.append(feature)

    return {
        "type": "FeatureCollection",
        "features": feature_list
    }
