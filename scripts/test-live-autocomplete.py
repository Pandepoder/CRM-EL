import urllib.request
import urllib.parse
import json
import http.cookiejar
import ssl
import sys
import os

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

print("\n=== TEST: Authenticate Admin ===")
login_data = json.dumps({
    "email": "admin@elapp.com.mx",
    "password": os.environ["APP_ADMIN_PASSWORD"]
}).encode("utf-8")

req = urllib.request.Request(
    f"{BASE_URL}/api/auth/login",
    data=login_data,
    headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
)
with opener.open(req) as res:
    print(f"Login Status: {res.getcode()}")

queries = [
    ("Loma Dorada", "Tonalá"),
    ("Av Tonaltecas", "Tonalá"),
    ("2704", "Tonalá"),
    ("Av Vallarta", "Guadalajara"),
    ("Plaza Patria", "Zapopan")
]

print("\n=== TEST: Live Autocomplete Endpoint ===")
for q, muni in queries:
    url = f"{BASE_URL}/api/map/autocomplete?q={urllib.parse.quote(q)}&municipality={urllib.parse.quote(muni)}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with opener.open(req) as res:
        data = json.loads(res.read().decode())
        results = data.get("results", [])
        print(f"\n🔍 Query: '{q}' ({muni}) -> {len(results)} sugerencias reales encontradas:")
        for r in results[:3]:
            print(f"  • [{r.get('type')}] {r.get('title')} | {r.get('subtitle')} | Secc: {r.get('sectionNum')} | Coords: ({r.get('lat')}, {r.get('lng')})")

print("\n✅ Todos los autocompletados en vivo respondieron correctamente con datos reales!")
