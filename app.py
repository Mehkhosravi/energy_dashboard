# ../app.py

from flask import Flask, jsonify
from flask_cors import CORS
from flask_compress import Compress

from api.territories import territories_bp
from api.scenarios import scenarios_bp
from api.energy import energy_bp
# from api import register_blueprints
from api.__init__ import register_blueprints


# CORS - backend and frontend origins
CORS_ORIGINS = [
    "http://localhost:3000",  # React
    "http://localhost:5173",  # Vite
    "http://localhost:5432",  # optional (DB UI)
]


def create_app() -> Flask:
    app = Flask(__name__)
    
    Compress(app)  # ✅ Enable gzip compression for responses
    
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
    app.register_blueprint(scenarios_bp, url_prefix="/scenarios")

    # ✅ If you have extra blueprints in api/__init__.py
    register_blueprints(app)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
