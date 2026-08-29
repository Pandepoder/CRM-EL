import urllib.request
import json
import ssl

ctx = ssl.create_default_context()

data = json.dumps({
    "email": "admin@elapp.com.mx",
    "password": "***REMOVED-ADMIN-PASSWORD***"
}).encode("utf-8")

try:
    req = urllib.request.Request(
        "https://elapp.com.mx/api/auth/login",
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
