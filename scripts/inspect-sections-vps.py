import paramiko
import sys
import os

def inspect_sections():
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=10)
    
    print("=== SECTIONS SUMMARY IN VPS ===")
    cmd = """
    docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os -c '
      SELECT 
        COUNT(*) as total_sections,
        COUNT(geom_json) as sections_with_geom,
        MIN(section_num) as min_sec,
        MAX(section_num) as max_sec
      FROM electoral_sections;
    '
    """
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode('utf-8'))

    print("=== SAMPLE SECTIONS AND COLONIES ===")
    cmd2 = """
    docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os -c '
      SELECT 
        es.section_num, 
        COUNT(DISTINCT sc.colony_id) as colonies_count,
        COALESCE(MIN(col.municipality), \'Tonalá\') as municipality,
        ARRAY_TO_STRING(ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL), \', \') as sample_colonies
      FROM electoral_sections es
      LEFT JOIN section_colonies sc ON sc.section_id = es.id
      LEFT JOIN colonies col ON col.id = sc.colony_id
      GROUP BY es.section_num
      ORDER BY es.section_num ASC
      LIMIT 30;
    '
    """
    stdin, stdout, stderr = client.exec_command(cmd2)
    print(stdout.read().decode('utf-8'))

    client.close()

if __name__ == "__main__":
    inspect_sections()
