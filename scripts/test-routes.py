import vps_ssh
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def test_routes():
    host, user, _ = vps_ssh.target_or_exit()
    
    client = vps_ssh.connect_or_exit(timeout=10)
    
    print("--- 1. Testing GET /login on host ---")
    stdin, stdout, stderr = client.exec_command("curl -s -i http://localhost:3000/login")
    print(stdout.read().decode('utf-8', errors='replace')[:1500])
    
    print("\n--- 2. Testing GET /api/health with verbose headers ---")
    stdin, stdout, stderr = client.exec_command("curl -v http://localhost:3000/api/health")
    print(stderr.read().decode('utf-8', errors='replace'))
    print(stdout.read().decode('utf-8', errors='replace'))
    
    client.close()

if __name__ == "__main__":
    test_routes()
