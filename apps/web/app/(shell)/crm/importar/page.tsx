import { and, eq, inArray } from "drizzle-orm";
import Link from "next/link";

import { schema } from "@tonala/shared/database";

import { requirePageAccess } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { contextoDeImportacion, pendientesDeUbicar } from "@/lib/importar-ciudadanos-servicio";
import { nombreDelNivel } from "@/lib/lenguaje";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { getServerSession } from "@/lib/session-server";

import ImportarClient from "./ImportarClient";

/**
 * Importar ciudadanos desde un Excel. Solo administración: el maestro a cualquier municipio, un administrador
 * municipal al suyo. La lógica está en `lib/importar-ciudadanos-servicio.ts`; aquí, lo que la pantalla necesita
 * para empezar: el municipio, la gente que puede atenderlos y lo importado que sigue sin ubicar.
 */
export default async function ImportarPage() {
  await requirePageAccess("/crm/importar");
  const session = await getServerSession();
  const alcance = await resolveUserNetworkScope(session.userId);
  const abierto = await contextoDeImportacion(alcance);

  if (!abierto.ok) {
    return (
      <div className="max-w-xl mx-auto p-4 md:p-8 space-y-4">
        <h1 className="text-2xl font-black text-slate-900">Importar desde Excel</h1>
        <p className="text-sm text-slate-600">{abierto.message}</p>
        <Link href="/crm/contacts" className="inline-flex min-h-11 items-center font-bold text-blue-700">
          Volver al Directorio
        </Link>
      </div>
    );
  }

  const u = schema.userProfiles;
  const personas = await getDatabaseClient()
    .select({ id: u.id, nombre: u.displayName, nivel: u.accessType, municipio: schema.municipalities.name })
    .from(u)
    .leftJoin(schema.municipalities, eq(schema.municipalities.id, u.municipalityId))
    .where(and(eq(u.status, "active"), alcance.isMaster ? undefined : inArray(u.id, alcance.teammateUserIds)))
    .orderBy(u.displayName);

  return (
    <ImportarClient
      municipioPropio={abierto.contexto.municipioPropio}
      personas={personas.map((p) => ({ id: p.id, nombre: p.nombre, nivel: nombreDelNivel(p.nivel), municipio: p.municipio ?? null }))}
      pendientes={await pendientesDeUbicar(session.userId)}
    />
  );
}
