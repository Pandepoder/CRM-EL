import requests
import os

session = requests.Session()
login_res = session.post(
    "https://elapp.com.mx/api/auth/login",
    json={"email": "admin@elapp.com.mx", "password": os.environ["APP_ADMIN_PASSWORD"]}
)

print("Testing colony predictive search across different areas:")
for q in ["Santa Paula", "Zalatit", "Coyula", "Vado", "Jalisco", "San Gaspar", "Puente Grande"]:
    res = session.get(f"https://elapp.com.mx/api/catalog/colonies/search?mun=Tonal%C3%A1&q={q}")
    if res.ok:
        items = res.json()
        print(f"\nQuery '{q}': {len(items)} results found")
        for it in items[:4]:
            print(f"   -> {it['name']} (CP: {it['postalCode']}, Sec: {it.get('sectionNum')})")
