# Annual Consumption Data - API Guide

## Overview
The application contains **annual consumption data** aggregated at different territorial levels (Region, Province, Comune) with support for **multiple sectors**: Residential, Primary, Secondary, and Tertiary.

---

## 📊 Data Available

### Data Organization
- **Levels**: Region, Province, Comune
- **Sectors (base_group)**: 
  - `residential` - Residential sector
  - `primary` - Primary sector (Agriculture, Mining)
  - `secondary` - Secondary sector (Manufacturing, Construction)
  - `tertiary` - Tertiary sector (Services, Commerce)
  - `all` - All sectors combined
  
- **Domain**: `consumption` (consumption data)
- **Time Resolution**: `annual` (yearly aggregated data)
- **Data Stored in**: `energy_dw.fact_energy` (with dimension tables for territory, time, energy category, scenario)

### Database Tables
```
energy_dw.fact_energy
├── territory_id (FK → dim_territory_en)
├── time_id (FK → dim_time)
├── category_id (FK → dim_energy_category)
├── scenario_id (FK → dim_scenario)
├── value_mwh (consumption in MWh)
└── time_resolution ('annual', 'monthly', 'hourly')

energy_dw.dim_territory_en
├── id
├── level ('region', 'province', 'comune')
├── region_name / province_name / municipality_name
├── reg_cod, prov_cod, mun_cod (geographical codes)
└── geom (geometry)

energy_dw.dim_energy_category
├── id
├── code
├── base_group ('residential', 'primary', 'secondary', 'tertiary')
├── domain ('consumption', 'production')
└── description

energy_dw.dim_time
├── id
├── year
├── month (NULL for annual data)
├── hour (NULL for annual data)
└── day_type
```

---

## 🔌 API Endpoints for Annual Consumption

### 1. **Choropleth Values - All Territories at a Level**
Get annual consumption for all territories (regions/provinces/comuni) for a specific sector.

**Endpoint:**
```
GET /charts/values
```

**Parameters:**
| Parameter | Type | Required | Values | Description |
|-----------|------|----------|--------|-------------|
| `level` | string | ✅ | `region`, `province`, `comune` | Territorial level |
| `resolution` | string | ✅ | `annual` | Must be annual |
| `domain` | string | ✅ | `consumption` | Energy domain |
| `year` | integer | ✅ | e.g., 2019-2023 | Year of data |
| `scenario` | string | ✅ | `0` (baseline) | Scenario code |
| `base_group` | string | ❌ | `residential`, `primary`, `secondary`, `tertiary` | Sector filter (optional) |

**Example Requests:**

All regions - all sectors:
```
GET http://localhost:5000/charts/values?level=region&resolution=annual&domain=consumption&year=2023&scenario=0
```

All regions - residential only:
```
GET http://localhost:5000/charts/values?level=region&resolution=annual&domain=consumption&year=2023&scenario=0&base_group=residential
```

All provinces - secondary sector:
```
GET http://localhost:5000/charts/values?level=province&resolution=annual&domain=consumption&year=2023&scenario=0&base_group=secondary
```

All comuni - tertiary sector:
```
GET http://localhost:5000/charts/values?level=comune&resolution=annual&domain=consumption&year=2023&scenario=0&base_group=tertiary
```

**Response Example:**
```json
[
  {
    "territory_id": 1,
    "name": "Piemonte",
    "reg_cod": "01",
    "prov_cod": null,
    "mun_cod": null,
    "value_mwh": 45820.5,
    "domain": "consumption",
    "base_group": "residential",
    "category_code": null
  },
  {
    "territory_id": 2,
    "name": "Aosta",
    "reg_cod": "02",
    "prov_cod": null,
    "mun_cod": null,
    "value_mwh": 3250.2,
    "domain": "consumption",
    "base_group": "residential",
    "category_code": null
  }
]
```

---

### 2. **Time Series - Single Territory Annual Consumption**
Get annual consumption over multiple years for a specific territory and sector.

**Endpoint:**
```
GET /charts/series
```

**Parameters:**
| Parameter | Type | Required | Values | Description |
|-----------|------|----------|--------|-------------|
| `level` | string | ✅ | `region`, `province`, `comune` | Territorial level |
| `resolution` | string | ✅ | `annual` | Must be annual |
| `domain` | string | ✅ | `consumption` | Energy domain |
| `year` | integer | ✅ | e.g., 2019-2023 | Year of data |
| `scenario` | string | ✅ | `0` (baseline) | Scenario code |
| `region_code` | string | ❌ | e.g., `01` | Required if level=region |
| `province_code` | string | ❌ | e.g., `001` | Required if level=province |
| `comune_code` | string | ❌ | e.g., `001001` | Required if level=comune |
| `base_group` | string | ❌ | `residential`, `primary`, `secondary`, `tertiary` | Sector filter (optional) |

**Example Requests:**

Piemonte (region 01) - all sectors:
```
GET http://localhost:5000/charts/series?level=region&resolution=annual&domain=consumption&year=2023&scenario=0&region_code=01
```

Piemonte - residential sector:
```
GET http://localhost:5000/charts/series?level=region&resolution=annual&domain=consumption&year=2023&scenario=0&region_code=01&base_group=residential
```

Turin Province - tertiary sector:
```
GET http://localhost:5000/charts/series?level=province&resolution=annual&domain=consumption&year=2023&scenario=0&province_code=001&base_group=tertiary
```

Turin Comune - secondary sector:
```
GET http://localhost:5000/charts/series?level=comune&resolution=annual&domain=consumption&year=2023&scenario=0&comune_code=001001&base_group=secondary
```

**Response Example:**
```json
[
  {
    "x": 2020,
    "value_mwh": 42350.5
  },
  {
    "x": 2021,
    "value_mwh": 43120.2
  },
  {
    "x": 2022,
    "value_mwh": 44890.8
  },
  {
    "x": 2023,
    "value_mwh": 45820.5
  }
]
```

---

### 3. **Scenario Parameters - Annual Consumption Data**
Get annual consumption data from scenario tables (alternative data source).

**Endpoint:**
```
GET /scenarios/values
```

**Parameters:**
| Parameter | Type | Required | Values | Description |
|-----------|------|----------|--------|-------------|
| `level` | string | ✅ | `region`, `province`, `comune` | Territorial level |
| `scenario` | string | ✅ | scenario code | Scenario identifier |
| `year` | integer | ✅ | e.g., 2019-2030 | Year of data |
| `param_key` | string | ✅ | `consumption_mwh`, `production_mwh`, etc. | Parameter key |

**Example Request:**
```
GET http://localhost:5000/scenarios/values?level=region&scenario=1&year=2025&param_key=consumption_mwh
```

**Response:**
```json
[
  {
    "territory_id": 1,
    "name": "Piemonte",
    "value": 45820.5
  },
  {
    "territory_id": 2,
    "name": "Aosta",
    "value": 3250.2
  }
]
```

---

## 📋 Available Scenarios

**Endpoint:** 
```
GET /scenarios
```

Returns all available scenarios with their years and metadata.

---

## 🗺️ Supported Territories

### Regions (20 total)
Piemonte, Aosta, Lombardia, Trentino-Alto Adige, Veneto, Friuli-Venezia Giulia, Liguria, Emilia-Romagna, Toscana, Umbria, Marche, Lazio, Abruzzo, Molise, Campania, Puglia, Basilicata, Calabria, Sicilia, Sardegna

### Provinces
107 provinces in Italy

### Comuni
7,903 comuni in Italy

---

## 💡 Usage Examples

### Get residential consumption for all regions in 2023:
```bash
curl "http://localhost:5000/charts/values?level=region&resolution=annual&domain=consumption&year=2023&scenario=0&base_group=residential"
```

### Get primary sector consumption trend for Lombardia:
```bash
curl "http://localhost:5000/charts/series?level=region&resolution=annual&domain=consumption&year=2023&scenario=0&region_code=03&base_group=primary"
```

### Get all sectors consumption comparison for all provinces in 2023:
```bash
curl "http://localhost:5000/charts/values?level=province&resolution=annual&domain=consumption&year=2023&scenario=0"
```

---

## ✨ Key Features
- ✅ Annual aggregated data (not hourly/monthly)
- ✅ Multi-level analysis (regions → provinces → comuni)
- ✅ Sector-level filtering (residential, primary, secondary, tertiary)
- ✅ Multiple year support
- ✅ Scenario-based data
- ✅ Values in MWh (Megawatt-hours)
- ✅ Baseline scenario (0) available by default

---

## 📌 Notes
- All consumption values are in **MWh** (Megawatt-hours)
- Scenario **0** is the baseline/actual data
- Annual data is available from 2020-2023 (check available years via `/scenarios` endpoint)
- `base_group` parameter is case-insensitive
- Omit `base_group` to get all sectors combined
