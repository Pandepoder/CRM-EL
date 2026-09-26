import "dotenv/config";

import pg from "pg";

import { loadAppEnv } from "../../packages/config/index.js";
import { decryptData, esValorCifrado, huellaDeTelefono } from "../../packages/shared/database/crypto.js";

/**
 * Calcula la huella del teléfono de los ciudadanos que todavía no la tienen (migración 0019).
 *
 * No puede hacerse en SQL: el teléfono va cifrado y la huella lleva una subllave derivada de
 * DATABASE_ENCRYPTION_KEY. Por eso lo corre `pnpm db:migrate` al terminar de aplicar las
 * migraciones —en producción, el servicio `migrate`, que ya tiene la llave—, y también se puede
 * correr aparte con `pnpm db:backfill-phone-hash`.
 *
 * Es seguro repetirlo: solo toca filas sin huella, y cada escritura exige que el teléfono siga
 * siendo el mismo que se leyó y que nadie haya puesto ya la huella entretanto.
 *
 * Deja sin huella, a propósito:
 *  - los teléfonos que no se pueden descifrar (otra llave): la huella saldría de los dígitos del
 *    texto cifrado y no correspondería a nadie;
 *  - los que no tienen ningún dígito.
 * El alta pública los sigue revisando aparte, así que ninguno deja pasar un duplicado.
 */

export type ResultadoDelRelleno = Readonly<{
  conHuellaNueva: number;
  ilegibles: number;
  sinDigitos: number;
}>;

export async function rellenarHuellasDeTelefono(
  pool: pg.Pool,
  { tamanoDeLote = 500 }: { tamanoDeLote?: number } = {}
): Promise<ResultadoDelRelleno> {
  let conHuellaNueva = 0;
  let ilegibles = 0;
  let sinDigitos = 0;
  // Se avanza por identificador: las filas que se dejan sin huella no vuelven a salir en el
  // siguiente lote, así que el recorrido termina aunque haya teléfonos ilegibles.
  let ultimoId = "00000000-0000-0000-0000-000000000000";

  for (;;) {
    const { rows } = await pool.query<{ id: string; phone: string }>(
      `SELECT id::text AS id, phone
         FROM contacts
        WHERE phone_hash IS NULL AND phone IS NOT NULL AND id > $1::uuid
        ORDER BY id
        LIMIT $2`,
      [ultimoId, tamanoDeLote]
    );
    if (rows.length === 0) break;
    ultimoId = rows[rows.length - 1]!.id;

    const ids: string[] = [];
    const cifrados: string[] = [];
    const huellas: string[] = [];
    for (const fila of rows) {
      const telefono = decryptData(fila.phone);
      if (esValorCifrado(telefono)) {
        ilegibles += 1;
        continue;
      }
      const huella = huellaDeTelefono(telefono);
      if (!huella) {
        sinDigitos += 1;
        continue;
      }
      ids.push(fila.id);
      cifrados.push(fila.phone);
      huellas.push(huella);
    }

    if (ids.length > 0) {
      const { rowCount } = await pool.query(
        `UPDATE contacts AS c
            SET phone_hash = v.huella
           FROM unnest($1::uuid[], $2::text[], $3::text[]) AS v(id, cifrado, huella)
          WHERE c.id = v.id
            AND c.phone = v.cifrado
            AND c.phone_hash IS NULL`,
        [ids, cifrados, huellas]
      );
      conHuellaNueva += rowCount ?? 0;
    }
  }

  return { conHuellaNueva, ilegibles, sinDigitos };
}

/**
 * Deja el índice único sobre `lower(email)` en su sitio en cuanto los datos lo permitan.
 *
 * La migración 0019 lo crea solo si no hay correos que choquen al ignorar mayúsculas; si los hay,
 * crea uno NO único para no bloquear el despliegue. Pero una migración aplicada no se repite, así
 * que sin esto el índice único no llegaría nunca aunque alguien corrigiera las cuentas después.
 * Aquí se revisa en cada `db:migrate`: sin repetidos, se crea el único y se retira el provisional.
 *
 * Devuelve los correos que siguen repetidos (vacío si todo quedó en orden).
 */
export async function asegurarCorreoUnicoSinMayusculas(pool: pg.Pool): Promise<string[]> {
  const { rows } = await pool.query<{ correo: string }>(
    `SELECT lower(email) AS correo FROM user_profiles GROUP BY lower(email) HAVING count(*) > 1 ORDER BY 1`
  );
  const repetidos = rows.map((fila) => fila.correo);
  if (repetidos.length > 0) return repetidos;

  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_lower_unique ON user_profiles (lower(email))`);
  // Con el único creado, el provisional sobra: cubre la misma expresión.
  await pool.query(`DROP INDEX IF EXISTS user_profiles_email_lower_idx`);
  return [];
}

if (process.argv[1] && process.argv[1].endsWith("backfill-phone-hash.ts")) {
  const env = loadAppEnv();
  const pool = new pg.Pool({ connectionString: env.private.DATABASE_URL });
  rellenarHuellasDeTelefono(pool)
    .then((resultado) => {
      console.log("Huellas de teléfono:", resultado);
      return pool.end();
    })
    .catch(async (error) => {
      console.error("No se pudo rellenar la huella del teléfono:", error);
      await pool.end();
      process.exit(1);
    });
}
