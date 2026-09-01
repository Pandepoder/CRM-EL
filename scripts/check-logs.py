import paramiko
import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def check_web_logs():
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=10)
    
    stdin, stdout, stderr = client.exec_command("cd /opt/crm-el && docker compose logs web --tail 50")
    print(stdout.read().decode('utf-8', errors='replace'))
    client.close()

if __name__ == "__main__":
    check_web_logs()
