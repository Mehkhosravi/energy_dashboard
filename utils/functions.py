# utils/functions.py

import pandas as pd
import os
import json
import pyproj
from utils.db_utils import fetch_query
from models.commune_geometry import CommuneGeometry
from extensions import db
import json
from utils.db_utils import fetch_query

# === Mapping & Constants ============================================

month_map = {
    "gen": "Jan", "feb": "Feb", "mar": "Mar", "apr": "Apr", "mag": "May",
    "giu": "Jun", "lug": "Jul", "ago": "Aug",
    "set": "Sep", "ott": "Oct", "nov": "Nov", "dic": "Dec",
}

season_months = {
    "winter": ["dic", "gen", "feb"],
    "spring": ["mar", "apr", "mag"],
    "summer": ["giu", "lug", "ago"],
    "autumn": ["set", "ott", "nov"],
}

# === GEOMETRY & MAP HELPERS =========================================

def get_geojson_for_comune(comune_name: str):
    """
    Simple wrapper to get geometry for a single comune name.
    Internally it reuses get_geojson_by_level with level='comune'.
    """
    return get_geojson_by_level("comune", comune_name)


def get_geojson_by_level(level: str, name: str):
    """
    Return a GeoJSON FeatureCollection for region / province / comune,
    converting WKT (EPSG:32632) to WGS84 (EPSG:4326) using PostGIS.

    Tables:
      - public.commune_geometry  (wkt in EPSG:32632)
      - public.comune_mapping    (names for region/province/comune)
    """

    level = level.lower()

    if level == "region":
        filter_column = "region_name"
    elif level == "province":
        filter_column = "province_name"
    elif level == "comune":
        filter_column = "comune_name"
    else:
        return None

    sql = f"""
        SELECT 
            cg.comune_code,
            cg.comune_name,
            ST_AsGeoJSON(
                ST_Transform(
                    ST_GeomFromText(cg.wkt, 32632),
                    4326
                )
            ) AS geometry
        FROM commune_geometry AS cg
        JOIN comune_mapping AS cm
            ON cg.comune_code = cm.comune_code::integer
        WHERE LOWER(cm.{filter_column}) = LOWER(%s);
    """

    rows = fetch_query(sql, (name,))
    if not rows:
        return None

    features = []
    for row in rows:
        geom = json.loads(row["geometry"])
        feature = {
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "comune": row["comune_name"],
                "comune_code": row["comune_code"],
                filter_column: name,
            },
        }
        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features,
    }

# === NEW: Energy API based on star-schema (fact_energy + dims) ======

def get_monthly_energy_for_comune(comune_name: str, year: int, domain: str = "consumption"):
    """
    Aggregate energy (MWh) by month and base_group for a given comune and year,
    using the new star-schema tables:

      - energy_dw.fact_energy
      - energy_dw.dim_territory
      - energy_dw.dim_time
      - energy_dw.dim_energy_category
    """
    sql = """
        SELECT
            tm.month AS month,
            ec.base_group AS base_group,
            SUM(fe.value_mwh) AS value_mwh
        FROM energy_dw.fact_energy AS fe
        JOIN energy_dw.dim_territory AS dt
            ON dt.id = fe.territory_id
        JOIN energy_dw.dim_time AS tm
            ON tm.id = fe.time_id
        JOIN energy_dw.dim_energy_category AS ec
            ON ec.id = fe.category_id
        WHERE
            dt.level = 'comune'
            AND LOWER(dt.comune_name) = LOWER(%s)
            AND tm.year = %s
            AND fe.time_resolution = 'hourly'
            AND ec.domain = %s   -- 'consumption' | 'production' | 'producibility' | 'result'
        GROUP BY tm.month, ec.base_group
        ORDER BY tm.month, ec.base_group;
    """

    rows = fetch_query(sql, (comune_name, year, domain))
    return rows  # list[dict]: {month, base_group, value_mwh}
