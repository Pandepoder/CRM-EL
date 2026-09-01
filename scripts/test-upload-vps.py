import requests
import io
import os

session = requests.Session()

# 1. Login
login_res = session.post("https://elapp.com.mx/api/auth/login", json={
    "email": "admin@elapp.com.mx",
    "password": os.environ["APP_ADMIN_PASSWORD"]
})
print("Login status:", login_res.status_code, login_res.text)

# 2. Upload
dummy_png = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82'
files = {
    'file': ('test_evidencia.png', io.BytesIO(dummy_png), 'image/png')
}

res = session.post("https://elapp.com.mx/api/upload", files=files)
print("Upload Status Code:", res.status_code)
print("Response JSON:", res.text)

if res.status_code == 201:
    data = res.json()
    file_url = f"https://elapp.com.mx{data['url']}"
    print("Testing GET file url:", file_url)
    get_res = session.get(file_url)
    print("GET Status Code:", get_res.status_code)
    print("Content-Type:", get_res.headers.get("Content-Type"))
    print("Content-Length:", len(get_res.content))

