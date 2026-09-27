-- Huella del teléfono para buscar sin descifrar el padrón, y correos comparados sin mayúsculas.
--
-- ADITIVA: no borra ni reescribe columnas, restricciones ni índices existentes. La versión
-- anterior de la aplicación sigue funcionando contra este esquema: la columna nueva simplemente
-- no la lee, y los correos normalizados a minúsculas son justo lo que ya escribía al darlos de
-- alta. Se puede correr dos veces sin efecto.
--
-- Escrita a mano: `drizzle-kit generate` no sirve en este repositorio mientras falten las
-- instantáneas de las migraciones 0012-0015, 0017 y 0018. Probado: con el esquema sin tocar,
-- genera una migración que vuelve a crear las tablas de la 0017 y falla al aplicarse.

-- 1. Huella del teléfono ----------------------------------------------------------------------
--
-- El teléfono va cifrado con un IV aleatorio y la base no puede compararlo, así que el alta
-- pública descifraba el padrón entero en cada registro para buscar un duplicado. La huella es
-- un HMAC con una subllave derivada de DATABASE_ENCRYPTION_KEY: se calcula en la aplicación, no
-- aquí, porque hace falta la llave.
--
-- El relleno de las filas existentes lo hace `pnpm db:migrate` al terminar de aplicar las
-- migraciones (scripts/db/backfill-phone-hash.ts), en lotes y sin volver a tocar lo ya hecho.
-- Mientras tanto el alta pública revisa aparte las filas sin huella, así que nunca deja pasar
-- un duplicado por no haber terminado el relleno.
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "phone_hash" text;

-- No única: el alta interna nunca deduplicó y hay números compartidos legítimos.
CREATE INDEX IF NOT EXISTS "contacts_phone_hash_idx"
  ON "contacts" ("phone_hash")
  WHERE "phone_hash" IS NOT NULL;

-- Las filas que todavía esperan su huella. Terminado el relleno queda vacío, y comprobar que no
-- queda ninguna es instantáneo en vez de recorrer la tabla.
CREATE INDEX IF NOT EXISTS "contacts_phone_hash_pending_idx"
  ON "contacts" ("id")
  WHERE "phone_hash" IS NULL AND "phone" IS NOT NULL;

-- 2. Correos sin mayúsculas -------------------------------------------------------------------
--
-- El login busca por `lower(email)`, pero el único índice era sobre `email` crudo: cada intento
-- de entrar recorría la tabla, y nada impedía que "Ana@x.com" y "ana@x.com" fueran dos cuentas,
-- de las que el login tomaba una cualquiera.

-- 2a. Se normalizan los correos que NO chocan con otro. Los que sí chocarían se dejan como están:
--     decidir cuál de dos cuentas se queda es trabajo de una persona, no de una migración.
UPDATE "user_profiles" AS u
SET "email" = lower(trim(u."email"))
WHERE u."email" <> lower(trim(u."email"))
  AND NOT EXISTS (
    SELECT 1 FROM "user_profiles" AS otro
    WHERE otro."id" <> u."id"
      AND lower(trim(otro."email")) = lower(trim(u."email"))
  );

-- 2b. Índice único sobre lower(email), salvo que ya haya correos repetidos por mayúsculas.
--
--     Si los hay, crear el índice único haría FALLAR esta migración, y en producción eso es el
--     sistema entero sin arrancar: el servicio `web` espera a que `migrate` termine bien. En ese
--     caso se crea el mismo índice sin la restricción —el login recupera su velocidad igual— y
--     `pnpm db:migrate` lista los correos repetidos al terminar para que alguien los resuelva.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "user_profiles" GROUP BY lower("email") HAVING count(*) > 1
  ) THEN
    CREATE INDEX IF NOT EXISTS "user_profiles_email_lower_idx" ON "user_profiles" (lower("email"));
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS "user_profiles_email_lower_unique" ON "user_profiles" (lower("email"));
  END IF;
END $$;
