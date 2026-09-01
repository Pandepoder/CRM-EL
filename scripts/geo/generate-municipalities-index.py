import json
import os

def generate_index():
    geojson_path = "apps/web/public/geo/jalisco-secciones.geojson"
    if not os.path.exists(geojson_path):
        print("GeoJSON not found:", geojson_path)
        return

    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    counts = {}
    for feat in data.get("features", []):
        muni = feat.get("properties", {}).get("municipality", "Tonalá")
        counts[muni] = counts.get(muni, 0) + 1

    priority = [
        "Tonalá",
        "Guadalajara",
        "Zapopan",
        "San Pedro Tlaquepaque",
        "Tlajomulco de Zúñiga",
        "El Salto",
        "Puerto Vallarta",
        "Zapotlanejo",
        "Lagos de Moreno",
        "Tepatitlán de Morelos",
        "Zapotlán el Grande",
        "Chapala",
        "Ixtlahuacán de los Membrillos",
        "Juanacatlán",
        "Autlán de Navarro",
        "Ameca",
        "Tala",
        "Ocotlán",
        "Arandas"
    ]

    sorted_list = []
    for p in priority:
        if p in counts:
            sorted_list.append({"name": p, "count": counts[p]})
            del counts[p]

    for name in sorted(counts.keys()):
        sorted_list.append({"name": name, "count": counts[name]})

    out_path = "apps/web/public/geo/jalisco-municipalities.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(sorted_list, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(sorted_list)} municipalities in {out_path}")
    print("Top 5:", sorted_list[:5])

if __name__ == "__main__":
    generate_index()
