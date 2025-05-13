# 🇮🇹 Italian Energy Dashboard Web Application

This project is a web-based dashboard built with **Flask** and **PostgreSQL** to visualize energy production and consumption across Italy at multiple territorial levels (Region, Province, Comune). It also includes a **Scenario Builder** to simulate future energy plans and view their impacts.

---

## 🚀 Features

### ✅ General
- Python Flask web app with modular structure
- PostgreSQL as the backend database
- Tailwind CSS for styling
- Chart.js and Leaflet.js for data visualization

### 📍 Comune Overview
- Dropdown to select any **comune** in Italy
- Dynamic data fetch via AJAX
- Interactive chart for:
  - **Time ranges**: Day, Week, Month, Year
  - **Energy types**: Production, Consumption

### 🗺️ Map View
- Interactive **Italy map** using **Leaflet.js**
- Geometries (WKT) loaded from PostgreSQL `commune_geometry` table
- Polygon highlights based on user interaction

### 🧩 Scenario Builder
- Select **predefined scenarios** (e.g., S0, S1, S2…)
- Automatically updates:
  - Consumption settings
  - Current and future production inputs
- Interactive chart and value boxes
- Fully styled with Tailwind

---

## 🗃️ Database Structure

- `actual_consumption`: Hourly consumption data per sector
- `actual_production`: Real-time production data
- `future_production`: Forecasted production data
- `commune_geometry`: Comune-level WKT geometries
- `comune_mapping`: Comune-to-province-region mapping

All data is read directly from PostgreSQL using `psycopg2` or `SQLAlchemy`.

---

## 🛠️ Technologies Used

| Layer         | Stack                               |
|---------------|-------------------------------------|
| Backend       | Python, Flask                       |
| Database      | PostgreSQL                          |
| Frontend      | HTML, Tailwind CSS, Chart.js, JS    |
| Geospatial    | Leaflet.js, WKT (PostGIS-compatible)|
| Tools         | Git, GitHub, DBeaver                |

---

## 🧪 How to Run the Project

1. **Clone the repository**

```bash
git clone https://github.com/KeyvanSharokh/Energy.git
cd Energy
