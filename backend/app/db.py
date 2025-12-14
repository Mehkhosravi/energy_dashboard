import psycopg
from fastapi import HTTPException
from .core.config import settings 

DB_DSN = (
    f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}"
    f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
)

def get_connection():
    return psycopg.connect(DB_DSN)

db_client = get_connection()

def fetch_rows(query: str, params: tuple | None = None):
    try:
  
        with db_client.cursor() as cur:
            if params is not None:
                cur.execute(query, params)
            else:
                cur.execute(query)

            columns = [desc[0] for desc in cur.description]
            rows = cur.fetchall()

        return [dict(zip(columns, row)) for row in rows]

    except psycopg.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e.pgerror}")


def fetch_one(query: str, params: tuple):
    rows = fetch_rows(query, params)
    return rows[0] if rows else None
