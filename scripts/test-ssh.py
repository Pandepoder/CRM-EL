import vps_ssh
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def test_ssh():
    host, user, _ = vps_ssh.target_or_exit()
    
    print(f"Connecting to {user}@{host}...")
    
    try:
        client = vps_ssh.connect_or_exit(timeout=10)
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
