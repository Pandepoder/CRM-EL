import { describe, expect, it } from "vitest";

import { loadAppEnv, loadPublicEnv } from "./index.js";

const validEnv = {
  DATABASE_URL: "postgres://tonala:secret@localhost:54329/tonala_os",
  POSTGRES_HOST: "localhost",
  POSTGRES_PORT: "54329",
  POSTGRES_DB: "tonala_os",
  POSTGRES_USER: "tonala",
  POSTGRES_PASSWORD: "secret",
  DATABASE_ENCRYPTION_KEY: "01234567890123456789012345678901",
  NEXT_PUBLIC_APP_NAME: "Tonala OS",
  NEXT_PUBLIC_APP_ENV: "local",
  NODE_ENV: "test"
};

describe("environment validation", () => {
  it("loads private and public env values", () => {
    const env = loadAppEnv(validEnv);

    expect(env.private.POSTGRES_PORT).toBe(54329);
    expect(env.public.NEXT_PUBLIC_APP_NAME).toBe("Tonala OS");
  });

  it("fails when critical private variables are missing", () => {
    expect(() => loadAppEnv({ NEXT_PUBLIC_APP_NAME: "Tonala OS", NODE_ENV: "test" })).toThrow(
      /Invalid environment configuration/
    );
  });

  describe("límites del pool de la aplicación web", () => {
    it("sin configurar, usa los valores de siempre más los límites nuevos", () => {
      const env = loadAppEnv(validEnv);

      expect(env.private.DATABASE_POOL_MAX).toBe(10);
      expect(env.private.DATABASE_CONNECTION_TIMEOUT_MS).toBe(5_000);
      expect(env.private.DATABASE_STATEMENT_TIMEOUT_MS).toBe(30_000);
      expect(env.private.DATABASE_IDLE_IN_TRANSACTION_TIMEOUT_MS).toBe(60_000);
    });

    it("acepta valores configurados", () => {
      const env = loadAppEnv({ ...validEnv, DATABASE_POOL_MAX: "25", DATABASE_STATEMENT_TIMEOUT_MS: "15000" });

      expect(env.private.DATABASE_POOL_MAX).toBe(25);
      expect(env.private.DATABASE_STATEMENT_TIMEOUT_MS).toBe(15_000);
    });

    /**
     * `DATABASE_POOL_MAX=` en un .env, o `${DATABASE_POOL_MAX}` sin valor en docker-compose, llega
     * como cadena vacía. Sin tratarla como ausente, `coerce` la volvía 0 y la aplicación no
     * arrancaba por una variable que nadie quiso fijar.
     */
    it("trata una variable vacía como ausente y aplica el valor por omisión", () => {
      const env = loadAppEnv({ ...validEnv, DATABASE_POOL_MAX: "", DATABASE_STATEMENT_TIMEOUT_MS: "   " });

      expect(env.private.DATABASE_POOL_MAX).toBe(10);
      expect(env.private.DATABASE_STATEMENT_TIMEOUT_MS).toBe(30_000);
    });

    it("rechaza al arrancar un valor mal escrito en vez de convertirlo en 'sin límite'", () => {
      expect(() => loadAppEnv({ ...validEnv, DATABASE_POOL_MAX: "diez" })).toThrow(/DATABASE_POOL_MAX/);
      expect(() => loadAppEnv({ ...validEnv, DATABASE_POOL_MAX: "0" })).toThrow(/DATABASE_POOL_MAX/);
      expect(() => loadAppEnv({ ...validEnv, DATABASE_STATEMENT_TIMEOUT_MS: "50" })).toThrow(
        /DATABASE_STATEMENT_TIMEOUT_MS/
      );
    });
  });

  it("does not require private variables for public env loading", () => {
    expect(loadPublicEnv({ NEXT_PUBLIC_APP_NAME: "Tonala OS", NEXT_PUBLIC_APP_ENV: "local", NODE_ENV: "test" }))
      .toEqual({ NEXT_PUBLIC_APP_NAME: "Tonala OS", NEXT_PUBLIC_APP_ENV: "local" });
  });
});
