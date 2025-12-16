# ../app.py

from flask import Flask, jsonify
from flask_cors import CORS

from api.territories import territories_bp
from api.energy import energy_bp
from api import register_blueprints

# If you don't use these directly in app.py, remove them to keep it clean.
# from utils.functions import (
#     get_geojson_for_comune,
#     get_geojson_by_level,
#     get_monthly_energy_for_comune,
# )
# from utils.db_utils import fetch_query


# CORS - backend and frontend origins
CORS_ORIGINS = [
    "http://localhost:3000",  # React
    "http://localhost:5173",  # Vite
    "http://localhost:5432",  # optional (DB UI)
]


def create_app() -> Flask:
    app = Flask(__name__)

    # ✅ Enable CORS for your frontend origins
    # If you want to restrict to only API routes, see the note below.
    CORS(
        app,
        origins=CORS_ORIGINS,
        supports_credentials=True,
    )

    # ✅ Health check
    @app.get("/")
    def health():
        return jsonify({"status": "ok", "message": "Energy backend is running"}), 200

    # ✅ Register blueprints
    app.register_blueprint(territories_bp, url_prefix="/map")
    app.register_blueprint(energy_bp, url_prefix="/charts")

    # ✅ If you have extra blueprints in api/__init__.py
    register_blueprints(app)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
