import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { schema } from "@tonala/shared/database";
import { getDatabaseClient } from "./db-client";
import type { UserNetworkScope } from "./network-hierarchy";

/**
 * Qué contactos puede ver quien no es administración.
 *
 * Reglas (decididas por el dueño del sistema):
 *   1. Solo administración ve todo.
 *   2. Cada persona ve los contactos ligados a las personas activas de su alcance —sus
 *      compañeros de equipo y, en cascada, quienes están bajo su mando (ver network-hierarchy)—:
 *      creados, referidos, como contacto real o con asignación activa. Cada uno se filtra con el
 *      territorio (teams.municipality y teams.section) del equipo por el que esa persona está en
 *      el alcance, o con el de los equipos que manda: una coordinación responde por todo su
 *      municipio aunque sus brigadas tengan solo unas secciones.
 *   3. Lo propio nunca desaparece: lo que la persona registró o tiene ligado directamente se
 *      ve aunque quede fuera del territorio del equipo. Antes, un error de captura dejaba el
 *      registro invisible para quien lo hizo, sin forma de corregirlo.
 *   4. El filtro de territorio solo aplica cuando hay dato. Un equipo sin municipio ni sección
 *      no limita, y un contacto sin municipio no se descarta por el dato que le falta. Antes, un
 *      equipo sin territorio dejaba a sus integrantes sin ver nada, ni lo suyo.
 *   5. Quien no tiene equipo ve solo lo suyo.
 */

export type AssignedTerritory = { municipality: string | null; section: string | null };

export type ContactoUbicado = {
  municipality: string | null;
  sectionNum: number | null;
  /** Municipio de la sección del contacto: sirve cuando el contacto no trae municipio propio. */
  sectionMunicipality?: string | null;
};

const normalize = (value: string | null | undefined) =>
  (value || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * Secciones que declara un equipo en su campo de texto libre.
 *
 * Acepta números sueltos ("3072, 3073"), rangos ("3000-3010") y texto alrededor ("Sección
 * 3073"). Antes cualquier cosa que no fuera una lista de números separados por comas se
 * tomaba como inválida y el equipo dejaba de ver todo. Devuelve null si no hay ningún número:
 * entonces el equipo no tiene secciones asignadas.
 */
export function seccionesDeEquipo(section: string | null): { numeros: Set<number>; rangos: Array<[number, number]> } | null {
  const texto = (section || "").trim();
  if (!texto) return null;

  const numeros = new Set<number>();
  const rangos: Array<[number, number]> = [];
  for (const m of texto.matchAll(/(\d+)\s*[-–]\s*(\d+)|(\d+)/g)) {
    if (m[1] !== undefined && m[2] !== undefined) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      rangos.push([Math.min(a, b), Math.max(a, b)]);
    } else if (m[3] !== undefined) {
      numeros.add(Number(m[3]));
    }
  }
  return numeros.size > 0 || rangos.length > 0 ? { numeros, rangos } : null;
}

/** ¿El contacto cae en alguno de los territorios? El filtro solo descarta con dato en ambos lados. */
export function matchesAssignedTerritory(contact: ContactoUbicado, territories: AssignedTerritory[]): boolean {
  if (territories.length === 0) return true;

  return territories.some((territory) => {
    const municipioEquipo = normalize(territory.municipality);
    const secciones = seccionesDeEquipo(territory.section);

    // Equipo sin territorio: no limita.
    if (!municipioEquipo && !secciones) return true;

    // Municipio: el del contacto o, si no lo trae, el de su sección.
    const municipioContacto = normalize(contact.municipality) || normalize(contact.sectionMunicipality);
    if (municipioEquipo && municipioContacto && municipioContacto !== municipioEquipo) return false;

    if (secciones && contact.sectionNum !== null) {
      const n = contact.sectionNum;
      const dentro = secciones.numeros.has(n) || secciones.rangos.some(([a, b]) => n >= a && n <= b);
      if (!dentro) return false;
    }

    return true;
  });
}

/**
 * Identificadores de los contactos visibles para un alcance, o null si ve todo.
 *
 * La pertenencia se filtra en SQL; el territorio, después, en memoria, porque el municipio
 * del contacto va cifrado y Drizzle lo descifra al leer.
 */
export async function visibleContactIds(scope: UserNetworkScope, contactId?: string): Promise<string[] | null> {
  if (scope.isGlobal) return null;
  const ids = scope.allowedUserIds || [];
  // Sin alcance (por ejemplo, una sesión de alguien dado de baja) no se ve nada, ni lo propio.
  if (ids.length === 0) return [];

  const db = getDatabaseClient();
  const asignacionesActivas = and(
    eq(schema.contactAssignments.assignmentStatus, "active"),
    inArray(schema.contactAssignments.assignedUserId, ids)
  );

  const [candidatos, asignaciones] = await Promise.all([
    db
      .select({
        id: schema.contacts.id,
        municipality: schema.contacts.municipality,
        sectionNum: schema.electoralSections.sectionNum,
        sectionMunicipality: schema.electoralSections.municipality,
        createdByUserId: schema.contacts.createdByUserId,
        referredByUserId: schema.contacts.referredByUserId,
        actualContactUserId: schema.contacts.actualContactUserId
      })
      .from(schema.contacts)
      .leftJoin(schema.electoralSections, eq(schema.contacts.sectionId, schema.electoralSections.id))
      .where(
        and(
          contactId ? eq(schema.contacts.id, contactId) : undefined,
          or(
            inArray(schema.contacts.createdByUserId, ids),
            inArray(schema.contacts.referredByUserId, ids),
            inArray(schema.contacts.actualContactUserId, ids),
            inArray(
              schema.contacts.id,
              db.select({ id: schema.contactAssignments.contactId }).from(schema.contactAssignments).where(asignacionesActivas)
            )
          )
        )
      ),
    db
      .select({ contactId: schema.contactAssignments.contactId, userId: schema.contactAssignments.assignedUserId })
      .from(schema.contactAssignments)
      .where(and(asignacionesActivas, contactId ? eq(schema.contactAssignments.contactId, contactId) : undefined))
  ]);

  // Sin equipo: todo lo que llegó aquí es suyo.
  if (scope.teamIds.length === 0) return candidatos.map((c) => c.id);

  const asignadosPorContacto = new Map<string, string[]>();
  for (const a of asignaciones) {
    const lista = asignadosPorContacto.get(a.contactId) ?? [];
    lista.push(a.userId);
    asignadosPorContacto.set(a.contactId, lista);
  }

  // Territorio de cada persona del alcance: el de los equipos por los que está en él. Antes se
  // juntaban los territorios de todos los equipos de quien consulta, así que un contacto de una
  // brigada pasaba el filtro con el territorio de otra, y un solo equipo sin territorio dejaba
  // sin filtro a todos. Con la cascada de mando eso ya no era un detalle.
  const { territorioPorPersona, territorioDeEquipo } = await territoriosPorPersona(scope.teamIds);

  // El territorio desde el que se manda cuenta además del de la brigada de cada persona: una
  // coordinación cubre todo su municipio aunque sus brigadas solo tengan unas secciones. Sin
  // esto, un ciudadano registrado a unas calles de la brigada desaparecía también para la
  // dirección, que es justo quien responde por todo el municipio. Se usan las raíces del mando y
  // no todas las brigadas: una sola brigada sin territorio abriría el filtro para las demás.
  const territoriosDeMando = scope.commandRootTeamIds
    .map((equipo) => territorioDeEquipo.get(equipo))
    .filter((t): t is AssignedTerritory => t !== undefined);

  const delAlcance = new Set(ids);

  return candidatos
    .filter((c) => {
      const vinculados = [c.createdByUserId, c.referredByUserId, c.actualContactUserId, ...(asignadosPorContacto.get(c.id) ?? [])];
      // Lo propio nunca desaparece.
      if (vinculados.includes(scope.userId)) return true;
      return vinculados.some((persona) => {
        if (!persona || !delAlcance.has(persona)) return false;
        const territorios = territorioPorPersona.get(persona);
        if (territorios === undefined) return false;
        if (matchesAssignedTerritory(c, territorios)) return true;
        // Ojo con la lista vacía: matchesAssignedTerritory la toma como "sin territorio, no
        // limita", así que sin equipos bajo mando esto abriría el filtro en vez de cerrarlo.
        return territoriosDeMando.length > 0 && matchesAssignedTerritory(c, territoriosDeMando);
      });
    })
    .map((c) => c.id);
}

/** Territorio de cada equipo dado y, por persona, el de los equipos donde lidera o es integrante. */
async function territoriosPorPersona(teamIds: string[]): Promise<{
  territorioPorPersona: Map<string, AssignedTerritory[]>;
  territorioDeEquipo: Map<string, AssignedTerritory>;
}> {
  const db = getDatabaseClient();
  const [equipos, integrantes] = await Promise.all([
    db
      .select({ id: schema.teams.id, leaderId: schema.teams.leaderId, municipality: schema.teams.municipality, section: schema.teams.section })
      .from(schema.teams)
      .where(inArray(schema.teams.id, teamIds)),
    db
      .select({ teamId: schema.teamMembers.teamId, userId: schema.teamMembers.userId })
      .from(schema.teamMembers)
      .where(inArray(schema.teamMembers.teamId, teamIds))
  ]);

  const territorioDe = new Map(equipos.map((e) => [e.id, { municipality: e.municipality, section: e.section }]));
  const resultado = new Map<string, AssignedTerritory[]>();
  const agregar = (persona: string, equipo: string) => {
    const territorio = territorioDe.get(equipo);
    if (!territorio) return;
    const lista = resultado.get(persona) ?? [];
    lista.push(territorio);
    resultado.set(persona, lista);
  };
  for (const e of equipos) agregar(e.leaderId, e.id);
  for (const i of integrantes) agregar(i.userId, i.teamId);
  return { territorioPorPersona: resultado, territorioDeEquipo: territorioDe };
}

/**
 * Fragmento para SQL escrito a mano: `AND <columna> IN (...)`.
 *
 * Con una lista vacía devuelve `AND false` en lugar de `IN ()`, que es un error de sintaxis en
 * Postgres: las consultas crudas con listas armadas a mano reventaban así con alcance vacío.
 */
export function sqlRestriccionContactos(columna: SQL, ids: string[] | null): SQL {
  if (ids === null) return sql``;
  if (ids.length === 0) return sql`AND false`;
  return sql`AND ${columna} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`;
}

/** Condición de Drizzle para acotar una consulta de contactos a los visibles. */
export function contactIdRestriction(ids: string[] | null) {
  return ids === null ? undefined : ids.length ? inArray(schema.contacts.id, ids) : sql`false`;
}
