from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, logout_user, login_required
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from werkzeug.security import check_password_hash
from models.user import User
from extensions import db, login_manager
from utils.functions import (
    get_residential_consumption,
    get_industrial_consumption,
    get_agricultural_consumption,
    get_commercial_consumption,
    get_solar_production,
    get_wind_production,
    get_hydro_production,
    get_geo_production,
    get_bio_production,
    get_future_bio,
    get_future_wind_v52,
    get_future_wind_v80,
    get_geojson_for_comune,
    get_unique_comuni_from_db,
    month_map,
    season_months
)
from utils.db_utils import fetch_query
from datetime import datetime
import pandas as pd


# Initialize Flask App
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://admin:MakDenerg%40@localhost/my_webapp_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your_super_secret_key'

# Initialize Extensions
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'login'

admin = Admin(app, name='Energy Admin Panel', template_mode='bootstrap4')
admin.add_view(ModelView(User, db.session))

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/dashboard.html')
@login_required
def dashboard():
    total_users = User.query.count()
    return render_template('dashboard.html', total_users=total_users)

@app.route('/comune-overview')
@login_required
def comune_overview():
    selected_comune = request.args.get("comune")
    selected_time = request.args.get("time_period", "month")
    comuni_data = get_unique_comuni_from_db()
    stats = chart_data = None

    if selected_comune:
        df = get_residential_consumption(selected_comune)
        filtered = df[df['comune_name'].str.lower() == selected_comune.lower()]
        if not filtered.empty:
            stats = filtered.iloc[0].to_dict()
            chart_data = {
                "labels": list(stats.keys()),
                "values": list(stats.values())
            }

    return render_template("comune_overview.html", comuni=comuni_data, selected_comune=selected_comune, selected_time=selected_time, stats=stats, chart_data=chart_data)

@app.route('/get_comune_data/<comune>')
@login_required
def get_comune_data(comune):
    df = get_residential_consumption(comune)
    filtered = df[df['comune_name'].str.lower() == comune.lower()]
    if filtered.empty:
        return jsonify({"labels": [], "values": []})
    data = filtered.iloc[0].to_dict()
    return jsonify({"labels": list(data.keys()), "values": list(data.values())})

@app.route('/api/map_data/<comune>')
def map_data(comune):
    geojson = get_geojson_for_comune(comune)
    if not geojson:
        return jsonify({'error': 'Comune not found'}), 404
    return jsonify(geojson)

@app.route('/')
def index():
    comuni = get_unique_comuni_from_db()
    return render_template("index.html", comuni=comuni, current_year=datetime.now().year)

@app.route('/api/get_chart_data', methods=["POST"])
def get_chart_data():
    req = request.get_json()
    comune = req.get("comune", "").strip().lower()
    sector_distribution = req.get("sector_distribution", {})
    actual_sources = req.get("actual_sources", [])
    future_sources = req.get("future_sources", [])

    if sum(sector_distribution.values()) > 100:
        return jsonify({"error": "Sector distribution exceeds 100%."}), 400

    sector_funcs = {
        "residential": get_residential_consumption,
        "industrial": get_industrial_consumption,
        "agricultural": get_agricultural_consumption,
        "commercial": get_commercial_consumption
    }

    actual_funcs = {
        "solar": get_solar_production,
        "wind": get_wind_production,
        "hydroelectric": get_hydro_production,
        "geothermal": get_geo_production,
        "biomass": get_bio_production
    }

    future_funcs = {
        "biomass": get_future_bio,
        "wind_v52": get_future_wind_v52,
        "wind_v80": get_future_wind_v80
    }

    monthly_consumption, monthly_actual, monthly_future = [], [], []

    for sector, percent in sector_distribution.items():
        if percent > 0 and sector in sector_funcs:
            df = sector_funcs[sector](comune)
            if df.empty: continue
            df_monthly = df.groupby('month')['value'].sum() * (percent / 100)
            monthly_consumption.append(df_monthly)

    for source in actual_sources:
        if source in actual_funcs:
            df = actual_funcs[source](comune)
            if df.empty: continue
            df_monthly = df.groupby('month')['value'].sum()
            monthly_actual.append(df_monthly)

    for source in future_sources:
        if source in future_funcs:
            df = future_funcs[source](comune)
            if df.empty: continue
            df_monthly = df.groupby('month')['value'].sum()
            monthly_future.append(df_monthly)

    total_consumption = sum(monthly_consumption) if monthly_consumption else pd.Series(dtype=float)
    total_actual = sum(monthly_actual) if monthly_actual else pd.Series(dtype=float)
    total_future = sum(monthly_future) if monthly_future else pd.Series(dtype=float)
    months = total_consumption.index.map(lambda m: month_map.get(m.lower(), m)).tolist()

    return jsonify({
        "months": months,
        "consumption": total_consumption.tolist(),
        "actual_production": total_actual.tolist(),
        "future_production": total_future.tolist(),
        "seasonal_hours": [],
        "self_sufficiency": [],
        "self_consumption": []
    })

# 🆕 Additional UI Routes
@app.route('/scenario-builder.html')
@login_required
def scenario_builder():
    return render_template('scenario-builder.html')

@app.route('/about.html')
def about():
    return render_template('about.html')

@app.route('/terms-of-use')
def terms_of_use():
    return render_template('terms.html')

@app.route('/privacy-policy')
def privacy_policy():
    return render_template('privacy.html')

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
