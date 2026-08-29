import urllib.request
import json

try:
    req = urllib.request.Request("http://45.80.153.22/login", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as response:
        print(f"Status Code: {response.getcode()}")
        print(f"Server Header: {response.headers.get('Server')}")
        body = response.read().decode('utf-8')
        print(f"Page title in body: {'Tonala OS' in body or 'Iniciar Sesión' in body or 'login' in body}")
except Exception as e:
    print(f"Error: {e}")
