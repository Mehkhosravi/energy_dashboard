from fastapi import APIRouter, HTTPException
from ..db import fetch_rows, fetch_one

router = APIRouter(
    prefix="/consumption",
    tags=["consumption"],
)


@router.get("/")
def get_all_consumption():
    query = "SELECT * FROM province_consumption"
    return fetch_rows(query)


@router.get("/{prov_cod}")
def get_consumption_by_province(prov_cod: int):
    query = """
        SELECT *
        FROM province_consumption
        WHERE prov_cod = %s
    """
    row = fetch_one(query, (prov_cod,))
    if row is None:
        raise HTTPException(status_code=404, detail="Province not found")
    return row


# ---------- Monthly RESIDENTIAL ----------

@router.get("/province/monthly/residential")
def get_all_residential_monthly():
    query = "SELECT * FROM province_consumption_residential_monthly"
    return fetch_rows(query)


@router.get("/province/monthly/residential/{prov_cod}")
def get_residential_monthly_by_province(prov_cod: int):
    query = """
        SELECT *
        FROM province_consumption_residential_monthly
        WHERE prov_cod = %s
    """
    row = fetch_one(query, (prov_cod,))
    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Monthly consumption not found",
        )
    return row


# ---------- Monthly PRIMARY ----------

@router.get("/province/monthly/primary")
def get_all_primary_monthly():
    query = "SELECT * FROM province_consumption_primary_monthly"
    return fetch_rows(query)


@router.get("/province/monthly/primary/{prov_cod}")
def get_primary_monthly_by_province(prov_cod: int):
    query = """
        SELECT *
        FROM province_consumption_primary_monthly
        WHERE prov_cod = %s
    """
    row = fetch_one(query, (prov_cod,))
    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Monthly primary consumption not found",
        )
    return row


# ---------- Monthly SECONDARY ----------

@router.get("/province/monthly/secondary")
def get_all_secondary_monthly():
    query = "SELECT * FROM province_consumption_secondary_monthly"
    return fetch_rows(query)


@router.get("/province/monthly/secondary/{prov_cod}")
def get_secondary_monthly_by_province(prov_cod: int):
    query = """
        SELECT *
        FROM province_consumption_secondary_monthly
        WHERE prov_cod = %s
    """
    row = fetch_one(query, (prov_cod,))
    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Monthly secondary consumption not found",
        )
    return row


# ---------- Monthly TERTIARY ----------

@router.get("/province/monthly/tertiary")
def get_all_tertiary_monthly():
    query = "SELECT * FROM province_consumption_tertiary_monthly"
    return fetch_rows(query)


@router.get("/province/monthly/tertiary/{prov_cod}")
def get_tertiary_monthly_by_province(prov_cod: int):
    query = """
        SELECT *
        FROM province_consumption_tertiary_monthly
        WHERE prov_cod = %s
    """
    row = fetch_one(query, (prov_cod,))
    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Monthly tertiary consumption not found",
        )
    return row

#-------- daily ------------------
@router.get("/province/daily")
def get_daily_all_provinces():
    query = """
        SELECT *
        FROM province_daily_consumption
        ORDER BY prov_cod, sector
    """
    # If your fetch_all requires params, use fetch_all(query, ())
    rows = fetch_rows(query)

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="No daily consumption data found"
        )

    provinces: dict[int, dict] = {}

    for r in rows:
        prov_cod = r["prov_cod"]
        prov_name = r["prov_name"]
        sector = r["sector"]

        # Create province container if not exists
        if prov_cod not in provinces:
            provinces[prov_cod] = {
                "prov_cod": prov_cod,
                "prov_name": prov_name,
                "sectors": {}
            }

        # Keep only the month/annual fields for this sector
        sector_data = {
            k: v
            for k, v in r.items()
            if k not in ("prov_cod", "prov_name", "sector")
        }

        provinces[prov_cod]["sectors"][sector] = sector_data

    # Return as a list (easier for frontend to iterate)
    return list(provinces.values())


@router.get("/province/daily/{prov_cod}")
def get_daily_by_province(prov_cod: int):
    query = """
        SELECT *
        FROM province_daily_consumption
        WHERE prov_cod = %s
        ORDER BY sector
    """
    rows = fetch_rows(query, (prov_cod,))  # list[dict] if you configured cursor that way

    if not rows:
        raise HTTPException(status_code=404, detail="Daily consumption not found")

    prov_name = rows[0]["prov_name"]
    sectors = {}

    for r in rows:
        sector = r["sector"]
        # drop keys you don't want repeated
        sectors[sector] = {
            k: v
            for k, v in r.items()
            if k not in ("prov_cod", "prov_name", "sector")
        }

    return {
        "prov_cod": prov_cod,
        "prov_name": prov_name,
        "sectors": sectors,
    }
