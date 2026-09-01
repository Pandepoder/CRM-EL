import "dotenv/config";
import pg from "pg";
import argon2 from "argon2";
import { loadAppEnv } from "../../packages/config/index.js";
import { roleSeeds, catalogSeed, colonySeeds } from "./seed-data.js";
import { METROPOLITAN_SECTIONS } from "./generate-metropolitan-sections.js";
import { boundsToRealisticPolygon } from "./generate-official-sections.js";
import { confirmDestructiveOperation } from "./confirm-destructive.js";

/**
 * Clean Production Database Seeder
 * Leaves the database completely pristine for a real election/campaign deployment:
 * - Cleans test incidents, test contacts, test visits, test outbox, and mock accounts.
 * - Seeds all official system roles.
 * - Seeds official INE Metropolitan Sections (Tonalá, GDL, Zapopan, Tlaquepaque, etc.) & Colonies.
 * - Creates 1 single Master Admin account configured via ADMIN_EMAIL / ADMIN_PASSWORD.
 */
async function cleanProductionDatabase() {
  console.log("🧹 Iniciando limpieza y preparación para PRODUCCIÓN...");
  const env = loadAppEnv();

  await confirmDestructiveOperation({
    databaseUrl: env.private.DATABASE_URL,
    actionLabel:
      "TRUNCAR contactos, visitas, incidencias, equipos, inbox e inventario, y borrar TODOS los perfiles de usuario"
  });

  const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });

  try {
    await pool.query("BEGIN");

    console.log("1. Vaciando datos transaccionales de prueba...");
    await pool.query(`
      TRUNCATE TABLE 
        visit_results,
        visits,
        contact_assignments,
        contact_territory,
        contacts,
        event_reports,
        electoral_representatives,
        team_members,
        teams,
        inbox_messages,
        inbox_conversations,
        inventory_transactions,
        inventory_items,
        warehouses,
        transactional_outbox,
        processed_event_log,
        walking_skeleton_projection_v1
      CASCADE;
    `);

    console.log("2. Sembrando roles de seguridad del sistema...");
    for (const role of roleSeeds) {
      await pool.query(
        `
          INSERT INTO roles (key, name)
          VALUES ($1, $2)
          ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name
        `,
        [role.key, role.name]
      );
    }

    console.log("3. Sembrando catálogo base de colonias...");
    const catalog = await pool.query<{ id: string }>(
      `
        INSERT INTO catalog_versions (catalog_type, source_name, source_version)
        VALUES ($1, $2, $3)
        ON CONFLICT (catalog_type, source_name, source_version)
        DO UPDATE SET imported_at = catalog_versions.imported_at
        RETURNING id
      `,
      [catalogSeed.catalogType, catalogSeed.sourceName, catalogSeed.sourceVersion]
    );
    const catalogVersionId = catalog.rows[0]?.id;

    const colonyIdMap = new Map<string, string>();
    for (const colony of colonySeeds) {
      const res = await pool.query<{ id: string }>(
        `
          INSERT INTO colonies (catalog_version_id, name, postal_code, municipality)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (catalog_version_id, name) DO UPDATE 
          SET status = 'active', postal_code = EXCLUDED.postal_code, municipality = EXCLUDED.municipality
          RETURNING id
        `,
        [catalogVersionId, colony.name, colony.postalCode, colony.municipality]
      );
      if (res.rows[0]) {
        colonyIdMap.set(colony.name, res.rows[0].id);
      }
    }

    console.log("4. Sembrando secciones electorales oficiales del AMG...");
    for (const sec of METROPOLITAN_SECTIONS) {
      const poly = boundsToRealisticPolygon(sec.sectionNum, sec.bounds);
      const secRes = await pool.query<{ id: string }>(
        `
          INSERT INTO electoral_sections (section_num, geom_json)
          VALUES ($1, $2)
          ON CONFLICT (section_num) DO UPDATE 
          SET geom_json = EXCLUDED.geom_json
          RETURNING id
        `,
        [sec.sectionNum, JSON.stringify(poly)]
      );
      const sectionId = secRes.rows[0]?.id;
      if (sectionId && sec.colonies) {
        for (const colonyName of sec.colonies) {
          const colId = colonyIdMap.get(colonyName);
          if (colId) {
            await pool.query(
              `
                INSERT INTO section_colonies (section_id, colony_id)
                VALUES ($1, $2)
                ON CONFLICT (section_id, colony_id) DO NOTHING
              `,
              [sectionId, colId]
            );
          }
        }
      }
    }

    console.log("5. Creando cuenta de Administrador Maestro...");
    const adminEmail = process.env.ADMIN_EMAIL || "admin@tonala.gob.mx";
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.DEMO_PASSWORD;
    if (!adminPassword) {
      throw new Error(
        "ADMIN_PASSWORD (or DEMO_PASSWORD) must be set — refusing to seed the master admin account with a default password."
      );
    }
    const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });

    // Delete existing non-admin profiles to ensure clean slate
    await pool.query("DELETE FROM user_profiles;");

    await pool.query(
      `
        INSERT INTO user_profiles (email, display_name, role_id, password_hash)
        SELECT $1, $2, roles.id, $3
        FROM roles
        WHERE roles.key = 'admin'
      `,
      [adminEmail, "Administrador Maestro", passwordHash]
    );

    await pool.query("COMMIT");
    console.log("=================================================");
    console.log("✅ BASE DE DATOS LISTA Y LIMPIA PARA PRODUCCIÓN");
    console.log(`👤 Usuario Admin: ${adminEmail}`);
    console.log(`🔑 Contraseña: (configurada en variables de entorno)`);
    console.log("=================================================");
  } catch (err) {
    await pool.query("ROLLBACK");
    console.error("❌ Error al limpiar base de datos:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanProductionDatabase().catch((err) => {
  console.error(`❌ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
