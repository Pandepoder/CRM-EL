"""
Deduplicate colonies and section_colonies, ensuring 1 clean row per colony name and municipality.
"""

import paramiko
import os

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('45.80.153.22', username='root', password=os.environ["VPS_SSH_PASSWORD"])

cleanup_sql = """
BEGIN;

-- 1. Remove duplicate entries in section_colonies keeping the first row
DELETE FROM section_colonies a USING section_colonies b
WHERE a.ctid < b.ctid 
  AND a.section_id = b.section_id 
  AND a.colony_id = b.colony_id;

-- 2. Merge duplicate colonies with the same name and municipality
WITH kept_colonies AS (
    SELECT DISTINCT ON (TRIM(LOWER(name)), TRIM(LOWER(COALESCE(municipality, 'Tonalá'))))
        id,
        name,
        municipality
    FROM colonies
    ORDER BY TRIM(LOWER(name)), TRIM(LOWER(COALESCE(municipality, 'Tonalá'))), created_at ASC
),
duplicate_colonies AS (
    SELECT c.id AS duplicate_id, k.id AS canonical_id
    FROM colonies c
    JOIN kept_colonies k ON TRIM(LOWER(c.name)) = TRIM(LOWER(k.name)) 
                        AND TRIM(LOWER(COALESCE(c.municipality, 'Tonalá'))) = TRIM(LOWER(COALESCE(k.municipality, 'Tonalá')))
    WHERE c.id != k.id
)
-- Update section_colonies to point to canonical colony
UPDATE section_colonies sc
SET colony_id = dc.canonical_id
FROM duplicate_colonies dc
WHERE sc.colony_id = dc.duplicate_id
  AND NOT EXISTS (
      SELECT 1 FROM section_colonies sc_check 
      WHERE sc_check.section_id = sc.section_id AND sc_check.colony_id = dc.canonical_id
  );

-- Delete orphaned section_colonies pointing to duplicates that had a conflict
DELETE FROM section_colonies 
WHERE colony_id IN (
    SELECT c.id FROM colonies c
    WHERE c.id NOT IN (
        SELECT DISTINCT ON (TRIM(LOWER(name)), TRIM(LOWER(COALESCE(municipality, 'Tonalá')))) id
        FROM colonies
        ORDER BY TRIM(LOWER(name)), TRIM(LOWER(COALESCE(municipality, 'Tonalá'))), created_at ASC
    )
);

-- Delete duplicate colonies
DELETE FROM colonies 
WHERE id NOT IN (
    SELECT DISTINCT ON (TRIM(LOWER(name)), TRIM(LOWER(COALESCE(municipality, 'Tonalá')))) id
    FROM colonies
    ORDER BY TRIM(LOWER(name)), TRIM(LOWER(COALESCE(municipality, 'Tonalá'))), created_at ASC
);

-- Ensure all municipality strings are cleanly trimmed and normalized
UPDATE colonies SET municipality = 'Tonalá' WHERE municipality ILIKE 'tonala%' OR municipality ILIKE 'tonal%';
UPDATE electoral_sections SET municipality = 'Tonalá' WHERE municipality ILIKE 'tonala%' OR municipality ILIKE 'tonal%';

COMMIT;
"""

stdin, stdout, stderr = client.exec_command(f'docker exec -i tonala-os-postgres psql -U tonala -d tonala_os << \'EOF\'\n{cleanup_sql}\nEOF')
out = stdout.read().decode('utf-8', errors='ignore')
err = stderr.read().decode('utf-8', errors='ignore')

print("Output:", out)
if err:
    print("Errors:", err)
