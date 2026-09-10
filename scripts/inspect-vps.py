import vps_ssh
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def inspect():
    host, user, _ = vps_ssh.target_or_exit()
    
    client = vps_ssh.connect_or_exit(timeout=10)
    
    stdin, stdout, stderr = client.exec_command("cd /opt/crm-el && docker compose ps && echo '--- DB LOGS ---' && docker compose logs db --tail 20 && echo '--- WEB LOGS ---' && docker compose logs web --tail 20 && echo '--- CADDY LOGS ---' && docker compose logs caddy --tail 20")
    print(stdout.read().decode('utf-8', errors='replace'))
    print(stderr.read().decode('utf-8', errors='replace'))
    client.close()

if __name__ == "__main__":
    inspect()
