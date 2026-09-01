import paramiko
import json

def get_all_vps_sections():
    host = "45.80.153.22"
    user = "root"
    password = "***REMOVED-VPS-SSH-PASSWORD***"
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=10)
    
    cmd = """
    docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os -t -c '
      SELECT json_agg(t) FROM (
        SELECT 
          es.section_num,
          COALESCE(MIN(col.municipality), \'Tonalá\') as municipality,
          ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL) as colonies,
          COUNT(DISTINCT cont.id) as contacts_count
        FROM electoral_sections es
        LEFT JOIN section_colonies sc ON sc.section_id = es.id
        LEFT JOIN colonies col ON col.id = sc.colony_id
        LEFT JOIN contacts cont ON cont.section_id = es.id
        GROUP BY es.section_num
        ORDER BY es.section_num ASC
      ) t;
    '
    """
    stdin, stdout, stderr = client.exec_command(cmd)
    raw = stdout.read().decode('utf-8').strip()
    if raw:
      data = json.loads(raw)
      print(f"Total sections in DB: {len(data)}")
      tonala_count = sum(1 for s in data if s.get('municipality') == 'Tonalá' or (2680 <= s['section_num'] <= 2800))
      print(f"Tonalá sections (2680-2800): {tonala_count}")
      print("Section Numbers:", [s['section_num'] for s in data])
    client.close()

if __name__ == "__main__":
    get_all_vps_sections()
