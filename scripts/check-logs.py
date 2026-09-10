import vps_ssh
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def check_web_logs():
    host, user, _ = vps_ssh.target_or_exit()
    
    client = vps_ssh.connect_or_exit(timeout=10)
    
    stdin, stdout, stderr = client.exec_command("cd /opt/crm-el && docker compose logs web --tail 50")
    print(stdout.read().decode('utf-8', errors='replace'))
    client.close()

if __name__ == "__main__":
    check_web_logs()
