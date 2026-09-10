import urllib.request
import json
import ssl
import os

import entorno

# Destino obligatorio: este script consulta un servidor en vivo, asi que no puede
# traer la direccion escrita. Antes apuntaba a produccion sin pedir configuracion.
BASE = entorno.app_base_url()
# La cuenta administradora tampoco va escrita: es la real del servidor.
ADMIN_EMAIL = entorno.admin_email()

ctx = ssl.create_default_context()

data = json.dumps({
    "email": ADMIN_EMAIL,
    "password": os.environ["APP_ADMIN_PASSWORD"]
}).encode("utf-8")

try:
    req = urllib.request.Request(
        f"{BASE}/api/auth/login",
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
    )
    with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
        print(f"HTTPS Auth Status Code: {response.getcode()}")
        print(f"Set-Cookie: {response.headers.get('Set-Cookie') is not None}")
        print(f"Response: {response.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
