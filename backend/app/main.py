from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg
from psycopg.rows import dict_row
from fastapi import Query  
from app.routers import consumption, production


# CORS -backend and Frontend origins-
CORS_ORIGIN = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5432"]

app = FastAPI()

# cross_origin settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGIN,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(consumption.router)
app.include_router(production.router)