# api/map_api.py

from flask import Blueprint, jsonify
from utils.functions import get_geojson_for_comune, get_geojson_by_level

map_bp = Blueprint("map_bp", __name__, url_prefix="/api")

@map_bp.route("/map_data/<comune>")
def map_data(comune: str):
    geojson = get_geojson_for_comune(comune)
    if not geojson:
        return jsonify({"error": "Comune not found"}), 404
    return jsonify(geojson)

@map_bp.route("/map_data/<level>/<name>")
def map_data_by_level(level: str, name: str):
    level = level.lower()
    if level not in ["region", "province", "comune"]:
        return jsonify({"error": "Invalid level"}), 400

    geojson = get_geojson_by_level(level, name)
    if not geojson:
        return jsonify({"error": "No geometry found"}), 404

    return jsonify(geojson)
