import { and, count, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";

import { huellasParaBuscarTelefono, patronDeBusqueda, schema, sinAcentosSql } from "@tonala/shared/database";

import { contactIdRestriction, contactosVisibles } from "./contact-visibility";
import { getDatabaseClient } from "./db-client";
import { POR_PAGINA_DIRECTORIO, type FiltrosDelDirectorio } from "./directorio-filtros";
import type { UserNetworkScope } from "./network-hierarchy";
import { puedeVerPerfil } from "./perfil";
import { contactoSinUbicacionEnMapa } from "./ubicacion-contacto";

/**
 * La lista del Directorio: una página de los ciudadanos que quien mira puede ver, con sus filtros. La usan la
 * pantalla (la primera página) y `POST /api/directorio/consulta` (todo lo demás, con el texto del buscador en el
 * cuerpo). Antes vivía en la pantalla y el buscador viajaba en la dirección web (observación O2).
 */

export type FilaDelDirectorio = {
  id: string;
  contactId: string;
  displayName: string;
  phone: string | null;
  colony: string | null;
  municipality: string | null;
  profession: string | null;
  interests: string | null;
  origin: string | null;
  panMilitancy: string | null;
  createdAt: string;
  createdByUserId: string | null;
  sectionNum: number | null;
  municipio: string;
  municipioTipo: string;
};

export type PaginaDelDirectorio = {
  filas: FilaDelDirectorio[];
  total: number;
  totalPaginas: number;
  pagina: number;
  /** «Registrados por…»: solo si quien mira puede abrir el perfil de esa persona; si no, `null`. */
  registro: { id: string; nombre: string } | null;
};

export async function consultarDirectorio(alcance: UserNetworkScope, f: FiltrosDelDirectorio): Promise<PaginaDelDirectorio> {
  const db = getDatabaseClient();

  // Las condiciones se acumulan y se aplican de una sola vez. Encadenar varios `.where()` sobre una consulta
  // `$dynamic()` no las suma: cada llamada SUSTITUYE a la anterior. Eso significaba que en cuanto se escribía
  // algo en el buscador, el filtro de red desaparecía y el directorio devolvía todos los contactos de la base.
  // Comprobado: un capturista con cero contactos a su nombre veía 25 registros ajenos con solo teclear una letra.
  const condiciones: SQL[] = [eq(schema.contacts.status, "active")];

  const restriccion = contactIdRestriction(await contactosVisibles(alcance));
  if (restriccion) condiciones.push(restriccion);

  // Nombre, teléfono completo, colonia o número de sección. Antes solo encontraba por nombre: teléfono y colonia
  // van cifrados y el `ILIKE` sobre ellos nunca coincidía (C22). Ver `packages/shared/database/busqueda.ts`.
  const texto = f.q.trim();
  if (texto) {
    const patron = patronDeBusqueda(texto);
    const alternativas: SQL[] = [
      sql`${sinAcentosSql(schema.contacts.displayName)} LIKE ${patron}`,
      sql`EXISTS (
        SELECT 1 FROM ${schema.contactTerritory} ct
        JOIN ${schema.colonies} col ON col.id = ct.colony_id
        WHERE ct.contact_id = ${schema.contacts.id} AND ${sinAcentosSql(sql`col.name`)} LIKE ${patron}
      )`
    ];
    const huellas = huellasParaBuscarTelefono(texto);
    if (huellas.length > 0) alternativas.push(inArray(schema.contacts.phoneHash, huellas));
    if (/^\d{1,5}$/.test(texto)) alternativas.push(eq(schema.electoralSections.sectionNum, Number(texto)));
    condiciones.push(or(...alternativas)!);
  }

  // «Asignados a mí»: lo que ofrecía la pantalla suelta /equipo/mis-contactos, ahora como filtro (M14).
  if (f.soloAsignados) {
    condiciones.push(sql`EXISTS (
      SELECT 1 FROM ${schema.contactAssignments} ca
      WHERE ca.contact_id = ${schema.contacts.id}
        AND ca.assigned_user_id = ${alcance.userId}
        AND ca.assignment_status = 'active'
    )`);
  }
  // La militancia se filtra en la base: si no, el total y las páginas contaban a todo el padrón.
  if (f.militancia) condiciones.push(eq(schema.contacts.panMilitancy, f.militancia));
  // «Sin ubicación»: los que el mapa no puede dibujar (C21); misma regla que su conteo.
  if (f.sinUbicacion) condiciones.push(contactoSinUbicacionEnMapa);
  // «Registrados por…» (fase 6): solo personas cuyo perfil puede abrir quien mira; un id ajeno o inventado se
  // ignora sin decir si existe. Lo que se ve sigue recortado por el alcance de arriba.
  let registro: PaginaDelDirectorio["registro"] = null;
  if (f.registro && (await puedeVerPerfil(alcance, f.registro))) {
    const [persona] = await db
      .select({ nombre: schema.userProfiles.displayName })
      .from(schema.userProfiles)
      .where(eq(schema.userProfiles.id, f.registro))
      .limit(1);
    if (persona) {
      registro = { id: f.registro, nombre: persona.nombre };
      condiciones.push(or(eq(schema.contacts.createdByUserId, f.registro), eq(schema.contacts.referredByUserId, f.registro))!);
    }
  }

  // Se cuenta y se pagina en la base: antes se traían y descifraban TODOS los visibles para enseñar 25.
  const filtro = and(...condiciones);
  const [conteo] = await db
    .select({ total: count() })
    .from(schema.contacts)
    .leftJoin(schema.electoralSections, eq(schema.contacts.sectionId, schema.electoralSections.id))
    .where(filtro);

  // Con desempate por id: con la misma fecha de alta, el orden de la base no es estable y una ficha podía salir
  // en dos páginas (o en ninguna).
  const filas = await db
    .select({
      id: schema.contacts.id,
      contactId: schema.contacts.id,
      displayName: schema.contacts.displayName,
      phone: schema.contacts.phone,
      colony: schema.contacts.colony,
      municipality: schema.contacts.municipality,
      profession: schema.contacts.profession,
      interests: schema.contacts.interests,
      origin: schema.contacts.origin,
      panMilitancy: schema.contacts.panMilitancy,
      createdAt: schema.contacts.createdAt,
      createdByUserId: schema.contacts.createdByUserId,
      sectionNum: schema.electoralSections.sectionNum,
      // La llave de municipio (0022): el municipio que cuenta, y General a la vista.
      municipio: schema.municipalities.name,
      municipioTipo: schema.municipalities.kind
    })
    .from(schema.contacts)
    .leftJoin(schema.electoralSections, eq(schema.contacts.sectionId, schema.electoralSections.id))
    .innerJoin(schema.municipalities, eq(schema.municipalities.id, schema.contacts.municipalityId))
    .where(filtro)
    .orderBy(desc(schema.contacts.createdAt), desc(schema.contacts.id))
    .limit(POR_PAGINA_DIRECTORIO)
    .offset((f.pagina - 1) * POR_PAGINA_DIRECTORIO);

  const total = Number(conteo?.total ?? 0);
  return {
    filas: filas.map((c) => ({ ...c, createdAt: (c.createdAt instanceof Date ? c.createdAt : new Date(c.createdAt)).toISOString() })),
    total,
    totalPaginas: Math.max(1, Math.ceil(total / POR_PAGINA_DIRECTORIO)),
    pagina: f.pagina,
    registro
  };
}
