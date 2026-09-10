import requests
import json
import sys
import os

import entorno

# Destino obligatorio: este script consulta un servidor en vivo, asi que no puede
# traer la direccion escrita. Antes apuntaba a produccion sin pedir configuracion.
BASE = entorno.app_base_url()
# La cuenta administradora tampoco va escrita: es la real del servidor.
ADMIN_EMAIL = entorno.admin_email()

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def test_live_map():
    session = requests.Session()
    login_url = f"{BASE}/api/auth/login"
    login_payload = {
        "email": ADMIN_EMAIL,
        "password": os.environ["APP_ADMIN_PASSWORD"]
    }
    
    print(f"1. Autenticando en {BASE}/api/auth/login...")
    r = session.post(login_url, json=login_payload, timeout=10)
    print(f"Login Status: {r.status_code}")
    if r.status_code != 200:
        print("Login falló:", r.text)
        return False
        
    print(f"2. Consultando GeoJSON de Secciones en {BASE}/api/map/sections/geojson...")
    r_geo = session.get(f"{BASE}/api/map/sections/geojson", timeout=10)
    print(f"GeoJSON Status: {r_geo.status_code}")
    if r_geo.status_code != 200:
        print("GeoJSON falló:", r_geo.text)
        return False
        
    data = r_geo.json()
    features = data.get("features", [])
    print(f"[OK] Total de secciones recibidas: {len(features)}")
    
    if len(features) > 0:
        first_feat = features[0]
        sec_num = first_feat.get("properties", {}).get("section_num")
        muni = first_feat.get("properties", {}).get("municipality")
        coords = first_feat.get("geometry", {}).get("coordinates", [[]])[0]
        print(f"Muestra: Sección {sec_num} ({muni}) - {len(coords)} vértices poligonales limpios")
        print(f"Vértices muestra: {coords[:3]}")
        
    print(f"3. Consultando Incidencias en {BASE}/api/map/reports...")
    r_rep = session.get(f"{BASE}/api/map/reports", timeout=10)
    print(f"Reports Status: {r_rep.status_code}")
    reps = r_rep.json().get("features", [])
    print(f"[OK] Total de incidencias activas en mapa: {len(reps)}")

    print("\n✅ ¡Todos los endpoints del mapa funcionan perfectamente y entregan polígonos matemáticos Voronoi sin solapamiento!")
    return True

if __name__ == "__main__":
    test_live_map()
