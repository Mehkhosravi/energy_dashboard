# # api/territories.py


# from flask import Blueprint, jsonify, request
# import json

# from utils.db_utils import fetch_query

# territories_bp = Blueprint("territories", __name__)

# ALLOWED_LEVELS = {"comune", "province", "region"}


# @territories_bp.get("/territories")
# def territories_geo():
#     """
#     GET /map/territories?level=province&simplify=0.005

#     Returns FeatureCollection with fixed geometry.
#     """
#     level = (request.args.get("level") or "").lower().strip()
#     if level not in ALLOWED_LEVELS:
#         return jsonify({"error": "Invalid level"}), 400

#     simplify = request.args.get("simplify", type=float)
#     # default simplify (good starting points)
#     if simplify is None:
#         simplify = 0.005 if level == "province" else (0.01 if level == "region" else 0.001)

#     sql = """
#         SELECT
#           t.id,
#           t.name,
#           t.reg_cod,
#           t.prov_cod,
#           t.mun_cod,
#           ST_AsGeoJSON(ST_SimplifyPreserveTopology(t.geom, %s)) AS geometry
#         FROM energy_dw.dim_territory_en t
#         WHERE t.level = %s
#           AND t.geom IS NOT NULL
#         ORDER BY t.name;
#     """
#     rows = fetch_query(sql, (simplify, level))

#     features = []
#     for r in rows:
#         geom = json.loads(r["geometry"]) if r.get("geometry") else None
#         if geom is None:
#             continue
#         features.append({
#             "type": "Feature",
#             "geometry": geom,
#             "properties": {
#                 "id": r["id"],
#                 "name": r["name"],
#                 "reg_cod": r["reg_cod"],
#                 "prov_cod": r["prov_cod"],
#                 "mun_cod": r["mun_cod"],
#             }
#         })

#     return jsonify({"type": "FeatureCollection", "features": features})

# api/territories.py

from flask import Blueprint, jsonify, request
import json
from utils.db_utils import fetch_query

territories_bp = Blueprint("territories", __name__)

ALLOWED_LEVELS = {"comune", "province", "region"}


@territories_bp.get("/territories")
def territories_geo():
    """
    GET /map/territories?level=province&simplify=0.005
    Returns GeoJSON FeatureCollection
    """
    level = (request.args.get("level") or "").lower().strip()
    if level not in ALLOWED_LEVELS:
        return jsonify({"error": "Invalid level"}), 400

    simplify = request.args.get("simplify", type=float)
    if simplify is None:
        simplify = 0.005 if level == "province" else (0.01 if level == "region" else 0.001)

        # 🔹 choose correct name column
    if level == "comune":
        name_field = "t.municipality_name"
    elif level == "province":
        name_field = "t.province_name"
    else:
        name_field = "t.region_name"

    sql = f"""
        SELECT
          t.id,
          {name_field} AS name,
          t.reg_cod,
          t.prov_cod,
          t.mun_cod,
          ST_AsGeoJSON(
            ST_SimplifyPreserveTopology(t.geom, %s)
          ) AS geometry
        FROM energy_dw.dim_territory_en t
        WHERE t.level = %s
          AND t.geom IS NOT NULL
        ORDER BY name;
    """

    rows = fetch_query(sql, (simplify, level))

    features = []
    for r in rows:
        geom = json.loads(r["geometry"]) if r.get("geometry") else None
        if not geom:
            continue

        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "id": r["id"],
                "name": r["name"],
                "reg_cod": r["reg_cod"],
                "prov_cod": r["prov_cod"],
                "mun_cod": r["mun_cod"],
                "level": level,
            }
        })

    return jsonify({
        "type": "FeatureCollection",
        "features": features
    })
