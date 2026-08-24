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

  it("does not require private variables for public env loading", () => {
    expect(loadPublicEnv({ NEXT_PUBLIC_APP_NAME: "Tonala OS", NEXT_PUBLIC_APP_ENV: "local", NODE_ENV: "test" }))
      .toEqual({ NEXT_PUBLIC_APP_NAME: "Tonala OS", NEXT_PUBLIC_APP_ENV: "local" });
  });
});
