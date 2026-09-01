import paramiko
import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def recreate_web():
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]
    
    print(f"Conectando por SSH a {user}@{host}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=15)
    print("[OK] Conectado.")

    cmd = """
    cd /opt/crm-el
    docker compose up -d --force-recreate web
    docker compose ps
    """
    print("Reiniciando contenedor web con la nueva imagen compilada...")
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    print("Salida:\n", out)
    if err:
        print("Salida stderr:\n", err)

    # Health check
    print("Verificando /api/health...")
    stdin, stdout, stderr = client.exec_command("curl -s https://elapp.com.mx/api/health")
    print("Health response:", stdout.read().decode('utf-8'))
    
    client.close()
    print("\n✅ ¡Servicio web reiniciado exitosamente en producción!")

if __name__ == "__main__":
    recreate_web()
