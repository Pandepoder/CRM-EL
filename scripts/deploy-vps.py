import paramiko
import sys
import time

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

def deploy():
    host = "45.80.153.22"
    user = "root"
    password = "***REMOVED-VPS-SSH-PASSWORD***"
    
    print(f"Conectando a {user}@{host}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(host, port=22, username=user, password=password, timeout=15)
        print("[OK] Conexión SSH establecida con el servidor VPS.")
    except Exception as e:
        print(f"Error al conectar por SSH: {e}", file=sys.stderr)
        sys.exit(1)

    # 1. Actualizar repositorios e instalar paquetes base (git, curl, ufw, etc.)
    cmd_packages = """
    export DEBIAN_FRONTEND=noninteractive
    apt-get update && apt-get install -y git curl ca-certificates gnupg lsb-release
    """
    ok, _ = run_remote_command(client, cmd_packages, "1. Actualización e Instalación de Paquetes Base")
    if not ok:
        sys.exit(1)

    # 2. Instalar Docker y Docker Compose si no están instalados
    cmd_docker = """
    if ! command -v docker &> /dev/null; then
        echo "Instalando Docker Engine..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    else
        echo "Docker ya se encuentra instalado."
    fi
    docker --version
    docker compose version
    """
    ok, _ = run_remote_command(client, cmd_docker, "2. Verificación e Instalación de Docker")
    if not ok:
        sys.exit(1)

    # 3. Clonar o actualizar el repositorio en /opt/crm-el
    cmd_git = """
    mkdir -p /opt
    if [ ! -d "/opt/crm-el/.git" ]; then
        echo "Clonando repositorio oficial..."
        git clone https://github.com/Pandepoder/CRM-EL.git /opt/crm-el
    else
        echo "Actualizando repositorio..."
        cd /opt/crm-el
        git fetch origin
        git reset --hard origin/main
    fi
    cd /opt/crm-el
    git log -1 --oneline
    """
    ok, _ = run_remote_command(client, cmd_git, "3. Sincronización del Código Fuente desde GitHub")
    if not ok:
        sys.exit(1)

    # 4. Configurar variables de entorno .env en el servidor
    cmd_env = """
    cat << 'EOF' > /opt/crm-el/.env
DATABASE_URL=postgres://tonala:***REMOVED-DB-PASSWORD***@db:5432/tonala_os
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=tonala_os
POSTGRES_USER=tonala
POSTGRES_PASSWORD=***REMOVED-DB-PASSWORD***

SESSION_SECRET=***REMOVED***
DATABASE_ENCRYPTION_KEY=***REMOVED***
ALLOW_PUBLIC_REGISTRATION=false

ADMIN_EMAIL=admin@elapp.com.mx
ADMIN_PASSWORD=***REMOVED-ADMIN-PASSWORD***
DEMO_PASSWORD=TonalaDemo2026
NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false

DOMAIN=elapp.com.mx
NEXT_PUBLIC_APP_NAME="Tonala OS - CRM Territorial"
NEXT_PUBLIC_APP_ENV=production
NODE_ENV=production
EOF
    chmod 600 /opt/crm-el/.env
    echo ".env configurado correctamente."
    """
    ok, _ = run_remote_command(client, cmd_env, "4. Configuración de Variables de Entorno de Producción")
    if not ok:
        sys.exit(1)

    # 5. Configurar Caddyfile para soportar dominio + IP directa
    cmd_caddy = """
    cat << 'EOF' > /opt/crm-el/Caddyfile
elapp.com.mx, www.elapp.com.mx {
    encode zstd gzip
    reverse_proxy web:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}

:80 {
    encode zstd gzip
    reverse_proxy web:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
EOF
    echo "Caddyfile configurado para elapp.com.mx e IP directa."
    """
    ok, _ = run_remote_command(client, cmd_caddy, "5. Configuración de Proxy Inverso y SSL Automático")
    if not ok:
        sys.exit(1)

    # 6. Compilar y levantar contenedores Docker
    cmd_build = """
    cd /opt/crm-el
    docker compose down --remove-orphans || true
    docker compose up -d --build
    docker compose ps
    """
    ok, _ = run_remote_command(client, cmd_build, "6. Construcción y Despliegue de Contenedores Docker")
    if not ok:
        sys.exit(1)

    # 7. Esperar a que PostgreSQL y el contenedor Web estén listos
    print("\nEsperando inicialización de los servicios en Docker...")
    time.sleep(10)

    # 8. Ejecutar migraciones Drizzle y Limpieza de Producción
    cmd_db = """
    cd /opt/crm-el
    echo "Ejecutando migraciones de base de datos..."
    docker compose exec -T web pnpm db:migrate
    
    echo "Ejecutando preparación y limpieza de base de datos para PRODUCCIÓN..."
    docker compose exec -T web pnpm db:clean
    """
    ok, _ = run_remote_command(client, cmd_db, "7. Ejecución de Migraciones y Limpieza de BD")
    if not ok:
        sys.exit(1)

    # 9. Verificación de Salud (Healthcheck)
    cmd_check = """
    echo "Probando API Healthcheck localmente en el servidor..."
    curl -I -s http://localhost:3000/api/health
    echo ""
    curl -s http://localhost:3000/api/health
    echo ""
    """
    ok, _ = run_remote_command(client, cmd_check, "8. Verificación de Salud de la Aplicación")
    if not ok:
        sys.exit(1)

    print("\n=======================================================")
    print("🎉 ¡DESPLIEGUE EN PRODUCCIÓN FINALIZADO CON ÉXITO! 🎉")
    print("=======================================================")
    print(f"🌐 URL por Dominio: https://elapp.com.mx (apunta el registro DNS A a 45.80.153.22)")
    print(f"🌐 URL por IP Directa: http://45.80.153.22")
    print(f"👤 Usuario Administrador: admin@elapp.com.mx")
    print(f"🔑 Contraseña Administrador: ***REMOVED-ADMIN-PASSWORD***")
    print("=======================================================")

    client.close()

if __name__ == "__main__":
    deploy()
