import { z } from "zod";

const privateEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive(),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1)
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Tonala OS"),
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
