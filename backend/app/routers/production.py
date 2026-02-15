from fastapi import APIRouter, HTTPException
from ..db import fetch_rows, fetch_one

router = APIRouter(
    prefix="/production",
    tags=["production"],
)

ALLOWED_ENERGY_TYPES = {"solar", "wind", "hydroelectric", "geothermal", "biomass"}


@router.get("/")
def get_all_production():
    query = "SELECT * FROM province_production"
    return fetch_rows(query)


@router.get("/{prov_cod}")
def get_production_by_province(prov_cod: int):
    query = """
        SELECT *
        FROM province_production
        WHERE prov_cod = %s
    """
    row = fetch_one(query, (prov_cod,))
    if row is None:
        raise HTTPException(status_code=404, detail="Province not found")
    return row


# ---------- Monthly PRODUCTION by type ----------

@router.get("/monthly/{energy_type}/{prov_cod}")
def get_production_monthly_by_type(
    energy_type: str,
    prov_cod: int,
):
    if energy_type not in ALLOWED_ENERGY_TYPES:
        raise HTTPException(status_code=400, detail="Invalid energy type")

    query = """
        SELECT *
        FROM province_production_monthly
        WHERE prov_cod = %s
          AND energy_type = %s::energy_type
    """
    rows = fetch_rows(query, (prov_cod, energy_type))
    if not rows:
        raise HTTPException(status_code=404, detail="No data found")

    # one row per energy_type
    return rows[0]


@router.get("/monthly/{prov_cod}")
def get_production_monthly_all_types(
    prov_cod: int,
):
    query = """
        SELECT *
        FROM province_production_monthly
        WHERE prov_cod = %s
        ORDER BY energy_type
    """
    rows = fetch_rows(query, (prov_cod,))
    if not rows:
        raise HTTPException(status_code=404, detail="No data found")
    return rows


# ---------- Daily ---------- 
@router.get("/province/daily")
def get_daily_all_provinces():
    query = """
        SELECT *
        FROM province_daily_production
        ORDER BY prov_cod, energy_type
    """
    # If your fetch_all requires params, use fetch_all(query, ())
    rows = fetch_rows(query)

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="No daily production data found"
        )

    provinces: dict[int, dict] = {}

    for r in rows:
        prov_cod = r["prov_cod"]
        prov_name = r["prov_name"]
        energy_type = r["energy_type"]

        # Create province container if not exists
        if prov_cod not in provinces:
            provinces[prov_cod] = {
                "prov_cod": prov_cod,
                "prov_name": prov_name,
                "energy_types": {}
            }

        # Keep only the month/annual fields for this energy type
        energy_type_data = {
            k: v
            for k, v in r.items()
            if k not in ("prov_cod", "prov_name", "energy_type")
        }

        provinces[prov_cod]["energy_types"][energy_type] = energy_type_data

    # Return as a list (easier for frontend to iterate)
    return list(provinces.values())


@router.get("/province/daily/{prov_cod}")
def get_daily_by_province(prov_cod: int):
    query = """
        SELECT *
        FROM province_daily_production
        WHERE prov_cod = %s
        ORDER BY energy_type
    """
    rows = fetch_rows(query, (prov_cod,))  # list[dict] if you configured cursor that way

    if not rows:
        raise HTTPException(status_code=404, detail="Daily production not found")

    prov_name = rows[0]["prov_name"]
    energy_types = {}

    for r in rows:
        energy_type = r["energy_type"]
        # drop keys you don't want repeated
        energy_types[energy_type] = {
            k: v
            for k, v in r.items()
            if k not in ("prov_cod", "prov_name", "energy_type")
        }

    return {
        "prov_cod": prov_cod,
        "prov_name": prov_name,
        "energy_types": energy_types,
    }
