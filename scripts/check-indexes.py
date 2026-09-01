import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('45.80.153.22', username='root', password='***REMOVED-VPS-SSH-PASSWORD***')

def run_query(q):
    stdin, stdout, stderr = client.exec_command(f"docker exec tonala-os-postgres psql -U tonala -d tonala_os -c \"{q}\"")
    print("=== Query ===", q)
    print(stdout.read().decode('utf-8', errors='ignore'))
    err = stderr.read().decode('utf-8', errors='ignore')
    if err:
        print("ERR:", err)

run_query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'colonies';")
