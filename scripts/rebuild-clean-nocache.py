import paramiko
import sys
import time

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def rebuild_no_cache():
    host = "45.80.153.22"
    user = "root"
    password = "***REMOVED-VPS-SSH-PASSWORD***"
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=10)
    
    print("--- 1. Pulling latest code and building web with --no-cache ---")
    stdin, stdout, stderr = client.exec_command("cd /opt/crm-el && git pull origin main && docker compose build --no-cache web && docker compose up -d web")
    
    for line in iter(stdout.readline, ""):
        print(line, end="")
    print(stderr.read().decode('utf-8', errors='replace'))
    
    time.sleep(5)
    
    print("\n--- 2. Checking Web Logs ---")
    stdin, stdout, stderr = client.exec_command("docker compose -f /opt/crm-el/docker-compose.yml logs --tail=20 web")
    print(stdout.read().decode('utf-8', errors='replace'))
    
    print("\n--- 3. Testing GET http://localhost/login ---")
    stdin, stdout, stderr = client.exec_command("curl -s -i http://localhost/login")
    print(stdout.read().decode('utf-8', errors='replace')[:1000])

    print("\n--- 4. Testing GET http://localhost/api/health ---")
    stdin, stdout, stderr = client.exec_command("curl -s -i http://localhost/api/health")
    print(stdout.read().decode('utf-8', errors='replace'))

    client.close()

if __name__ == "__main__":
    rebuild_no_cache()
