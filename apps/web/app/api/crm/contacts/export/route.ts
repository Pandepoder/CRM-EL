import { type NextRequest } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema, decryptData } from "@tonala/shared/database";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { like, or, eq, and, inArray } from "drizzle-orm";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

export async function GET(req: NextRequest) {
  const actor = await actorFromSession();
  if (!actor) {
    return unauthorized();
  }

  // La exportación se lleva los datos fuera del sistema, así que respeta el
  // mismo alcance que el directorio. Antes Dirección exportaba la base entera;
  // ahora exporta lo de sus equipos, y quien no tiene equipo, lo suyo.
  const alcance = await resolveUserNetworkScope(actor.actorId);
  const isGlobal = alcance.isGlobal || actor.isSystem;
  const enAlcance = alcance.allowedUserIds ?? [actor.actorId];

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const db = getDatabaseClient();
  const conditions = [eq(schema.contacts.status, "active")];

  if (!isGlobal) {
    conditions.push(or(
      inArray(schema.contacts.createdByUserId, enAlcance),
      inArray(schema.contacts.referredByUserId, enAlcance)
    )!);
  }

  if (q) {
    conditions.push(like(schema.contacts.displayName, `%${q}%`));
  }

  const rawContacts = await db
    .select()
    .from(schema.contacts)
    .where(and(...conditions));

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
