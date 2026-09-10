import vps_ssh
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def run_db_setup():
    host, user, _ = vps_ssh.target_or_exit()
    
    client = vps_ssh.connect_or_exit(timeout=10)
    
    print("--- 0. Pulling Latest Code on VPS ---")
    stdin, stdout, stderr = client.exec_command("cd /opt/crm-el && git pull origin main")
    print(stdout.read().decode('utf-8', errors='replace'))
    
    print("--- 1. Running Drizzle DB Migrations ---")
    stdin, stdout, stderr = client.exec_command("cd /opt/crm-el && docker compose exec -T web pnpm db:migrate")
    print(stdout.read().decode('utf-8', errors='replace'))
    print(stderr.read().decode('utf-8', errors='replace'))
    
    print("--- 2. Running Clean Production Seeder ---")
    stdin, stdout, stderr = client.exec_command("cd /opt/crm-el && docker compose exec -T web pnpm db:clean")
    print(stdout.read().decode('utf-8', errors='replace'))
    print(stderr.read().decode('utf-8', errors='replace'))
    
    print("--- 3. Testing Healthcheck Endpoint ---")
    stdin, stdout, stderr = client.exec_command("curl -i http://127.0.0.1:3000/api/health")
    print("\n[Direct Web Port 3000]:\n" + stdout.read().decode('utf-8', errors='replace'))
    
    stdin, stdout, stderr = client.exec_command("curl -i http://127.0.0.1/api/health")
    print("\n[Via Caddy Port 80]:\n" + stdout.read().decode('utf-8', errors='replace'))

    client.close()

if __name__ == "__main__":
    run_db_setup()
