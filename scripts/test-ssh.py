import paramiko
import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def test_ssh():
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]
    
    print(f"Connecting to {user}@{host}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(host, port=22, username=user, password=password, timeout=10)
        print("[OK] Connected successfully!")
        
        stdin, stdout, stderr = client.exec_command("uname -a && cat /etc/os-release | grep PRETTY_NAME && free -h && df -h /")
        print("\n--- System Info ---")
        print(stdout.read().decode('utf-8', errors='replace'))
        
        client.close()
    except Exception as e:
        print(f"Connection failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    test_ssh()
