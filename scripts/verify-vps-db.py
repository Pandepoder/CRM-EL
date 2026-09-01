import paramiko
import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def verify_db():
    host = "45.80.153.22"
    user = "root"
    password=os.environ["VPS_SSH_PASSWORD"]
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=user, password=password, timeout=10)
    
    print("=== 1. LISTING TABLES IN POSTGRES ===")
    stdin, stdout, stderr = client.exec_command("docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os -c '\\dt'")
    print(stdout.read().decode('utf-8', errors='replace'))
    
    print("=== 2. APPLYING MIGRATION 0007 IF NEEDED ===")
    cmd_migrate_sql = """
    docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os << 'EOF'
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS access_type text NOT NULL DEFAULT 'conexion';
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS invited_by_user_id uuid REFERENCES user_profiles(id);
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS parent_enlace_id uuid REFERENCES user_profiles(id);
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS personal_slug text;
      CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_slug_unique ON user_profiles(personal_slug);

      UPDATE user_profiles SET access_type = 'coordinacion' WHERE email LIKE 'admin%' OR email LIKE 'edgar%' OR role_id IN (SELECT id FROM roles WHERE key = 'admin' OR key = 'direction');
      UPDATE user_profiles SET access_type = 'enlace' WHERE access_type = 'conexion' AND id IN (SELECT leader_id FROM teams);
      UPDATE user_profiles SET personal_slug = LOWER(REGEXP_REPLACE(display_name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE personal_slug IS NULL;

      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS origin text DEFAULT 'toca_toca';
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS actual_contact_user_id uuid REFERENCES user_profiles(id);
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_contact_date timestamp with time zone;
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_contact_method text;
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_contact_time text;
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pan_militancy text DEFAULT 'no_registrada';
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pan_militancy_verified_at timestamp with time zone;
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS know_me_better text;
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS barda_photo_url text;
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS exact_latitude double precision;
      ALTER TABLE contacts ADD COLUMN IF NOT EXISTS exact_longitude double precision;

      CREATE TABLE IF NOT EXISTS user_promotions_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES user_profiles(id),
        from_access_type text NOT NULL,
        to_access_type text NOT NULL,
        reason text,
        promoted_by_user_id uuid NOT NULL REFERENCES user_profiles(id),
        promoted_at timestamp with time zone NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS contact_notes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id uuid NOT NULL REFERENCES contacts(id),
        author_user_id uuid NOT NULL REFERENCES user_profiles(id),
        note_text text NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS social_surveys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id uuid NOT NULL REFERENCES contacts(id),
        colony_priority_need text,
        colony_priority_other text,
        tonala_values text,
        tonala_values_other text,
        services_rating integer,
        services_rating_why text,
        project_expectations text,
        project_expectations_other text,
        participation_form text,
        participation_form_other text,
        open_proposal text,
        created_at timestamp with time zone NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS social_listening (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contact_id uuid REFERENCES contacts(id),
        categories jsonb NOT NULL DEFAULT '[]'::jsonb,
        title text NOT NULL,
        description text NOT NULL,
        photo_urls jsonb DEFAULT '[]'::jsonb,
        latitude double precision,
        longitude double precision,
        location_text text,
        status text NOT NULL DEFAULT 'pendiente',
        is_formal_gestion integer NOT NULL DEFAULT 0,
        approved_by_user_id uuid REFERENCES user_profiles(id),
        resolution_notes text,
        created_by_user_id uuid NOT NULL REFERENCES user_profiles(id),
        created_at timestamp with time zone NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS rapid_activity_prospects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        prospect_name text NOT NULL,
        organization_or_reference text,
        profile_type text NOT NULL DEFAULT 'vecinal',
        disposition text NOT NULL DEFAULT 'interesado',
        disposition_notes text,
        activity_date timestamp with time zone NOT NULL DEFAULT NOW(),
        location_text text,
        commitments text,
        private_notes text,
        converted_to_contact_id uuid REFERENCES contacts(id),
        created_by_user_id uuid NOT NULL REFERENCES user_profiles(id),
        created_at timestamp with time zone NOT NULL DEFAULT NOW()
      );
EOF
    """
    stdin, stdout, stderr = client.exec_command(cmd_migrate_sql)
    print(stdout.read().decode('utf-8', errors='replace'))
    err = stderr.read().decode('utf-8', errors='replace')
    if err:
        print("STDERR:", err)

    print("=== 3. CHECKING ADMIN USERS ===")
    stdin, stdout, stderr = client.exec_command("docker compose -f /opt/crm-el/docker-compose.yml exec -T db psql -U tonala -d tonala_os -c 'SELECT id, email, display_name, access_type, personal_slug FROM user_profiles;'")
    print(stdout.read().decode('utf-8', errors='replace'))

    client.close()

if __name__ == "__main__":
    verify_db()
