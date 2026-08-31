import { type NextRequest } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema, decryptData } from "@tonala/shared/database";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { like, or, eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const actor = await actorFromSession();
  if (!actor) {
    return unauthorized();
  }

  const isGlobal = actor.roles.includes("admin") || actor.roles.includes("direction") || actor.isSystem;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const db = getDatabaseClient();
  const conditions = [eq(schema.contacts.status, "active")];

  if (!isGlobal) {
    conditions.push(or(
      eq(schema.contacts.createdByUserId, actor.actorId as string),
      eq(schema.contacts.referredByUserId, actor.actorId as string)
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
