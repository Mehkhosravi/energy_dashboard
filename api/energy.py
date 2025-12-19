# api/energy.py

from __future__ import annotations

from flask import Blueprint, jsonify, request
from utils.db_utils import fetch_query

energy_bp = Blueprint("energy", __name__)

ALLOWED_LEVELS = {"comune", "province", "region"}
ALLOWED_RES = {"hourly", "monthly", "annual"}
ALLOWED_DAY_TYPES = {"weekday", "weekend"}
ALLOWED_DOMAINS = {"consumption", "production", "future_production"}


def _pick_data_source(level: str, resolution: str) -> str:
    if level == "comune":
        if resolution == "hourly":
            return "__RAW__"
        if resolution == "monthly":
            return "agg_comune_monthly"
        if resolution == "annual":
            return "agg_comune_annual"

    if level == "province":
        if resolution == "hourly":
            return "agg_province_hourly"
        if resolution == "monthly":
            return "agg_province_monthly"
        if resolution == "annual":
            return "agg_province_annual"

    if level == "region":
        if resolution == "hourly":
            return "agg_region_hourly"
        if resolution == "monthly":
            return "agg_region_monthly"
        if resolution == "annual":
            return "agg_region_annual"

    raise ValueError("Unsupported level/resolution")


def _build_where(
    level: str,
    resolution: str,
    year: int,
    domain: str,
    scenario: str,
    day_type: str | None,
    base_group: str,
    category_code: str,
):
    data_source = _pick_data_source(level, resolution)

    where_parts = [
        "t.level = %s",
        "f.time_resolution = %s",
        "tm.year = %s",
        "ec.domain = %s",
        "sc.code = %s",
    ]
    params = [level, resolution, year, domain, scenario]

    # day_type OPTIONAL
    if day_type is not None:
        where_parts.append("tm.day_type = %s")
        params.append(day_type)

    # data_source
    if data_source == "__RAW__":
        where_parts.append("f.data_source NOT LIKE 'agg_%'")
    else:
        where_parts.append("f.data_source = %s")
        params.append(data_source)

    # optional filters
    if base_group:
        where_parts.append("LOWER(ec.base_group) = %s")
        params.append(base_group.lower())

    if category_code:
        where_parts.append("ec.code = %s")
        params.append(category_code)

    return " AND ".join(where_parts), params


@energy_bp.get("/values")
def choropleth_values_only():
    level = (request.args.get("level") or "").lower().strip()
    resolution = (request.args.get("resolution") or "").lower().strip()
    domain = (request.args.get("domain") or "").lower().strip()
    scenario = (request.args.get("scenario") or "0").strip()
    year = request.args.get("year", type=int)

    day_type = request.args.get("day_type")
    day_type = day_type.lower().strip() if day_type else None

    base_group = (request.args.get("base_group") or "").lower().strip()
    category_code = (request.args.get("category_code") or "").strip()

    # validations
    if level not in ALLOWED_LEVELS:
        return jsonify({"error": "Invalid level"}), 400
    if resolution not in ALLOWED_RES:
        return jsonify({"error": "Invalid resolution"}), 400
    if not year:
        return jsonify({"error": "Missing year"}), 400
    if domain not in ALLOWED_DOMAINS:
        return jsonify({"error": "Invalid domain"}), 400
    if day_type is not None and day_type not in ALLOWED_DAY_TYPES:
        return jsonify({"error": "Invalid day_type"}), 400

    if level == "comune":
        name_expr = "t.municipality_name"
    elif level == "province":
        name_expr = "t.province_name"
    else:  # region
        name_expr = "t.region_name"

    where_sql, params = _build_where(
        level=level,
        resolution=resolution,
        year=year,
        domain=domain,
        scenario=scenario,
        day_type=day_type,
        base_group=base_group,
        category_code=category_code,
    )

    sql = f"""
    SELECT
      t.id AS territory_id,
      {name_expr} AS name,
      t.reg_cod,
      t.prov_cod,
      t.mun_cod,
      SUM(f.value_mwh) AS value_mwh
    FROM energy_dw.fact_energy f
    JOIN energy_dw.dim_territory_en t ON t.id = f.territory_id
    JOIN energy_dw.dim_time tm ON tm.id = f.time_id
    JOIN energy_dw.dim_energy_category ec ON ec.id = f.category_id
    JOIN energy_dw.dim_scenario sc ON sc.id = f.scenario_id
    WHERE {where_sql}
    GROUP BY t.id, {name_expr}, t.reg_cod, t.prov_cod, t.mun_cod
    ORDER BY t.id;
    """

    rows = fetch_query(sql, tuple(params))
    out = [
        {
            "territory_id": r["territory_id"],
            "name": r["name"],
            "reg_cod": r["reg_cod"],
            "prov_cod": r["prov_cod"],
            "mun_cod": r["mun_cod"],
            "value_mwh": float(r["value_mwh"]) if r["value_mwh"] is not None else 0.0,
            "domain": domain,
            "base_group": base_group if base_group else None,
            "category_code": category_code if category_code else None,
        }
        for r in rows
    ]
    return jsonify(out)


@energy_bp.get("/series")
def chart_series():
    level = (request.args.get("level") or "").lower().strip()
    resolution = (request.args.get("resolution") or "").lower().strip()
    domain = (request.args.get("domain") or "").lower().strip()
    scenario = (request.args.get("scenario") or "0").strip()
    year = request.args.get("year", type=int)

    day_type = request.args.get("day_type")
    day_type = day_type.lower().strip() if day_type else None

    base_group = (request.args.get("base_group") or "").lower().strip()
    category_code = (request.args.get("category_code") or "").strip()

    # validations
    if level not in ALLOWED_LEVELS:
        return jsonify({"error": "Invalid level"}), 400
    if resolution not in {"hourly", "monthly", "annual"}:
        return jsonify({"error": "Invalid resolution"}), 400
    if not year:
        return jsonify({"error": "Missing year"}), 400
    if domain not in ALLOWED_DOMAINS:
        return jsonify({"error": "Invalid domain"}), 400
    if day_type is not None and day_type not in ALLOWED_DAY_TYPES:
        return jsonify({"error": "Invalid day_type"}), 400

    # code per level
    if level == "comune":
        code = request.args.get("comune_code")
        code_field = "t.mun_cod"
    elif level == "province":
        code = request.args.get("province_code")
        code_field = "t.prov_cod"
    else:  # region
        code = request.args.get("region_code")
        code_field = "t.reg_cod"

    if not code:
        return jsonify({"error": f"Missing code for level {level}"}), 400

    where_sql, params = _build_where(
        level=level,
        resolution=resolution,
        year=year,
        domain=domain,
        scenario=scenario,
        day_type=day_type,
        base_group=base_group,
        category_code=category_code,
    )

    # apply code filter
    where_sql += f" AND {code_field} = %s"
    params.append(code)

    if resolution == "hourly":
        sql = f"""
            SELECT
              tm.hour AS x,
              SUM(f.value_mwh) AS value_mwh
            FROM energy_dw.fact_energy f
            JOIN energy_dw.dim_territory_en t ON t.id = f.territory_id
            JOIN energy_dw.dim_time tm ON tm.id = f.time_id
            JOIN energy_dw.dim_energy_category ec ON ec.id = f.category_id
            JOIN energy_dw.dim_scenario sc ON sc.id = f.scenario_id
            WHERE {where_sql}
              AND tm.hour IS NOT NULL
            GROUP BY tm.hour
            ORDER BY tm.hour;
        """

    elif resolution == "monthly":
        sql = f"""
            SELECT
              tm.month AS x,
              SUM(f.value_mwh) AS value_mwh
            FROM energy_dw.fact_energy f
            JOIN energy_dw.dim_territory_en t ON t.id = f.territory_id
            JOIN energy_dw.dim_time tm ON tm.id = f.time_id
            JOIN energy_dw.dim_energy_category ec ON ec.id = f.category_id
            JOIN energy_dw.dim_scenario sc ON sc.id = f.scenario_id
            WHERE {where_sql}
              AND tm.month IS NOT NULL
              AND tm.hour IS NULL
            GROUP BY tm.month
            ORDER BY tm.month;
        """

    else:  # annual
        sql = f"""
            SELECT
              tm.year AS x,
              SUM(f.value_mwh) AS value_mwh
            FROM energy_dw.fact_energy f
            JOIN energy_dw.dim_territory_en t ON t.id = f.territory_id
            JOIN energy_dw.dim_time tm ON tm.id = f.time_id
            JOIN energy_dw.dim_energy_category ec ON ec.id = f.category_id
            JOIN energy_dw.dim_scenario sc ON sc.id = f.scenario_id
            WHERE {where_sql}
              AND tm.month IS NULL
              AND tm.hour IS NULL
            GROUP BY tm.year
            ORDER BY tm.year;
        """

    rows = fetch_query(sql, tuple(params))
    return jsonify(
        [
            {
                "x": int(r["x"]) if r["x"] is not None else None,
                "value_mwh": float(r["value_mwh"]) if r["value_mwh"] is not None else 0.0,
            }
            for r in rows
        ]
    )
