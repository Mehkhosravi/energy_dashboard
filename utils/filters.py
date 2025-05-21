from datetime import datetime
from flask import request
import pandas as pd

def parse_filters():
    filters = {
        "years": request.args.getlist("year"),
        "months": request.args.getlist("month"),
        "seasons": request.args.getlist("season"),
        "day_types": request.args.getlist("day_type"),
        "hours": request.args.getlist("hour")
    }

    # Convert strings to integers or normalized formats
    filters["years"] = [int(y) for y in filters["years"] if y.isdigit()]
    filters["months"] = [int(m) for m in filters["months"] if m.isdigit()]
    filters["hours"] = [int(h) for h in filters["hours"] if h.isdigit()]
    filters["seasons"] = [s.lower() for s in filters["seasons"]]
    filters["day_types"] = [dt.lower() for dt in filters["day_types"]]

    return filters

def apply_filters(df, filters):
    if "date" not in df.columns:
        return df  # skip filtering if no date column

    df["date"] = pd.to_datetime(df["date"], errors='coerce')
    df = df.dropna(subset=["date"])

    if filters["years"]:
        df = df[df["date"].dt.year.isin(filters["years"])]

    if filters["months"]:
        df = df[df["date"].dt.month.isin(filters["months"])]

    if filters["hours"]:
        df = df[df["date"].dt.hour.isin(filters["hours"])]

    if filters["day_types"]:
        df["day_type"] = df["date"].dt.weekday.apply(lambda x: "weekend" if x >= 5 else "weekday")
        df = df[df["day_type"].isin(filters["day_types"])]

    if filters["seasons"]:
        month_to_season = {
            12: "winter", 1: "winter", 2: "winter",
            3: "spring", 4: "spring", 5: "spring",
            6: "summer", 7: "summer", 8: "summer",
            9: "autumn", 10: "autumn", 11: "autumn"
        }
        df["season"] = df["date"].dt.month.map(month_to_season)
        df = df[df["season"].isin(filters["seasons"])]

    return df
