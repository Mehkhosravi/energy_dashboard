# utils/db_utils.py

import psycopg2
from psycopg2.extras import execute_values
from config import DB_CONFIG


def get_connection():
    """Create a new DB connection."""
    return psycopg2.connect(**DB_CONFIG)


def fetch_query(query: str, params: tuple | None = None):
    """Run SELECT and return list[dict]."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(query, params or ())
    rows = cur.fetchall()
    cols = [d[0] for d in cur.description]
    cur.close()
    conn.close()
    return [dict(zip(cols, r)) for r in rows]


def execute_query(query: str, params: tuple | None = None):
    """Run INSERT/UPDATE/DELETE."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(query, params or ())
    conn.commit()
    cur.close()
    conn.close()


def bulk_insert_values(query_with_values_placeholder: str, rows: list[tuple], page_size: int = 5000):
    """Fast bulk insert using execute_values. Query must contain VALUES %s."""
    if not rows:
        return
    conn = get_connection()
    cur = conn.cursor()
    execute_values(cur, query_with_values_placeholder, rows, page_size=page_size)
    conn.commit()
    cur.close()
    conn.close()
