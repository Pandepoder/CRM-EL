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
    password = os.environ.get("VPS_SSH_PASSWORD") or (sys.argv[1] if len(sys.argv) > 1 else None)
    if not password:
        print("ERROR: Debe definir VPS_SSH_PASSWORD o pasar la contraseña como argumento.", file=sys.stderr)
        sys.exit(1)
    
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

    # 2. Rebuild and restart containers
    cmd_docker = """
    cd /opt/crm-el
    docker compose build migrate
    docker compose run --rm migrate pnpm db:migrate
    docker compose up -d --build
    docker compose ps
    """
    ok, _ = run_remote_command(client, cmd_docker, "2. Recompilación y Despliegue de Contenedores")
    if not ok:
        sys.exit(1)

    # 3. Devolver a las secciones su contorno oficial del INE.
    #
    # Durante mucho tiempo el paso siguiente (Voronoi) sustituía la cartografía
    # real por una teselación aproximada, porque su UPDATE no llevaba condición:
    # deformaba 82 secciones con contorno oficial, 46 de ellas en Tonalá, en cada
    # despliegue. Ya no lo hace, pero hay que reparar lo que quedó dañado. El
    # script es idempotente: si todo está correcto no escribe nada.
    time.sleep(3)
    cmd_ine = """
    cd /opt/crm-el
    docker compose run --rm migrate pnpm db:restore-geo
    """
    ok, _ = run_remote_command(client, cmd_ine, "3. Restauración de la Cartografía Oficial del INE")
    if not ok:
        print("[WARN] Restauración de cartografía con avisos, continuando...")

    # 4. Rellenar con Voronoi únicamente las secciones que siguen sin contorno.
    cmd_voronoi = """
    cd /opt/crm-el
    docker compose run --rm migrate npx tsx scripts/db/generate-clean-voronoi-sections.ts
    """
    ok, _ = run_remote_command(client, cmd_voronoi, "4. Relleno Voronoi de Secciones sin Cartografía")
    if not ok:
        print("[WARN] Voronoi script inside container had a warning, continuing...")

    # 5. Wait for web container to be ready and test health
    print("\nEsperando a que el contenedor web responda...")
    time.sleep(6)
    cmd_test = """
    echo "Verificando respuesta local (intentando hasta 10 veces)..."
    for i in $(seq 1 10); do
        RES=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health)
        if [ "$RES" = "200" ]; then
            echo "Contenedor web listo en intento $i (HTTP 200)"
            curl -s http://localhost:3000/api/health
            echo ""
            break
        fi
        echo "Intento $i: esperando respuesta (código $RES)..."
        sleep 3
    done

    echo "Verificando respuesta pública en https://elapp.com.mx/api/health ..."
    curl -s https://elapp.com.mx/api/health
    echo ""
    """
    ok, _ = run_remote_command(client, cmd_test, "5. Verificación de Salud en Vivo")
    if not ok:
        sys.exit(1)

    print("\n✅ ¡Actualización en vivo desplegada con éxito en https://elapp.com.mx!")
    client.close()

if __name__ == "__main__":
    update_live()
