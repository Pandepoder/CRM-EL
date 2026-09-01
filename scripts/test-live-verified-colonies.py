import requests
import os

session = requests.Session()
login_res = session.post(
    "https://elapp.com.mx/api/auth/login",
    json={"email": "admin@elapp.com.mx", "password": os.environ["APP_ADMIN_PASSWORD"]}
)
print("Login status:", login_res.status_code)

# 1. Test GeoJSON for Tonalá
geo_res = session.get("https://elapp.com.mx/api/map/sections/geojson?municipality=Tonal%C3%A1")
print("GeoJSON Tonalá status:", geo_res.status_code)
if geo_res.ok:
    data = geo_res.json()
    features = data.get("features", [])
    print(f"Total Tonalá features returned: {len(features)}")
    for f in features[:10]:
        p = f.get("properties", {})
        print(f"  Sec #{p.get('section_num')}: Muni={p.get('municipality')}, Colonies={p.get('colonies')}")

# 2. Test Colony search in Tonalá
col_res = session.get("https://elapp.com.mx/api/catalog/colonies/search?mun=Tonal%C3%A1&q=Loma")
print("\nColonies Search 'Loma' status:", col_res.status_code)
if col_res.ok:
    cols = col_res.json()
    print(f"Found {len(cols)} colonies matching 'Loma':")
    for c in cols[:6]:
        print(f"  - {c.get('name')} (CP: {c.get('postalCode')}, Muni: {c.get('municipality')}, Sec: {c.get('sectionNum')})")

# 3. Test Section 2704 colonies in Tonalá
sec_res = session.get("https://elapp.com.mx/api/catalog/colonies/search?mun=Tonal%C3%A1&section=2704")
print("\nSection 2704 Colonies status:", sec_res.status_code)
if sec_res.ok:
    s_cols = sec_res.json()
    print(f"Section 2704 colonies ({len(s_cols)}):")
    for c in s_cols:
        print(f"  - {c.get('name')} (CP: {c.get('postalCode')})")
