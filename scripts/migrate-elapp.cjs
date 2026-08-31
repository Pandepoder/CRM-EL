const { Pool } = require('pg');
require('dotenv').config({ path: 'apps/web/.env' });
require('dotenv').config({ path: '.env' });

const conn = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tonala_crm';
const pool = new Pool({ connectionString: conn });

async function runMigrate() {
  const client = await pool.connect();
  try {
    console.log('Running direct PostgreSQL migration for ElApp Primera Etapa...');
    await client.query(`
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
    `);
    console.log('✅ PostgreSQL migration applied successfully in < 1 second!');
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrate();
