import paramiko
import sys
import time
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def run_remote_command(client, command, step_name):
    print(f"\n=======================================================")
    print(f"▶ {step_name}")
    print(f"=======================================================")
    print(f"$ {command}")
    
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    
    output_lines = []
    while True:
        line = stdout.readline()
        if not line:
            break
        print(line, end="")
        output_lines.append(line)
        
    exit_status = stdout.channel.recv_exit_status()
    if exit_status != 0:
        print(f"\n[ERROR] Command failed with exit code: {exit_status}", file=sys.stderr)
        return False, "".join(output_lines)
    
    print(f"[OK] {step_name} completado con éxito.")
    return True, "".join(output_lines)

def update_live():
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]
    
    print(f"Conectando a {user}@{host}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(host, port=22, username=user, password=password, timeout=15)
        print("[OK] Conexión SSH establecida con el servidor VPS.")
    except Exception as e:
        print(f"Error al conectar por SSH: {e}", file=sys.stderr)
        sys.exit(1)

    # 1. Git pull
    cmd_git = """
    cd /opt/crm-el
    git fetch origin main
    git reset --hard origin/main
    git log -1 --oneline
    """
    ok, _ = run_remote_command(client, cmd_git, "1. Sincronización con Git")
    if not ok:
        sys.exit(1)

    # 2. Rebuild and restart web container
    cmd_docker = """
    cd /opt/crm-el
    docker compose build web
    docker compose up -d web
    docker compose ps
    """
    ok, _ = run_remote_command(client, cmd_docker, "2. Recompilación y Despliegue de Next.js")
    if not ok:
        sys.exit(1)

    # 3. Regenerate seamless Voronoi sections in Postgres
    time.sleep(3)
    cmd_voronoi = """
    cd /opt/crm-el
    docker compose exec -T web npx tsx scripts/db/generate-clean-voronoi-sections.ts
    """
    ok, _ = run_remote_command(client, cmd_voronoi, "3. Generación de Secciones Voronoi Continuas")
    if not ok:
        print("[WARN] Voronoi script inside container had a warning, continuing...")

    # 4. Wait 5s and test health
    time.sleep(4)
    cmd_test = """
    echo "Verificando respuesta local..."
    curl -s http://localhost:3000/api/health
    echo ""
    echo "Verificando respuesta pública en https://elapp.com.mx/api/health ..."
    curl -s https://elapp.com.mx/api/health
    echo ""
    """
    ok, _ = run_remote_command(client, cmd_test, "4. Verificación de Salud en Vivo")
    if not ok:
        sys.exit(1)

    print("\n✅ ¡Actualización en vivo desplegada con éxito en https://elapp.com.mx!")
    client.close()

if __name__ == "__main__":
    update_live()
