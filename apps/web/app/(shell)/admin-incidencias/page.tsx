import { requirePageRole } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { AlertTriangle, MapPin, Calendar, CheckCircle2, Clock } from "lucide-react";
import { desc, eq, sql } from "drizzle-orm";
import { StatusSelector } from "./StatusSelector";
import { IncidentSectionAssigner } from "./IncidentSectionAssigner";

export default async function AdminIncidenciasPage() {
  await requirePageRole("admin", "direction", "territorial_coordinator");

  const db = getDatabaseClient();

  // 1. Fetch reports with joined electoral section
  const reports = await db
    .select({
      id: schema.eventReports.id,
      title: schema.eventReports.title,
      description: schema.eventReports.description,
      category: schema.eventReports.category,
      municipality: schema.eventReports.municipality,
      district: schema.eventReports.district,
      sectionId: schema.eventReports.sectionId,
      sectionNum: schema.electoralSections.sectionNum,
      latitude: schema.eventReports.latitude,
      longitude: schema.eventReports.longitude,
      status: schema.eventReports.status,
      createdAt: schema.eventReports.createdAt,
    })
    .from(schema.eventReports)
    .leftJoin(schema.electoralSections, eq(schema.eventReports.sectionId, schema.electoralSections.id))
    .orderBy(desc(schema.eventReports.createdAt));

  // 2. Fetch all sections with their colonies and municipalities
  let sectionsList: Array<{
    id: string;
    sectionNum: number;
    municipality: string;
    colonies: string[];
  }> = [];

  try {
    const secRes = await db.execute<{
      id: string;
      section_num: number;
      municipality: string;
      colonies: string[];
    }>(sql`
      SELECT
        es.id::text,
        es.section_num,
        COALESCE(MIN(col.municipality), 'Tonalá') AS municipality,
        COALESCE(ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL), '{}') AS colonies
      FROM electoral_sections es
      LEFT JOIN section_colonies sc ON sc.section_id = es.id
      LEFT JOIN colonies col ON col.id = sc.colony_id
      GROUP BY es.id, es.section_num
      ORDER BY es.section_num ASC
    `);

    sectionsList = secRes.rows.map(r => ({
      id: r.id,
      sectionNum: r.section_num,
      municipality: r.municipality,
      colonies: r.colonies || [],
    }));
  } catch (_err) {
    console.warn("Failed to fetch sections list:", _err);
  }

  // Summary counts
  const totalReports = reports.length;
  const activeCount = reports.filter(r => r.status === "active").length;
  const resolvedCount = reports.filter(r => r.status === "resolved").length;
  const missingSectionCount = reports.filter(r => !r.sectionId && !r.sectionNum).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight flex items-center gap-3">
            <AlertTriangle className="text-red-600 h-8 w-8" /> Centro de Gestión de Incidencias
          </h1>
          <p className="text-gray-500 mt-1">
            Asignación territorial de secciones electorales, resolución de reportes y supervisión operativa.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Incidencias</div>
          <div className="text-2xl font-extrabold text-blue-950 mt-1">{totalReports}</div>
        </div>
        <div className="bg-white border border-red-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
            <Clock size={14} /> Activas / Pendientes
          </div>
          <div className="text-2xl font-extrabold text-red-600 mt-1">{activeCount}</div>
        </div>
        <div className="bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={14} /> Resueltas
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{resolvedCount}</div>
        </div>
        <div className="bg-white border border-amber-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">
            Sin Sección Electoral
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{missingSectionCount}</div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-4 py-3 md:px-6 md:py-4 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Incidencia / Categoría</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Ubicación & Coordenadas</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Sección Electoral (Autoselector)</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">Fecha</th>
                <th className="px-4 py-3 md:px-6 md:py-4 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                  
                  {/* Title & Category */}
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <div className="font-bold text-gray-900 text-sm whitespace-nowrap">{r.title}</div>
                    {r.description && (
                      <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate" title={r.description}>
                        {r.description}
                      </div>
                    )}
                    <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-gray-100 text-gray-700 text-[11px] font-bold rounded-md uppercase tracking-wider whitespace-nowrap">
                      {r.category}
                    </span>
                  </td>

                  {/* Location & Coords */}
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <div className="flex items-start gap-1.5 text-xs text-gray-700 whitespace-nowrap">
                      <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-800">{r.municipality || "Tonalá"}</div>
                        {r.latitude && r.longitude ? (
                          <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                            {Number(r.latitude).toFixed(4)}, {Number(r.longitude).toFixed(4)}
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-400 italic">Sin coordenadas</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Section Electoral Autoselector */}
                  <td className="px-4 py-3 md:px-6 md:py-4 whitespace-nowrap">
                    <IncidentSectionAssigner
                      reportId={r.id}
                      reportTitle={r.title}
                      currentSectionId={r.sectionId}
                      currentSectionNum={r.sectionNum}
                      currentMunicipality={r.municipality}
                      latitude={r.latitude ? Number(r.latitude) : null}
                      longitude={r.longitude ? Number(r.longitude) : null}
                      availableSections={sectionsList}
                    />
                  </td>

                  {/* Date */}
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <div className="text-xs text-gray-600 flex items-center gap-1 whitespace-nowrap" suppressHydrationWarning>
                      <Calendar size={13} className="text-gray-400" />
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 md:px-6 md:py-4 text-right whitespace-nowrap">
                    <StatusSelector reportId={r.id} currentStatus={r.status || "active"} />
                  </td>
                </tr>
              ))}

              {reports.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <AlertTriangle size={32} className="mx-auto text-gray-300 mb-2" />
                    No hay incidencias reportadas en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
