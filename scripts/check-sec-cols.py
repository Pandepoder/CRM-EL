import vps_ssh

client = vps_ssh.connect_or_exit()

q = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'electoral_sections';"
stdin, stdout, stderr = client.exec_command(f'docker exec tonala-os-postgres psql -U tonala -d tonala_os -c "{q}"')
print(stdout.read().decode('utf-8', errors='ignore'))
