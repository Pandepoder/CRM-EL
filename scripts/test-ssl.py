import vps_ssh
import sys
import time

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def trigger_caddy_ssl():
    host, user, _ = vps_ssh.target_or_exit()
    
    client = vps_ssh.connect_or_exit(timeout=10)
    
    print("--- 1. Restarting Caddy to obtain SSL certificates immediately ---")
    stdin, stdout, stderr = client.exec_command("docker compose -f /opt/crm-el/docker-compose.yml restart caddy")
    print(stdout.read().decode('utf-8', errors='replace'))
    
    time.sleep(6)
    
    print("--- 2. Checking Caddy Logs ---")
    stdin, stdout, stderr = client.exec_command("docker compose -f /opt/crm-el/docker-compose.yml logs --tail=25 caddy")
    print(stdout.read().decode('utf-8', errors='replace'))
    
    print("--- 3. Testing HTTPS request to https://elapp.com.mx ---")
    stdin, stdout, stderr = client.exec_command("curl -s -i https://elapp.com.mx/api/health")
    print(stdout.read().decode('utf-8', errors='replace'))

    client.close()

if __name__ == "__main__":
    trigger_caddy_ssl()
