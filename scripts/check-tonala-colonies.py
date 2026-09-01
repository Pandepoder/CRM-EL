import paramiko

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('45.80.153.22', username='root', password='***REMOVED-VPS-SSH-PASSWORD***')

q = """
SELECT 
    es.section_num,
    COALESCE(ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL), '{}') AS colonies
FROM electoral_sections es
LEFT JOIN section_colonies sc ON sc.section_id = es.id
LEFT JOIN colonies col ON col.id = sc.colony_id
GROUP BY es.section_num
HAVING (
    es.section_num BETWEEN 2650 AND 2729 
    OR es.section_num = 3311 
    OR es.section_num BETWEEN 3704 AND 3715 
    OR es.section_num BETWEEN 3740 AND 3745 
    OR es.section_num BETWEEN 3800 AND 3806 
    OR es.section_num BETWEEN 3861 AND 3873
)
ORDER BY es.section_num ASC;
"""

stdin, stdout, stderr = client.exec_command(f'docker exec tonala-os-postgres psql -U tonala -d tonala_os -c "{q}"')
out = stdout.read().decode('utf-8', errors='ignore')
print(out)
