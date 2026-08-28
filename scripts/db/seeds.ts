import argon2 from "argon2";
import pg from "pg";

import { catalogSeed, colonySeeds, demoUserSeeds, roleSeeds, electoralSectionSeeds } from "./seed-data.js";

export type SeedResult = {
  readonly roles: number;
  readonly users: number;
  readonly colonies: number;
};

type CountRow = {
  readonly count: string;
};

async function countTable(pool: pg.Pool, table: string): Promise<number> {
  const result = await pool.query<CountRow>(`SELECT COUNT(*)::text AS count FROM ${table}`);
  return Number(result.rows[0]?.count ?? 0);
}

export async function seedDatabase(connectionString: string): Promise<SeedResult> {
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

    for (const section of electoralSectionSeeds) {
      const secRes = await pool.query<{ id: string }>(
        `
          INSERT INTO electoral_sections (section_num, geom_json)
          VALUES ($1, $2)
          ON CONFLICT (section_num) DO UPDATE 
          SET geom_json = EXCLUDED.geom_json
          RETURNING id
        `,
        [section.sectionNum, JSON.stringify(section.geom)]
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

    // Hashear la contraseña demo una vez antes de la transacción.
    // argon2id es intencionalmente lento: hacerlo dentro del transaction
    // mantendría el lock de BD durante ~200ms por usuario.
    const demoPassword = process.env.DEMO_PASSWORD ?? "TonalaDemo2026";
    const passwordHash = await argon2.hash(demoPassword, { type: argon2.argon2id });

    for (const user of demoUserSeeds) {
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
      colonies: await countTable(pool, "colonies")
    };
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally {
    await pool.end();
  }
}
