import urllib.request
import urllib.parse
import json
import http.cookiejar
import ssl

ctx = ssl.create_default_context()
cookie_jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(cookie_jar),
    urllib.request.HTTPSHandler(context=ctx)
)

BASE_URL = "https://elapp.com.mx"

def test_suite():
    print("=== TEST 1: Healthcheck ===")
    req = urllib.request.Request(f"{BASE_URL}/api/health", headers={"User-Agent": "Mozilla/5.0"})
    with opener.open(req) as res:
        print(f"Health Status: {res.getcode()}, Body: {res.read().decode()}")

    print("\n=== TEST 2: Admin Login ===")
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
        body = json.loads(res.read().decode())
        print(f"Login Status: {res.getcode()}, Response: {body}")
        assert body.get("ok") is True

    print("\n=== TEST 3: Authenticated CRM Contacts API ===")
    req = urllib.request.Request(f"{BASE_URL}/api/crm/contacts", headers={"User-Agent": "Mozilla/5.0"})
    with opener.open(req) as res:
        contacts_data = json.loads(res.read().decode())
        print(f"Contacts Status: {res.getcode()}, Total items: {len(contacts_data.get('items', []))}")

    print("\n=== TEST 4: Map GeoJSON Sections API ===")
    req = urllib.request.Request(f"{BASE_URL}/api/map/sections/geojson", headers={"User-Agent": "Mozilla/5.0"})
    with opener.open(req) as res:
        map_data = json.loads(res.read().decode())
        print(f"Map GeoJSON Status: {res.getcode()}, Features count: {len(map_data.get('features', []))}")

    print("\n=== TEST 5: Escucha Social API ===")
    req = urllib.request.Request(f"{BASE_URL}/api/escucha-social", headers={"User-Agent": "Mozilla/5.0"})
    with opener.open(req) as res:
        escucha_data = json.loads(res.read().decode())
        print(f"Escucha Social Status: {res.getcode()}, Items: {len(escucha_data.get('items', []))}")

    print("\n=== TEST 6: Rapid Activity Prospectos API ===")
    req = urllib.request.Request(f"{BASE_URL}/api/prospectos", headers={"User-Agent": "Mozilla/5.0"})
    with opener.open(req) as res:
        prospectos_data = json.loads(res.read().decode())
        print(f"Prospectos Status: {res.getcode()}, Items: {len(prospectos_data.get('items', []))}")

    print("\n=== TEST 7: Public Registration Landing Page ===")
    req = urllib.request.Request(f"{BASE_URL}/registro/edgar-lopez", headers={"User-Agent": "Mozilla/5.0"})
    with opener.open(req) as res:
        html = res.read().decode('utf-8')
        print(f"Registration Page Status: {res.getcode()}, HTML length: {len(html)}")
        assert "Edgar" in html or "Tonala" in html or "registro" in html.lower()

    print("\n✅ TODAS LAS PRUEBAS EN PRODUCCIÓN HAN PASADO EXITOSAMENTE!")

if __name__ == "__main__":
    test_suite()
