import argon2 from "argon2";
import { randomBytes } from "node:crypto";
import pg from "pg";

import { confirmDestructiveOperation } from "./confirm-destructive.js";
import { catalogSeed, colonySeeds, userSeeds, roleSeeds, electoralSectionSeeds } from "./seed-data.js";

export type SeedResult = {
  readonly roles: number;
  readonly users: number;
  readonly colonies: number;
  /** Contrasena con la que quedaron los usuarios sembrados, para poder entrar en local. */
  readonly userPassword: string;
};

type CountRow = {
  readonly count: string;
};

async function countTable(pool: pg.Pool, table: string): Promise<number> {
  const result = await pool.query<CountRow>(`SELECT COUNT(*)::text AS count FROM ${table}`);
  return Number(result.rows[0]?.count ?? 0);
}

/**
 * Contrasena de los usuarios que crea la semilla.
 *
 * Aleatoria por omision, distinta en cada ejecucion, y devuelta en el resultado para que
 * quien siembre en local pueda entrar. No hay valor compartido en el repositorio ni en la
 * configuracion: antes existia DEMO_PASSWORD, presente en .env, CI, Dockerfile,
 * docker-compose y el despliegue, y eso era exactamente lo que habia que blindar, rotar y
 * vigilar. Un secreto que no existe no se filtra.
 *
 * SEED_USER_PASSWORD permite fijarla cuando hace falta repetibilidad, por ejemplo para
 * los scripts sueltos de scripts/ que entran por HTTP.
 */
function resolveSeedPassword(): string {
  const fijada = process.env.SEED_USER_PASSWORD?.trim();
  if (fijada) return fijada;
  return randomBytes(18).toString("base64url");
}

export async function seedDatabase(connectionString: string): Promise<SeedResult> {
  const userPassword = resolveSeedPassword();

  // El upsert de mas abajo reescribe password_hash, asi que sembrar sobre una base que ya
  // tenga usuarios con esos correos les cambia la contrasena. confirmDestructiveOperation
  // decide segun el host de DATABASE_URL, no segun una etiqueta de entorno: localhost pasa
  // sin ruido y cualquier host remoto exige confirmar el nombre exacto de la base. Es el
  // mismo control que ya usaban db:clean y db:reset.
  await confirmDestructiveOperation({
    databaseUrl: connectionString,
    actionLabel:
      "SEMBRAR usuarios de prueba, reescribiendo la contrasena de cualquier usuario que ya " +
      "exista con esos correos"
  });

  const pool = new pg.Pool({ connectionString });

  try {
    await pool.query("BEGIN");

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
    if (!catalogVersionId) {
      throw new Error("Catalog version seed did not return an id");
    }

    const colonyIdMap = new Map<string, string>();

    for (const colony of colonySeeds) {
      const res = await pool.query<{ id: string }>(
        `
          INSERT INTO colonies (catalog_version_id, name, postal_code, municipality)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (catalog_version_id, name, municipality) DO UPDATE 
          SET status = 'active', postal_code = EXCLUDED.postal_code, municipality = EXCLUDED.municipality
          RETURNING id
        `,
        [catalogVersionId, colony.name, colony.postalCode, colony.municipality]
      );
      if (res.rows[0]) {
        colonyIdMap.set(colony.name, res.rows[0].id);
      }
    }

    for (const section of electoralSectionSeeds) {
      const secRes = await pool.query<{ id: string }>(
        `
          INSERT INTO electoral_sections (section_num, municipality, geom_json)
          VALUES ($1, $2, $3)
          ON CONFLICT (section_num) DO UPDATE 
          SET municipality = EXCLUDED.municipality,
              geom_json = EXCLUDED.geom_json
          RETURNING id
        `,
        [section.sectionNum, section.municipality, JSON.stringify(section.geom)]
      );
      
      const sectionId = secRes.rows[0]?.id;
      if (sectionId) {
        for (const colonyName of section.colonies) {
          const colonyId = colonyIdMap.get(colonyName);
          if (colonyId) {
            await pool.query(
              `
                INSERT INTO section_colonies (section_id, colony_id)
                VALUES ($1, $2)
                ON CONFLICT (section_id, colony_id) DO NOTHING
              `,
              [sectionId, colonyId]
            );
          }
        }
      }
    }

    // Hashear la contraseña una sola vez antes de la transacción.
    // argon2id es intencionalmente lento: hacerlo dentro del transaction
    // mantendría el lock de BD durante ~200ms por usuario.
    const passwordHash = await argon2.hash(userPassword, { type: argon2.argon2id });

    for (const user of userSeeds) {
      await pool.query(
        `
          INSERT INTO user_profiles (email, display_name, role_id, password_hash)
          SELECT $1, $2, roles.id, $4
          FROM roles
          WHERE roles.key = $3
          ON CONFLICT (email) DO UPDATE
          SET display_name    = EXCLUDED.display_name,
              role_id         = EXCLUDED.role_id,
              password_hash   = EXCLUDED.password_hash,
              updated_at      = now(),
              version         = user_profiles.version + 1
        `,
        [user.email, user.displayName, user.roleKey, passwordHash]
      );
    }

    await pool.query("COMMIT");

    return {
      roles: await countTable(pool, "roles"),
      users: await countTable(pool, "user_profiles"),
      colonies: await countTable(pool, "colonies"),
      userPassword
    };
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally {
    await pool.end();
  }
}
