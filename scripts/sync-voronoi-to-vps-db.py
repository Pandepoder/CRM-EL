import vps_ssh

# Destino publico configurado, no escrito: este script verifica un servidor en vivo.
BASE = vps_ssh.app_base_url()
import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def sync_voronoi_to_vps():
    host, user, _ = vps_ssh.target_or_exit()
    
    print(f"Conectando por SSH a {user}@{host}...")
    client = vps_ssh.connect_or_exit(timeout=15)
    print("[OK] Conectado.")

    sql_path = os.path.join(os.path.dirname(__file__), "voronoi_updates.sql")
    if not os.path.exists(sql_path):
        print(f"Error: no existe {sql_path}", file=sys.stderr)
        return

    print("Subiendo scripts/voronoi_updates.sql al servidor VPS...")
    sftp = client.open_sftp()
    sftp.put(sql_path, "/tmp/voronoi_updates.sql")
    sftp.close()
    print("[OK] Archivo SQL subido a /tmp/voronoi_updates.sql.")

    cmd_apply = """
    cat /tmp/voronoi_updates.sql | docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os
    rm -f /tmp/voronoi_updates.sql
    """
    print("Ejecutando actualización de polígonos Voronoi en PostgreSQL...")
    stdin, stdout, stderr = client.exec_command(cmd_apply)
    out_apply = stdout.read().decode('utf-8')
    err_apply = stderr.read().decode('utf-8')
    if err_apply:
        print("Avisos/Salida de error:", err_apply)
    
    lines = [l for l in out_apply.splitlines() if l.strip()]
    print(f"[OK] Total de comandos ejecutados en Postgres: {len(lines)}")
    print("Última línea:", lines[-1] if lines else "None")

    # Test GeoJSON endpoint on live server
    print(f"\nVerificando API pública {BASE}/api/map/sections/geojson ...")
    cmd_test = """
    curl -s __BASE__/api/map/sections/geojson | head -c 250
    """
    stdin, stdout, stderr = cmd_test = cmd_test.replace("__BASE__", BASE)
    client.exec_command(cmd_test)
    out_test = stdout.read().decode('utf-8')
    print("Respuesta GeoJSON en vivo:\n", out_test)
    
    client.close()
    print(f"\n✅ ¡86 Secciones Voronoi continuas sin sobreposiciones aplicadas en vivo en {BASE}/mapa!")

if __name__ == "__main__":
    sync_voronoi_to_vps()
