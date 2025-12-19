# api/scenarios.py


from __future__ import annotations

from flask import Blueprint, jsonify, request
from utils.db_utils import fetch_query

scenarios_bp = Blueprint("scenarios", __name__)

ALLOWED_LEVELS = {"comune", "province", "region"}

PARAM_META = {
    "consumption_mwh": {
        "label": "Consumption",
        "unit": "MWh",
        "group": "Energy (MWh)",
        "format": "number",
    },
    "production_mwh": {
        "label": "Production",
        "unit": "MWh",
        "group": "Energy (MWh)",
        "format": "number",
    },
    "self_consumption_mwh": {
        "label": "Self-consumption",
        "unit": "MWh",
        "group": "Energy (MWh)",
        "format": "number",
    },
    "over_production_mwh": {
        "label": "Over-production (Surplus)",
        "unit": "MWh",
        "group": "Energy (MWh)",
        "format": "number",
    },
    "uncovered_demand_mwh": {
        "label": "Uncovered demand",
        "unit": "MWh",
        "group": "Energy (MWh)",
        "format": "number",
    },
    "community_self_consumption_mwh": {
        "label": "Community self-consumption (CSC)",
        "unit": "MWh",
        "group": "Community (MWh)",
        "format": "number",
    },
    "community_self_consumption_total_mwh": {
        "label": "SC + CSC (Total self-consumption)",
        "unit": "MWh",
        "group": "Community (MWh)",
        "format": "number",
    },
    "self_consumption_index": {
        "label": "SCI (Self-consumption index)",
        "unit": "ratio",
        "group": "Indexes",
        "format": "ratio",
    },
    "self_sufficiency_index": {
        "label": "SSI (Self-sufficiency index)",
        "unit": "ratio",
        "group": "Indexes",
        "format": "ratio",
    },
    "over_production_index": {
        "label": "OPI (Over-production index)",
        "unit": "ratio",
        "group": "Indexes",
        "format": "ratio",
    },
}


def _name_expr(level: str) -> str:
    # dim_territory_en has these
    if level == "comune":
        return "t.municipality_name"
    if level == "province":
        return "t.province_name"
    return "t.region_name"


@scenarios_bp.get("")
def list_scenarios():
    """
    GET /scenarios
    Returns scenarios from dim_scenario + years available in fact_scenario_param
    """
    sql = """
        SELECT
          s.id,
          s.code,
          s.name_en,
          s.name_it,
          s.description,
          s.horizon_year,
          s.scenario_group,
          s.is_baseline,
          s.source,
          COALESCE(y.years, ARRAY[]::int[]) AS years
        FROM energy_dw.dim_scenario s
        LEFT JOIN (
          SELECT scenario_id, array_agg(DISTINCT year ORDER BY year) AS years
          FROM energy_dw.fact_scenario_param
          WHERE year IS NOT NULL
          GROUP BY scenario_id
        ) y ON y.scenario_id = s.id
        ORDER BY s.id;
    """
    rows = fetch_query(sql)
    return jsonify(rows)


@scenarios_bp.get("/param-keys")
def list_param_keys():
    """
    GET /scenarios/param-keys
    Returns available param_keys from DB, enriched with PARAM_META.
    """
    sql = """
        SELECT DISTINCT param_key
        FROM energy_dw.fact_scenario_param
        ORDER BY param_key;
    """
    rows = fetch_query(sql)
    keys = [r["param_key"] for r in rows]

    out = []
    for k in keys:
        meta = PARAM_META.get(k, {"label": k, "unit": None, "group": "Other", "format": "number"})
        out.append({"param_key": k, **meta})
    return jsonify(out)


@scenarios_bp.get("/values")
def scenario_values_choropleth():
    """
    GET /scenarios/values?level=province&scenario=4&year=2019&param_key=consumption_mwh
    Choropleth values for all territories at a level.
    """
    level = (request.args.get("level") or "").lower().strip()
    scenario_code = (request.args.get("scenario") or "").strip()
    year = request.args.get("year", type=int)
    param_key = (request.args.get("param_key") or "").strip()

    if level not in ALLOWED_LEVELS:
        return jsonify({"error": "Invalid level"}), 400
    if not scenario_code:
        return jsonify({"error": "Missing scenario"}), 400
    if not year:
        return jsonify({"error": "Missing year"}), 400
    if not param_key:
        return jsonify({"error": "Missing param_key"}), 400

    name_expr = _name_expr(level)

    sql = f"""
        SELECT
          t.id AS territory_id,
          {name_expr} AS name,
          t.reg_cod,
          t.prov_cod,
          t.mun_cod,
          f.param_value,
          f.unit,
          f.param_key
        FROM energy_dw.fact_scenario_param f
        JOIN energy_dw.dim_scenario s ON s.id = f.scenario_id
        JOIN energy_dw.dim_territory_en t ON t.id = f.territory_id
        WHERE t.level = %s
          AND s.code = %s
          AND f.year = %s
          AND f.param_key = %s
        ORDER BY t.id;
    """
    rows = fetch_query(sql, (level, scenario_code, year, param_key))

    meta = PARAM_META.get(param_key, {"label": param_key, "unit": None, "group": "Other", "format": "number"})
    out = []
    for r in rows:
        out.append({
            "territory_id": r["territory_id"],
            "name": r["name"],
            "reg_cod": r["reg_cod"],
            "prov_cod": r["prov_cod"],
            "mun_cod": r["mun_cod"],
            "param_key": r["param_key"],
            "value": float(r["param_value"]) if r["param_value"] is not None else None,
            "unit": r["unit"],
            "meta": meta,
        })
    return jsonify(out)


@scenarios_bp.get("/territory")
def scenario_params_for_one_territory():
    """
    GET /scenarios/territory?level=province&province_code=1&scenario=4&year=2019
    Returns ALL param_keys for one selected territory.
    """
    level = (request.args.get("level") or "").lower().strip()
    scenario_code = (request.args.get("scenario") or "").strip()
    year = request.args.get("year", type=int)

    if level not in ALLOWED_LEVELS:
        return jsonify({"error": "Invalid level"}), 400
    if not scenario_code:
        return jsonify({"error": "Missing scenario"}), 400
    if not year:
        return jsonify({"error": "Missing year"}), 400

    if level == "comune":
        code = request.args.get("comune_code")
        code_field = "t.mun_cod"
    elif level == "province":
        code = request.args.get("province_code")
        code_field = "t.prov_cod"
    else:
        code = request.args.get("region_code")
        code_field = "t.reg_cod"

    if not code:
        return jsonify({"error": f"Missing code for level {level}"}), 400

    name_expr = _name_expr(level)

    sql = f"""
        SELECT
          t.id AS territory_id,
          {name_expr} AS name,
          t.reg_cod,
          t.prov_cod,
          t.mun_cod,
          f.param_key,
          f.param_value,
          f.unit
        FROM energy_dw.fact_scenario_param f
        JOIN energy_dw.dim_scenario s ON s.id = f.scenario_id
        JOIN energy_dw.dim_territory_en t ON t.id = f.territory_id
        WHERE t.level = %s
          AND s.code = %s
          AND f.year = %s
          AND {code_field} = %s
        ORDER BY f.param_key;
    """
    rows = fetch_query(sql, (level, scenario_code, year, code))

    # reshape to a clean object
    if not rows:
        return jsonify({"error": "No data found"}), 404

    values = {}
    for r in rows:
        k = r["param_key"]
        values[k] = {
            "value": float(r["param_value"]) if r["param_value"] is not None else None,
            "unit": r["unit"],
            "meta": PARAM_META.get(k, {"label": k, "unit": None, "group": "Other", "format": "number"}),
        }

    territory = {
        "territory_id": rows[0]["territory_id"],
        "level": level,
        "name": rows[0]["name"],
        "reg_cod": rows[0]["reg_cod"],
        "prov_cod": rows[0]["prov_cod"],
        "mun_cod": rows[0]["mun_cod"],
    }

    return jsonify({
        "scenario": scenario_code,
        "year": year,
        "territory": territory,
        "values": values,
    })
