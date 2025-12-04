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
