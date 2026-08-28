import "dotenv/config";
import pg from "pg";
import { readFileSync } from "fs";
import { join } from "path";
import { loadAppEnv } from "../../packages/config/index.js";

const env = loadAppEnv();
const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });

async function _applyPendingSQL() {
  console.log("Applying pending SQL changes directly to bypass migration history...");
  const sqlContent = readFileSync(join(process.cwd(), "db/migrations/0001_pretty_scarlet_witch.sql"), "utf-8");
  
  // Split statements
  const statements = sqlContent.split("--> statement-breakpoint");
  for (const stmt of statements) {
    const query = stmt.trim();
    if (query) {
      try {
        await pool.query(query);
      } catch (err: any) {
        if (err.code !== "42P07" && err.code !== "42701") {
          // 42P07: table already exists
          // 42701: column already exists
          console.warn(`Warning executing query: ${err.message}`);
        }
      }
    }
  }
}

async function seedMockData() {
  console.log("Starting mock data seed...");
  try {
    // Create tables if they don't exist to fix the missing migration issue
    await pool.query(`
      CREATE TABLE IF NOT EXISTS electoral_sections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        section_num integer NOT NULL UNIQUE,
        geom_json jsonb,
        created_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS electoral_representatives (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        section_id uuid NOT NULL REFERENCES electoral_sections(id),
        user_id uuid NOT NULL REFERENCES user_profiles(id),
        role text NOT NULL,
        assigned_at timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT electoral_reps_section_user_idx UNIQUE (section_id, user_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS section_colonies (
        section_id uuid NOT NULL REFERENCES electoral_sections(id),
        colony_id uuid NOT NULL REFERENCES colonies(id),
        PRIMARY KEY (section_id, colony_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_territory (
        contact_id uuid PRIMARY KEY REFERENCES contacts(id),
        colony_id uuid NOT NULL REFERENCES colonies(id),
        territory_status text NOT NULL,
        linked_by_user_id uuid NOT NULL REFERENCES user_profiles(id),
        linked_at timestamp with time zone NOT NULL,
        version integer NOT NULL DEFAULT 1,
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_assignments (
        contact_id uuid PRIMARY KEY REFERENCES contacts(id),
        assigned_user_id uuid NOT NULL REFERENCES user_profiles(id),
        assignment_status text NOT NULL,
        assigned_by_user_id uuid NOT NULL REFERENCES user_profiles(id),
        assigned_at timestamp with time zone NOT NULL,
        version integer NOT NULL DEFAULT 1,
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS visit_results (
        visit_id uuid PRIMARY KEY REFERENCES visits(id),
        structured_outcome text NOT NULL,
        summary text NOT NULL,
        completed_by_user_id uuid NOT NULL REFERENCES user_profiles(id),
        completed_at timestamp with time zone NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS walking_skeleton_projection_v1 (
        projection_key text PRIMARY KEY,
        contact_registered_count integer NOT NULL DEFAULT 0,
        contact_linked_count integer NOT NULL DEFAULT 0,
        responsible_assigned_count integer NOT NULL DEFAULT 0,
        visit_scheduled_count integer NOT NULL DEFAULT 0,
        visit_completed_count integer NOT NULL DEFAULT 0,
        last_event_at timestamp with time zone,
        version integer NOT NULL DEFAULT 1,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        actor_user_id uuid NOT NULL REFERENCES user_profiles(id),
        action text NOT NULL,
        entity_type text NOT NULL,
        entity_id uuid NOT NULL,
        before_data jsonb,
        after_data jsonb,
        correlation_id text NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now()
      );
    `);

    // 1. Fetch some dependencies
    const usersRes = await pool.query("SELECT id FROM user_profiles LIMIT 10");
    const users = usersRes.rows.map(r => r.id);
    if (users.length === 0) throw new Error("No users found to assign data to.");
    const adminUser = users[0];

    const coloniesRes = await pool.query("SELECT id FROM colonies LIMIT 10");
    const colonies = coloniesRes.rows.map(r => r.id);
    
    // CRM Contacts
    console.log("Seeding CRM contacts...");
    for (let i = 1; i <= 30; i++) {
      const contactId = crypto.randomUUID();
      await pool.query(`
        INSERT INTO contacts (id, display_name, created_by_user_id, created_at, phone, colony, profession, skill)
        VALUES ($1, $2, $3, now(), $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [
        contactId,
        `Ciudadano de Prueba ${i}`,
        adminUser,
        `555-000-${i.toString().padStart(2, '0')}`,
        i % 2 === 0 ? "Centro" : "Jalisco",
        i % 3 === 0 ? "Comerciante" : "Maestro",
        i % 4 === 0 ? "Logística" : "Activismo"
      ]);
    }

    // Map Event Reports
    console.log("Seeding map event reports...");
    const categories = ['emergencia', 'incidencia', 'mitin', 'propaganda', 'servicios', 'sospechoso', 'brigada'];
    for (let i = 1; i <= 15; i++) {
      // Tonalá coordinates approx: 20.624, -103.24
      const lat = 20.624 + (Math.random() - 0.5) * 0.05;
      const lng = -103.24 + (Math.random() - 0.5) * 0.05;
      const cat = categories[i % categories.length];
      await pool.query(`
        INSERT INTO event_reports (title, description, latitude, longitude, category, created_by_user_id)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        `Reporte de prueba ${i}`,
        `Descripción autogenerada para el evento ${i}`,
        lat,
        lng,
        cat,
        adminUser
      ]);
    }

    // Teams
    console.log("Seeding teams...");
    const teamId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO teams (id, name, leader_id, zone)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO NOTHING
    `, [teamId, "Brigada Tonalá Centro", adminUser, "Centro"]);

    for (const userId of users.slice(0, 3)) {
      await pool.query(`
        INSERT INTO team_members (team_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [teamId, userId]);
    }

    // Electoral Sections
    console.log("Seeding electoral sections...");
    for (let i = 1; i <= 5; i++) {
      const sectionNum = 1000 + i;
      const sectionId = crypto.randomUUID();
      try {
        await pool.query(`
          INSERT INTO electoral_sections (id, section_num)
          VALUES ($1, $2)
          ON CONFLICT (section_num) DO NOTHING
        `, [sectionId, sectionNum]);
        
        // Add a representative
        const sectionRes = await pool.query("SELECT id FROM electoral_sections WHERE section_num = $1", [sectionNum]);
        const dbSectionId = sectionRes.rows[0].id;
        
        await pool.query(`
          INSERT INTO electoral_representatives (section_id, user_id, role)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
        `, [dbSectionId, users[i % users.length], i % 2 === 0 ? "RC" : "RG"]);
      } catch (err: any) {
        if(err.code !== '23505') console.warn("Section insert issue:", err.message);
      }
    }

    // section_colonies
    console.log("Seeding section_colonies...");
    for (let i = 1; i <= 5; i++) {
      const sectionNum = 1000 + i;
      const sectionRes = await pool.query("SELECT id FROM electoral_sections WHERE section_num = $1", [sectionNum]);
      if (sectionRes.rows.length > 0) {
        const dbSectionId = sectionRes.rows[0].id;
        await pool.query(`
          INSERT INTO section_colonies (section_id, colony_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [dbSectionId, colonies[i % colonies.length]]);
      }
    }

    // contact_territory and contact_assignments
    console.log("Seeding contact territory and assignments...");
    const allContactsRes = await pool.query("SELECT id FROM contacts");
    let cIndex = 0;
    for (const contact of allContactsRes.rows) {
      cIndex++;
      if (cIndex % 2 === 0) {
        await pool.query(`
          INSERT INTO contact_territory (contact_id, colony_id, territory_status, linked_by_user_id, linked_at, updated_at)
          VALUES ($1, $2, 'confirmed', $3, now(), now())
          ON CONFLICT DO NOTHING
        `, [contact.id, colonies[cIndex % colonies.length], adminUser]);
      }
      if (cIndex % 3 === 0) {
        await pool.query(`
          INSERT INTO contact_assignments (contact_id, assigned_user_id, assignment_status, assigned_by_user_id, assigned_at, updated_at)
          VALUES ($1, $2, 'active', $3, now(), now())
          ON CONFLICT DO NOTHING
        `, [contact.id, users[cIndex % users.length], adminUser]);
      }
    }

    // Visits (Agenda) & visit_results
    console.log("Seeding visits (agenda) and visit results...");
    if (colonies.length > 0) {
      const contactsRes = await pool.query("SELECT id FROM contacts LIMIT 15");
      let vIndex = 0;
      for (const contact of contactsRes.rows) {
        vIndex++;
        const visitId = crypto.randomUUID();
        const status = vIndex % 2 === 0 ? "completed" : "scheduled";
        await pool.query(`
          INSERT INTO visits (id, contact_id, colony_id, assigned_user_id, scheduled_at, status, visit_location_text, created_by_user_id, created_at, completed_at, completed_by_user_id)
          VALUES ($1, $2, $3, $4, now() + interval '1 day', $5, $6, $7, now(), $8, $9)
          ON CONFLICT (id) DO NOTHING
        `, [
          visitId, 
          contact.id, 
          colonies[0], 
          users[vIndex % users.length], 
          status, 
          "Domicilio conocido", 
          adminUser,
          status === "completed" ? new Date() : null,
          status === "completed" ? adminUser : null
        ]);

        if (status === "completed") {
          const outcomes = ['successful', 'no_contact', 'follow_up_required', 'rejected'];
          await pool.query(`
            INSERT INTO visit_results (visit_id, structured_outcome, summary, completed_by_user_id, completed_at)
            VALUES ($1, $2, $3, $4, now())
            ON CONFLICT DO NOTHING
          `, [visitId, outcomes[vIndex % outcomes.length], "Resumen de visita autogenerado", adminUser]);
        }
      }
    }

    // Audit Logs
    console.log("Seeding audit logs...");
    for (let i = 1; i <= 20; i++) {
      const actions = ["CREATE", "UPDATE", "DELETE", "LOGIN"];
      const entities = ["contact", "visit", "user_profile", "team", "event_report"];
      await pool.query(`
        INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, correlation_id, created_at)
        VALUES ($1, $2, $3, $4, $5, now() - interval '${Math.floor(Math.random() * 48)} hours')
      `, [
        users[i % users.length],
        actions[i % actions.length],
        entities[i % entities.length],
        crypto.randomUUID(),
        `corr-${i}`
      ]);
    }

    // walking_skeleton_projection_v1
    console.log("Seeding walking skeleton projection...");
    await pool.query(`
      INSERT INTO walking_skeleton_projection_v1 (
        projection_key, 
        contact_registered_count, 
        contact_linked_count, 
        responsible_assigned_count, 
        visit_scheduled_count, 
        visit_completed_count
      )
      VALUES ('global', 30, 15, 10, 8, 7)
      ON CONFLICT (projection_key) DO UPDATE SET
        contact_registered_count = 30,
        contact_linked_count = 15,
        responsible_assigned_count = 10,
        visit_scheduled_count = 8,
        visit_completed_count = 7
    `);

    console.log("Mock data seed completed successfully!");
  } catch (error) {
    console.error("Error seeding mock data:", error);
  } finally {
    await pool.end();
  }
}

seedMockData();
