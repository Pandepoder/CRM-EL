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

export function encryptData(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return plaintext as any;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptData(ciphertext: string | null | undefined): string | null {
  if (ciphertext == null || ciphertext === "") return ciphertext as any;
  const parts = ciphertext.split(":");
  if (parts.length !== 3) return ciphertext;
  
  const ivHex = parts[0] as string;
  const authTagHex = parts[1] as string;
  const encryptedHex = parts[2] as string;
  
  if (ivHex.length !== IV_LENGTH * 2 || authTagHex.length !== AUTH_TAG_LENGTH * 2) {
      return ciphertext;
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    throw new Error(`Failed to decrypt data: ${err instanceof Error ? err.message : String(err)}`);
  }
}
