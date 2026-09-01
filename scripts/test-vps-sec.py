import paramiko
import os

def test():
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=10)
    
    cmd = 'docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os -c "SELECT section_num, COUNT(geom_json) FROM electoral_sections GROUP BY section_num ORDER BY section_num;"'
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    print(out)
    client.close()

if __name__ == "__main__":
    test()
