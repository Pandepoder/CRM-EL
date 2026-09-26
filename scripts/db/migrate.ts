import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { loadAppEnv } from "../../packages/config/index.js";
import { asegurarCorreoUnicoSinMayusculas, rellenarHuellasDeTelefono } from "./backfill-phone-hash.js";
import { consultaDeConteoEnGeneral, TABLAS_CON_MUNICIPIO } from "../../packages/shared/database/municipios.js";
import { estadoDeAdministracion, nombrarMaestroSiFalta, type ResultadoDelMaestro } from "./administracion.js";

export async function applyMigrations(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./db/migrations" });
  await pool.end();
  return ["0000_tonala_os_initial.sql"];
}

/**
 * Lo que la base necesita después de las migraciones y que no se puede hacer en SQL porque
 * requiere la llave de cifrado. Va aquí, y no dentro de `applyMigrations`, porque esa función la
 * usan las pruebas de integración con bases de prueba recién creadas.
 *
 * En producción lo corre el servicio `migrate` en cada despliegue, así que no hay ningún paso a
 * mano: si una migración deja filas pendientes, el mismo despliegue las completa.
 */
async function tareasPosteriores(connectionString: string) {
  const pool = new pg.Pool({ connectionString });
  try {
    const huellas = await rellenarHuellasDeTelefono(pool);
    console.log("Huellas de teléfono:", huellas);
    if (huellas.ilegibles > 0) {
      console.warn(
        `  ${huellas.ilegibles} teléfono(s) no se pudieron descifrar con la llave actual y quedan sin huella. ` +
          "El alta pública los sigue revisando aparte; revisa si se cifraron con otra llave."
      );
    }

    const repetidos = await asegurarCorreoUnicoSinMayusculas(pool);
    if (repetidos.length > 0) {
      console.warn(
        `  ${repetidos.length} correo(s) se repiten si se ignoran las mayúsculas, así que el índice sobre ` +
          "lower(email) quedó NO único. Une o corrige esas cuentas y vuelve a correr `pnpm db:migrate`: " +
          "el índice único se crea solo en cuanto no quede ninguno."
      );
      for (const correo of repetidos) console.warn(`    - ${correo}`);
    }

    // El maestro primero: está en General a propósito y no cuenta como «sin municipio».
    const nombramiento = await nombrarMaestroSiFalta(pool, process.env.ADMIN_EMAIL);
    await informarLlaveDeMunicipio(pool);
    await informarAdministracion(pool, nombramiento);
  } finally {
    await pool.end();
  }
}

/**
 * Informe de la llave de municipio (migración 0022): cuántas filas de cada tabla quedaron en General.
 *
 * No detiene el despliegue. La migración sí se detiene ante un error de estructura —una sección con un
 * municipio fuera del catálogo—; pero mucho en General es un problema de datos, y la pantalla para
 * corregirlo (Configuración → Sin municipio) llega en este mismo despliegue: detenerlo impediría
 * arreglarlo. Se avisa fuerte y se sigue.
 */
/**
 * Etapa 6. La primera vez nombra administrador maestro a la cuenta de ADMIN_EMAIL (la del
 * «Administrador Maestro» de `pnpm db:clean`), si es una cuenta de administración activa. Después
 * informa lo que el maestro tiene que atender: administradores sin municipio, que no ven nada hasta que
 * se lo asigna, y municipios con gente activa sin ningún administrador.
 */
async function informarAdministracion(pool: pg.Pool, nombramiento: ResultadoDelMaestro) {
  if (nombramiento.estado === "nombrado") {
    console.log(`Administrador maestro: ${nombramiento.nombre} (la cuenta de ADMIN_EMAIL). Se nombró ahora.`);
  } else if (nombramiento.estado === "ya_habia") {
    console.log(`Administrador maestro: ${nombramiento.nombre}.`);
  } else {
    console.warn(
      "  ⚠ NO HAY ADMINISTRADOR MAESTRO: nadie puede crear ni gobernar administradores desde la aplicación. " +
        (nombramiento.estado === "sin_variable"
          ? "ADMIN_EMAIL no está definida. "
          : "ADMIN_EMAIL no corresponde a una cuenta de administración activa. ") +
        "Nómbralo con: pnpm admin:rescatar --email <correo> --maestro"
    );
  }

  const estado = await estadoDeAdministracion(pool);
  if (estado.administradoresSinMunicipio > 0) {
    console.warn(
      `  ${estado.administradoresSinMunicipio} administrador(es) sin municipio: no ven nada del padrón hasta que el ` +
        "maestro les asigne uno en Configuración → Administración por municipio."
    );
  }
  if (estado.municipiosSinAdministracion.length > 0) {
    console.log(`  Municipios con gente activa y sin administrador activo: ${estado.municipiosSinAdministracion.join(", ")}.`);
  }
}

async function informarLlaveDeMunicipio(pool: pg.Pool) {
  const { rows } = await pool.query<{ clave: string; total: number; en_general: number }>(consultaDeConteoEnGeneral());
  const enGeneral = rows.reduce((n, r) => n + r.en_general, 0);
  console.log(`Llave de municipio: ${enGeneral} fila(s) en General.`);
  for (const r of rows) {
    if (r.en_general === 0) continue;
    const etiqueta = TABLAS_CON_MUNICIPIO.find((t) => t.clave === r.clave)?.etiqueta ?? r.clave;
    const parte = r.total > 0 ? Math.round((r.en_general / r.total) * 100) : 0;
    const linea = `    ${etiqueta}: ${r.en_general} de ${r.total} (${parte} %)`;
    if (r.total >= 20 && parte >= 25) console.warn(`${linea}  ← revisa: es mucho para quedar sin municipio`);
    else console.log(linea);
  }
  if (enGeneral > 0) console.log("  Se asignan en Configuración → Sin municipio.");
}

if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  const env = loadAppEnv();
  applyMigrations(env.private.DATABASE_URL)
    .then(() => tareasPosteriores(env.private.DATABASE_URL))
    .then(() => {
      console.log("Migrations complete!");
      process.exit(0);
    })
    .catch((e) => {
      console.error("Migration failed:", e);
      process.exit(1);
    });
}
