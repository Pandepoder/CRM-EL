import urllib.request
import json
import ssl

import entorno

# Destino obligatorio: este script consulta un servidor en vivo, asi que no puede
# traer la direccion escrita. Antes apuntaba a produccion sin pedir configuracion.
BASE = entorno.app_base_url()

ctx = ssl.create_default_context()

try:
    req = urllib.request.Request(f"{BASE}/login", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
        print(f"HTTPS Status Code: {response.getcode()}")
        print(f"SSL Verified: True")
        print(f"Server: {response.headers.get('Server')}")
except Exception as e:
    print(f"Error: {e}")
