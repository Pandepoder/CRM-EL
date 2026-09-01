import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('45.80.153.22', username='root', password='***REMOVED-VPS-SSH-PASSWORD***')
stdin, stdout, stderr = client.exec_command('docker exec tonala-os-postgres psql -U tonala -d tonala_os -c "SELECT email, display_name, status FROM user_profiles LIMIT 5;"')
out = stdout.read().decode()
err = stderr.read().decode()
print("STDOUT:", out)
print("STDERR:", err)
