import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { and, eq, isNull } from "drizzle-orm";

import { esViolacionUnica } from "@/lib/idempotencia";

// Unicode combining diacritical marks (U+0300-U+036F), written as explicit
// escapes on purpose — a literal accent character in source is fragile across
// editors/encodings and has previously been mangled into garbage bytes here.
const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function slugifyName(displayName: string): string {
  const base = displayName
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "") // strip accents: "María" -> "Maria"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "operador";
}

/**
 * Every user needs a personalSlug for their "Enlace Personal y QR" public
 * registration link (/registro/[slug]) to work — without one, that feature
 * silently disappears from their UI. Nothing else in the codebase assigns
 * one, so every user-creation path must call this explicitly.
 */
export async function generateUniquePersonalSlug(displayName: string): Promise<string> {
  const db = getDatabaseClient();
  const base = slugifyName(displayName);

  let candidate = base;
  let suffix = 1;
  // Bounded retry loop — collisions are rare (same normalized name), so this
  // will resolve within a handful of iterations in practice.
  while (suffix < 1000) {
    const existing = await db
      .select({ id: schema.userProfiles.id })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.personalSlug, candidate))
      .limit(1);
    if (existing.length === 0) {
      return candidate;
    }
    suffix++;
    candidate = `${base}-${suffix}`;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/**
 * El enlace de una cuenta que se creó sin él, asignado la primera vez que hace falta.
 *
 * Las altas desde la aplicación ya lo generan, pero las cuentas que nacen por script no: el
 * administrador maestro de `pnpm db:clean` y los usuarios de `pnpm db:seed` quedaban sin enlace,
 * y el botón «Mi enlace» compartía `/registro/<id>`, que responde 404. Así, quien comparte su
 * enlace o su QR siempre comparte uno que funciona.
 */
export async function asegurarEnlacePersonal(userId: string, displayName: string, actual: string | null | undefined): Promise<string | null> {
  if (actual) return actual;
  const db = getDatabaseClient();
  for (let intento = 0; intento < 3; intento++) {
    const candidato = await generateUniquePersonalSlug(displayName);
    try {
      // Solo si sigue vacío: dos pestañas abiertas a la vez no se pisan el enlace.
      const [fila] = await db
        .update(schema.userProfiles)
        .set({ personalSlug: candidato })
        .where(and(eq(schema.userProfiles.id, userId), isNull(schema.userProfiles.personalSlug)))
        .returning({ personalSlug: schema.userProfiles.personalSlug });
      if (fila?.personalSlug) return fila.personalSlug;
      const [ya] = await db
        .select({ personalSlug: schema.userProfiles.personalSlug })
        .from(schema.userProfiles)
        .where(eq(schema.userProfiles.id, userId))
        .limit(1);
      return ya?.personalSlug ?? null;
    } catch (error) {
      // Otra cuenta tomó el mismo enlace entre la búsqueda y la escritura: se intenta con el siguiente.
      if (!esViolacionUnica(error, "user_profiles_slug_unique")) throw error;
    }
  }
  return null;
}
