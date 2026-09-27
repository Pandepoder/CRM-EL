import Link from "next/link";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { AlertTriangle, Building2, ShieldCheck } from "lucide-react";

import { schema } from "@tonala/shared/database";

import { requirePageAccess } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { rolesQuePuedeDar } from "@/lib/gobierno-de-cuentas";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { getServerSession } from "@/lib/session-server";

import { RoleSelector } from "../admin-usuarios/RoleSelector";
import { UserActions } from "../admin-usuarios/UserActions";
import { AsignarMunicipio, NombrarAdministrador } from "./ControlesDelPanel";

/**
 * Administración por municipio (etapa 6): el panel del administrador maestro.
 *
 * Quién administra cada municipio, cuándo entró por última vez y qué municipios con gente activa se
 * quedaron sin nadie que los administre. Desde aquí se resuelve la pérdida de acceso de un
 * administrador sin salir de la pantalla: restablecer su contraseña, reactivarlo, cerrar sus
 * sesiones, transferirlo a otro municipio, retirarle el rol o nombrar a otra persona del municipio.
 * Si se pierde el acceso al propio maestro, la salida es la consola del servidor
 * (`pnpm admin:rescatar`).
 */

const fecha = (d: Date | null) =>
  d ? d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" }) : "Nunca";

export default async function AdministracionMunicipalPage() {
  await requirePageAccess("/administracion-municipal");
  const session = await getServerSession();
  const alcance = await resolveUserNetworkScope(session.userId);
  const db = getDatabaseClient();
  const up = schema.userProfiles;

  const [maestro, administradores, personasPorMunicipio, candidatos, roles] = await Promise.all([
    db.select({ nombre: up.displayName, ultima: up.lastLoginAt }).from(up).where(eq(up.isMasterAdmin, true)).limit(1),
    db
      .select({
        id: up.id,
        nombre: up.displayName,
        correo: up.email,
        estado: up.status,
        roleId: up.roleId,
        ultima: up.lastLoginAt,
        municipio: schema.municipalities.name,
        municipioTipo: schema.municipalities.kind
      })
      .from(up)
      .innerJoin(schema.roles, eq(schema.roles.id, up.roleId))
      .innerJoin(schema.municipalities, eq(schema.municipalities.id, up.municipalityId))
      .where(and(eq(schema.roles.key, "admin"), eq(up.isMasterAdmin, false)))
      .orderBy(asc(schema.municipalities.name), asc(up.displayName)),
    db
      .select({
        municipio: schema.municipalities.name,
        activas: sql<number>`count(*) FILTER (WHERE ${up.status} = 'active')::int`,
        pendientes: sql<number>`count(*) FILTER (WHERE ${up.status} = 'pending')::int`
      })
      .from(up)
      .innerJoin(schema.municipalities, eq(schema.municipalities.id, up.municipalityId))
      .where(eq(schema.municipalities.kind, "municipio"))
      .groupBy(schema.municipalities.name),
    // A quién se puede nombrar: personas activas de un municipio que no son administración.
    db
      .select({ id: up.id, nombre: up.displayName, rol: schema.roles.name, municipio: schema.municipalities.name })
      .from(up)
      .innerJoin(schema.roles, eq(schema.roles.id, up.roleId))
      .innerJoin(schema.municipalities, eq(schema.municipalities.id, up.municipalityId))
      .where(and(eq(up.status, "active"), ne(schema.roles.key, "admin"), eq(schema.municipalities.kind, "municipio")))
      .orderBy(asc(up.displayName)),
    rolesQuePuedeDar(alcance)
  ]);

  const opcionesDeRol = roles.map((r) => ({ id: r.id, name: r.name }));
  const sinMunicipio = administradores.filter((a) => a.municipioTipo !== "municipio");
  const conMunicipio = administradores.filter((a) => a.municipioTipo === "municipio");

  // Un renglón por municipio con gente o con administración.
  const nombres = new Set([...personasPorMunicipio.map((p) => p.municipio), ...conMunicipio.map((a) => a.municipio)]);
  const municipios = [...nombres]
    .map((nombre) => {
      const gente = personasPorMunicipio.find((p) => p.municipio === nombre);
      const suyos = conMunicipio.filter((a) => a.municipio === nombre);
      const activos = suyos.filter((a) => a.estado === "active");
      return {
        nombre,
        activas: gente?.activas ?? 0,
        pendientes: gente?.pendientes ?? 0,
        administradores: suyos,
        sinAdministracion: activos.length === 0 && (gente?.activas ?? 0) > 0
      };
    })
    .sort((a, b) => Number(b.sinAdministracion) - Number(a.sinAdministracion) || b.activas - a.activas || a.nombre.localeCompare(b.nombre, "es"));
  const huerfanos = municipios.filter((m) => m.sinAdministracion).length;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <Building2 size={22} className="text-blue-700" /> Administración por municipio
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl">
          Cada administrador gobierna su municipio; tú, todos. Aquí resuelves que alguien pierda el acceso: restablecer la
          contraseña, reactivar, cerrar sesiones, transferir de municipio, retirar el rol o nombrar a otra persona. Todo
          queda en la auditoría.
        </p>
        {/* Texto corrido, no una fila flexible: en el teléfono cada tramo quedaba en su propia columna. */}
        <p className="text-xs text-slate-500">
          <ShieldCheck size={14} className="inline align-[-2px] mr-1 text-emerald-600" /> Administrador maestro: <strong className="text-slate-800">{maestro[0]?.nombre ?? "—"}</strong>{" "}
          · última entrada {fecha(maestro[0]?.ultima ?? null)} · su cuenta se gobierna desde el servidor (<code>pnpm admin:rescatar</code>).
        </p>
      </header>

      {huerfanos > 0 && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-900">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          {huerfanos === 1 ? "1 municipio con gente activa no tiene" : `${huerfanos} municipios con gente activa no tienen`} administración activa.
          Nómbrala abajo.
        </p>
      )}

      {sinMunicipio.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
          <h2 className="m-0 text-base font-black text-amber-950">Administradores sin municipio ({sinMunicipio.length})</h2>
          <p className="m-0 text-xs text-amber-900">
            Quedaron en General al crear la llave de municipio. Hasta que les asignes uno, no ven ni gobiernan nada más que lo suyo.
          </p>
          <ul className="m-0 p-0 list-none divide-y divide-amber-200">
            {sinMunicipio.map((a) => (
              <li key={a.id} className="py-2.5 flex flex-col md:flex-row md:items-center gap-2 md:justify-between">
                <div className="min-w-0">
                  <Link href={`/perfil/${a.id}`} className="text-sm font-extrabold text-slate-900 hover:underline">{a.nombre}</Link>
                  <div className="text-[11px] text-slate-600">
                    {a.correo} · {a.estado === "active" ? "Activa" : "Dada de baja"} · última entrada {fecha(a.ultima)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AsignarMunicipio userId={a.id} actual={null} etiqueta={`Municipio de ${a.nombre}`} />
                  <RoleSelector userId={a.id} currentRoleId={a.roleId} roles={opcionesDeRol} />
                  <UserActions user={{ userId: a.id, displayName: a.nombre, status: a.estado, municipality: null }} puedeCambiarMunicipio puedeEliminar />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <h2 className="m-0 px-4 py-3 text-base font-black text-slate-900 border-b border-slate-100 bg-slate-50">
          Municipios con gente o con administración ({municipios.length})
        </h2>
        {municipios.length === 0 ? (
          <p className="m-0 px-4 py-3 text-sm text-slate-600">Todavía no hay cuentas con municipio.</p>
        ) : (
          <ul className="m-0 p-0 list-none divide-y divide-slate-100">
            {municipios.map((m) => (
              <li key={m.nombre} className={`px-4 py-3 space-y-2 ${m.sinAdministracion ? "bg-rose-50/60" : ""}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-black text-slate-900">{m.nombre}</span>
                    <Link href={`/admin-usuarios?municipio=${encodeURIComponent(m.nombre)}`} className="text-[11px] font-bold text-blue-700 hover:underline">
                      {m.activas} activas{m.pendientes > 0 ? ` · ${m.pendientes} por aprobar` : ""}
                    </Link>
                  </div>
                  {m.sinAdministracion && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white">
                      <AlertTriangle size={11} /> Sin administración activa
                    </span>
                  )}
                </div>
                {m.administradores.length > 0 && (
                  <ul className="m-0 p-0 list-none space-y-2">
                    {m.administradores.map((a) => (
                      <li key={a.id} className="flex flex-col md:flex-row md:items-center gap-2 md:justify-between rounded-xl border border-slate-100 px-3 py-2">
                        <div className="min-w-0">
                          <Link href={`/perfil/${a.id}`} className="text-[13px] font-extrabold text-slate-900 hover:underline">{a.nombre}</Link>
                          <div className="text-[11px] text-slate-500">
                            {a.estado === "active" ? "Activa" : a.estado === "inactive" ? "Dada de baja" : a.estado} · última entrada {fecha(a.ultima)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <AsignarMunicipio userId={a.id} actual={a.municipio} etiqueta={`Transferir a ${a.nombre}`} />
                          <RoleSelector userId={a.id} currentRoleId={a.roleId} roles={opcionesDeRol} />
                          <UserActions user={{ userId: a.id, displayName: a.nombre, status: a.estado, municipality: a.municipio }} puedeCambiarMunicipio puedeEliminar />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <NombrarAdministrador candidatos={candidatos.filter((c) => c.municipio === m.nombre)} municipio={m.nombre} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
