import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

import { huellaDeTelefono, normalizarTelefono } from "./crypto.js";

/**
 * Búsqueda de ciudadanos por lo que alguien teclea en campo: un nombre, un teléfono, una colonia.
 *
 * Teléfono y colonia del ciudadano van cifrados con IV aleatorio, así que un `ILIKE` sobre ellos
 * nunca coincide: el Directorio prometía «Buscar por nombre, teléfono o colonia…» y solo
 * encontraba por nombre (C22). Aquí están las dos piezas que sí funcionan sin descifrar nada:
 *
 * - el teléfono se busca por su huella (`phone_hash`, migración 0019), con el número completo;
 * - la colonia, por el catálogo en claro al que la liga `contact_territory`.
 *
 * Y lo que se compara como texto se compara sin mayúsculas ni acentos: en la calle se escribe
 * «jose» y «tonala», no «José» ni «Tonalá».
 */

/** Menos dígitos que esto no es un teléfono completo: 7 cubre un número local sin lada. */
export const DIGITOS_MINIMOS_DE_TELEFONO = 7;

/**
 * Huellas con las que buscar un teléfono tecleado a mano. Todos los del padrón están guardados con
 * 10 dígitos y sin prefijo (medido), pero quien busca puede escribir «+52 33…» o «044…»: se prueba
 * el número tal cual, sus últimos 10 dígitos y, si trae 10, también con prefijo de país.
 * Devuelve [] si no parece un teléfono completo.
 */
export function huellasParaBuscarTelefono(texto: string): string[] {
  const digitos = normalizarTelefono(texto);
  if (!digitos || digitos.length < DIGITOS_MINIMOS_DE_TELEFONO) return [];
  const variantes = new Set([digitos]);
  if (digitos.length > 10) variantes.add(digitos.slice(-10));
  if (digitos.length === 10) {
    variantes.add(`52${digitos}`);
    variantes.add(`521${digitos}`);
  }
  return [...variantes].map((v) => huellaDeTelefono(v)).filter((h): h is string => h !== null);
}

// Las mismas equivalencias en JavaScript y en SQL (`translate`), letra por letra.
const CON_ACENTO = "áéíóúüñàèìòùâêîôûäëïö";
const SIN_ACENTO = "aeiouunaeiouaeiouaeio";

/** Minúsculas y sin acentos, como `sinAcentosSql` lo hace en la base. */
export function sinAcentos(texto: string): string {
  let resultado = "";
  for (const letra of texto.toLowerCase()) {
    const i = CON_ACENTO.indexOf(letra);
    resultado += i >= 0 ? SIN_ACENTO[i] : letra;
  }
  return resultado;
}

/** La expresión en minúsculas y sin acentos, en SQL. */
export function sinAcentosSql(expresion: SQLWrapper | SQL): SQL {
  return sql`translate(lower(${expresion}), ${CON_ACENTO}, ${SIN_ACENTO})`;
}

/**
 * Patrón para `LIKE` que encuentra el texto en cualquier parte, sin acentos. `%` y `_` escritos por
 * la persona se buscan literalmente: sin escaparlos, un «_» coincidía con cualquier letra.
 */
export function patronDeBusqueda(texto: string): string {
  return `%${sinAcentos(texto.trim()).replace(/[\\%_]/g, "\\$&")}%`;
}
