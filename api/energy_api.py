# api/energy_api.py

from flask import Blueprint, jsonify, request
from utils.functions import get_monthly_energy_for_comune

energy_bp = Blueprint("energy_bp", __name__, url_prefix="/api/energy")

@energy_bp.route("/monthly")
def energy_monthly_by_comune():
    comune = request.args.get("comune")
    year = request.args.get("year", type=int)
    domain = request.args.get("domain", default="consumption")

    if not comune or not year:
        return jsonify({"error": "Missing 'comune' or 'year' parameter"}), 400

    try:
        rows = get_monthly_energy_for_comune(comune, year, domain)
        return jsonify(rows)
    except Exception as e:
        print("[ERROR] energy_monthly_by_comune:", e)
        return jsonify({"error": "Internal server error"}), 500
