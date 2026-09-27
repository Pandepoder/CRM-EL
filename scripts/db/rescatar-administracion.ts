import "dotenv/config";
import { parseArgs } from "node:util";

import pg from "pg";

import { loadAppEnv } from "../../packages/config/index.js";
import { confirmDestructiveOperation } from "./confirm-destructive.js";
import { ErrorDeRescate, rescatar } from "./administracion.js";

/**
 * Rescate de administración desde el servidor (etapa 6, tercer nivel de recuperación).
 *
 * Es la salida cuando nadie puede arreglarlo desde la aplicación: se perdió el acceso al propio
 * administrador maestro, o hay que nombrar uno. Todo queda en `audit_logs` sin autor («consola del
 * servidor»). En un servidor que no es local pide escribir el nombre de la base para confirmar.
 *
 *   pnpm admin:rescatar --email <correo> --maestro [--reemplazar]
 *   pnpm admin:rescatar --email <correo> --municipio "Tonalá"
 *   pnpm admin:rescatar --email <correo> --reactivar
 *   pnpm admin:rescatar --email <correo> --contrasena-temporal
 *   pnpm admin:rescatar --email <correo> --cerrar-sesiones
 *
 * En producción: `docker compose run --rm migrate pnpm admin:rescatar --email … --maestro`.
 */

const AYUDA = `Uso: pnpm admin:rescatar --email <correo> [opciones]

  --maestro              La nombra administradora maestra (activa, sin municipio).
  --reemplazar           Con --maestro, si ya hay otro: ese pierde la marca y queda dado de baja.
  --municipio "<nombre>" La nombra administradora de ese municipio (activa).
  --reactivar            Reactiva la cuenta.
  --contrasena-temporal  Le pone una contraseña nueva, que se muestra aquí una sola vez.
  --cerrar-sesiones      Cierra sus sesiones abiertas.`;

async function main() {
  // `pnpm admin:rescatar -- --email …` también vale: el `--` suelto no es una opción.
  const argumentos = process.argv.slice(2).filter((a, i) => !(i === 0 && a === "--"));
  const { values } = parseArgs({
    args: argumentos,
    options: {
      email: { type: "string" },
      maestro: { type: "boolean" },
      reemplazar: { type: "boolean" },
      municipio: { type: "string" },
      reactivar: { type: "boolean" },
      "contrasena-temporal": { type: "boolean" },
      "cerrar-sesiones": { type: "boolean" },
      yes: { type: "boolean" },
      help: { type: "boolean" }
    },
    allowPositionals: false
  });

  const pideAlgo = values.maestro || values.municipio || values.reactivar || values["contrasena-temporal"] || values["cerrar-sesiones"];
  if (values.help || !values.email || !pideAlgo) {
    // Antes de tocar la base, ni siquiera para confirmar: sin una orden no hay nada que hacer.
    console.log(AYUDA);
    process.exit(values.help ? 0 : 1);
  }

  const env = loadAppEnv();
  await confirmDestructiveOperation({
    databaseUrl: env.private.DATABASE_URL,
    actionLabel: "cambiar la administración de una cuenta (rol, estado, contraseña o sesiones)"
  });

  const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });
  try {
    const resultado = await rescatar(pool, {
      correo: values.email,
      ...(values.maestro ? { maestro: true } : {}),
      ...(values.reemplazar ? { reemplazar: true } : {}),
      ...(values.municipio ? { municipio: values.municipio } : {}),
      ...(values.reactivar ? { reactivar: true } : {}),
      ...(values["contrasena-temporal"] ? { contrasenaTemporal: true } : {}),
      ...(values["cerrar-sesiones"] ? { cerrarSesiones: true } : {})
    });
    console.log(`✅ ${resultado.persona}`);
    for (const linea of resultado.hecho) console.log(`   · ${linea}`);
    if (resultado.contrasena) {
      console.log("");
      console.log(`   Contraseña temporal: ${resultado.contrasena}`);
      console.log("   No se guarda en ningún otro lado: si se pierde, repite la orden.");
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  if (error instanceof ErrorDeRescate) {
    console.error(`❌ ${error.message}`);
  } else {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  }
  process.exit(1);
});
