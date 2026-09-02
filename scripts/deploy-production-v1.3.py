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
        print(f"\n[ERROR] El comando fallo con codigo de salida: {exit_status}", file=sys.stderr)
        return False, "".join(output_lines)
    
    print(f"[OK] {step_name} completado con exito.")
    return True, "".join(output_lines)

def deploy():
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]
    
    print(f"Conectando a {user}@{host}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(host, port=22, username=user, password=password, timeout=15)
        print("[OK] Conexión SSH establecida con el servidor VPS (45.80.153.22).")
    except Exception as e:
        print(f"Error al conectar por SSH: {e}", file=sys.stderr)
        sys.exit(1)

    # 1. Sincronizar codigo desde GitHub origin main
    cmd_git = """
    cd /opt/crm-el
    git fetch origin main
    git reset --hard origin/main
    git log -1 --oneline
    """
    ok, _ = run_remote_command(client, cmd_git, "1. Sincronización del Código Fuente desde GitHub (origin/main)")
    if not ok:
        sys.exit(1)

    # 2. Ejecutar migraciones Drizzle en la base de datos PostgreSQL
    cmd_migrate = """
    cd /opt/crm-el
    echo "Aplicando migraciones de base de datos..."
    docker exec tonala-os-postgres psql -U tonala -d tonala_os -c "ALTER TABLE event_reports ADD COLUMN IF NOT EXISTS media_urls JSONB;" || true
    docker compose exec -T web pnpm db:migrate || true
    """
    ok, _ = run_remote_command(client, cmd_migrate, "2. Aplicación de Migraciones en PostgreSQL")

    # 3. Compilar la nueva imagen Docker de Next.js (Standalone)
    cmd_build = """
    cd /opt/crm-el
    echo "Compilando nueva imagen web con Turbopack / Standalone..."
    docker compose build web
    docker compose up -d web
    docker compose ps
    """
    ok, _ = run_remote_command(client, cmd_build, "3. Recompilación y Levantamiento del Contenedor Web")
    if not ok:
        sys.exit(1)

    # 4. Asegurar que las migraciones finales queden registradas con el nuevo código
    time.sleep(5)
    cmd_post_migrate = """
    cd /opt/crm-el
    echo "Verificando estado de migraciones Drizzle en el nuevo contenedor..."
    docker compose exec -T web node scripts/migrate-elapp.cjs || true
    """
    run_remote_command(client, cmd_post_migrate, "4. Verificación de Migraciones Post-Despliegue")

    # 5. Ejecutar Healthcheck y Verificación en Vivo
    time.sleep(3)
    cmd_health = """
    echo "=== VERIFICANDO SERVICIOS EN EL SERVIDOR ==="
    echo "1. Healthcheck local:"
    curl -s http://localhost:3000/api/health
    echo ""
    echo "2. Healthcheck publico HTTPS (https://elapp.com.mx/api/health):"
    curl -s https://elapp.com.mx/api/health
    echo ""
    """
    ok, _ = run_remote_command(client, cmd_health, "5. Verificación de Salud en Vivo")

    client.close()
    print("\n=======================================================")
    print("🚀 ¡DESPLIEGUE FINALIZADO Y ACTIVO EN LA WEB REAL!")
    print("=======================================================")
    print("🌐 URL Pública: https://elapp.com.mx")
    print("🌐 URL Alternativa (IP): http://45.80.153.22")
    print("=======================================================")

if __name__ == "__main__":
    deploy()
