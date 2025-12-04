from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg
from psycopg.rows import dict_row
from fastapi import Query  

from db import get_connection  

# CORS -backend and Frontend origins-
CORS_ORIGIN = ["http://localhost:3000", "http://localhost:5173"]

app = FastAPI()

# cross_origin settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGIN,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




@app.get("/")
def read_root():
    return {"message": "Backend is running 🚀"}


@app.get("/consumption")
def get_all_consumption():
    query = "SELECT * FROM province_consumption"

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                columns = [desc[0] for desc in cur.description]
                rows = cur.fetchall()

        # Convert each row to dictionary → JSON
        result = [dict(zip(columns, row)) for row in rows]
        return result
    
    except psycopg.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.pgerror}")
    
@app.get("/consumption/{prov_cod}")
def get_consumption_by_province(prov_cod: int):
    query = """
        SELECT *
        FROM province_consumption
        WHERE prov_cod = %s
    """

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (prov_cod,))
                row = cur.fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Province not found")

        # map columns → dict
        return {
            "reg_cod": row[0],
            "prov_cod": row[1],
            "prov_name": row[2],
            "res_cons_ann": row[3],
            "pri_cons_ann": row[4],
            "sec_cons_ann": row[5],
            "ter_cons_ann": row[6],
            "total_cons_ann": row[7],
        }


    except psycopg.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.pgerror}")

@app.get("/production")
def get_all_production():
    query = "SELECT * FROM province_production"

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                columns = [desc[0] for desc in cur.description]
                rows = cur.fetchall()

        # Convert each row to dictionary → JSON
        result = [dict(zip(columns, row)) for row in rows]
        return result
    
    except psycopg.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.pgerror}")
    
    
@app.get("/production/{prov_cod}")
def get_production_by_province(prov_cod: int):
    query = """ SELECT
            prov_cod,
            prov_name,
            solar,
            wind,
            geothermal,
            biomass,
            hydroelectric,
            total
        FROM province_production
        WHERE prov_cod = %s"""

    try:
        with get_connection() as conn:
            # row_factory=dict_row → returns rows as dicts automatically
            with conn.cursor(row_factory=dict_row) as cur:
                cur.execute(query, (prov_cod,))
                row = cur.fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Province not found")

        # row is already a dict with the keys you selected above
        return row

    except psycopg.Error as e:
        # Optional: log e to console
        print("DB error:", e)
        raise HTTPException(
            status_code=500,
            detail="Database error"
        );

@app.get("/consumption/province/monthly/residential/{prov_cod}")
def get_residential_monthly_by_province(prov_cod: int):
    query = """
        SELECT *
        FROM province_consumption_residential_monthly
        WHERE prov_cod = %s
    """

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (prov_cod,))
                row = cur.fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Monthly consumption not found")

        return {
            "prov_cod": row[0],
            "prov_name": row[1],
            "jan": row[2],
            "feb": row[3],
            "mar": row[4],
            "apr": row[5],
            "may": row[6],
            "jun": row[7],
            "jul": row[8],
            "aug": row[9],
            "sep": row[10],
            "oct": row[11],
            "nov": row[12],
            "dec": row[13],
        }

    except psycopg.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.pgerror}")

@app.get("/consumption/province/monthly/primary")
def get_all_primary_monthly():
    query = "SELECT * FROM province_consumption_primary_monthly"

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                columns = [desc[0] for desc in cur.description]
                rows = cur.fetchall()

        return [dict(zip(columns, row)) for row in rows]

    except psycopg.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.pgerror}")

@app.get("/consumption/province/monthly/primary/{prov_cod}")
def get_primary_monthly_by_province(prov_cod: int):
    query = """
        SELECT *
        FROM province_consumption_primary_monthly
        WHERE prov_cod = %s
    """

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (prov_cod,))
                row = cur.fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Monthly primary consumption not found")

        # column order: prov_cod, prov_name, jan...dec
        return {
            "prov_cod": row[0],
            "prov_name": row[1],
            "jan": row[2],
            "feb": row[3],
            "mar": row[4],
            "apr": row[5],
            "may": row[6],
            "jun": row[7],
            "jul": row[8],
            "aug": row[9],
            "sep": row[10],
            "oct": row[11],
            "nov": row[12],
            "dec": row[13],
        }

    except psycopg.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.pgerror}")

@app.get("/consumption/province/monthly/secondary")
def get_all_secondary_monthly():
    query = "SELECT * FROM province_consumption_secondary_monthly"

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                columns = [desc[0] for desc in cur.description]
                rows = cur.fetchall()

        return [dict(zip(columns, row)) for row in rows]

    except psycopg.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.pgerror}")

@app.get("/consumption/province/monthly/secondary/{prov_cod}")
def get_secondary_monthly_by_province(prov_cod: int):
    query = """
        SELECT *
        FROM province_consumption_secondary_monthly
        WHERE prov_cod = %s
    """

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (prov_cod,))
                row = cur.fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Monthly secondary consumption not found")

        return {
            "prov_cod": row[0],
            "prov_name": row[1],
            "jan": row[2],
            "feb": row[3],
            "mar": row[4],
            "apr": row[5],
            "may": row[6],
            "jun": row[7],
            "jul": row[8],
            "aug": row[9],
            "sep": row[10],
            "oct": row[11],
            "nov": row[12],
            "dec": row[13],
        }

    except psycopg.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.pgerror}")

@app.get("/consumption/province/monthly/tertiary")
def get_all_tertiary_monthly():
    query = "SELECT * FROM province_consumption_tertiary_monthly"

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                columns = [desc[0] for desc in cur.description]
                rows = cur.fetchall()

        return [dict(zip(columns, row)) for row in rows]

    except psycopg.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.pgerror}")

@app.get("/consumption/province/monthly/tertiary/{prov_cod}")
def get_tertiary_monthly_by_province(prov_cod: int):
    query = """
        SELECT *
        FROM province_consumption_tertiary_monthly
        WHERE prov_cod = %s
    """

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, (prov_cod,))
                row = cur.fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="Monthly tertiary consumption not found")

        return {
            "prov_cod": row[0],
            "prov_name": row[1],
            "jan": row[2],
            "feb": row[3],
            "mar": row[4],
            "apr": row[5],
            "may": row[6],
            "jun": row[7],
            "jul": row[8],
            "aug": row[9],
            "sep": row[10],
            "oct": row[11],
            "nov": row[12],
            "dec": row[13],
        }

    except psycopg.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.pgerror}")




ALLOWED_ENERGY_TYPES = {"solar", "wind", "hydroelectric", "geothermal", "biomass"}


def fetch_rows(query: str, params: tuple):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                columns = [desc[0] for desc in cur.description]
                rows = cur.fetchall()
        return [dict(zip(columns, row)) for row in rows]
    except psycopg.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.pgerror}")





# Register routers
app.include_router(consumption.router)
app.include_router(production.router)