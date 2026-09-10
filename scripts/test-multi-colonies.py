import requests
import os

import entorno

# Destino obligatorio: este script consulta un servidor en vivo, asi que no puede
# traer la direccion escrita. Antes apuntaba a produccion sin pedir configuracion.
BASE = entorno.app_base_url()
# La cuenta administradora tampoco va escrita: es la real del servidor.
ADMIN_EMAIL = entorno.admin_email()

session = requests.Session()
login_res = session.post(
    f"{BASE}/api/auth/login",
    json={"email": ADMIN_EMAIL, "password": os.environ["APP_ADMIN_PASSWORD"]}
)

print("Testing colony predictive search across different areas:")
for q in ["Santa Paula", "Zalatit", "Coyula", "Vado", "Jalisco", "San Gaspar", "Puente Grande"]:
    res = session.get(f"{BASE}/api/catalog/colonies/search?mun=Tonal%C3%A1&q={q}")
    if res.ok:
        items = res.json()
        print(f"\nQuery '{q}': {len(items)} results found")
        for it in items[:4]:
            print(f"   -> {it['name']} (CP: {it['postalCode']}, Sec: {it.get('sectionNum')})")
