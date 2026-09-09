import vps_ssh
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def recreate_web():
    host, user, _ = vps_ssh.target_or_exit()
    
    print(f"Conectando por SSH a {user}@{host}...")
    client = vps_ssh.connect_or_exit(timeout=15)
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
