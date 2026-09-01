import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { eq } from "drizzle-orm";

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
