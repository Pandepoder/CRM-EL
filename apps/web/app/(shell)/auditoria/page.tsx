import Link from "next/link";
import { History } from "lucide-react";

import { requirePageAccess } from "@/lib/authorization";
import { ACCIONES, consultarAuditoria, GRUPOS_DE_ACCIONES, POR_PAGINA_DE_AUDITORIA } from "@/lib/auditoria";

/**
 * Auditoría de cambios (etapa 6, solo el administrador maestro): quién cambió qué y cuándo. Roles,
 * municipios, altas, bajas, admisiones, contraseñas, exportaciones del padrón y cada ficha que abre el
 * propio maestro. Antes nada de eso quedaba registrado (A5). Lo hecho desde la consola del servidor
 * sale sin autor.
 */

const fecha = (d: Date) =>
  d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `{ rol: "admin" }` → «rol: admin». Los valores largos se recortan; los vacíos y los identificadores
 * internos no se enseñan: no le dicen nada a quien lee, y quién es cada uno ya va en la línea.
 */
function resumen(datos: unknown): string {
  if (!datos || typeof datos !== "object") return "";
  return Object.entries(datos as Record<string, unknown>)
    .filter(([, valor]) => valor !== null && valor !== undefined && valor !== "" && !(typeof valor === "string" && UUID.test(valor)))
    .map(([clave, valor]) => {
      const texto = typeof valor === "string" ? valor : JSON.stringify(valor);
      return `${clave}: ${texto.length > 60 ? `${texto.slice(0, 57)}…` : texto}`;
    })
    .join(" · ");
}

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<{ grupo?: string; page?: string }> }) {
  await requirePageAccess("/auditoria");
  const parametros = await searchParams;
  const grupo = GRUPOS_DE_ACCIONES.find((g) => g.clave === parametros.grupo)?.clave;
  const paginaPedida = Math.max(1, Number.parseInt(parametros.page ?? "1", 10) || 1);
  const { total, filas } = await consultarAuditoria({ grupo, pagina: paginaPedida });
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA_DE_AUDITORIA));

  const enlace = (g: string | undefined, p = 1) => {
    const u = new URLSearchParams();
    if (g) u.set("grupo", g);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/auditoria${s ? `?${s}` : ""}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <History size={22} className="text-blue-700" /> Auditoría de cambios
        </h1>
        <p className="text-sm text-slate-600 max-w-3xl">
          Quién cambió qué y cuándo: cuentas, roles, municipios, admisiones, contraseñas, exportaciones del padrón y las fichas
          que abre el administrador maestro. Lo hecho desde la consola del servidor aparece sin autor.
        </p>
      </header>

      <nav aria-label="Qué ver" className="flex flex-wrap gap-2">
        <Link href={enlace(undefined)} aria-current={!grupo ? "page" : undefined} className={`rounded-full border px-3 py-1 text-xs font-bold no-underline ${!grupo ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
          Todo
        </Link>
        {GRUPOS_DE_ACCIONES.map((g) => (
          <Link key={g.clave} href={enlace(g.clave)} aria-current={grupo === g.clave ? "page" : undefined} className={`rounded-full border px-3 py-1 text-xs font-bold no-underline ${grupo === g.clave ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"}`}>
            {g.etiqueta}
          </Link>
        ))}
      </nav>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-600">
          {total.toLocaleString("es-MX")} {total === 1 ? "registro" : "registros"}
        </div>
        {filas.length === 0 ? (
          <p className="m-0 px-4 py-3 text-sm text-slate-600">No hay registros.</p>
        ) : (
          <ul className="m-0 p-0 list-none divide-y divide-slate-100">
            {filas.map((f) => {
              // Sobre quién: se omite cuando es quien lo hizo (una exportación queda a su nombre).
              const sobre = f.entidadId === f.quienId ? null : (f.sobrePersona ?? f.sobreCiudadano);
              return (
                <li key={f.id} className="px-4 py-2.5 grid gap-0.5 md:grid-cols-[10rem_1fr]">
                  <time dateTime={f.fecha.toISOString()} className="text-[11px] text-slate-500">{fecha(f.fecha)}</time>
                  <div className="min-w-0">
                    <div className="text-[13px] text-slate-900">
                      <strong>{f.quien ?? "Consola del servidor"}</strong> · {ACCIONES[f.accion] ?? f.accion}
                      {sobre ? (
                        <>
                          {" · "}
                          {f.entidad === "user_profile" ? (
                            <Link href={`/perfil/${f.entidadId}`} className="font-bold text-blue-700 hover:underline">{sobre}</Link>
                          ) : f.entidad === "contact" ? (
                            <Link href={`/crm/contacts/${f.entidadId}`} className="font-bold text-blue-700 hover:underline">{sobre}</Link>
                          ) : (
                            <span className="font-bold">{sobre}</span>
                          )}
                        </>
                      ) : null}
                    </div>
                    {f.antes || f.despues ? (
                      <div className="text-[11px] text-slate-500 break-words">
                        {f.antes ? <span>{resumen(f.antes)} → </span> : null}
                        <span className="text-slate-700">{resumen(f.despues)}</span>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {paginas > 1 && (
          <nav aria-label="Páginas" className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
            {paginaPedida > 1 ? <Link href={enlace(grupo, paginaPedida - 1)}>← Anterior</Link> : <span />}
            <span>Página {Math.min(paginaPedida, paginas)} de {paginas}</span>
            {paginaPedida < paginas ? <Link href={enlace(grupo, paginaPedida + 1)}>Siguiente →</Link> : <span />}
          </nav>
        )}
      </div>
    </div>
  );
}
