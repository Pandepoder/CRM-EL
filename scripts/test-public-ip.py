import urllib.request
import json
import ssl

import vps_ssh

BASE = vps_ssh.app_base_url()

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

try:
    req = urllib.request.Request(f"{BASE}/api/health", headers={"User-Agent": "Antigravity/1.0"})
    with urllib.request.urlopen(req, timeout=10) as response:
        print(f"Status Code: {response.getcode()}")
        print(f"Body: {response.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
