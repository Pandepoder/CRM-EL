import paramiko
import sys
import time

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def trigger_caddy_ssl():
    host = "45.80.153.22"
    user = "root"
    password = "***REMOVED-VPS-SSH-PASSWORD***"
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=10)
    
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
