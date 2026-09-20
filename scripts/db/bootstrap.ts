import "dotenv/config";

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

import pg from "pg";

import { loadAppEnv } from "../../packages/config/index.js";

/**
 * Arranque de una base nueva, de principio a fin.
 *
 * Las migraciones crean las 34 tablas pero no insertan una sola fila: en una base recién
 * migrada quedan cero roles, y como `user_profiles.role_id` es obligatorio y apunta al catálogo
 * de roles, nadie puede ni registrarse ni entrar. La cartografía tampoco viene en las
 * migraciones, así que el mapa abre en blanco. Es decir: `pnpm db:migrate` por sí solo deja un
 * sistema que no se puede usar, y los pasos que faltaban vivían en la cabeza de quien desplegó
 * la última vez.
 *
 * Esto los deja escritos y en orden:
 *
 *   1. Migraciones              -> el esquema.
 *   2. Catálogos y cuenta madre -> roles, colonias, secciones del AMG y el administrador.
 *   3. Cartografía del INE      -> los 3,787 contornos de Jalisco.
 *   4. Atlas del Distrito 10    -> prioridades y votos por sección (opcional).
 *
 * Uso:  pnpm db:bootstrap
 *
 * Sobre una base que ya tiene gente dentro se queda en el paso 1, porque el paso 2 borra los
 * perfiles de usuario: así el mismo comando sirve para desplegar sobre una base en uso (solo
 * migra) y para levantar una nueva. Para rehacer una a propósito: `FORZAR=si pnpm db:bootstrap`.
 */

const PASOS = {
  migraciones: "scripts/db/migrate.ts",
  catalogos: "scripts/db/clean-production.ts",
  cartografia: "scripts/db/load-jalisco-cartography.ts",
  atlas: "scripts/db/load-atlas-distrito-10.ts"
} as const;

/** Donde el cargador del atlas espera el archivo; si no está, ese paso se salta. */
const ATLAS = process.env.ATLAS_ARCHIVO || "scripts/local/atlas-distrito-10.json";

function correr(titulo: string, archivo: string): void {
  console.log(`\n=== ${titulo} ===`);
  // Se reenvía `--yes` a cada paso: la confirmación de verdad la sigue exigiendo cada script,
  // que compara CONFIRM_DB con el nombre de la base cuando el host no es local. Así este
  // arranque no se salta ninguna guarda; solo evita tener que escribirla cuatro veces.
  const r = spawnSync("npx", ["tsx", archivo, "--yes"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
  });
  if (r.status !== 0) {
    throw new Error(`El paso "${titulo}" falló (código ${r.status}). El arranque se detiene aquí.`);
  }
}

async function estado(databaseUrl: string) {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const { rows } = await pool.query<{ usuarios: number; roles: number; secciones: number; atlas: number }>(`
      SELECT
        (SELECT count(*)::int FROM user_profiles)                                  AS usuarios,
        (SELECT count(*)::int FROM roles)                                          AS roles,
        (SELECT count(*)::int FROM electoral_sections WHERE geom_json IS NOT NULL) AS secciones,
        (SELECT count(*)::int FROM section_electoral_results)                      AS atlas
    `);
    return rows[0]!;
  } finally {
    await pool.end();
  }
}

async function main() {
  const env = loadAppEnv();
  const url = env.private.DATABASE_URL;

  correr("1/4 Migraciones", PASOS.migraciones);

  const antes = await estado(url);
  console.log(
    `\nEstado tras migrar: ${antes.usuarios} usuarios, ${antes.roles} roles, ` +
      `${antes.secciones} secciones con contorno, ${antes.atlas} fichas de atlas.`
  );

  if (antes.usuarios > 0 && process.env.FORZAR !== "si") {
    console.log(
      "\nLa base ya tiene usuarios: no se tocan los catálogos ni las cuentas.\n" +
        "El esquema quedó al día, que es lo que necesita un despliegue sobre una base en uso.\n" +
        "Para rehacerla desde cero a propósito: FORZAR=si pnpm db:bootstrap"
    );
    return;
  }

  correr("2/4 Catálogos, secciones del AMG y cuenta de administración", PASOS.catalogos);
  correr("3/4 Cartografía oficial de Jalisco", PASOS.cartografia);

  if (existsSync(ATLAS)) {
    correr("4/4 Atlas del Distrito 10", PASOS.atlas);
  } else {
    console.log(
      `\n=== 4/4 Atlas del Distrito 10 ===\nNo hay archivo en "${ATLAS}": se salta.\n` +
        "El sistema funciona sin él; el mapa solo se queda sin prioridades ni votos por sección.\n" +
        "Para cargarlo después: copia el archivo ahí y corre `pnpm db:load-atlas`."
    );
  }

  const despues = await estado(url);
  console.log(
    `\nListo. ${despues.usuarios} usuario(s), ${despues.roles} roles, ` +
      `${despues.secciones} secciones con contorno y ${despues.atlas} fichas de atlas.`
  );
  if (despues.roles === 0 || despues.secciones === 0) {
    throw new Error("El arranque terminó sin roles o sin cartografía: revisa la salida de los pasos anteriores.");
  }
}

main().catch((error: unknown) => {
  console.error("\nArranque interrumpido:", error instanceof Error ? error.message : error);
  process.exit(1);
});
