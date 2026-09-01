import requests
import json
import urllib.parse
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def test_osm_search(query, muni="Tonalá"):
    full_q = f"{query}, {muni}, Jalisco, México"
    encoded = urllib.parse.quote(full_q)
    url = f"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&addressdetails=1&limit=5&countrycodes=mx&viewbox=-105.7,21.9,-101.5,18.9&bounded=0"
    
    headers = {
        "User-Agent": "Tonala-CRM-OS/2.0 (Municipal Electoral System; admin@tonala.gob.mx)"
    }
    
    res = requests.get(url, headers=headers, timeout=5)
    print(f"\n🔍 Búsqueda: '{query}' en '{muni}' (Status: {res.status_code}):")
    if res.status_code == 200:
        data = res.json()
        for idx, item in enumerate(data):
            addr = item.get("address", {})
            road = addr.get("road") or addr.get("pedestrian") or addr.get("street") or item.get("name") or ""
            house_num = f" #{addr.get('house_number')}" if addr.get("house_number") else ""
            suburb = addr.get("suburb") or addr.get("neighbourhood") or addr.get("quarter") or addr.get("residential") or ""
            city = addr.get("city") or addr.get("town") or addr.get("county") or addr.get("municipality") or muni
            lat = item.get("lat")
            lon = item.get("lon")
            print(f"  [{idx+1}] {road}{house_num} | Col. {suburb} | {city} (Lat: {lat}, Lng: {lon})")

if __name__ == "__main__":
    test_osm_search("Loma Dorada", "Tonalá")
    test_osm_search("Av Tonaltecas", "Tonalá")
    test_osm_search("Juárez", "Tonalá")
    test_osm_search("Av Vallarta", "Guadalajara")
    test_osm_search("Plaza Patria", "Zapopan")
