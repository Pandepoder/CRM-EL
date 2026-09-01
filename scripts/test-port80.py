import paramiko
import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def test_routes():
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=10)
    
    print("--- 1. Testing GET http://localhost/login ---")
    stdin, stdout, stderr = client.exec_command("curl -s -i http://localhost/login")
    print(stdout.read().decode('utf-8', errors='replace')[:1000])
    
    print("\n--- 2. Testing GET http://localhost/api/health ---")
    stdin, stdout, stderr = client.exec_command("curl -s -i http://localhost/api/health")
    print(stdout.read().decode('utf-8', errors='replace'))
    
    print("\n--- 3. Testing GET http://localhost/ ---")
    stdin, stdout, stderr = client.exec_command("curl -s -i http://localhost/")
    print(stdout.read().decode('utf-8', errors='replace')[:1000])

    client.close()

if __name__ == "__main__":
    test_routes()
