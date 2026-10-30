import { and, eq, inArray, sql, type SQL } from "drizzle-orm";

import type { ActorContext } from "@tonala/shared/auth";
import { decryptData, patronDeBusqueda, schema, sinAcentosSql } from "@tonala/shared/database";

import { idDeGeneral, sqlRestriccionPersonas } from "./alcance-municipal";
import { contactosVisibles, sqlRestriccionContactos, veCiudadano } from "./contact-visibility";
import { getDatabaseClient } from "./db-client";
import {
  CASILLAS_ESTIMADAS_POR_SECCION,
  esRolElectoral,
  normalizarCasilla,
  PATRON_QUIERE_SER_RC,
  SECCIONES_POR_PAGINA,
  type Candidato,
  type CandidatosParaNombrar,
  type FilaDeCobertura,
  type FiltrosDeCobertura,
  type Nombrado,
  type ResultadoDeCobertura,
  type RolElectoral
} from "./estructura-electoral";
import { esUuid } from "./ids";
import { esViolacionUnica } from "./idempotencia";
import { buscarMunicipio } from "./municipios-jalisco";
import type { UserNetworkScope } from "./network-hierarchy";
import { withOutbox } from "./outbox-helper";

/**
 * Estructura Electoral (plan de auditoría de menús, fase 4): cuántas secciones del municipio tienen
 * coordinación, representante general y representantes de casilla, y quién.
 *
 * Quién cuenta (D11): el maestro y la administración municipal, todo el municipio; la dirección y el líder,
 * solo su estructura — no reciben conteos ni nombres de las demás, como ya decidía la ruta `/api/admin/sections` (retirada en la fase 7: nadie la llamaba). Un
 * nombramiento se ve si la cuenta nombrada está en el alcance (`sqlRestriccionPersonas`) o, si es un
 * ciudadano, si quien mira puede ver su ficha (`contactosVisibles`).
 *
 * Quién nombra (§4.4): cuentas de su mando (`commandUserIds`; la administración, la gente de su municipio) o
 * ciudadanos que ve, en secciones de su municipio. Quién cambia o quita: la administración en su municipio;
 * quien coordina, si la persona nombrada está bajo su mando o la nombró alguien de su mando.
 */

export type Fallo = { ok: false; status: number; error: string; campo?: string };
const fallo = (status: number, error: string, campo?: string): Fallo => ({ ok: false, status, error, ...(campo ? { campo } : {}) });

type Municipio = { id: string; nombre: string };

/**
 * El municipio de la cobertura: el maestro elige (`pedido`, por nombre; si no, el suyo o Tonalá); la
 * administración, el suyo; dirección y líder, el de su cuenta. `null` si la cuenta sigue en General.
 */
export async function municipioDeCobertura(alcance: UserNetworkScope, pedido: string | null | undefined): Promise<Municipio | null> {
  const db = getDatabaseClient();
  const porId = async (id: string | null) => {
    if (!id) return null;
    const [m] = await db
      .select({ id: schema.municipalities.id, nombre: schema.municipalities.name })
      .from(schema.municipalities)
      .where(and(eq(schema.municipalities.id, id), eq(schema.municipalities.kind, "municipio")))
      .limit(1);
    return m ?? null;
  };
  const porNombre = async (nombre: string) => {
    const oficial = buscarMunicipio(nombre)?.name;
    if (!oficial) return null;
    const [m] = await db
      .select({ id: schema.municipalities.id, nombre: schema.municipalities.name })
      .from(schema.municipalities)
      .where(and(eq(schema.municipalities.name, oficial), eq(schema.municipalities.kind, "municipio")))
      .limit(1);
    return m ?? null;
  };
  if (alcance.isMaster) return (pedido ? await porNombre(pedido) : null) ?? (await porId(alcance.userMunicipalityId)) ?? (await porNombre("Tonalá"));
  return porId(alcance.isAdmin ? alcance.adminMunicipalityId : alcance.userMunicipalityId);
}

/** El municipio donde quien actúa puede nombrar: el suyo (el maestro, cualquiera). */
function municipioPropio(alcance: UserNetworkScope): string | null {
  return alcance.isAdmin ? alcance.adminMunicipalityId : alcance.userMunicipalityId;
}

/** Los nombramientos que cuentan para quien mira, sobre el alias `er` (D11). */
async function nombradosVisibles(alcance: UserNetworkScope): Promise<SQL> {
  const ciudadanos = await contactosVisibles(alcance);
  return sql`(
    (er.user_id IS NOT NULL ${sqlRestriccionPersonas(sql`er.user_id`, alcance)})
    OR (er.contact_id IS NOT NULL ${sqlRestriccionContactos(sql`er.contact_id`, ciudadanos)})
  )`;
}

/** ¿Puede cambiar o quitar este nombramiento? (la fila ya es visible y la sección, de su municipio) */
export function puedeCambiarNombrado(alcance: UserNetworkScope, fila: { userId: string | null; asignadoPor: string | null }): boolean {
  if (alcance.isMaster || alcance.isAdmin) return true;
  const mando = new Set(alcance.commandUserIds ?? []);
  return (fila.userId !== null && mando.has(fila.userId)) || (fila.asignadoPor !== null && mando.has(fila.asignadoPor));
}

const CONDICION_DE_FILTRO: Record<FiltrosDeCobertura["filtro"], SQL> = {
  todas: sql`true`,
  sin_coordinador: sql`c.coordinador = 0`,
  sin_rg: sql`c.rg = 0`,
  sin_rc: sql`c.rc = 0`,
  completas: sql`c.coordinador > 0 AND c.rg > 0 AND c.rc >= ${CASILLAS_ESTIMADAS_POR_SECCION}`
};

/** La cobertura de un municipio, por páginas, con los filtros resueltos en la base. */
export async function coberturaPorSeccion(alcance: UserNetworkScope, municipio: Municipio | null, f: FiltrosDeCobertura): Promise<ResultadoDeCobertura> {
  const soloSuEstructura = !alcance.isMaster && !alcance.isAdmin;
  const vacio: ResultadoDeCobertura = {
    municipio,
    soloSuEstructura,
    totales: { secciones: 0, conCoordinador: 0, conRg: 0, rc: 0, rcEsperados: 0, sinCoordinador: 0, sinRg: 0, sinRc: 0, completas: 0 },
    filas: [],
    total: 0,
    pagina: 1,
    totalPaginas: 1
  };
  if (!municipio) return vacio;

  const db = getDatabaseClient();
  const visibles = await nombradosVisibles(alcance);
  const conteos = sql`
    WITH c AS (
      SELECT es.id, es.section_num,
        count(er.id) FILTER (WHERE er.role = 'coordinador')::int AS coordinador,
        count(er.id) FILTER (WHERE er.role = 'representante_general')::int AS rg,
        count(er.id) FILTER (WHERE er.role = 'representante_casilla')::int AS rc
      FROM electoral_sections es
      LEFT JOIN electoral_representatives er ON er.section_id = es.id AND ${visibles}
      WHERE es.municipality_id = ${municipio.id}
      GROUP BY es.id, es.section_num
    )`;

  const texto = f.q.trim();
  const busqueda = !texto
    ? sql`true`
    : /^\d+$/.test(texto)
      ? sql`c.section_num::text LIKE ${`${texto}%`}`
      : sql`(
          EXISTS (SELECT 1 FROM section_colonies sc JOIN colonies col ON col.id = sc.colony_id
                  WHERE sc.section_id = c.id AND ${sinAcentosSql(sql`col.name`)} LIKE ${patronDeBusqueda(texto)})
          OR EXISTS (SELECT 1 FROM electoral_representatives er
                     LEFT JOIN user_profiles up ON up.id = er.user_id
                     LEFT JOIN contacts ct ON ct.id = er.contact_id
                     WHERE er.section_id = c.id AND ${visibles}
                       AND ${sinAcentosSql(sql`coalesce(up.display_name, ct.display_name, '')`)} LIKE ${patronDeBusqueda(texto)})
        )`;
  const condicion = sql`${CONDICION_DE_FILTRO[f.filtro]} AND ${busqueda}`;

  const [totales] = (
    await db.execute<Record<string, number>>(sql`${conteos}
      SELECT count(*)::int AS secciones,
        count(*) FILTER (WHERE coordinador > 0)::int AS con_coordinador,
        count(*) FILTER (WHERE rg > 0)::int AS con_rg,
        coalesce(sum(rc), 0)::int AS rc,
        count(*) FILTER (WHERE coordinador = 0)::int AS sin_coordinador,
        count(*) FILTER (WHERE rg = 0)::int AS sin_rg,
        count(*) FILTER (WHERE rc = 0)::int AS sin_rc,
        count(*) FILTER (WHERE coordinador > 0 AND rg > 0 AND rc >= ${CASILLAS_ESTIMADAS_POR_SECCION})::int AS completas
      FROM c`)
  ).rows;
  const [{ total = 0 } = {}] = (await db.execute<{ total: number }>(sql`${conteos} SELECT count(*)::int AS total FROM c WHERE ${condicion}`)).rows;
  const totalPaginas = Math.max(1, Math.ceil(total / SECCIONES_POR_PAGINA));
  const pagina = Math.min(f.pagina, totalPaginas);
  const pag = (
    await db.execute<{ id: string; section_num: number; coordinador: number; rg: number; rc: number }>(sql`${conteos}
      SELECT c.id::text, c.section_num, c.coordinador, c.rg, c.rc FROM c WHERE ${condicion}
      ORDER BY c.section_num LIMIT ${SECCIONES_POR_PAGINA} OFFSET ${(pagina - 1) * SECCIONES_POR_PAGINA}`)
  ).rows;

  const ids = pag.map((p) => p.id);
  const [colonias, nombrados] = ids.length
    ? await Promise.all([
        db.execute<{ section_id: string; colonias: string[] }>(sql`
          SELECT sc.section_id::text, array_agg(col.name ORDER BY col.name) AS colonias
          FROM section_colonies sc JOIN colonies col ON col.id = sc.colony_id
          WHERE sc.section_id IN (${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)})
          GROUP BY sc.section_id`),
        db.execute<{ id: string; section_id: string; role: string; user_id: string | null; contact_id: string | null; casilla: string | null; assigned_by_user_id: string | null; cuenta: string | null; ciudadano: string | null }>(sql`
          SELECT er.id::text, er.section_id::text, er.role, er.user_id::text, er.contact_id::text, er.casilla, er.assigned_by_user_id::text,
            up.display_name AS cuenta, ct.display_name AS ciudadano
          FROM electoral_representatives er
          LEFT JOIN user_profiles up ON up.id = er.user_id
          LEFT JOIN contacts ct ON ct.id = er.contact_id
          WHERE er.section_id IN (${sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `)}) AND ${visibles}
          ORDER BY er.assigned_at, er.id`)
      ])
    : [{ rows: [] }, { rows: [] }];

  const coloniasDe = new Map(colonias.rows.map((r) => [r.section_id, r.colonias]));
  const filas: FilaDeCobertura[] = pag.map((p) => ({
    seccionId: p.id,
    numero: p.section_num,
    colonias: coloniasDe.get(p.id) ?? [],
    conteo: { coordinador: p.coordinador, representante_general: p.rg, representante_casilla: p.rc },
    nombrados: nombrados.rows
      .filter((n) => n.section_id === p.id)
      .map(
        (n): Nombrado => ({
          id: n.id,
          rol: n.role,
          // Visibles por construcción; si faltara el nombre, no se inventa.
          nombre: n.user_id ? (n.cuenta ?? "Otra estructura") : (n.ciudadano ?? "Ciudadano del padrón"),
          tipo: n.user_id ? "cuenta" : "ciudadano",
          personaId: (n.user_id ?? n.contact_id)!,
          casilla: n.casilla,
          puedeCambiar: puedeCambiarNombrado(alcance, { userId: n.user_id, asignadoPor: n.assigned_by_user_id })
        })
      )
  }));

  const t = totales ?? {};
  const secciones = Number(t.secciones ?? 0);
  return {
    municipio,
    soloSuEstructura,
    totales: {
      secciones,
      conCoordinador: Number(t.con_coordinador ?? 0),
      conRg: Number(t.con_rg ?? 0),
      rc: Number(t.rc ?? 0),
      rcEsperados: secciones * CASILLAS_ESTIMADAS_POR_SECCION,
      sinCoordinador: Number(t.sin_coordinador ?? 0),
      sinRg: Number(t.sin_rg ?? 0),
      sinRc: Number(t.sin_rc ?? 0),
      completas: Number(t.completas ?? 0)
    },
    filas,
    total,
    pagina,
    totalPaginas
  };
}

type Seccion = { id: string; numero: number; municipioId: string | null };

/** La sección, si existe y quien actúa trabaja en su municipio. */
async function seccionParaTrabajar(alcance: UserNetworkScope, seccionId: unknown): Promise<{ seccion: Seccion } | { fallo: Fallo }> {
  if (!esUuid(seccionId)) return { fallo: fallo(404, "No encontramos esa sección.", "sectionId") };
  const [s] = await getDatabaseClient()
    .select({ id: schema.electoralSections.id, numero: schema.electoralSections.sectionNum, municipioId: schema.electoralSections.municipalityId })
    .from(schema.electoralSections)
    .where(eq(schema.electoralSections.id, seccionId))
    .limit(1);
  if (!s) return { fallo: fallo(404, "No encontramos esa sección.", "sectionId") };
  if (!alcance.isMaster) {
    const propio = municipioPropio(alcance);
    if (!propio || propio === (await idDeGeneral())) return { fallo: fallo(403, "Tu cuenta aún no tiene municipio: pídele a la administración que te lo asigne.") };
    if (s.municipioId !== propio) return { fallo: fallo(403, `La sección ${s.numero} es de otro municipio: ahí nombra su estructura.`, "sectionId") };
  }
  return { seccion: s };
}

type ConInsert = Pick<ReturnType<typeof getDatabaseClient>, "insert">;

async function auditar(actor: ActorContext, accion: string, id: string, antes: unknown, despues: unknown, tx: ConInsert = getDatabaseClient()) {
  await tx.insert(schema.auditLogs).values({
    actorUserId: actor.actorId,
    action: accion,
    entityType: "electoral_representative",
    entityId: id,
    correlationId: actor.correlationId,
    beforeData: antes ?? null,
    afterData: despues ?? null
  });
}

export type EntradaDeNombramiento = { seccionId: unknown; rol: unknown; userId?: unknown; contactId?: unknown; casilla?: unknown };

/** Nombrar a una cuenta de su mando o a un ciudadano que ve, en una sección de su municipio. */
export async function nombrar(actor: ActorContext, alcance: UserNetworkScope, e: EntradaDeNombramiento) {
  if (!esRolElectoral(e.rol)) return fallo(400, "Elige qué hará: coordinación, representante general o de casilla.", "role");
  const rol: RolElectoral = e.rol;
  const conCuenta = e.userId !== undefined && e.userId !== null && e.userId !== "";
  const conCiudadano = e.contactId !== undefined && e.contactId !== null && e.contactId !== "";
  if (conCuenta === conCiudadano) return fallo(400, "Elige a una persona: una cuenta de tu gente o un ciudadano.", "persona");
  const leida = rol === "representante_casilla" ? normalizarCasilla(e.casilla) : { ok: true as const, casilla: null };
  if (!leida.ok) return fallo(400, "La casilla se escribe como en el INE: B, C1, E1…", "casilla");
  const casilla = leida.casilla;

  const r = await seccionParaTrabajar(alcance, e.seccionId);
  if ("fallo" in r) return r.fallo;
  const { seccion } = r;
  const db = getDatabaseClient();

  let persona: { userId: string | null; contactId: string | null };
  if (conCuenta) {
    if (!esUuid(e.userId)) return fallo(404, "No encontramos a esa persona.", "userId");
    const [cuenta] = await db
      .select({ id: schema.userProfiles.id, municipioId: schema.userProfiles.municipalityId })
      .from(schema.userProfiles)
      .where(and(eq(schema.userProfiles.id, e.userId), eq(schema.userProfiles.status, "active")))
      .limit(1);
    if (!cuenta) return fallo(404, "No encontramos a esa persona.", "userId");
    // Antes bastaba con que estuviera en lo que se ve (`allowedUserIds`): un capturista ve a sus compañeros,
    // pero nombrar es de quien manda. El maestro nombra a cualquiera.
    if (!alcance.isMaster && !(alcance.commandUserIds ?? []).includes(cuenta.id)) return fallo(403, "Solo puedes nombrar a alguien de tu gente.", "userId");
    persona = { userId: cuenta.id, contactId: null };
  } else {
    // Ligarlo a un ciudadano que no se ve dejaría su nombre a la vista: como si no existiera.
    if (!esUuid(e.contactId) || !(await veCiudadano(alcance, e.contactId))) return fallo(404, "Este ciudadano no pertenece a tu estructura.", "contactId");
    persona = { userId: null, contactId: e.contactId };
  }

  try {
    const fila = await withOutbox(
      "electoral_representative",
      (persona.userId ?? persona.contactId)!,
      "RepresentativeAssigned.v1",
      { sectionId: seccion.id, userId: persona.userId, contactId: persona.contactId, role: rol, casilla },
      actor.actorId,
      async (tx) => {
        const [nueva] = await tx
          .insert(schema.electoralRepresentatives)
          .values({ sectionId: seccion.id, userId: persona.userId, contactId: persona.contactId, role: rol, casilla, assignedByUserId: actor.actorId })
          .returning();
        await auditar(actor, "electoral.assign", nueva!.id, null, { seccion: seccion.numero, rol, casilla, cuenta: persona.userId, ciudadano: persona.contactId }, tx);
        return nueva!;
      }
    );
    return { ok: true as const, nombramiento: fila };
  } catch (error) {
    if (esViolacionUnica(error)) return fallo(409, `Esa persona ya está nombrada en la sección ${seccion.numero}. Cámbiale el rol desde su tarjeta.`, "persona");
    throw error;
  }
}

/** El nombramiento, si quien actúa lo ve (404 si no) y lo puede cambiar (403 si solo lo consulta). */
async function nombramientoParaTrabajar(alcance: UserNetworkScope, id: string) {
  if (!esUuid(id)) return { fallo: fallo(404, "No encontramos ese nombramiento.") } as const;
  const db = getDatabaseClient();
  const visibles = await nombradosVisibles(alcance);
  const [fila] = (
    await db.execute<{ id: string; section_id: string; section_num: number; municipio_id: string | null; role: string; user_id: string | null; contact_id: string | null; casilla: string | null; assigned_by_user_id: string | null }>(sql`
      SELECT er.id::text, er.section_id::text, es.section_num, es.municipality_id::text AS municipio_id, er.role, er.user_id::text,
        er.contact_id::text, er.casilla, er.assigned_by_user_id::text
      FROM electoral_representatives er JOIN electoral_sections es ON es.id = er.section_id
      WHERE er.id = ${id} AND ${visibles}
      LIMIT 1`)
  ).rows;
  if (!fila) return { fallo: fallo(404, "No encontramos ese nombramiento.") } as const;
  // La administración municipal, solo en su municipio (un nombramiento de su gente en otro, no).
  if (!alcance.isMaster && alcance.isAdmin && fila.municipio_id !== alcance.adminMunicipalityId) {
    return { fallo: fallo(403, "Ese nombramiento es de otro municipio.") } as const;
  }
  if (!puedeCambiarNombrado(alcance, { userId: fila.user_id, asignadoPor: fila.assigned_by_user_id })) {
    return { fallo: fallo(403, "Solo consulta: lo nombró otra estructura.") } as const;
  }
  return { fila } as const;
}

/** Cambiar el rol o la casilla. */
export async function cambiarNombramiento(actor: ActorContext, alcance: UserNetworkScope, id: string, cambios: { rol?: unknown; casilla?: unknown }) {
  if (cambios.rol === undefined && cambios.casilla === undefined) return fallo(400, "No hay nada que cambiar.");
  if (cambios.rol !== undefined && !esRolElectoral(cambios.rol)) return fallo(400, "Elige qué hará: coordinación, representante general o de casilla.", "role");
  const cargado = await nombramientoParaTrabajar(alcance, id);
  if ("fallo" in cargado) return cargado.fallo;
  const antes = cargado.fila;
  const rol = cambios.rol ?? antes.role;
  // Un rol viejo fuera del catálogo («Promotor») no se puede guardar otra vez: la regla de la 0029 lo pide.
  if (!esRolElectoral(rol)) return fallo(400, "Elige qué hará: este nombramiento tiene un rol que ya no existe.", "role");
  const leida = rol !== "representante_casilla" ? { ok: true as const, casilla: null } : cambios.casilla === undefined ? { ok: true as const, casilla: antes.casilla } : normalizarCasilla(cambios.casilla);
  if (!leida.ok) return fallo(400, "La casilla se escribe como en el INE: B, C1, E1…", "casilla");
  const casilla = leida.casilla;

  const db = getDatabaseClient();
  const [actualizado] = await db.transaction(async (tx) => {
    const filas = await tx.update(schema.electoralRepresentatives).set({ role: rol, casilla }).where(eq(schema.electoralRepresentatives.id, id)).returning();
    await auditar(actor, "electoral.change", id, { seccion: antes.section_num, rol: antes.role, casilla: antes.casilla }, { seccion: antes.section_num, rol, casilla }, tx);
    return filas;
  });
  if (!actualizado) return fallo(404, "No encontramos ese nombramiento.");
  return { ok: true as const, nombramiento: actualizado };
}

/** Quitar a alguien. La fila se borra; en la auditoría queda a quién, de qué sección, con qué rol y quién. */
export async function quitarNombramiento(actor: ActorContext, alcance: UserNetworkScope, id: string) {
  const cargado = await nombramientoParaTrabajar(alcance, id);
  if ("fallo" in cargado) return cargado.fallo;
  const f = cargado.fila;
  await getDatabaseClient().transaction(async (tx) => {
    await tx.delete(schema.electoralRepresentatives).where(eq(schema.electoralRepresentatives.id, id));
    await auditar(
      actor,
      "electoral.remove",
      id,
      { seccion: f.section_num, rol: f.role, casilla: f.casilla, cuenta: f.user_id, ciudadano: f.contact_id, nombradoPor: f.assigned_by_user_id },
      null,
      tx
    );
  });
  return { ok: true as const };
}

/**
 * A quién se puede nombrar en una sección: si es RC, arriba los ciudadanos visibles que dijeron que quieren
 * ser representantes de casilla (primero los que viven en esa sección); luego su gente; y lo que se busque.
 * Nunca alguien ya nombrado en esa sección.
 */
export async function candidatosParaNombrar(alcance: UserNetworkScope, seccionId: unknown, rol: unknown, q: string): Promise<CandidatosParaNombrar | Fallo> {
  const r = await seccionParaTrabajar(alcance, seccionId);
  if ("fallo" in r) return r.fallo;
  const { seccion } = r;
  const db = getDatabaseClient();
  const texto = q.trim().slice(0, 80);
  const coincide = (columna: SQL) => (texto ? sql`AND ${sinAcentosSql(columna)} LIKE ${patronDeBusqueda(texto)}` : sql``);
  const ciudadanos = await contactosVisibles(alcance);
  const yaNombrados = sql`(SELECT er.contact_id FROM electoral_representatives er WHERE er.section_id = ${seccion.id} AND er.contact_id IS NOT NULL)`;

  const aCiudadano = (c: { id: string; display_name: string; colony: string | null; misma: boolean }): Candidato => ({
    tipo: "ciudadano",
    id: c.id,
    nombre: c.display_name,
    detalle: c.misma ? `Vive en la sección ${seccion.numero}` : decryptData(c.colony) || null
  });

  const sugeridos =
    rol === "representante_casilla"
      ? (
          await db.execute<{ id: string; display_name: string; colony: string | null; misma: boolean }>(sql`
            SELECT ct.id::text, ct.display_name, ct.colony, (ct.section_id = ${seccion.id}) AS misma
            FROM contacts ct
            WHERE ct.status = 'active'
              AND EXISTS (SELECT 1 FROM social_surveys ss WHERE ss.contact_id = ct.id
                          AND (ss.participation_form ILIKE ${PATRON_QUIERE_SER_RC} OR ss.participation_form_other ILIKE ${PATRON_QUIERE_SER_RC}))
              AND ct.id NOT IN ${yaNombrados}
              ${sqlRestriccionContactos(sql`ct.id`, ciudadanos)}
              ${coincide(sql`ct.display_name`)}
            ORDER BY (ct.section_id = ${seccion.id}) DESC NULLS LAST, ct.display_name
            LIMIT 10`)
        ).rows.map(aCiudadano)
      : [];

  // Su gente: el maestro, las cuentas del municipio de la sección; los demás, su mando.
  const mando = alcance.isMaster ? null : (alcance.commandUserIds ?? []);
  const gente =
    mando && mando.length === 0
      ? []
      : (
          await db
            .select({ id: schema.userProfiles.id, nombre: schema.userProfiles.displayName })
            .from(schema.userProfiles)
            .where(
              and(
                eq(schema.userProfiles.status, "active"),
                mando ? inArray(schema.userProfiles.id, mando) : seccion.municipioId ? eq(schema.userProfiles.municipalityId, seccion.municipioId) : sql`false`,
                sql`${schema.userProfiles.id} NOT IN (SELECT er.user_id FROM electoral_representatives er WHERE er.section_id = ${seccion.id} AND er.user_id IS NOT NULL)`,
                texto ? sql`${sinAcentosSql(schema.userProfiles.displayName)} LIKE ${patronDeBusqueda(texto)}` : undefined
              )
            )
            .orderBy(schema.userProfiles.displayName)
            .limit(20)
        ).map((u): Candidato => ({ tipo: "cuenta", id: u.id, nombre: u.nombre, detalle: null }));

  const yaSugeridos = new Set(sugeridos.map((s) => s.id));
  const buscados =
    texto.length >= 2
      ? (
          await db.execute<{ id: string; display_name: string; colony: string | null; misma: boolean }>(sql`
            SELECT ct.id::text, ct.display_name, ct.colony, (ct.section_id = ${seccion.id}) AS misma
            FROM contacts ct
            WHERE ct.status = 'active' AND ct.id NOT IN ${yaNombrados}
              ${sqlRestriccionContactos(sql`ct.id`, ciudadanos)}
              ${coincide(sql`ct.display_name`)}
            ORDER BY (ct.section_id = ${seccion.id}) DESC NULLS LAST, ct.display_name
            LIMIT 12`)
        ).rows
          .map(aCiudadano)
          .filter((c) => !yaSugeridos.has(c.id))
          .slice(0, 10)
      : [];

  return { sugeridos, gente, ciudadanos: buscados };
}

