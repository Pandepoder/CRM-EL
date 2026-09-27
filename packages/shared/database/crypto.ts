import crypto from "node:crypto";
import { loadAppEnv } from "@tonala/config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;

// The exact placeholder shipped in .env.example — never a valid production key.
// Rejected explicitly so copying the template without generating a real key fails
// loudly instead of silently "encrypting" citizen PII with a value visible in git history.
const KNOWN_EXAMPLE_KEYS = new Set(["12345678901234567890123456789012"]);

// Llave ya derivada, junto con el texto de la variable del que salió.
//
// Antes cada cifrado y cada descifrado volvía a llamar a loadAppEnv(), que valida TODO el
// entorno con zod: al escribir o leer un padrón completo eso son decenas de miles de
// validaciones idénticas (medido: ~220 ms extra por cada 20 mil valores) para obtener siempre
// el mismo Buffer.
//
// No se guarda solo el Buffer: se recuerda también la cadena que lo originó y se compara con
// process.env en cada uso. Leer una variable de entorno es gratis frente a validar el entorno
// entero, y así una prueba que cambia DATABASE_ENCRYPTION_KEY no sigue cifrando con la llave
// vieja —un caché silencioso aquí produciría datos que nadie puede volver a descifrar—.
let llaveCacheada: Buffer | null = null;
let llaveOrigen: string | undefined;

/**
 * Descarta la llave memoizada para que la siguiente operación la vuelva a derivar y a validar.
 * La comparación contra process.env ya cubre el caso normal; esto existe para pruebas que
 * cambian el entorno por otros medios (mocks de @tonala/config, por ejemplo).
 */
export function olvidarLlaveDeCifrado(): void {
  llaveCacheada = null;
  llaveOrigen = undefined;
}

function getEncryptionKey(): Buffer {
  const actual = process.env.DATABASE_ENCRYPTION_KEY;
  if (llaveCacheada && llaveOrigen === actual) return llaveCacheada;

  const env = loadAppEnv();
  const keyStr = env.private.DATABASE_ENCRYPTION_KEY;
  if (!keyStr || keyStr.length < 32) {
    throw new Error("DATABASE_ENCRYPTION_KEY must be at least 32 characters long");
  }
  if (KNOWN_EXAMPLE_KEYS.has(keyStr)) {
    throw new Error(
      "DATABASE_ENCRYPTION_KEY is still set to the placeholder value from .env.example. " +
        "Generate a real key with `openssl rand -hex 16` and set it before starting the app."
    );
  }

  llaveCacheada = Buffer.from(keyStr.slice(0, 32), "utf-8");
  // Se recuerda el valor crudo del entorno, no el ya validado: es contra ese que se compara
  // en la siguiente llamada.
  llaveOrigen = actual;
  return llaveCacheada;
}

// ---------------------------------------------------------------------------------------------
// Huella del teléfono (índice ciego)
// ---------------------------------------------------------------------------------------------

/**
 * Deja solo los dígitos. Es exactamente la regla con la que el alta pública compara duplicados
 * desde siempre; la huella la conserva a propósito para que calcularla sea un cambio de
 * rendimiento y no de a quién se acepta o se rechaza. Devuelve null si no queda ningún dígito.
 */
export function normalizarTelefono(telefono: string | null | undefined): string | null {
  const digitos = (telefono ?? "").replace(/[^0-9]/g, "");
  return digitos.length > 0 ? digitos : null;
}

let subllaveDeHuella: Buffer | null = null;
let subllaveOrigen: Buffer | null = null;

function llaveDeHuella(): Buffer {
  const llave = getEncryptionKey();
  if (subllaveDeHuella && subllaveOrigen === llave) return subllaveDeHuella;
  // Subllave derivada, no la misma llave del cifrado: usar una sola llave para dos algoritmos
  // distintos es mala práctica, y así la huella cambia sola si se rota la llave.
  subllaveDeHuella = Buffer.from(crypto.hkdfSync("sha256", llave, "tonala-os", "huella-telefono/v1", 32));
  subllaveOrigen = llave;
  return subllaveDeHuella;
}

/**
 * Huella del teléfono de un ciudadano: permite buscar por teléfono sin descifrar el padrón.
 *
 * El teléfono va cifrado con un IV aleatorio, así que la base no puede compararlo: el alta pública
 * buscaba duplicados descifrando TODOS los teléfonos en cada registro. Medido: 22 µs por fila,
 * lineal con la concurrencia; con 50 000 ciudadanos, más de un segundo por cada persona que
 * escanea el QR. Con la huella es una búsqueda por índice.
 *
 * Por qué con llave (HMAC) y no un SHA-256 simple: un teléfono son 10 dígitos, diez mil millones
 * de posibilidades. Un hash sin llave se revierte probándolas todas en minutos, y guardarlo
 * equivaldría a guardar los teléfonos en claro. Sin la llave, la huella no dice nada.
 *
 * Si se rota DATABASE_ENCRYPTION_KEY, las huellas guardadas dejan de coincidir: el script de
 * rotación las borra y `pnpm db:migrate` las vuelve a calcular con la llave nueva.
 */
export function huellaDeTelefono(telefono: string | null | undefined): string | null {
  const normalizado = normalizarTelefono(telefono);
  if (!normalizado) return null;
  return crypto.createHmac("sha256", llaveDeHuella()).update(normalizado).digest("hex");
}

/**
 * Forma exacta de lo que produce `encryptData`: `iv:authTag:cifrado`, los tres en hexadecimal
 * en minúsculas. Es el mismo patrón que usa `scripts/db/rotate-encryption-key.ts` para
 * distinguir un valor cifrado de un texto plano sin depender de una lista de columnas.
 *
 * Ningún dato real de un ciudadano —un nombre, un teléfono, una dirección— tiene esta forma.
 */
const PATRON_CIFRADO = new RegExp(`^[0-9a-f]{${IV_LENGTH * 2}}:[0-9a-f]{${AUTH_TAG_LENGTH * 2}}:[0-9a-f]*$`);

function pareceCifrado(valor: string): boolean {
  return PATRON_CIFRADO.test(valor);
}

/**
 * ¿Sigue cifrado este valor después de pasar por `decryptData`? Es la señal de que no se pudo
 * descifrar. Quien calcule algo a partir del dato —la huella del teléfono, por ejemplo— tiene que
 * mirarlo antes: sacar los dígitos de un texto cifrado da una huella que no corresponde a nadie.
 */
export function esValorCifrado(valor: string | null | undefined): boolean {
  return typeof valor === "string" && pareceCifrado(valor);
}

// Fallos de descifrado del proceso: el healthcheck los expone para que un problema con la
// llave se vea antes de que alguien lo encuentre en pantalla.
//
// Viven en `globalThis` y no en variables del módulo, igual que el pool de conexiones. Next
// carga una copia de este módulo por cada grupo de rutas: con variables del módulo, cada copia
// llevaba su propio contador —comprobado: la misma fila ilegible salía tres veces en el
// registro, cada una con "fallosAcumulados: 1"— y el healthcheck solo habría visto el suyo.
declare global {
  var __tonalaFallosDeDescifrado: { total: number; huellas: Set<string>; ultimoEn: number | null } | undefined;
}

const MAXIMO_DE_HUELLAS_EN_EL_REGISTRO = 50;

function contadorDeFallos(): { total: number; huellas: Set<string>; ultimoEn: number | null } {
  globalThis.__tonalaFallosDeDescifrado ??= { total: 0, huellas: new Set<string>(), ultimoEn: null };
  return globalThis.__tonalaFallosDeDescifrado;
}

function registrarFalloDeDescifrado(cifrado: string, motivo: unknown): void {
  const contador = contadorDeFallos();
  contador.total += 1;
  contador.ultimoEn = Date.now();
  // Nunca se registra el valor: ni cifrado ni mucho menos descifrado. La huella —un recorte del
  // SHA-256— basta para saber si es la misma fila la que falla una y otra vez.
  const huella = crypto.createHash("sha256").update(cifrado).digest("hex").slice(0, 12);
  if (contador.huellas.size < MAXIMO_DE_HUELLAS_EN_EL_REGISTRO && !contador.huellas.has(huella)) {
    contador.huellas.add(huella);
    console.error("[cifrado] No se pudo descifrar un valor; se devuelve tal cual, sin tocarlo.", {
      huella,
      motivo: motivo instanceof Error ? motivo.message : String(motivo),
      fallosAcumulados: contador.total
    });
  } else if (contador.total % 1000 === 0) {
    // Con la llave equivocada fallan todas las filas: una línea por fila inundaría el registro.
    console.error("[cifrado] Fallos de descifrado acumulados.", { fallosAcumulados: contador.total });
  }
}

/**
 * Para el healthcheck: cuántas veces falló el descifrado desde que arrancó el proceso, cuántos
 * valores distintos fueron (contados hasta 50: más allá, es la llave, no filas sueltas) y cuándo
 * fue el último. El healthcheck solo se preocupa por fallos recientes: un evento de hace horas no
 * debe dejar el aviso encendido hasta el siguiente reinicio.
 */
export function estadoDelCifrado(): Readonly<{
  fallosDeDescifrado: number;
  valoresDistintos: number;
  ultimoFalloEn: string | null;
}> {
  const contador = contadorDeFallos();
  return {
    fallosDeDescifrado: contador.total,
    valoresDistintos: contador.huellas.size,
    // `== null` y no `=== null`: un contador creado por una versión anterior del módulo —en
    // desarrollo, tras recargar el código— no trae el campo, y `new Date(undefined)` lanza.
    ultimoFalloEn: contador.ultimoEn == null ? null : new Date(contador.ultimoEn).toISOString()
  };
}

export function encryptData(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return plaintext as any;
  // Lo que ya tiene forma de cifrado no se vuelve a cifrar.
  //
  // Es la otra mitad de que `decryptData` devuelva sin tocar lo que no puede descifrar: si un
  // formulario carga ese valor y alguien guarda la ficha, aquí vuelve a la base byte por byte,
  // en vez de cifrarse encima y quedar enterrado bajo una segunda capa. Cubre también el caso
  // de un valor leído con SQL a mano —que llega cifrado— y escrito después con Drizzle.
  if (pareceCifrado(plaintext)) return plaintext;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Descifra un valor. Lo que no tiene forma de cifrado —datos anteriores al cifrado— se devuelve
 * tal cual.
 *
 * **Cuando un valor tiene forma de cifrado pero no se puede descifrar, se devuelve sin tocar y
 * se registra.** Antes lanzaba, y como esto corre dentro del mapeo de filas de Drizzle, una sola
 * fila ilegible tumbaba la consulta entera: el directorio completo de una estructura dejaba de
 * abrir por un solo ciudadano, y reintentar no servía de nada.
 *
 * Por qué no se devuelve `null` ni un texto como "[ilegible]": la causa realista de una fila que
 * no descifra es que se cifró con OTRA llave —un script corrido con otro `.env`, o una fila
 * escrita durante la ventana de una rotación—, y eso se puede recuperar con la llave correcta.
 * Si la pantalla recibiera `null` y alguien guardara la ficha, el dato recuperable se
 * sobrescribiría con vacío. Devolviéndolo sin tocar, `encryptData` lo reconoce al guardar y lo
 * deja como estaba.
 *
 * Lo que SÍ sigue fallando fuerte es la configuración: si falta la llave o es la de ejemplo,
 * `getEncryptionKey` lanza fuera del `try`. Eso no es una fila rota, es el sistema entero.
 */
export function decryptData(ciphertext: string | null | undefined): string | null {
  if (ciphertext == null || ciphertext === "") return ciphertext as any;
  if (!pareceCifrado(ciphertext)) return ciphertext;

  const [ivHex = "", authTagHex = "", encryptedHex = ""] = ciphertext.split(":");
  const key = getEncryptionKey();

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    registrarFalloDeDescifrado(ciphertext, err);
    return ciphertext;
  }
}
