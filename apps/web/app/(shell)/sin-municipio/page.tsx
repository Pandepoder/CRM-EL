import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { MapPinOff } from "lucide-react";

import { consultaDeConteoEnGeneral, schema, TABLAS_CON_MUNICIPIO, type ClaveDeTabla } from "@tonala/shared/database";

import { requirePageAccess } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";

import { AsignarMunicipio, type FilaSinMunicipio } from "./AsignarMunicipio";

/**
 * Sin municipio confirmado (etapa 5).
 *
 * Todo registro lleva llave de municipio desde la migración 0022. Lo que no se pudo ubicar —una
 * persona sin municipio ni equipo, un ciudadano sin sección registrado por ella— quedó en General,
 * a la vista, en vez de en nulo o en un municipio inventado. Aquí se le asigna el suyo.
 *
 * Solo el administrador maestro (etapa 6): lo que está en General no es de ningún municipio, y
 * cambiar a alguien de municipio es suyo. Él mismo está en General a propósito y no sale aquí.
 */

const POR_VISTA = 100;

type Conteo = { clave: ClaveDeTabla; total: number; en_general: number };

export default async function SinMunicipioPage({ searchParams }: { searchParams: Promise<{ tabla?: string }> }) {
  await requirePageAccess("/sin-municipio");
  const db = getDatabaseClient();

  const conteos = (await db.execute(sql.raw(consultaDeConteoEnGeneral()))).rows as Conteo[];
  const enGeneral = (clave: ClaveDeTabla) => conteos.find((c) => c.clave === clave)?.en_general ?? 0;
  const totalEnGeneral = conteos.reduce((n, c) => n + c.en_general, 0);

  const pedida = (await searchParams).tabla;
  const clave: ClaveDeTabla =
    TABLAS_CON_MUNICIPIO.find((t) => t.clave === pedida)?.clave ??
    TABLAS_CON_MUNICIPIO.find((t) => enGeneral(t.clave) > 0)?.clave ??
    "personas";
  const filas = await filasEnGeneral(clave);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <MapPinOff size={22} className="text-amber-600" /> Sin municipio confirmado
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl">
          Todo registro lleva su municipio. Lo que no se pudo ubicar está en <strong>General</strong>, a la vista, en vez de
          quedarse vacío o en un municipio inventado. Asígnale el suyo. Al asignar a una persona, lo que ella registró y estaba
          en General por no tener municipio la sigue.
        </p>
      </header>

      <nav aria-label="Qué revisar" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TABLAS_CON_MUNICIPIO.map((t) => {
          const n = enGeneral(t.clave);
          const activa = t.clave === clave;
          return (
            <Link
              key={t.clave}
              href={`/sin-municipio?tabla=${t.clave}`}
              aria-current={activa ? "page" : undefined}
              className={`rounded-xl border px-3 py-2.5 no-underline ${activa ? "border-slate-900 bg-slate-900 text-white" : n > 0 ? "border-amber-300 bg-amber-50 text-amber-950" : "border-slate-200 bg-white text-slate-500"}`}
            >
              <div className="text-[20px] font-black leading-none">{n.toLocaleString("es-MX")}</div>
              <div className="text-[11px] font-bold mt-1">{t.etiqueta}</div>
            </Link>
          );
        })}
      </nav>

      {totalEnGeneral === 0 ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-900">Todo tiene municipio. No hay nada que asignar.</p>
      ) : (
        <AsignarMunicipio
          key={clave}
          tabla={clave}
          etiqueta={TABLAS_CON_MUNICIPIO.find((t) => t.clave === clave)!.etiqueta}
          filas={filas}
          total={enGeneral(clave)}
        />
      )}
    </div>
  );
}

/** Las filas en General de una tabla, con lo necesario para reconocerlas. */
async function filasEnGeneral(clave: ClaveDeTabla): Promise<FilaSinMunicipio[]> {
  const db = getDatabaseClient();
  const general = sql`(SELECT id FROM municipalities WHERE kind = 'general')`;
  const fecha = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);

  switch (clave) {
    case "personas": {
      const t = schema.userProfiles;
      const filas = await db
        .select({
          id: t.id,
          nombre: t.displayName,
          correo: t.email,
          rol: schema.roles.name,
          estado: t.status,
          creado: t.createdAt,
          equipos: sql<string | null>`(
            SELECT string_agg(DISTINCT e.name, ', ') FROM teams e
            WHERE e.leader_id = ${t.id} OR e.id IN (SELECT team_id FROM team_members WHERE user_id = ${t.id})
          )`
        })
        .from(t)
        .innerJoin(schema.roles, eq(schema.roles.id, t.roleId))
        .where(and(eq(t.municipalityId, general), eq(t.isMasterAdmin, false)))
        .orderBy(desc(t.createdAt))
        .limit(POR_VISTA);
      return filas.map((f) => ({
        id: f.id,
        titulo: f.nombre,
        detalle: [f.rol, f.correo, f.equipos ? `Equipos: ${f.equipos}` : "Sin equipo", f.estado !== "active" ? "No activa" : null].filter(Boolean).join(" · "),
        fecha: fecha(f.creado)
      }));
    }
    case "equipos": {
      const t = schema.teams;
      const filas = await db
        .select({ id: t.id, nombre: t.name, lider: schema.userProfiles.displayName, creado: t.createdAt })
        .from(t)
        .innerJoin(schema.userProfiles, eq(schema.userProfiles.id, t.leaderId))
        .where(eq(t.municipalityId, general))
        .orderBy(desc(t.createdAt))
        .limit(POR_VISTA);
      return filas.map((f) => ({ id: f.id, titulo: f.nombre, detalle: `Líder: ${f.lider}`, fecha: fecha(f.creado), enlace: `/admin-equipos/${f.id}` }));
    }
    case "ciudadanos": {
      const t = schema.contacts;
      const filas = await db
        .select({ id: t.id, nombre: t.displayName, quien: schema.userProfiles.displayName, estado: t.status, creado: t.createdAt })
        .from(t)
        .innerJoin(schema.userProfiles, eq(schema.userProfiles.id, t.createdByUserId))
        .where(eq(t.municipalityId, general))
        .orderBy(desc(t.createdAt))
        .limit(POR_VISTA);
      return filas.map((f) => ({
        id: f.id,
        titulo: f.nombre,
        detalle: [`Registró: ${f.quien}`, "Sin sección", f.estado !== "active" ? "Dado de baja" : null].filter(Boolean).join(" · "),
        fecha: fecha(f.creado),
        enlace: `/crm/contacts/${f.id}`
      }));
    }
    case "incidencias": {
      const t = schema.eventReports;
      const filas = await db
        .select({ id: t.id, titulo: t.title, actividad: t.activityTypeId, texto: t.municipality, quien: schema.userProfiles.displayName, creado: t.createdAt })
        .from(t)
        .innerJoin(schema.userProfiles, eq(schema.userProfiles.id, t.createdByUserId))
        .where(eq(t.municipalityId, general))
        .orderBy(desc(t.createdAt))
        .limit(POR_VISTA);
      return filas.map((f) => ({
        id: f.id,
        titulo: f.titulo,
        detalle: [f.actividad ? "Actividad" : "Incidencia", `Levantó: ${f.quien}`, f.texto ? `Decía «${f.texto}»` : null].filter(Boolean).join(" · "),
        fecha: fecha(f.creado)
      }));
    }
    case "almacenes": {
      const t = schema.warehouses;
      const filas = await db
        .select({ id: t.id, nombre: t.name, lugar: t.location, creado: t.createdAt })
        .from(t)
        .where(eq(t.municipalityId, general))
        .orderBy(desc(t.createdAt))
        .limit(POR_VISTA);
      return filas.map((f) => ({ id: f.id, titulo: f.nombre, detalle: f.lugar ? `Dirección: ${f.lugar}` : "Sin dirección", fecha: fecha(f.creado) }));
    }
    case "catalogo": {
      const t = schema.activityCatalogOptions;
      const filas = await db
        .select({ id: t.id, nombre: t.name, tipo: t.kind, quien: schema.userProfiles.displayName, creado: t.createdAt })
        .from(t)
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.id, t.createdByUserId))
        .where(and(eq(t.municipalityId, general), eq(t.isSystem, false), eq(t.scope, "network")))
        .orderBy(desc(t.createdAt))
        .limit(POR_VISTA);
      return filas.map((f) => ({ id: f.id, titulo: f.nombre, detalle: [`Tipo: ${f.tipo}`, f.quien ? `Creó: ${f.quien}` : null].filter(Boolean).join(" · "), fecha: fecha(f.creado) }));
    }
    case "escucha": {
      const t = schema.socialListening;
      const filas = await db
        .select({ id: t.id, titulo: t.title, quien: schema.userProfiles.displayName, creado: t.createdAt })
        .from(t)
        .innerJoin(schema.userProfiles, eq(schema.userProfiles.id, t.createdByUserId))
        .where(eq(t.municipalityId, general))
        .orderBy(desc(t.createdAt))
        .limit(POR_VISTA);
      return filas.map((f) => ({ id: f.id, titulo: f.titulo, detalle: `Levantó: ${f.quien}`, fecha: fecha(f.creado) }));
    }
    case "prospectos": {
      const t = schema.rapidActivityProspects;
      const filas = await db
        .select({ id: t.id, nombre: t.prospectName, quien: schema.userProfiles.displayName, creado: t.createdAt })
        .from(t)
        .innerJoin(schema.userProfiles, eq(schema.userProfiles.id, t.createdByUserId))
        .where(eq(t.municipalityId, general))
        .orderBy(desc(t.createdAt))
        .limit(POR_VISTA);
      return filas.map((f) => ({ id: f.id, titulo: f.nombre, detalle: `Registró: ${f.quien}`, fecha: fecha(f.creado) }));
    }
  }
}
