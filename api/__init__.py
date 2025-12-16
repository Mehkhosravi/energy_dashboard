# api/__init__.py

from .map_api import map_bp
from .energy_api import energy_bp

def register_blueprints(app):
    app.register_blueprint(map_bp)
    app.register_blueprint(energy_bp)
