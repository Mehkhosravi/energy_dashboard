import json
import unicodedata
from pathlib import Path

# Adjust these if your paths differ
INPUT = Path("./Scripts/territory_index.json")
OUTPUT = Path("./Scripts/simplified_territory_index.json")


def normalize(value: str) -> str:
    # Remove accents + lowercase (similar to your TS normalize)
    value = unicodedata.normalize("NFD", value)
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    return value.lower().strip()


def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"Input file not found: {INPUT.resolve()}")

    raw = json.loads(INPUT.read_text(encoding="utf-8"))

    simplified = []
    for t in raw:
        out = {
            "id": t["id"],
            "level": t["level"],
            "name": t["name"],
            "codes": {"reg": t["reg_cod"]},
            "search": {
                "normalized": t.get("normalized_name") or normalize(t["name"])
            },
        }

        # province or municipality => has region parent + prov code
        if t["level"] in ("province", "municipality"):
            if t.get("prov_cod") is not None:
                out["codes"]["prov"] = t["prov_cod"]
            out["parent"] = {"region": t.get("region")}

        # municipality => has mun code + province parent name (if provided)
        if t["level"] == "municipality":
            if t.get("mun_cod") is not None:
                out["codes"]["mun"] = t["mun_cod"]
            if t.get("province"):
                out.setdefault("parent", {})
                out["parent"]["province"] = t["province"]

        # remove empty parent if any
        if "parent" in out and not out["parent"]:
            out.pop("parent", None)

        simplified.append(out)

    # Optional: sort for nicer diffs
    level_order = {"region": 0, "province": 1, "municipality": 2}
    simplified.sort(key=lambda x: (level_order.get(x["level"], 99), x["name"]))

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(simplified, ensure_ascii=False, indent=2), encoding="utf-8")

    print("✅ territory_index converted")
    print(f"➡  {OUTPUT.resolve()}")
    print(f"Entries: {len(simplified)}")


if __name__ == "__main__":
    main()
