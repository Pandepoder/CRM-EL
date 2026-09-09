import vps_ssh
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def inspect_container_files():
    host, user, _ = vps_ssh.target_or_exit()
    
    client = vps_ssh.connect_or_exit(timeout=10)
    
    print("--- 1. Listing /app inside tonala-os-web ---")
    stdin, stdout, stderr = client.exec_command("docker compose -f /opt/crm-el/docker-compose.yml exec -T web ls -la /app")
    print(stdout.read().decode('utf-8', errors='replace'))
    
    print("--- 2. Listing /app/apps/web inside tonala-os-web ---")
    stdin, stdout, stderr = client.exec_command("docker compose -f /opt/crm-el/docker-compose.yml exec -T web ls -la /app/apps/web")
    print(stdout.read().decode('utf-8', errors='replace'))
    
    print("--- 3. Testing curl to /login ---")
    stdin, stdout, stderr = client.exec_command("curl -s -i http://127.0.0.1:3000/login")
    print(stdout.read().decode('utf-8', errors='replace')[:1000])

    client.close()

if __name__ == "__main__":
    inspect_container_files()
