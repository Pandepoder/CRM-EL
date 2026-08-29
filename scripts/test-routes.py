import paramiko
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def test_routes():
    host = "45.80.153.22"
    user = "root"
    password = "***REMOVED-VPS-SSH-PASSWORD***"
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=10)
    
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
