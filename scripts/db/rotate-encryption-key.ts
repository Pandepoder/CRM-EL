import "dotenv/config";

import crypto from "node:crypto";

import pg from "pg";

/**
 * Rota DATABASE_ENCRYPTION_KEY volviendo a cifrar el PII que ya esta guardado.
 *
 * Sin esto la llave era intocable: cambiarla en el .env deja los datos
 * existentes cifrados con la llave vieja, y `decryptData` devuelve el texto
 * cifrado tal cual cuando falla en vez de lanzar un error, asi que la base no
 * se rompe de forma visible: simplemente empiezan a aparecer cadenas ilegibles
 * en nombres, telefonos y CURPs sin una sola linea en los logs.
 *
 * Uso:
 *
 *   DATABASE_ENCRYPTION_KEY_OLD=<llave actual> \
 *   DATABASE_ENCRYPTION_KEY_NEW=<llave nueva>  \
 *   pnpm db:rotate-key
 *
 * De fabrica hace un ensayo: recorre todo, informa cuanto reescribiria y no
 * toca nada. Para escribir de verdad hay que anadir:
 *
 *   CONFIRMAR_ROTACION=si-tengo-respaldo
 *
 * Cuando termina, hay que poner la llave nueva en DATABASE_ENCRYPTION_KEY y
 * reiniciar la aplicacion.
 */

const ALGORITMO = "aes-256-gcm";
const LARGO_IV = 12;
const LARGO_TAG = 16;

// Formato que produce packages/shared/database/crypto.ts: iv:authTag:cifrado,
// los tres en hexadecimal. Sirve para distinguir un valor cifrado de un texto
// plano cualquiera sin depender de una lista de columnas escrita a mano.
const PATRON_CIFRADO = `^[0-9a-f]{${LARGO_IV * 2}}:[0-9a-f]{${LARGO_TAG * 2}}:[0-9a-f]*$`;

function llaveDesde(valor: string): Buffer {
  return Buffer.from(valor.slice(0, 32), "utf-8");
}

/** Descifra o lanza. A diferencia de decryptData, aqui un fallo nunca pasa desapercibido. */
function descifrar(texto: string, llave: Buffer): string {
  const partes = texto.split(":");
  const ivHex = partes[0] ?? "";
  const tagHex = partes[1] ?? "";
  const datosHex = partes[2] ?? "";

  const descifrador = crypto.createDecipheriv(ALGORITMO, llave, Buffer.from(ivHex, "hex"));
  descifrador.setAuthTag(Buffer.from(tagHex, "hex"));
  return descifrador.update(datosHex, "hex", "utf8") + descifrador.final("utf8");
}

function cifrar(texto: string, llave: Buffer): string {
  const iv = crypto.randomBytes(LARGO_IV);
  const cifrador = crypto.createCipheriv(ALGORITMO, llave, iv);
  const datos = cifrador.update(texto, "utf8", "hex") + cifrador.final("hex");
  return `${iv.toString("hex")}:${cifrador.getAuthTag().toString("hex")}:${datos}`;
}

/** Cita un identificador de Postgres. Vienen de information_schema, pero no se concatenan crudos. */
function citar(identificador: string): string {
  return `"${identificador.replace(/"/g, '""')}"`;
}

function abortar(mensaje: string): never {
  console.error(`\n  ${mensaje}\n`);
  process.exit(1);
}

const urlBase = process.env.DATABASE_URL;
const llaveVieja = process.env.DATABASE_ENCRYPTION_KEY_OLD;
const llaveNueva = process.env.DATABASE_ENCRYPTION_KEY_NEW;
const confirmado = process.env.CONFIRMAR_ROTACION === "si-tengo-respaldo";

if (!urlBase) abortar("Falta DATABASE_URL.");
if (!llaveVieja || llaveVieja.length < 32) {
  abortar("Falta DATABASE_ENCRYPTION_KEY_OLD, o tiene menos de 32 caracteres.");
}
if (!llaveNueva || llaveNueva.length < 32) {
  abortar("Falta DATABASE_ENCRYPTION_KEY_NEW, o tiene menos de 32 caracteres. Genera una con `openssl rand -hex 16`.");
}
if (llaveVieja.slice(0, 32) === llaveNueva.slice(0, 32)) {
  abortar("La llave nueva es igual a la vieja en sus primeros 32 caracteres, que son los unicos que se usan. No hay nada que rotar.");
}

const bufferVieja = llaveDesde(llaveVieja);
const bufferNueva = llaveDesde(llaveNueva);

const pool = new pg.Pool({ connectionString: urlBase });
const cliente = await pool.connect();

let revisados = 0;
let reescritos = 0;
let yaRotados = 0;

try {
  const columnas = await cliente.query<{ tabla: string; columna: string }>(`
    SELECT c.table_name AS tabla, c.column_name AS columna
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND c.data_type IN ('text', 'character varying')
    ORDER BY c.table_name, c.column_name
  `);

  console.warn(
    confirmado
      ? "\n  Rotando la llave de cifrado. Escribiendo de verdad.\n"
      : "\n  ENSAYO: no se escribe nada. Anade CONFIRMAR_ROTACION=si-tengo-respaldo para aplicar.\n"
  );

  await cliente.query("BEGIN");

  for (const { tabla, columna } of columnas.rows) {
    const filas = await cliente.query<{ ctid: string; valor: string }>(
      `SELECT ctid::text AS ctid, ${citar(columna)} AS valor
       FROM ${citar(tabla)}
       WHERE ${citar(columna)} ~ $1`,
      [PATRON_CIFRADO]
    );

    if (filas.rowCount === 0) continue;

    let deEstaColumna = 0;

    for (const fila of filas.rows) {
      revisados += 1;

      let plano: string;
      try {
        plano = descifrar(fila.valor, bufferVieja);
      } catch {
        // Si abre con la llave nueva es que ya se roto: una corrida anterior se
        // quedo a medias. Se salta, para que el script se pueda repetir.
        try {
          descifrar(fila.valor, bufferNueva);
          yaRotados += 1;
          continue;
        } catch {
          await cliente.query("ROLLBACK");
          abortar(
            `${tabla}.${columna} tiene un valor que no abre ni con la llave vieja ni con la nueva. ` +
              "No se toca nada: revisa que DATABASE_ENCRYPTION_KEY_OLD sea la llave con la que se cifro esta base."
          );
        }
      }

      if (confirmado) {
        await cliente.query(
          `UPDATE ${citar(tabla)} SET ${citar(columna)} = $1 WHERE ctid = $2::tid`,
          [cifrar(plano, bufferNueva), fila.ctid]
        );
      }
      reescritos += 1;
      deEstaColumna += 1;
    }

    if (deEstaColumna > 0) {
      console.warn(`  ${tabla}.${columna}: ${deEstaColumna}`);
    }
  }

  if (confirmado) {
    await cliente.query("COMMIT");
    console.warn(
      `\n  Listo. Reescritos ${reescritos} valores (${yaRotados} ya estaban rotados, ${revisados} revisados).\n` +
        "  Ahora pon la llave nueva en DATABASE_ENCRYPTION_KEY y reinicia la aplicacion.\n"
    );
  } else {
    await cliente.query("ROLLBACK");
    console.warn(
      `\n  Ensayo terminado. Se reescribirian ${reescritos} valores (${yaRotados} ya rotados, ${revisados} revisados).\n` +
        "  Nada fue modificado.\n"
    );
  }
} catch (error) {
  await cliente.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  cliente.release();
  await pool.end();
}
