import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('45.80.153.22', username='root', password='***REMOVED-VPS-SSH-PASSWORD***')

q = "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'electoral_sections';"
stdin, stdout, stderr = client.exec_command(f'docker exec tonala-os-postgres psql -U tonala -d tonala_os -c "{q}"')
print(stdout.read().decode('utf-8', errors='ignore'))
