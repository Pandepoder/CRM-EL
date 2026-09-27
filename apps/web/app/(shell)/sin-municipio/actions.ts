"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";

import { consultaDeConteoEnGeneral, schema, TABLAS_CON_MUNICIPIO, type ClaveDeTabla } from "@tonala/shared/database";

import { Role } from "@tonala/shared/auth";

import { actorFromSession } from "@/lib/api-helpers";
import { getDatabaseClient } from "@/lib/db-client";
import { esUuid } from "@/lib/ids";
import { buscarMunicipio } from "@/lib/municipios-jalisco";
import { registrarError } from "@/lib/registro";

export type EstadoDeAsignacion = { ok: boolean; mensaje: string } | null;

/** Con qué nombre queda cada tabla en `audit_logs`, como en el resto del sistema. */
const ENTIDAD: Record<ClaveDeTabla, string> = {
  personas: "user_profile",
  equipos: "team",
  ciudadanos: "contact",
  incidencias: "event_report",
  almacenes: "warehouse",
  catalogo: "activity_catalog_option",
  escucha: "social_listening",
  prospectos: "rapid_activity_prospect"
};

const MAXIMO = 500;

/** Un campo del formulario como texto; un archivo no es un texto válido. */
const texto = (valor: FormDataEntryValue | null) => (typeof valor === "string" ? valor : "");

/**
 * Asigna un municipio a filas que están en General.
 *
 * Solo toca filas en General: esto **asigna**, no cambia un municipio ya puesto —eso será del
 * administrador maestro, en la etapa 6—. Personas, equipos, incidencias y ciudadanos llevan además
 * su municipio escrito, que se pone igual para que no digan otra cosa. Al asignar a una persona, lo
 * que ella registró y estaba en General solo por eso la sigue (lo hace la base, migración 0022); el
 * mensaje lo cuenta. Todo en una transacción y con una fila de auditoría por cada asignación.
 *
 * Devuelve el resultado en vez de lanzarlo: en producción Next oculta el mensaje de lo que lanza una
 * acción de servidor.
 */
export async function asignarMunicipioAction(_previo: EstadoDeAsignacion, datos: FormData): Promise<EstadoDeAsignacion> {
  const actor = await actorFromSession();
  // Lo que está en General no es de ningún municipio, y cambiar a alguien de municipio es del
  // administrador maestro (etapa 6).
  if (!actor || !actor.roles.includes(Role.MasterAdmin)) return { ok: false, mensaje: "Solo el administrador maestro asigna municipios." };

  const clave = texto(datos.get("tabla")) as ClaveDeTabla;
  const tabla = TABLAS_CON_MUNICIPIO.find((t) => t.clave === clave);
  if (!tabla) return { ok: false, mensaje: "Esa lista no existe." };

  const ids = [...new Set(datos.getAll("ids").map(texto))];
  if (ids.length === 0) return { ok: false, mensaje: "Marca al menos una fila." };
  if (ids.length > MAXIMO) return { ok: false, mensaje: `Son muchas a la vez: marca como máximo ${MAXIMO}.` };
  if (!ids.every(esUuid)) return { ok: false, mensaje: "Alguna de las filas marcadas no existe." };

  const nombre = buscarMunicipio(texto(datos.get("municipio")))?.name;
  if (!nombre) return { ok: false, mensaje: "Elige un municipio de la lista." };

  const db = getDatabaseClient();
  try {
    const resultado = await db.transaction(async (tx) => {
      const [municipio] = await tx
        .select({ id: schema.municipalities.id })
        .from(schema.municipalities)
        .where(and(eq(schema.municipalities.name, nombre), eq(schema.municipalities.kind, "municipio")));
      const [general] = await tx.select({ id: schema.municipalities.id }).from(schema.municipalities).where(eq(schema.municipalities.kind, "general"));
      if (!municipio || !general) return null;

      const enGeneral = async () =>
        ((await tx.execute(sql.raw(`SELECT sum(en_general)::int AS n FROM (${consultaDeConteoEnGeneral()}) t`))).rows[0] as { n: number }).n;
      const antes = await enGeneral();

      const m = municipio.id;
      let asignadas: { id: string }[];
      switch (clave) {
        case "personas": {
          const t = schema.userProfiles;
          asignadas = await tx.update(t).set({ municipalityId: m, municipality: nombre, updatedAt: new Date() })
            .where(and(inArray(t.id, ids), eq(t.municipalityId, general.id), eq(t.isMasterAdmin, false))).returning({ id: t.id });
          break;
        }
        case "equipos": {
          const t = schema.teams;
          asignadas = await tx.update(t).set({ municipalityId: m, municipality: nombre })
            .where(and(inArray(t.id, ids), eq(t.municipalityId, general.id))).returning({ id: t.id });
          break;
        }
        case "ciudadanos": {
          // Un ciudadano en General no tiene sección cartografiada: con una, la base le habría puesto
          // la de su sección, que manda siempre.
          const t = schema.contacts;
          asignadas = await tx.update(t).set({ municipalityId: m, municipality: nombre })
            .where(and(inArray(t.id, ids), eq(t.municipalityId, general.id))).returning({ id: t.id });
          break;
        }
        case "incidencias": {
          const t = schema.eventReports;
          asignadas = await tx.update(t).set({ municipalityId: m, municipality: nombre, updatedAt: new Date() })
            .where(and(inArray(t.id, ids), eq(t.municipalityId, general.id))).returning({ id: t.id });
          break;
        }
        case "almacenes": {
          const t = schema.warehouses;
          asignadas = await tx.update(t).set({ municipalityId: m })
            .where(and(inArray(t.id, ids), eq(t.municipalityId, general.id))).returning({ id: t.id });
          break;
        }
        case "catalogo": {
          const t = schema.activityCatalogOptions;
          asignadas = await tx.update(t).set({ municipalityId: m })
            .where(and(inArray(t.id, ids), eq(t.municipalityId, general.id), eq(t.isSystem, false), eq(t.scope, "network"))).returning({ id: t.id });
          break;
        }
        case "escucha": {
          const t = schema.socialListening;
          asignadas = await tx.update(t).set({ municipalityId: m })
            .where(and(inArray(t.id, ids), eq(t.municipalityId, general.id))).returning({ id: t.id });
          break;
        }
        case "prospectos": {
          const t = schema.rapidActivityProspects;
          asignadas = await tx.update(t).set({ municipalityId: m, updatedAt: new Date() })
            .where(and(inArray(t.id, ids), eq(t.municipalityId, general.id))).returning({ id: t.id });
          break;
        }
      }

      if (asignadas.length > 0) {
        await tx.insert(schema.auditLogs).values(
          asignadas.map((f) => ({
            actorUserId: actor.actorId,
            action: "municipality.assign",
            entityType: ENTIDAD[clave],
            entityId: f.id,
            correlationId: actor.correlationId,
            beforeData: { municipio: "General (estatal)" },
            afterData: { municipio: nombre }
          }))
        );
      }
      const despues = await enGeneral();
      return { asignadas: asignadas.length, arrastradas: Math.max(0, antes - despues - asignadas.length) };
    });

    if (!resultado) return { ok: false, mensaje: "Ese municipio no está en el catálogo." };
    revalidatePath("/sin-municipio");
    if (resultado.asignadas === 0) {
      return { ok: false, mensaje: "Ninguna de las filas marcadas seguía en General: ya las había asignado alguien más." };
    }
    const extra = resultado.arrastradas > 0 ? ` Con ellas salieron de General ${resultado.arrastradas} registro(s) suyos.` : "";
    const faltaron = ids.length - resultado.asignadas;
    const aviso = faltaron > 0 ? ` ${faltaron} ya no estaba(n) en General y no se tocaron.` : "";
    return { ok: true, mensaje: `${resultado.asignadas} asignada(s) a ${nombre}.${extra}${aviso}` };
  } catch (error) {
    registrarError("sin-municipio.asignar", error);
    return { ok: false, mensaje: "No se pudo guardar. Intenta de nuevo." };
  }
}
