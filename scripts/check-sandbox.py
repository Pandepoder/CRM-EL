import vps_ssh
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def inspect_sandbox():
    host, user, _ = vps_ssh.target_or_exit()
    
    client = vps_ssh.connect_or_exit(timeout=10)
    
    print("--- 1. Check if sandbox exists in node_modules ---")
    stdin, stdout, stderr = client.exec_command("docker compose -f /opt/crm-el/docker-compose.yml exec -T web find /app -name sandbox*")
    print(stdout.read().decode('utf-8', errors='replace'))
    
    print("--- 2. Check next package in node_modules ---")
    stdin, stdout, stderr = client.exec_command("docker compose -f /opt/crm-el/docker-compose.yml exec -T web find /app -path '*/next/dist/server/*'")
    print(stdout.read().decode('utf-8', errors='replace')[:1500])

    client.close()

if __name__ == "__main__":
    inspect_sandbox()
