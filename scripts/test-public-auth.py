import urllib.request
import json
import os

data = json.dumps({
    "email": "admin@elapp.com.mx",
    "password": os.environ["APP_ADMIN_PASSWORD"]
}).encode("utf-8")

try:
    req = urllib.request.Request(
        "http://45.80.153.22/api/auth/login",
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        print(f"Login Status Code: {response.getcode()}")
        print(f"Set-Cookie: {response.headers.get('Set-Cookie') is not None}")
        print(f"Response: {response.read().decode('utf-8')}")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
