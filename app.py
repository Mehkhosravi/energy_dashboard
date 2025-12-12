from flask import Flask, jsonify, request
# from flask_sqlalchemy import SQLAlchemy
# from flask_login import LoginManager, login_user, logout_user, login_required, current_user
# from flask_admin import Admin
# from flask_admin.contrib.sqla import ModelView
# from werkzeug.security import check_password_hash

# from models.user import User
# from extensions import db, login_manager
from utils.functions import (
    # get_residential_consumption,
    # get_industrial_consumption,
    # get_agricultural_consumption,
    # get_commercial_consumption,
    # get_solar_production,
    # get_wind_production,
    # get_hydro_production,
    # get_geo_production,
    # get_bio_production,
    # get_future_bio,
    # get_future_wind_v52,
    # get_future_wind_v80,
    get_geojson_for_comune,
    get_geojson_by_level,
    get_monthly_energy_for_comune,
    # get_unique_comuni_from_db,
    # month_map,
    # get_comuni_by_level,
    # get_data_by_comune,
    # season_months,
)
from utils.db_utils import fetch_query
# from models.banner import Banner
# from datetime import timedelta
# from flask_admin import AdminIndexView, expose
# from flask_admin.form import FileUploadField
# from wtforms import validators
# import os
# import pandas as pd


app = Flask(__name__)

# If later you want SQLAlchemy / sessions, you can restore this config.
# For now, it is not required just to serve the map GeoJSON.
#
# app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://admin:MakDenerg%40@localhost/my_webapp_db'
# app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# app.config['SECRET_KEY'] = 'your_super_secret_key'
# app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)
# app.config['SESSION_PERMANENT'] = True
#
# db.init_app(app)
# login_manager.init_app(app)
# login_manager.login_view = 'login'


# -------------------------------------------------------------------
# BASIC HEALTH ROUTE (no templates, no login)
# -------------------------------------------------------------------
@app.route("/", methods=["GET"])
def health():
    """
    Simple health check endpoint.
    Use this while focusing only on the API.
    """
    return jsonify({"status": "ok", "message": "Energy backend is running"}), 200


# -------------------------------------------------------------------
# MAP API: single comune (this is what your React/Leaflet calls)
# GET /api/map_data/<comune>
# -------------------------------------------------------------------
@app.route("/api/map_data/<comune>")
def map_data(comune: str):
    print(f"[DEBUG] Comune requested: {comune}")
    geojson = get_geojson_for_comune(comune)
    if not geojson:
        print("[DEBUG] No GeoJSON found!")
        return jsonify({"error": "Comune not found"}), 404

    print("[DEBUG] Returning GeoJSON for comune")
    return jsonify(geojson)


# -------------------------------------------------------------------
# MAP API: by level (region / province / comune)
# GET /api/map_data/<level>/<name>
# You can use this if your frontend also requests by region/province.
# -------------------------------------------------------------------
@app.route("/api/map_data/<level>/<name>")
def map_data_by_level(level: str, name: str):
    level = level.lower()
    if level not in ["region", "province", "comune"]:
        return jsonify({"error": "Invalid level"}), 400

    geojson = get_geojson_by_level(level, name)
    if not geojson:
        return jsonify({"error": "No geometry found"}), 404

    return jsonify(geojson)

# -------------------------------------------------------------------
# ENERGY API: monthly summary by comune
# GET /api/energy/monthly?comune=Torino&year=2019&domain=consumption
# -------------------------------------------------------------------
@app.route("/api/energy/monthly")
def energy_monthly_by_comune():
    comune = request.args.get("comune")
    year = request.args.get("year", type=int)
    domain = request.args.get("domain", default="consumption")

    if not comune or not year:
        return jsonify({"error": "Missing 'comune' or 'year' parameter"}), 400

    try:
        rows = get_monthly_energy_for_comune(comune, year, domain)
    except Exception as e:
        # Log the error for debugging
        print("[ERROR] energy_monthly_by_comune:", e)
        return jsonify({"error": "Internal server error"}), 500

    return jsonify(rows)


# -------------------------------------------------------------------
# OLD / COMMENTED-OUT STUFF (LOGIN, ADMIN, DASHBOARD, TEMPLATES)
# Keep it here for later, but commented so it does not interfere now.
# -------------------------------------------------------------------

"""
# Secure admin index view
class SecureAdminIndexView(AdminIndexView):
    @expose('/')
    def index(self):
        if not current_user.is_authenticated or current_user.role != 'admin':
            return redirect(url_for('login'))
        return super().index()

admin = Admin(app, name='Energy Admin Panel', template_mode='bootstrap4', index_view=SecureAdminIndexView())


class UserAdmin(ModelView):
    column_exclude_list = ['password']
    form_excluded_columns = ['password']

    def is_accessible(self):
        return current_user.is_authenticated and current_user.role == 'admin'

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('login'))

admin.add_view(UserAdmin(User, db.session))


class BannerAdmin(ModelView):
    form_overrides = {
        'image_url': FileUploadField
    }
    form_args = {
        'image_url': {
            'label': 'Banner Image',
            'base_path': os.path.join(os.path.dirname(__file__), 'static/uploads'),
            'relative_path': 'uploads/',
            'validators': [validators.DataRequired()]
        }
    }

    def is_accessible(self):
        return current_user.is_authenticated and current_user.role == 'admin'
    
    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for('login'))

admin.add_view(BannerAdmin(Banner, db.session))


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


@app.route('/', methods=['GET', 'POST'])
def login():
    # OLD login page - currently disabled because it requires login.html template.
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            session.permanent = True
            return redirect(url_for('index'))
        else:
            flash('Invalid username or password')
    return render_template('login.html')


@app.route('/home')
@login_required
def index():
    comuni = get_unique_comuni_from_db()
    banners = Banner.query.filter_by(active=True).all()
    return render_template("index.html", comuni=comuni, banners=banners)

# Other routes like /comune-overview, /dashboard.html, /api/get_chart_data, etc.
# are temporarily commented out to keep the app minimal while you get the map working.
"""


# -------------------------------------------------------------------
# ENTRYPOINT
# -------------------------------------------------------------------
if __name__ == "__main__":
    # No db.create_all() here for now, since we're not using SQLAlchemy models yet.
    app.run(debug=True, host="0.0.0.0")
