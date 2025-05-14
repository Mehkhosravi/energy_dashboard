# db_utils.py

import psycopg2
from config import DB_CONFIG

def get_connection():
    """Establishes a new database connection using config settings."""
    return psycopg2.connect(**DB_CONFIG)

def fetch_query(query, params=None):
    """
    Executes a SELECT query and returns the results as a list of dictionaries.
    - query: SQL string with optional placeholders (%s)
    - params: tuple of values to replace in query
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(query, params)
    rows = cur.fetchall()
    columns = [desc[0] for desc in cur.description]
    cur.close()
    conn.close()
    return [dict(zip(columns, row)) for row in rows]
