# === UPDATED app.py (correct and clean) ===
from flask import ( Flask,
    render_template,
    request,
    jsonify,
    redirect,
    url_for,
    flash
)
import pandas as pd
import os
from flask_sqlalchemy import SQLAlchemy
from flask_login import (LoginManager,
    login_user,
    logout_user,
    login_required
)
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from extensions import db, login_manager
from models.user import User
from werkzeug.security import check_password_hash
from utils.functions import (
    safe_read_csv,
    DATA_PATH,
    consumption_files,
    actual_files,
    future_files,
    month_map,
    season_months,
    get_geojson_for_comune
)

# Load all datasets
consumption_data = {k: safe_read_csv(v) for k, v in consumption_files.items()}
actual_production_data = {k: safe_read_csv(v) for k, v in actual_files.items()}
future_production_data = {k: safe_read_csv(v) for k, v in future_files.items()}
wkt_df = safe_read_csv("Italy_commune_wkt.csv")

# === Create Flask App ===
app = Flask(__name__)

# === Configuration ===
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://admin:MakDenerg%40@localhost/my_webapp_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your_super_secret_key'

# === Initialize Extensions ===
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'login'

# === Initialize Admin Panel ===
admin = Admin(app, name='Energy Admin Panel', template_mode='bootstrap4')
admin.add_view(ModelView(User, db.session)) 

# === Login Manager Setup ===
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# === Authentication Routes ===
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('dashboard'))  # <-- Important: go to admin dashboard directly
        else:
            flash('Invalid username or password')

    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    total_users = User.query.count()
    return render_template('dashboard.html', total_users=total_users)


@app.route('/comune-overview', methods=['GET'])
@login_required
def comune_overview():
    selected_comune = request.args.get("comune")
    selected_time = request.args.get("time_period", "month")  # default = month
    comuni_data = sorted(wkt_df['comune'].dropna().unique())

    stats = None
    chart_data = None

    if selected_comune:
        df = safe_read_csv("co_dom_com_o_table.csv")
        filtered = df[df['comune'] == selected_comune.lower()]
        if not filtered.empty:
            stats = filtered.iloc[0].to_dict()

            # Now build a proper chart_data
            labels = list(stats.keys())
            values = list(stats.values())

            chart_data = {
                "labels": labels,
                "values": values
            }

    return render_template(
        "comune_overview.html",
        comuni = comuni_data,
        selected_comune = selected_comune,
        selected_time = selected_time,
        stats = stats,
        chart_data = chart_data 
    )


@app.route('/get_comune_data/<comune>')
@login_required
def get_comune_data(comune):
    df = safe_read_csv("co_dom_com_o_table.csv")
    filtered = df[df['comune'] == comune.lower()]
    if filtered.empty:
        return jsonify({"labels": [], "values": []})

    data = filtered.iloc[0].to_dict()
    labels = list(data.keys())
    values = list(data.values())

    return jsonify({"labels": labels, "values": values})


@app.route('/api/map_data/<comune>')
def map_data(comune):
    geojson = get_geojson_for_comune(comune)
    if not geojson:
        return jsonify({'error': 'Comune not found'}), 404
    return jsonify(geojson)


# === Data Display Routes ===
@app.route("/", methods=["GET"])
def index():
    comuni = sorted(wkt_df['comune'].dropna().unique()) if not wkt_df.empty else []
    return render_template("index.html", comuni = comuni)

@app.route("/api/get_chart_data", methods=["POST"])
def get_chart_data():
    req = request.get_json()
    comune = req.get("comune", "").strip().lower()
    sector_distribution = req.get("sector_distribution", {})
    actual_sources = req.get("actual_sources", [])
    future_sources = req.get("future_sources", [])

    if sum(sector_distribution.values()) > 100:
        return jsonify({"error": "Sector distribution exceeds 100%."}), 400

    monthly_consumption, monthly_actual, monthly_future = [], [], []

    for sector, percent in sector_distribution.items():
        if percent > 0 and sector in consumption_data:
            df = consumption_data[sector]
            df_filtered = df[df['comune'] == comune]
            if df_filtered.empty:
                continue
            df_monthly = df_filtered.groupby('month')['value'].sum() * (percent / 100)
            monthly_consumption.append(df_monthly)

    for source in actual_sources:
        if source in actual_production_data:
            df = actual_production_data[source]
            df_filtered = df[df['comune'] == comune]
            if df_filtered.empty:
                continue
            df_monthly = df_filtered.groupby('month')['value'].sum()
            monthly_actual.append(df_monthly)

    for source in future_sources:
        if source in future_production_data:
            df = future_production_data[source]
            df_filtered = df[df['comune'] == comune]
            if df_filtered.empty:
                continue
            df_monthly = df_filtered.groupby('month')['value'].sum()
            monthly_future.append(df_monthly)

    total_consumption = sum(monthly_consumption) if monthly_consumption else pd.Series(dtype=float)
    total_actual = sum(monthly_actual) if monthly_actual else pd.Series(dtype=float)
    total_future = sum(monthly_future) if monthly_future else pd.Series(dtype=float)

    months = total_consumption.index.map(lambda m: month_map.get(m.lower(), m)).tolist()

    seasonal_hours = []
    for season, months_list in season_months.items():
        weekday_consumption, weekday_actual = [], []

        temp_weekday = []
        for sector, percent in sector_distribution.items():
            if percent > 0 and sector in consumption_data:
                df = consumption_data[sector]
                df_filtered = df[
                    (df['comune'] == comune) &
                    (df['month'].isin(months_list)) &
                    (df['wday_wend'] == 'weekday')
                ]
                df_hourly = df_filtered.groupby('hour')['value'].mean() * (percent / 100)
                temp_weekday.append(df_hourly)
        if temp_weekday:
            weekday_consumption = sum(temp_weekday).tolist()

        temp_weekday_actual = []
        for source in actual_sources:
            if source in actual_production_data:
                df = actual_production_data[source]
                df_filtered = df[
                    (df['comune'] == comune) &
                    (df['month'].isin(months_list)) &
                    (df['wday_wend'] == 'weekday')
                ]
                df_hourly = df_filtered.groupby('hour')['value'].mean()
                temp_weekday_actual.append(df_hourly)
        if temp_weekday_actual:
            weekday_actual = sum(temp_weekday_actual).tolist()

        seasonal_hours.append({
            'season': season,
            'weekday_consumption': weekday_consumption,
            'weekday_actual': weekday_actual
        })

    self_sufficiency = []
    self_consumption = []

    if seasonal_hours:
        winter = seasonal_hours[0]
        for hour in range(24):
            cons = winter['weekday_consumption'][hour] if hour < len(winter['weekday_consumption']) else 0
            prod = winter['weekday_actual'][hour] if hour < len(winter['weekday_actual']) else 0
            if cons > 0:
                sufficiency = min(prod / cons, 1.0)
                consumption = min(prod / cons, 1.0)
            else:
                sufficiency = 0
                consumption = 0
            self_sufficiency.append({"x": hour, "y": sufficiency})
            self_consumption.append({"x": hour, "y": consumption})

    return jsonify({
        "months": months,
        "consumption": total_consumption.tolist(),
        "actual_production": total_actual.tolist(),
        "future_production": total_future.tolist(),
        "seasonal_hours": seasonal_hours,
        "self_sufficiency": self_sufficiency,
        "self_consumption": self_consumption
    })

# === Main Run App ===
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
