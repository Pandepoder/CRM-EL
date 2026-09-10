import vps_ssh

client = vps_ssh.connect_or_exit()
stdin, stdout, stderr = client.exec_command('docker exec tonala-os-postgres psql -U tonala -d tonala_os -c "SELECT email, display_name, status FROM user_profiles LIMIT 5;"')
out = stdout.read().decode()
err = stderr.read().decode()
print("STDOUT:", out)
print("STDERR:", err)
