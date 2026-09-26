import { sql } from "drizzle-orm";

import { estadoDelCifrado } from "@tonala/shared/database";

import { getDatabaseClient } from "@/lib/db-client";
import { registrar } from "@/lib/registro";

// El journal de migraciones se empaqueta con la aplicación al compilar. Así el código sabe
// exactamente qué esquema espera —el de la versión que se desplegó— sin leer archivos al vuelo.
import journal from "../../../../db/migrations/meta/_journal.json";

/**
 * Estado del sistema: lo que el healthcheck informa y lo que se revisa al arrancar.
 *
 * Motivo: con la base dos migraciones por detrás del código, `/resumen` se caía con un 500 y el
 * texto crudo de Next, y nada decía por qué. La causa —`column x.visit_id does not exist`— solo
 * aparecía enterrada en el registro del servidor. El healthcheck solo hacía `SELECT 1`, que
 * respondía bien. Ahora la aplicación compara el esquema que espera con el que encuentra.
 */

export type EstadoDeMigraciones = Readonly<{ esperadas: number; pendientes: string[] }>;

/** Código de error de Postgres, venga directo de `pg` o envuelto por Drizzle en `cause`. */
function codigoDePostgres(error: unknown): string | undefined {
  const e = error as { code?: string; cause?: { code?: string } } | null;
  return e?.code ?? e?.cause?.code;
}

/**
 * La regla del migrador de Drizzle, sin base de por medio: una migración está pendiente si su
 * `when` es mayor que el último `created_at` registrado (comprobado en su código:
 * `lastDbMigration.created_at < migration.folderMillis`). Sin ninguna registrada, faltan todas.
 */
export function migracionesPendientes(
  esperadas: ReadonlyArray<{ tag: string; when: number }>,
  ultimaAplicada: number | null
): string[] {
  return esperadas.filter((m) => ultimaAplicada === null || m.when > ultimaAplicada).map((m) => m.tag);
}

/** Qué migraciones del journal empaquetado no están aplicadas en la base a la que se conecta. */
export async function revisarMigraciones(): Promise<EstadoDeMigraciones> {
  const esperadas = journal.entries;
  let ultimaAplicada: number | null = null;
  try {
    const { rows } = await getDatabaseClient().execute<{ ultima: string | null }>(
      sql`SELECT max(created_at)::text AS ultima FROM drizzle.__drizzle_migrations`
    );
    ultimaAplicada = rows[0]?.ultima ? Number(rows[0].ultima) : null;
  } catch (error) {
    // Sin la tabla de control (42P01), no se ha aplicado ninguna migración. Otro error —la base
    // caída, por ejemplo— no es "faltan migraciones" y sube tal cual.
    if (codigoDePostgres(error) !== "42P01") throw error;
  }
  return { esperadas: esperadas.length, pendientes: migracionesPendientes(esperadas, ultimaAplicada) };
}

export type EstadoDelSistema = Readonly<{
  estado: "ok" | "degradado" | "error";
  base: { ok: boolean; latenciaMs: number | null };
  migraciones: EstadoDeMigraciones | null;
  outbox: { atascados: number; fallidos: number } | null;
  cifrado: { fallosDeDescifrado: number; valoresDistintos: number; ultimoFalloEn: string | null };
  huellasDeTelefonoPendientes: number | null;
  indiceDeCorreo: "unico" | "provisional" | "ninguno" | null;
  avisos: string[];
}>;

/**
 * Minutos sin procesar a partir de los cuales un evento del outbox se considera atascado. El
 * worker pasa cada 10 segundos: cinco minutos pendiente es que no está corriendo.
 */
const MINUTOS_OUTBOX_ATASCADO = 5;

/**
 * Revisión completa. No lanza: lo que falla se refleja en el resultado, porque el healthcheck
 * tiene que responder precisamente cuando algo va mal.
 */
export async function revisarSistema(): Promise<EstadoDelSistema> {
  const db = getDatabaseClient();
  const avisos: string[] = [];
  const cifrado = estadoDelCifrado();

  const inicio = performance.now();
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    return {
      estado: "error",
      base: { ok: false, latenciaMs: null },
      migraciones: null,
      outbox: null,
      cifrado,
      huellasDeTelefonoPendientes: null,
      indiceDeCorreo: null,
      avisos: ["La base de datos no responde."]
    };
  }
  const latenciaMs = Math.round(performance.now() - inicio);

  let migraciones: EstadoDeMigraciones | null = null;
  try {
    migraciones = await revisarMigraciones();
    if (migraciones.pendientes.length > 0) {
      avisos.push(
        `Faltan ${migraciones.pendientes.length} migración(es) por aplicar: ${migraciones.pendientes.join(", ")}. Corre \`pnpm db:migrate\`.`
      );
    }
  } catch {
    avisos.push("No se pudo revisar qué migraciones están aplicadas.");
  }

  // Cada consulta va aparte y con su propio manejo: si una tabla todavía no existe porque faltan
  // migraciones, el resto de la revisión tiene que seguir saliendo.
  let outbox: EstadoDelSistema["outbox"] = null;
  try {
    const { rows } = await db.execute<{ atascados: number; fallidos: number }>(sql`
      SELECT
        (SELECT count(*)::int FROM transactional_outbox
          WHERE status = 'pending' AND created_at < now() - ${sql.raw(`interval '${MINUTOS_OUTBOX_ATASCADO} minutes'`)}) AS atascados,
        (SELECT count(*)::int FROM transactional_outbox WHERE status = 'dead_letter') AS fallidos
    `);
    outbox = { atascados: rows[0]?.atascados ?? 0, fallidos: rows[0]?.fallidos ?? 0 };
    if (outbox.atascados > 0) {
      avisos.push(`${outbox.atascados} evento(s) del outbox llevan más de ${MINUTOS_OUTBOX_ATASCADO} min sin procesarse: ¿está corriendo el worker?`);
    }
    if (outbox.fallidos > 0) avisos.push(`${outbox.fallidos} evento(s) del outbox fallaron definitivamente (dead_letter).`);
  } catch {
    avisos.push("No se pudo revisar el outbox.");
  }

  let huellasDeTelefonoPendientes: number | null = null;
  try {
    const { rows } = await db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM contacts WHERE phone_hash IS NULL AND phone IS NOT NULL`
    );
    huellasDeTelefonoPendientes = rows[0]?.n ?? 0;
    if (huellasDeTelefonoPendientes > 0) {
      avisos.push(
        `${huellasDeTelefonoPendientes} ciudadano(s) sin huella de teléfono: el alta pública los revisa aparte y va más lenta. Corre \`pnpm db:migrate\`.`
      );
    }
  } catch {
    avisos.push("No se pudo revisar la huella del teléfono.");
  }

  let indiceDeCorreo: EstadoDelSistema["indiceDeCorreo"] = null;
  try {
    const { rows } = await db.execute<{ indexname: string }>(sql`
      SELECT indexname FROM pg_indexes
      WHERE indexname IN ('user_profiles_email_lower_unique', 'user_profiles_email_lower_idx')
    `);
    const nombres = rows.map((r) => r.indexname);
    indiceDeCorreo = nombres.includes("user_profiles_email_lower_unique")
      ? "unico"
      : nombres.includes("user_profiles_email_lower_idx")
        ? "provisional"
        : "ninguno";
    if (indiceDeCorreo === "provisional") {
      avisos.push("Hay correos repetidos si se ignoran las mayúsculas; el índice de correo es provisional. `pnpm db:migrate` los lista.");
    }
  } catch {
    avisos.push("No se pudo revisar el índice de correo.");
  }

  // Solo degrada si hubo fallos en la última hora. Un aviso que no se apaga nunca —por un evento
  // viejo que ya se resolvió— acaba ignorándose, y entonces tampoco se ve el que sí importa.
  const haceUnaHora = Date.now() - 60 * 60 * 1000;
  if (cifrado.ultimoFalloEn && Date.parse(cifrado.ultimoFalloEn) >= haceUnaHora) {
    avisos.push(
      `Fallos de descifrado en la última hora (último: ${cifrado.ultimoFalloEn}; ${cifrado.fallosDeDescifrado} desde el arranque, ` +
        `${cifrado.valoresDistintos} valor(es) distinto(s)). Si son muchos, la llave de cifrado puede no ser la correcta.`
    );
  }

  // Faltar migraciones es "error": el código espera tablas o columnas que no están, y las pantallas
  // que las usen van a fallar. Lo demás degrada, pero la aplicación funciona.
  const estado = migraciones && migraciones.pendientes.length > 0 ? "error" : avisos.length > 0 ? "degradado" : "ok";
  return { estado, base: { ok: true, latenciaMs }, migraciones, outbox, cifrado, huellasDeTelefonoPendientes, indiceDeCorreo, avisos };
}

/**
 * Revisión al arrancar el servidor (desde `instrumentation.ts`). Nunca lanza: un fallo aquí no
 * debe impedir que la aplicación arranque. Lo que hace es dejar el problema escrito en el registro
 * de forma imposible de pasar por alto, que es lo que faltó con C1.
 */
export async function revisarAlArrancar(): Promise<void> {
  try {
    const { pendientes, esperadas } = await revisarMigraciones();
    if (pendientes.length === 0) {
      registrar("info", "arranque.esquema-al-dia", { migraciones: esperadas });
      return;
    }
    console.error(
      [
        "",
        "=".repeat(78),
        `[arranque] ESQUEMA DESACTUALIZADO: faltan ${pendientes.length} migración(es) que este código necesita.`,
        ...pendientes.map((m) => `           - ${m}`),
        "           Las pantallas que usen esas tablas o columnas van a fallar.",
        "           Aplica las migraciones con `pnpm db:migrate` y reinicia.",
        "=".repeat(78),
        ""
      ].join("\n")
    );
  } catch (error) {
    console.error("[arranque] No se pudo revisar el esquema: la base no responde.", {
      mensaje: error instanceof Error ? error.message : String(error)
    });
  }
}
