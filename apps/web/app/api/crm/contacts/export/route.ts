import { contactosVisibles, contactIdRestriction } from "@/lib/contact-visibility";
import { type NextRequest } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema, decryptData, patronDeBusqueda, sinAcentosSql } from "@tonala/shared/database";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { eq, and, asc, count, sql } from "drizzle-orm";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Cuántos ciudadanos puede llevarse una exportación. Sin tope, cualquiera con permiso de lectura
 * descargaba todo su padrón visible, descifrado, y no quedaba constancia (A13). Administración trabaja
 * con su municipio entero; el resto, con su estructura.
 */
const TOPE_ADMINISTRACION = 50_000;
const TOPE_ESTRUCTURA = 2_000;

export async function GET(req: NextRequest) {
  const actor = await actorFromSession();
  if (!actor) {
    return unauthorized();
  }

  // La exportación se lleva los datos fuera del sistema, así que respeta el
  // mismo alcance que el directorio. Antes Dirección exportaba la base entera;
  // ahora exporta lo de sus equipos, y quien no tiene equipo, lo suyo.
  const alcance = await resolveUserNetworkScope(actor.actorId);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const db = getDatabaseClient();
  const conditions = [eq(schema.contacts.status, "active")];

  const restriction = contactIdRestriction(await contactosVisibles(alcance));
  if (restriction) conditions.push(restriction);

  // El nombre como lo busca el Directorio: sin acentos ni mayúsculas, y un «%» escrito se busca tal
  // cual. Antes era un LIKE con el texto crudo.
  const busqueda = q?.trim().slice(0, 120);
  if (busqueda) {
    conditions.push(sql`${sinAcentosSql(schema.contacts.displayName)} LIKE ${patronDeBusqueda(busqueda)}`);
  }

  const tope = alcance.isAdmin ? TOPE_ADMINISTRACION : TOPE_ESTRUCTURA;
  const [{ total } = { total: 0 }] = await db.select({ total: count() }).from(schema.contacts).where(and(...conditions));
  if (total > tope) {
    return new Response(
      `Son ${total.toLocaleString("es-MX")} ciudadanos y una exportación lleva como máximo ${tope.toLocaleString("es-MX")}. ` +
        "Acota la búsqueda del Directorio y vuelve a exportar.",
      { status: 413, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  const rawContacts = await db
    .select()
    .from(schema.contacts)
    .where(and(...conditions))
    .orderBy(asc(schema.contacts.createdAt));

  // Llevarse datos fuera del sistema queda en la auditoría: quién, cuántos y con qué búsqueda.
  await db.insert(schema.auditLogs).values({
    actorUserId: actor.actorId,
    action: "contacts.export",
    entityType: "user_profile",
    entityId: actor.actorId,
    correlationId: actor.correlationId,
    beforeData: null,
    afterData: { ciudadanos: rawContacts.length, busqueda: busqueda || null }
  });

  const rows = rawContacts.map(c => {
    return {
      nombre_completo: c.displayName,
      telefono: decryptData(c.phone),
      email: decryptData(c.email),
      colonia: decryptData(c.colony),
      profesion: decryptData(c.profession),
      habilidad: decryptData(c.skill),
      disponibilidad: decryptData(c.availability),
      intereses: decryptData(c.interests),
      fecha_registro: c.createdAt.toISOString()
    };
  });

  const headers = [
    "Nombre Completo", "Teléfono", "Email", "Colonia", "Profesión", 
    "Habilidad", "Disponibilidad", "Intereses", "Fecha Registro"
  ];

  const escapeCsv = (str: string | null | undefined) => {
    if (!str) return '""';
    let clean = str.toString();
    // Neutralize Formula Injection / DDE execution in Excel
    if (/^[=+\-@\t\r]/.test(clean)) {
      clean = `'${clean}`;
    }
    return `"${clean.replace(/"/g, '""')}"`;
  };

  const csvRows = rows.map(r => [
    escapeCsv(r.nombre_completo),
    escapeCsv(r.telefono),
    escapeCsv(r.email),
    escapeCsv(r.colonia),
    escapeCsv(r.profesion),
    escapeCsv(r.habilidad),
    escapeCsv(r.disponibilidad),
    escapeCsv(r.intereses),
    escapeCsv(r.fecha_registro)
  ].join(","));

  const csvString = [headers.join(","), ...csvRows].join("\r\n");
  const bom = "\uFEFF";
  
  return new Response(bom + csvString, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="padron_ciudadano_${new Date().toISOString().split('T')[0]}.csv"`
    }
  });
}
