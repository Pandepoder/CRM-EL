import { eq } from "drizzle-orm";
import { schema } from "@tonala/shared/database";

import { puedeAbrir, rolesDeAcceso } from "@tonala/ui";

import { getDatabaseClient } from "./db-client";
import type { UserNetworkScope } from "./network-hierarchy";

/**
 * Los equipos reales de una persona, para su perfil.
 *
 * El perfil buscaba solo el equipo que la persona dirige y, si no dirigía ninguno, inventaba uno: «Equipo
 * de Raúl», con el id de la persona como id del equipo. A un capturista le salía un equipo que no existe y
 * «Ver su Equipo» lo llevaba a `/admin-equipos/<su propio id>`, que lo rebotaba al Directorio (auditoría
 * del 2026-10-15, A3). Ahora salen los que dirige y aquellos de los que es integrante.
 */
export type EquipoDePersona = {
  id: string;
  nombre: string;
  /** La persona lo dirige (si no, es integrante). */
  lidera: boolean;
  /** Quien mira lo puede abrir en «Equipos»: la misma regla que `admin-equipos/[id]`. */
  enlazable: boolean;
};

export async function equiposDePersona(personaId: string, quienMira: UserNetworkScope): Promise<EquipoDePersona[]> {
  const db = getDatabaseClient();
  const [dirige, integra] = await Promise.all([
    db.select({ id: schema.teams.id, nombre: schema.teams.name }).from(schema.teams).where(eq(schema.teams.leaderId, personaId)),
    db
      .select({ id: schema.teams.id, nombre: schema.teams.name })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teams.id, schema.teamMembers.teamId))
      .where(eq(schema.teamMembers.userId, personaId))
  ]);
  const abreEquipos = rolesDeAcceso(quienMira.roleKey, quienMira.isMaster).some((r) => puedeAbrir("/admin-equipos", r));
  const enlazable = (id: string) => abreEquipos && (quienMira.isMaster || quienMira.teamIds.includes(id));

  const vistos = new Set<string>();
  const salida: EquipoDePersona[] = [];
  for (const [lista, lidera] of [[dirige, true], [integra, false]] as const) {
    for (const e of [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))) {
      if (vistos.has(e.id)) continue;
      vistos.add(e.id);
      salida.push({ id: e.id, nombre: e.nombre, lidera, enlazable: enlazable(e.id) });
    }
  }
  return salida;
}
