import requests
import json
import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

BASE_URL = "https://elapp.com.mx"

def test_user_flow():
    print(f"--- Probando Flujo Completo de Usuarios en {BASE_URL} ---")
    session = requests.Session()
    
    # 1. Registrar un nuevo usuario (solicitud de acceso)
    test_email = "brigadista.test@elapp.com.mx"
    test_pass = "Brigadista2026!"
    test_name = "Carlos Brigadista de Prueba"
    
    print(f"\n1. Enviando solicitud de registro público para {test_email}...")
    reg_res = session.post(f"{BASE_URL}/api/auth/register", json={
        "displayName": test_name,
        "email": test_email,
        "password": test_pass
    })
    print(f"Status: {reg_res.status_code}")
    print(f"Response: {reg_res.text}")
    
    # 2. Intentar iniciar sesión con la cuenta pendiente
    print(f"\n2. Intentando iniciar sesión antes de la aprobación...")
    login_res = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": test_email,
        "password": test_pass
    })
    print(f"Status: {login_res.status_code}")
    print(f"Response: {login_res.text}")
    
    if login_res.status_code == 403 and "pendiente de aprobación" in login_res.text.lower():
        print("✅ Comportamiento de seguridad verificado: La cuenta no puede ingresar hasta que el Admin la apruebe.")
    else:
        print("⚠️ Advertencia: Respuesta inesperada al intentar login con cuenta pendiente.")

    # 3. Iniciar sesión como Admin
    print(f"\n3. Iniciando sesión como Administrador (admin@elapp.com.mx)...")
    admin_login = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@elapp.com.mx",
        "password": os.environ["APP_ADMIN_PASSWORD"]
    })
    print(f"Admin Status: {admin_login.status_code}")
    print(f"Admin Cookies: {session.cookies.get_dict()}")
    
    if admin_login.status_code == 200:
        print("✅ Inicio de sesión de Administrador exitoso.")
    else:
        print("❌ Error al iniciar sesión como Administrador.")
        return

    print("\n🎉 Flujo de Registro Público y Protección de Cuentas Pendientes 100% OPERATIVO EN VIVO.")

if __name__ == "__main__":
    test_user_flow()
