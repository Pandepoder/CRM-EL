import { contactosVisibles, contactIdRestriction } from "@/lib/contact-visibility";
import { getDatabaseClient } from "@/lib/db-client";
import { getServerSession } from "@/lib/session-server";
import { schema, huellasParaBuscarTelefono, patronDeBusqueda, sinAcentosSql } from "@tonala/shared/database";
import { and, count, eq, or, desc, inArray, sql, type SQL } from "drizzle-orm";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { contactoSinUbicacionEnMapa } from "@/lib/ubicacion-contacto";
import { asegurarEnlacePersonal } from "@/lib/personal-slug";
import DirectorioClient from "./DirectorioClient";

const PAGE_SIZE = 25;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; asignados?: string; pan?: string; ubicacion?: string }>;
}) {
  const session = await getServerSession();

  const { q = "", page = "1", asignados = "", pan = "", ubicacion = "" } = await searchParams;
  const soloAsignados = asignados === "mios";
  const sinUbicacion = ubicacion === "sin";
  const militancia = pan === "confirmada" || pan === "declarada" ? pan : "";
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const db = getDatabaseClient();

  // 1. Fetch current user profile to get slug
  const userRows = await db
    .select({
      id: schema.userProfiles.id,
      displayName: schema.userProfiles.displayName,
      personalSlug: schema.userProfiles.personalSlug
    })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.id, session.userId))
    .limit(1);

  const currentUser = userRows[0];

  // 2. Resolve network scope for 3-tier visibility
  const networkScope = await resolveUserNetworkScope(session.userId);

  // 3. Query contacts with network restriction
  //
  // Las condiciones se acumulan y se aplican de una sola vez. Encadenar varios
  // `.where()` sobre una consulta `$dynamic()` no las suma: cada llamada
  // SUSTITUYE a la anterior. Aquí eso significaba que en cuanto se escribía algo
  // en el buscador, el filtro de red desaparecía y el directorio devolvía todos
  // los contactos de la base. Comprobado: un capturista con cero contactos a su
  // nombre veía 25 registros ajenos con solo teclear una letra.
  const condiciones: SQL[] = [eq(schema.contacts.status, "active")];

  const restriction = contactIdRestriction(await contactosVisibles(networkScope));
  if (restriction) condiciones.push(restriction);

  // Nombre, teléfono completo, colonia o número de sección. Antes solo encontraba por nombre:
  // teléfono y colonia van cifrados y el `ILIKE` sobre ellos nunca coincidía (C22). Ver
  // `packages/shared/database/busqueda.ts`.
  const texto = q.trim();
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

  // «Asignados a mí»: lo que ofrecía la pantalla suelta /equipo/mis-contactos, sin estilos y fuera
  // del menú (M14), ahora como filtro del Directorio.
  if (soloAsignados) {
    condiciones.push(sql`EXISTS (
      SELECT 1 FROM ${schema.contactAssignments} ca
      WHERE ca.contact_id = ${schema.contacts.id}
        AND ca.assigned_user_id = ${session.userId}
        AND ca.assignment_status = 'active'
    )`);
  }
  // La militancia se filtraba en el navegador, sobre las 25 filas de la página: el total y las
  // páginas seguían contando a todo el padrón.
  if (militancia) condiciones.push(eq(schema.contacts.panMilitancy, militancia));
  // «Sin ubicación»: los que el mapa no puede dibujar. El aviso del mapa enlaza aquí para corregirlos
  // (C21); misma regla que su conteo. Las dos consultas de abajo ya unen la sección.
  if (sinUbicacion) condiciones.push(contactoSinUbicacionEnMapa);

  // Se cuenta y se pagina en la base. Antes se traían TODOS los ciudadanos visibles —descifrando
  // teléfono, colonia, municipio, profesión e intereses de cada uno— para enseñar 25: con el padrón
  // completo, cada vista del Directorio descifraba más de tres mil fichas.
  const filtro = and(...condiciones);
  const [conteo] = await db
    .select({ total: count() })
    .from(schema.contacts)
    .leftJoin(schema.electoralSections, eq(schema.contacts.sectionId, schema.electoralSections.id))
    .where(filtro);

  const query = db
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
    .where(filtro);

  // Con desempate por id: con la misma fecha de alta, el orden de la base no es estable y una
  // ficha podía salir en dos páginas (o en ninguna).
  const paginatedContacts = await query
    .orderBy(desc(schema.contacts.createdAt), desc(schema.contacts.id))
    .limit(PAGE_SIZE)
    .offset(offset);
  const totalCount = Number(conteo?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <DirectorioClient
      contactsList={paginatedContacts}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={currentPage}
      q={q}
      soloAsignados={soloAsignados}
      militancia={militancia}
      sinUbicacion={sinUbicacion}
      userSlug={(currentUser ? await asegurarEnlacePersonal(currentUser.id, currentUser.displayName, currentUser.personalSlug) : null) || ""}
      userName={currentUser?.displayName || "Mi Usuario"}
      userAccessType={networkScope.isAdmin ? "coordinacion" : networkScope.isLeader ? "enlace" : "conexion"}
    />
  );
}
