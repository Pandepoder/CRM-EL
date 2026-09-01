import paramiko
import os

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('45.80.153.22', username='root', password=os.environ["VPS_SSH_PASSWORD"])

queries = [
    ("Colonies count by municipality", "SELECT municipality, COUNT(*) FROM colonies GROUP BY municipality ORDER BY COUNT(*) DESC LIMIT 20;"),
    ("Total section_colonies", "SELECT COUNT(*) FROM section_colonies;"),
    ("Sample colonies in Tonala", "SELECT name, postal_code, municipality FROM colonies WHERE municipality ILIKE '%Tonalá%' OR municipality ILIKE '%Tonala%' LIMIT 20;"),
    ("Sample section to colonies mappings in Tonala", "SELECT es.section_num, c.name as colony, c.municipality FROM section_colonies sc JOIN electoral_sections es ON es.id = sc.section_id JOIN colonies c ON c.id = sc.colony_id WHERE c.municipality ILIKE '%Tonalá%' OR c.municipality ILIKE '%Tonala%' LIMIT 25;"),
    ("Total electoral sections count", "SELECT COUNT(*) FROM electoral_sections;"),
    ("Sections without colonies", "SELECT COUNT(*) FROM electoral_sections es LEFT JOIN section_colonies sc ON sc.section_id = es.id WHERE sc.section_id IS NULL;"),
]

for title, q in queries:
    print(f"\n=== {title} ===")
    stdin, stdout, stderr = client.exec_command(f'docker exec tonala-os-postgres psql -U tonala -d tonala_os -c "{q}"')
    out = stdout.read().decode('utf-8', errors='ignore')
    err = stderr.read().decode('utf-8', errors='ignore')
    if out:
        print(out)
    if err:
        print("ERR:", err)
