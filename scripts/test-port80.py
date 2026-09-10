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
