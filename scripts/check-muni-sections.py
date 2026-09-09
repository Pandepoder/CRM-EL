import vps_ssh

client = vps_ssh.connect_or_exit()

q = "SELECT municipality, count(id) as total_sections FROM electoral_sections GROUP BY municipality ORDER BY total_sections DESC LIMIT 25;"
stdin, stdout, stderr = client.exec_command(f'docker exec tonala-os-postgres psql -U tonala -d tonala_os -c "{q}"')
print(stdout.read().decode('utf-8', errors='ignore'))
