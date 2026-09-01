import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('45.80.153.22', username='root', password='***REMOVED-VPS-SSH-PASSWORD***')

q = "SELECT municipality, count(id) as total_sections FROM electoral_sections GROUP BY municipality ORDER BY total_sections DESC LIMIT 25;"
stdin, stdout, stderr = client.exec_command(f'docker exec tonala-os-postgres psql -U tonala -d tonala_os -c "{q}"')
print(stdout.read().decode('utf-8', errors='ignore'))
