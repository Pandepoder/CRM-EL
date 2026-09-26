import crypto from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `getEncryptionKey` valida el entorno completo con `loadAppEnv`, que exige también la URL de la
// base y el secreto de sesión. Para probar solo el cifrado se simula la configuración y se deja
// que la llave salga de `process.env`, que es contra lo que el módulo compara su caché.
vi.mock("@tonala/config", () => ({
  loadAppEnv: () => ({ private: { DATABASE_ENCRYPTION_KEY: process.env.DATABASE_ENCRYPTION_KEY } })
}));

const { decryptData, encryptData, estadoDelCifrado, huellaDeTelefono, normalizarTelefono, olvidarLlaveDeCifrado } =
  await import("./crypto.js");

const LLAVE_A = "a".repeat(32);
const LLAVE_B = "b".repeat(32);

/** Cifra como lo haría otra instalación con otra llave: el caso realista de una fila ilegible. */
function cifrarConOtraLlave(texto: string, llave: string): string {
  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv("aes-256-gcm", Buffer.from(llave.slice(0, 32), "utf-8"), iv);
  const datos = cifrador.update(texto, "utf8", "hex") + cifrador.final("hex");
  return `${iv.toString("hex")}:${cifrador.getAuthTag().toString("hex")}:${datos}`;
}

describe("cifrado del PII", () => {
  const entornoOriginal = process.env.DATABASE_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.DATABASE_ENCRYPTION_KEY = LLAVE_A;
    olvidarLlaveDeCifrado();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.DATABASE_ENCRYPTION_KEY = entornoOriginal;
    olvidarLlaveDeCifrado();
    vi.restoreAllMocks();
  });

  it("cifra y descifra de ida y vuelta", () => {
    const cifrado = encryptData("33 1234 5678");

    expect(cifrado).not.toBe("33 1234 5678");
    expect(cifrado).toMatch(/^[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    expect(decryptData(cifrado)).toBe("33 1234 5678");
  });

  it("deja pasar nulos y vacíos sin tocarlos", () => {
    expect(encryptData(null)).toBeNull();
    expect(encryptData("")).toBe("");
    expect(decryptData(null)).toBeNull();
    expect(decryptData("")).toBe("");
  });

  it("devuelve tal cual el texto plano anterior al cifrado", () => {
    expect(decryptData("Col. Centro")).toBe("Col. Centro");
    // Dos puntos en un domicilio real no deben confundirse con un valor cifrado.
    expect(decryptData("Av. Juárez: 12: interior 3")).toBe("Av. Juárez: 12: interior 3");
  });

  /**
   * El defecto que motiva el cambio: antes esto lanzaba, y como corre dentro del mapeo de filas
   * de Drizzle, una sola fila ilegible tumbaba el directorio entero de una estructura.
   */
  it("no lanza con un valor cifrado con otra llave: lo devuelve sin tocar y lo registra", () => {
    const deOtraInstalacion = cifrarConOtraLlave("dato recuperable", LLAVE_B);
    const antes = estadoDelCifrado().fallosDeDescifrado;

    expect(() => decryptData(deOtraInstalacion)).not.toThrow();
    expect(decryptData(deOtraInstalacion)).toBe(deOtraInstalacion);
    expect(estadoDelCifrado().fallosDeDescifrado).toBe(antes + 2);
    expect(console.error).toHaveBeenCalled();
  });

  it("nunca escribe el valor en el registro, ni cifrado ni descifrado", () => {
    const deOtraInstalacion = cifrarConOtraLlave("CURP secreta", LLAVE_B);

    decryptData(deOtraInstalacion);

    const registrado = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(registrado).not.toContain(deOtraInstalacion);
    expect(registrado).not.toContain("CURP secreta");
  });

  /**
   * La garantía que evita perder datos: si una pantalla carga un valor ilegible y alguien guarda
   * la ficha, el valor vuelve a la base exactamente igual y sigue siendo recuperable con la llave
   * con la que se cifró. Si se devolviera null o "[ilegible]", aquí se habría sobrescrito.
   */
  it("un valor ilegible sobrevive intacto al viaje de ida y vuelta de un formulario", () => {
    const deOtraInstalacion = cifrarConOtraLlave("dato recuperable", LLAVE_B);

    const leido = decryptData(deOtraInstalacion);
    const guardado = encryptData(leido);

    expect(guardado).toBe(deOtraInstalacion);

    // Y con la llave correcta se recupera el dato original.
    process.env.DATABASE_ENCRYPTION_KEY = LLAVE_B;
    olvidarLlaveDeCifrado();
    expect(decryptData(guardado)).toBe("dato recuperable");
  });

  it("no cifra dos veces un valor que ya viene cifrado", () => {
    const cifrado = encryptData("dato") as string;

    expect(encryptData(cifrado)).toBe(cifrado);
    expect(decryptData(encryptData(cifrado))).toBe("dato");
  });

  it("sigue fallando fuerte si falta la llave: eso es configuración, no una fila rota", () => {
    const cifrado = encryptData("dato") as string;
    process.env.DATABASE_ENCRYPTION_KEY = "corta";
    olvidarLlaveDeCifrado();

    expect(() => decryptData(cifrado)).toThrow(/at least 32 characters/);
    expect(() => encryptData("otro")).toThrow(/at least 32 characters/);
  });

  it("rechaza la llave de ejemplo del repositorio", () => {
    process.env.DATABASE_ENCRYPTION_KEY = "12345678901234567890123456789012";
    olvidarLlaveDeCifrado();

    expect(() => encryptData("dato")).toThrow(/placeholder/);
  });
});

describe("huella del teléfono", () => {
  const entornoOriginal = process.env.DATABASE_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.DATABASE_ENCRYPTION_KEY = LLAVE_A;
    olvidarLlaveDeCifrado();
  });

  afterEach(() => {
    process.env.DATABASE_ENCRYPTION_KEY = entornoOriginal;
    olvidarLlaveDeCifrado();
  });

  it("es la misma para el mismo número, se escriba como se escriba", () => {
    const base = huellaDeTelefono("3312345678");

    expect(base).toMatch(/^[0-9a-f]{64}$/);
    expect(huellaDeTelefono("33 1234 5678")).toBe(base);
    expect(huellaDeTelefono("(33) 1234-5678")).toBe(base);
    expect(huellaDeTelefono("  33.12.34.56.78  ")).toBe(base);
  });

  /**
   * La regla de siempre del alta pública: se comparan todos los dígitos. Cambiarla alteraría a
   * quién se acepta o rechaza, y eso no es parte de este cambio.
   */
  it("conserva la regla actual de comparar todos los dígitos", () => {
    expect(normalizarTelefono("+52 33 1234 5678")).toBe("523312345678");
    expect(huellaDeTelefono("+52 33 1234 5678")).not.toBe(huellaDeTelefono("33 1234 5678"));
  });

  it("distingue números distintos", () => {
    expect(huellaDeTelefono("3312345678")).not.toBe(huellaDeTelefono("3312345679"));
  });

  it("no da huella a un valor sin dígitos", () => {
    expect(huellaDeTelefono(null)).toBeNull();
    expect(huellaDeTelefono("")).toBeNull();
    expect(huellaDeTelefono("sin teléfono")).toBeNull();
  });

  /**
   * Un SHA-256 sin llave de un número de 10 dígitos se revierte probando las diez mil millones de
   * posibilidades. La huella tiene que depender de la llave, o equivaldría a guardarlo en claro.
   */
  it("no es un hash sin llave: depende de la llave de cifrado", () => {
    const conLlaveA = huellaDeTelefono("3312345678");
    const shaSimple = crypto.createHash("sha256").update("3312345678").digest("hex");

    expect(conLlaveA).not.toBe(shaSimple);

    process.env.DATABASE_ENCRYPTION_KEY = LLAVE_B;
    olvidarLlaveDeCifrado();
    expect(huellaDeTelefono("3312345678")).not.toBe(conLlaveA);
  });

  it("no usa la llave del cifrado tal cual, sino una subllave derivada", () => {
    const hmacConLaLlaveDirecta = crypto
      .createHmac("sha256", Buffer.from(LLAVE_A, "utf-8"))
      .update("3312345678")
      .digest("hex");

    expect(huellaDeTelefono("3312345678")).not.toBe(hmacConLaLlaveDirecta);
  });
});
