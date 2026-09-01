import urllib.request
import urllib.parse
import json
import http.cookiejar
import ssl
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

ctx = ssl.create_default_context()
cookie_jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(cookie_jar),
    urllib.request.HTTPSHandler(context=ctx)
)

BASE_URL = "https://elapp.com.mx"

login_data = json.dumps({
    "email": "admin@elapp.com.mx",
    "password": "***REMOVED-ADMIN-PASSWORD***"
}).encode("utf-8")

req = urllib.request.Request(
    f"{BASE_URL}/api/auth/login",
    data=login_data,
    headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
)
with opener.open(req) as res:
    print("Login:", res.getcode())

for muni in ['Tonalá', 'Guadalajara', 'Zapopan', 'San Pedro Tlaquepaque', 'Puerto Vallarta', 'Lagos de Moreno', 'Tepatitlán de Morelos']:
    encoded_muni = urllib.parse.quote(muni)
    req = urllib.request.Request(f"{BASE_URL}/api/map/sections/geojson?municipality={encoded_muni}", headers={"User-Agent": "Mozilla/5.0"})
    with opener.open(req) as res:
        data = json.loads(res.read().decode())
        features = data.get("features", [])
        print(f"📍 {muni}: {len(features)} secciones oficiales cargadas en memoria (Payload: {round(len(json.dumps(data))/1024, 1)} KB)")
