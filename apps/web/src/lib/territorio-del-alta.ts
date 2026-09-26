import { and, eq, sql } from "drizzle-orm";

import { linkContactToColony } from "@tonala/modules/territory/application";
import { createAuthenticatedActor, type ActorContext } from "@tonala/shared/auth";
import { schema, sinAcentos, sinAcentosSql } from "@tonala/shared/database";
import { DevelopmentLogger } from "@tonala/shared/observability";

import { permissionChecker } from "@/lib/api-helpers";
import { createTerritoryMutationsDependencies } from "@/lib/crm-deps";
import { getDatabaseClient } from "@/lib/db-client";
import { processOutboxInline } from "@/lib/outbox";
import { permissionsForRole } from "@/lib/permissions";
import { idDePeticion, registrar, registrarError } from "@/lib/registro";

export type TerritorioDelAlta = "vinculado" | "sin_colonia" | "fuera_del_catalogo" | "fallo";

/**
 * El territorio del ciudadano, desde su alta (D20, decisión del dueño del 2026-09-25).
 *
 * Solo el botón «Territorio» de la ficha lo creaba: ninguna alta, aunque capturara la colonia. Si el
 * alta trae una colonia que **ya está en el catálogo** de su municipio, se vincula aquí, con el mismo
 * caso de uso que la ficha (su auditoría y su evento). Una colonia que no está en el catálogo no se
 * inventa desde un formulario —el registro público lo escribe cualquiera—: se confirma en la ficha.
 *
 * Va después del alta, en su propio paso: si fallara, el ciudadano ya está guardado y queda como
 * antes, sin territorio. Nunca lanza.
 *
 * `quien`: el actor de la sesión, o el id de la persona a cuyo nombre queda el ciudadano (en el
 * registro público, el dueño del enlace, igual que la ficha misma).
 */
export async function vincularTerritorioDelAlta(
  quien: ActorContext | string,
  contactId: string,
  colonia: string | null | undefined,
  municipio: string | null
): Promise<TerritorioDelAlta> {
  const nombre = colonia?.trim();
  if (!nombre || !municipio || sinAcentos(nombre) === "por identificar") return "sin_colonia";
  try {
    const db = getDatabaseClient();
    const [delCatalogo] = await db
      .select({ id: schema.colonies.id })
      .from(schema.colonies)
      .where(
        and(
          eq(schema.colonies.status, "active"),
          eq(schema.colonies.municipality, municipio),
          sql`${sinAcentosSql(sql`trim(${schema.colonies.name})`)} = ${sinAcentos(nombre)}`
        )
      )
      .orderBy(schema.colonies.name)
      .limit(1);
    if (!delCatalogo) return "fuera_del_catalogo";

    const actor = typeof quien === "string" ? await actorDe(quien) : quien;
    if (!actor) return "fallo";
    const deps = await createTerritoryMutationsDependencies(db);
    const resultado = await linkContactToColony(
      actor,
      { contactId, colonyId: delCatalogo.id },
      { ...deps, logger: new DevelopmentLogger(), permissionChecker }
    );
    if (!resultado.ok) {
      registrar("warn", "territorio.alta.no_vinculado", { codigo: resultado.error.code });
      return "fallo";
    }
    await processOutboxInline(db);
    return "vinculado";
  } catch (error) {
    registrarError("Territorio desde el alta", error);
    return "fallo";
  }
}

/** El actor de una persona activa, para lo que se hace a su nombre sin su sesión (el registro público). */
async function actorDe(userId: string): Promise<ActorContext | null> {
  const [persona] = await getDatabaseClient()
    .select({ status: schema.userProfiles.status, rol: schema.roles.key })
    .from(schema.userProfiles)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.userProfiles.roleId))
    .where(eq(schema.userProfiles.id, userId))
    .limit(1);
  if (!persona || persona.status !== "active") return null;
  return createAuthenticatedActor({
    actorId: userId,
    roles: [persona.rol],
    permissions: permissionsForRole(persona.rol),
    correlationId: (await idDePeticion()) ?? crypto.randomUUID(),
    // Nadie inició sesión: el ciudadano entró por el enlace de esta persona y queda a su nombre. El tipo
    // no tiene otra forma de decirlo; lo que importa en la auditoría es quién y la petición.
    authenticationMethod: "password",
    requestStartedAt: new Date()
  });
}
