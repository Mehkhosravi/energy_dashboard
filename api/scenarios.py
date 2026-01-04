# api/scenarios.py


from __future__ import annotations

from flask import Blueprint, jsonify, request
from utils.db_utils import fetch_query, execute_query, bulk_insert_values

scenarios_bp = Blueprint("scenarios", __name__)

ALLOWED_LEVELS = {"comune", "province", "region"}
ALLOWED_RES = {"annual", "monthly", "seasonal"}

PARAM_META = {
    "consumption_mwh": {"label": "Consumption", "unit": "MWh", "group": "Energy (MWh)", "format": "number"},
    "production_mwh": {"label": "Production", "unit": "MWh", "group": "Energy (MWh)", "format": "number"},
    "self_consumption_mwh": {"label": "Self-consumption", "unit": "MWh", "group": "Energy (MWh)", "format": "number"},
    "over_production_mwh": {"label": "Over-production (Surplus)", "unit": "MWh", "group": "Energy (MWh)", "format": "number"},
    "uncovered_demand_mwh": {"label": "Uncovered demand", "unit": "MWh", "group": "Energy (MWh)", "format": "number"},
    "community_self_consumption_mwh": {"label": "Community self-consumption (CSC)", "unit": "MWh", "group": "Community (MWh)", "format": "number"},
    "community_self_consumption_total_mwh": {"label": "SC + CSC (Total self-consumption)", "unit": "MWh", "group": "Community (MWh)", "format": "number"},
    "self_consumption_index": {"label": "SCI (Self-consumption index)", "unit": "ratio", "group": "Indexes", "format": "ratio"},
    "self_sufficiency_index": {"label": "SSI (Self-sufficiency index)", "unit": "ratio", "group": "Indexes", "format": "ratio"},
    "over_production_index": {"label": "OPI (Over-production index)", "unit": "ratio", "group": "Indexes", "format": "ratio"},
}


def _name_expr(level: str) -> str:
    if level == "comune":
        return "t.municipality_name"
    if level == "province":
        return "t.province_name"
    return "t.region_name"


def _pick_agg_source(level: str, resolution: str) -> tuple[str, str]:
    # seasonal derived from monthly aggregation
    if resolution == "seasonal":
        resolution = "monthly"

    if level == "comune":
        return (f"agg_comune_{resolution}", resolution)
    if level == "province":
        return (f"agg_province_{resolution}", resolution)
    if level == "region":
        return (f"agg_region_{resolution}", resolution)

    raise ValueError("Invalid level")


def _safe_float(x) -> float:
    try:
        return float(x)
    except Exception:
        return 0.0


def _calc_indicators(c: float, p: float) -> dict:
    # Same logic as previously established:
    # sc = min(c,p), op = max(p-c,0), ud = max(c-p,0)
    sc = min(c, p)
    op = max(p - c, 0.0)
    ud = max(c - p, 0.0)

    sci = (sc / p) if p > 0 else 0.0
    ssi = (sc / c) if c > 0 else 0.0
    opi = (op / p) if p > 0 else 0.0

    return {
        "consumption_mwh": c,
        "production_mwh": p,
        "self_consumption_mwh": sc,
        "over_production_mwh": op,
        "uncovered_demand_mwh": ud,
        "self_consumption_index": sci,
        "self_sufficiency_index": ssi,
        "over_production_index": opi,
    }


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
    return jsonify(fetch_query(sql))


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


@scenarios_bp.get("/preview")
def preview_scenario():
    level = (request.args.get("level") or "").lower().strip()
    resolution = (request.args.get("resolution") or "").lower().strip()
    year = request.args.get("year", type=int)
    base_scenario = (request.args.get("base_scenario") or "0").strip()

    uplift_pct = request.args.get("uplift_pct", default=0.0, type=float)
    uplift_categories_raw = (request.args.get("uplift_categories") or "").strip()
    uplift_categories = [c.strip() for c in uplift_categories_raw.split(",") if c.strip()]

    if level not in ALLOWED_LEVELS:
        return jsonify({"error": "Invalid level"}), 400
    if resolution not in ALLOWED_RES:
        return jsonify({"error": "Invalid resolution"}), 400
    if not year:
        return jsonify({"error": "Missing year"}), 400
    if uplift_pct < 0:
        return jsonify({"error": "uplift_pct must be >= 0"}), 400

    # build and run query
    name_expr = _name_expr(level)

    data_source, time_res = _pick_agg_source(level, resolution)

    if resolution == "annual":
        x_expr = "tm.year"
        x_where = "tm.month IS NULL AND tm.hour IS NULL"
    elif resolution == "monthly":
        x_expr = "tm.month"
        x_where = "tm.month IS NOT NULL AND tm.hour IS NULL"
    else:  # seasonal
        x_expr = "tm.season"
        x_where = "tm.month IS NOT NULL AND tm.hour IS NULL AND tm.season IS NOT NULL"
        data_source, time_res = _pick_agg_source(level, "seasonal")  # seasonal->monthly

    uplift_filter_sql = ""
    params = [level, time_res, year, base_scenario, data_source]

    if uplift_categories:
        uplift_filter_sql = "AND ec.code = ANY(%s)"
        params.append(uplift_categories)

    sql = f"""
        WITH base AS (
          SELECT
            t.id AS territory_id,
            {name_expr} AS name,
            t.reg_cod, t.prov_cod, t.mun_cod,
            {x_expr} AS x,

            COALESCE(SUM(CASE WHEN ec.domain = 'consumption' THEN f.value_mwh END), 0) AS consumption_mwh,
            COALESCE(SUM(CASE WHEN ec.domain = 'production' THEN f.value_mwh END), 0) AS production_total_mwh,
            COALESCE(SUM(CASE
              WHEN ec.domain = 'production' {uplift_filter_sql}
              THEN f.value_mwh END), 0) AS production_uplift_base_mwh

          FROM energy_dw.fact_energy f
          JOIN energy_dw.dim_territory_en t ON t.id = f.territory_id
          JOIN energy_dw.dim_time tm ON tm.id = f.time_id
          JOIN energy_dw.dim_energy_category ec ON ec.id = f.category_id
          JOIN energy_dw.dim_scenario sc ON sc.id = f.scenario_id

          WHERE
            t.level = %s
            AND f.time_resolution = %s
            AND tm.year = %s
            AND sc.code = %s
            AND f.data_source = %s
            AND {x_where}

          GROUP BY
            t.id,
            {name_expr},
            t.reg_cod, t.prov_cod, t.mun_cod,
            x
        )
        SELECT *
        FROM base
        ORDER BY territory_id, x;
    """

    rows = fetch_query(sql, tuple(params))

    out = []
    uplift_factor = uplift_pct / 100.0

    for r in rows:
        c = _safe_float(r["consumption_mwh"])
        p_total = _safe_float(r["production_total_mwh"])
        p_uplift_base = _safe_float(r["production_uplift_base_mwh"])
        p_new = p_total + (p_uplift_base * uplift_factor)

        metrics = _calc_indicators(c, p_new)

        out.append({
            "territory_id": r["territory_id"],
            "name": r["name"],
            "reg_cod": r["reg_cod"],
            "prov_cod": r["prov_cod"],
            "mun_cod": r["mun_cod"],
            "x": r["x"],
            "base_scenario": base_scenario,
            "uplift_pct": uplift_pct,
            "uplift_categories": uplift_categories,
            **metrics,
        })

    return jsonify(out)


@scenarios_bp.post("/save")
def save_scenario():
    """
    Save scenario only when user clicks Save.

    JSON body:
    {
      "username": "admin",
      "name_en": "My test scenario",
      "name_it": "Scenario test",
      "description": "....",
      "year": 2019,
      "level": "province",
      "base_scenario": "0",
      "uplift_pct": 10,
      "uplift_categories": ["solar","wind"]
    }

    MVP: Only save annually (since fact_scenario_param only has year).
    """
    body = request.get_json(silent=True) or {}

    username = (body.get("username") or "").strip()
    name_en = (body.get("name_en") or "").strip()
    name_it = (body.get("name_it") or "").strip()
    description = (body.get("description") or "").strip()

    year = body.get("year")
    level = (body.get("level") or "").lower().strip()
    base_scenario = str(body.get("base_scenario") or "0").strip()

    uplift_pct = float(body.get("uplift_pct") or 0.0)
    uplift_categories = body.get("uplift_categories") or []
    uplift_categories = [str(x).strip() for x in uplift_categories if str(x).strip()]

    # validate
    if not username:
        return jsonify({"error": "username is required"}), 400
    if not name_en:
        return jsonify({"error": "name_en is required"}), 400
    if level not in ALLOWED_LEVELS:
        return jsonify({"error": "Invalid level"}), 400
    if not isinstance(year, int):
        return jsonify({"error": "year must be int"}), 400
    if uplift_pct < 0:
        return jsonify({"error": "uplift_pct must be >= 0"}), 400

    # generate a DB-friendly scenario code (unique enough)
    # example: u_admin_2019_10p
    safe_user = "".join(ch for ch in username.lower() if ch.isalnum() or ch in ("_", "-"))[:24]
    code = f"u_{safe_user}_{year}_{int(round(uplift_pct))}p"

    # ensure unique code
    exists = fetch_query("SELECT 1 FROM energy_dw.dim_scenario WHERE code=%s LIMIT 1;", (code,))
    if exists:
        code = f"{code}_v2"

    # 1) insert into dim_scenario
    insert_s = """
      INSERT INTO energy_dw.dim_scenario
        (code, name_en, name_it, description, horizon_year, scenario_group, is_baseline, source)
      VALUES
        (%s, %s, %s, %s, %s, 'user', false, %s)
      RETURNING id;
    """
    source = f"user:{username}"
    scenario_id_row = fetch_query(insert_s, (code, name_en, name_it or None, description or None, year, source))
    scenario_id = scenario_id_row[0]["id"]

    # 2) compute annual values using the SAME logic as preview (but annual only)
    level = level
    resolution = "annual"
    data_source, time_res = _pick_agg_source(level, resolution)

    uplift_filter_sql = ""
    params = [level, time_res, year, base_scenario, data_source]
    if uplift_categories:
        uplift_filter_sql = "AND ec.code = ANY(%s)"
        params.append(uplift_categories)

    name_case = """
      CASE
        WHEN %s = 'comune' THEN t.municipality_name
        WHEN %s = 'province' THEN t.province_name
        ELSE t.region_name
      END
    """

    sql = f"""
      SELECT
        t.id AS territory_id,
        COALESCE(SUM(CASE WHEN ec.domain='consumption' THEN f.value_mwh END),0) AS consumption_mwh,
        COALESCE(SUM(CASE WHEN ec.domain='production' THEN f.value_mwh END),0) AS production_total_mwh,
        COALESCE(SUM(CASE WHEN ec.domain='production' {uplift_filter_sql} THEN f.value_mwh END),0) AS production_uplift_base_mwh
      FROM energy_dw.fact_energy f
      JOIN energy_dw.dim_territory_en t ON t.id=f.territory_id
      JOIN energy_dw.dim_time tm ON tm.id=f.time_id
      JOIN energy_dw.dim_energy_category ec ON ec.id=f.category_id
      JOIN energy_dw.dim_scenario sc ON sc.id=f.scenario_id
      WHERE
        t.level=%s
        AND f.time_resolution=%s
        AND tm.year=%s
        AND sc.code=%s
        AND f.data_source=%s
        AND tm.month IS NULL AND tm.hour IS NULL
      GROUP BY t.id
      ORDER BY t.id;
    """
    rows = fetch_query(sql, tuple(params))

    # 3) unpivot + bulk insert to fact_scenario_param
    uplift_factor = uplift_pct / 100.0
    notes = f"Saved by {username}. Base={base_scenario}, uplift_pct={uplift_pct}, cats={','.join(uplift_categories) or '-'}"

    fact_rows = []
    for r in rows:
        c = _safe_float(r["consumption_mwh"])
        p_total = _safe_float(r["production_total_mwh"])
        p_uplift_base = _safe_float(r["production_uplift_base_mwh"])
        p_new = p_total + (p_uplift_base * uplift_factor)
        metrics = _calc_indicators(c, p_new)

        for k, v in metrics.items():
            unit = "MWh" if k.endswith("_mwh") else "ratio"
            fact_rows.append((scenario_id, int(r["territory_id"]), k, float(v), unit, year, notes))

    bulk_sql = """
      INSERT INTO energy_dw.fact_scenario_param
        (scenario_id, territory_id, param_key, param_value, unit, year, notes)
      VALUES %s;
    """
    bulk_insert_values(bulk_sql, fact_rows)

    return jsonify({
        "status": "saved",
        "scenario_id": scenario_id,
        "code": code,
        "stored_level": level,
        "stored_year": year,
        "rows_inserted": len(fact_rows),
    }), 201
