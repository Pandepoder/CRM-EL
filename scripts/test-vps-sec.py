import vps_ssh

def test():
    host, user, _ = vps_ssh.target_or_exit()
    
    client = vps_ssh.connect_or_exit(timeout=10)
    
    cmd = 'docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os -c "SELECT section_num, COUNT(geom_json) FROM electoral_sections GROUP BY section_num ORDER BY section_num;"'
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    print(out)
    client.close()

if __name__ == "__main__":
    test()
