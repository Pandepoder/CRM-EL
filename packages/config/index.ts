import { z } from "zod";

/**
 * Entero opcional con valor por omisión. Una variable vacía cuenta como ausente: `.default()` de
 * zod solo actúa ante `undefined`, y `DATABASE_POOL_MAX=` en un `.env` —o `${VAR}` sin valor en
 * docker-compose— llegaría como cadena vacía, `coerce` la volvería 0 y la aplicación no
 * arrancaría por una variable que nadie quiso fijar.
 */
function enteroOpcional(minimo: number, maximo: number, porOmision: number) {
  return z.preprocess(
    (valor) => (typeof valor === "string" && valor.trim() === "" ? undefined : valor),
    z.coerce.number().int().min(minimo).max(maximo).default(porOmision)
  );
}

const privateEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive(),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  DATABASE_ENCRYPTION_KEY: z.string().min(32).describe("Llave maestra AES-256 para cifrar PII en la base de datos"),
  // Pool de la aplicación web. Opcionales: sin ellos rigen los valores de abajo, que son los que
  // se usaban antes de poder configurarlos (el máximo de 10 y la espera de 5 s por conexión) más
  // los límites nuevos. Se validan aquí para que un valor mal escrito falle al arrancar y no
  // se convierta en silencio en `NaN` —que `pg` interpreta como "sin límite"—.
  DATABASE_POOL_MAX: enteroOpcional(1, 100, 10),
  DATABASE_CONNECTION_TIMEOUT_MS: enteroOpcional(500, 60_000, 5_000),
  DATABASE_STATEMENT_TIMEOUT_MS: enteroOpcional(1_000, 600_000, 30_000),
  DATABASE_IDLE_IN_TRANSACTION_TIMEOUT_MS: enteroOpcional(1_000, 600_000, 60_000)
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Jalisco OS"),
  NEXT_PUBLIC_APP_ENV: z.enum(["local", "test", "staging", "production"]).default("local")
});

export type PrivateEnv = z.infer<typeof privateEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

export type AppEnv = {
  readonly private: PrivateEnv;
  readonly public: PublicEnv;
};

export function loadAppEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const privateResult = privateEnvSchema.safeParse(source);
  const publicResult = publicEnvSchema.safeParse(source);

  if (!privateResult.success || !publicResult.success) {
    const errors = [
      ...(!privateResult.success ? privateResult.error.issues : []),
      ...(!publicResult.success ? publicResult.error.issues : [])
    ]
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${errors}`);
  }

  return {
    private: privateResult.data,
    public: publicResult.data
  };
}

export function loadPublicEnv(source: NodeJS.ProcessEnv = process.env): PublicEnv {
  return publicEnvSchema.parse(source);
}
