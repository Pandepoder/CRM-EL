import Link from "next/link";
import { Archive, ArrowLeft, MapPin, Calendar } from "lucide-react";
import { desc, eq, inArray } from "drizzle-orm";

import { requirePageRole } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { CATEGORIAS_INCIDENCIA, CATEGORIA_DESCONOCIDA } from "@/lib/categorias-incidencia";
import { ESTADOS_CERRADOS, ESTADOS_INCIDENCIA, ESTADO_DESCONOCIDO } from "@/lib/estados-incidencia";
import { StatusSelector } from "../admin-incidencias/StatusSelector";

/**
 * Historial de incidencias cerradas.
 *
 * El Centro de Gestión enterraba lo atendido junto a lo que faltaba por atender,
 * así que la bandeja crecía sin parar y costaba ver qué tocaba hacer. Aquí vive
 * lo que ya se cerró —resuelto, archivado o rechazado— sin borrarse: sigue
 * consultable y sigue apareciendo en el mapa, porque el territorio necesita la
 * memoria de lo que ya pasó, no solo lo pendiente.
 *
 * Desde aquí se puede reabrir una incidencia con el mismo selector de estado de
 * la pantalla de gestión.
 */
export default async function HistorialIncidenciasPage() {
  await requirePageRole("admin", "direction", "territorial_coordinator");

  const db = getDatabaseClient();

  const reportes = await db
    .select({
      id: schema.eventReports.id,
      title: schema.eventReports.title,
      description: schema.eventReports.description,
      category: schema.eventReports.category,
      municipality: schema.eventReports.municipality,
      sectionNum: schema.electoralSections.sectionNum,
      status: schema.eventReports.status,
      createdAt: schema.eventReports.createdAt
    })
    .from(schema.eventReports)
    .leftJoin(schema.electoralSections, eq(schema.eventReports.sectionId, schema.electoralSections.id))
    .where(inArray(schema.eventReports.status, ESTADOS_CERRADOS))
    .orderBy(desc(schema.eventReports.createdAt));

  const porEstado = ESTADOS_CERRADOS.map((clave) => ({
    clave,
    info: ESTADOS_INCIDENCIA[clave]!,
    total: reportes.filter((r) => r.status === clave).length
  }));

  const fecha = (d: Date | null) =>
    d
      ? new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(d)
      : "—";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3" style={{ color: "#0b1f3a" }}>
            <Archive className="h-8 w-8" style={{ color: "#475569" }} /> Historial de Incidencias
          </h1>
          <p className="text-gray-500 mt-1">
            Lo que ya se atendió, se archivó o se descartó. Sigue apareciendo en el mapa.
          </p>
        </div>
        <Link
          href="/admin-incidencias"
          className="text-sm font-semibold px-4 py-2.5 rounded-xl whitespace-nowrap inline-flex items-center gap-2"
          style={{ background: "#eef2f8", color: "#0b1f3a" }}
        >
          <ArrowLeft size={16} /> Volver a gestión
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {porEstado.map(({ clave, info, total }) => (
          <div
            key={clave}
            className="rounded-2xl p-4"
            style={{ background: info.bg, border: `1px solid ${info.border}` }}
          >
            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: info.color }}>
              {info.label}
            </div>
            <div className="text-2xl font-extrabold mt-1" style={{ color: info.color }}>
              {total}
            </div>
            <p className="text-xs mt-1" style={{ color: "#64748b" }}>
              {info.ayuda}
            </p>
          </div>
        ))}
      </div>

      {reportes.length === 0 ? (
        <div
          className="rounded-2xl px-6 py-12 text-center"
          style={{ background: "#fff", border: "1px dashed #cbd5e1" }}
        >
          <p className="font-semibold" style={{ color: "#0b1f3a" }}>
            Todavía no hay incidencias cerradas
          </p>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Cuando una incidencia se resuelva, se archive o se rechace, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 720 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Incidencia</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Sección</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Fecha</th>
                  <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Estado</th>
                </tr>
              </thead>
              <tbody>
                {reportes.map((r) => {
                  const cat = CATEGORIAS_INCIDENCIA[r.category] ?? CATEGORIA_DESCONOCIDA;
                  const est = ESTADOS_INCIDENCIA[r.status] ?? ESTADO_DESCONOCIDO;
                  return (
                    <tr key={r.id} className="border-t border-gray-100 align-top">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span
                            className="flex items-center justify-center rounded-lg shrink-0"
                            style={{ width: 34, height: 34, background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}
                            dangerouslySetInnerHTML={{ __html: cat.svg }}
                          />
                          <div className="min-w-0">
                            <p className="font-bold truncate" style={{ color: "#0b1f3a" }}>{r.title}</p>
                            <p className="text-xs mt-0.5" style={{ color: cat.color, fontWeight: 600 }}>{cat.label}</p>
                            {r.description ? (
                              <p className="text-xs mt-1 line-clamp-2" style={{ color: "#64748b" }}>{r.description}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap" style={{ color: "#475569" }}>
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <MapPin size={13} style={{ color: "#94a3b8" }} />
                          {r.sectionNum ? `Sección ${r.sectionNum}` : "Sin sección"}
                        </span>
                        <div className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{r.municipality || "Tonalá"}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs" style={{ color: "#64748b" }}>
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={13} style={{ color: "#94a3b8" }} />
                          {fecha(r.createdAt)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider rounded-md px-2 py-1 whitespace-nowrap"
                            style={{ background: est.bg, color: est.color, border: `1px solid ${est.border}` }}
                          >
                            {est.label}
                          </span>
                          <StatusSelector reportId={r.id} currentStatus={r.status} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
