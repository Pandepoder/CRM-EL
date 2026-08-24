import { NextRequest } from "next/server";
import { getDatabaseClient } from "@/lib/db-client";
import { schema, decryptData } from "@tonala/shared/database";
import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { like } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const actor = await actorFromSession();
  if (!actor || (!actor.roles.includes("admin") && !actor.roles.includes("direction"))) {
    return unauthorized();
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const db = getDatabaseClient();
  let query = db.select().from(schema.contacts);

  if (q) {
    query = query.where(like(schema.contacts.displayName, `%${q}%`)) as any;
  }

  const rawContacts = await query;

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
    "Nombre Completo", "Tel�fono", "Email", "Colonia", "Profesi�n", 
    "Habilidad", "Disponibilidad", "Intereses", "Fecha Registro"
  ];

  const escapeCsv = (str: string | null | undefined) => {
    if (!str) return '""';
    return `"${str.toString().replace(/"/g, '""')}"`;
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
