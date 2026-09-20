import { requirePageRole } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { AlertTriangle, MapPin, Calendar, CheckCircle2, Clock } from "lucide-react";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { getServerSession } from "@/lib/session-server";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { incidentScopeCondition } from "@/lib/incident-visibility";
import { municipioDelUsuario } from "@/lib/municipio-usuario";
import { resolverMunicipio } from "@/lib/municipios-jalisco";
import Link from "next/link";
import { ESTADOS_ABIERTOS } from "@/lib/estados-incidencia";
import { StatusSelector } from "./StatusSelector";
import { IncidentSectionAssigner } from "./IncidentSectionAssigner";
import { MediaGallery } from "@/components/MediaGallery";

/**
 * Cuántas incidencias se atienden de una sentada. La tabla monta un asignador de sección por
 * fila, con su catálogo y su ventana de búsqueda: con las 389 abiertas del escenario, armar la
 * página costaba 4.6 s en el servidor y el navegador hidrataba 389 componentes que nadie iba a
 * abrir. Se trabajan de arriba abajo, así que la primera página es la que importa.
 */
const POR_PAGINA = 50;

export default async function AdminIncidenciasPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requirePageRole("admin", "direction", "territorial_coordinator");

  const db = getDatabaseClient();
  const session = await getServerSession();
  // Dirección y coordinación ven las incidencias de su alcance; antes esta pantalla leía todas
  // las del sistema sin filtro.
  const alcance = await resolveUserNetworkScope(session.userId);

  // Los indicadores cuentan todo lo abierto del alcance, no solo la página que se está viendo.
  const abiertasDelAlcance = and(inArray(schema.eventReports.status, ESTADOS_ABIERTOS), incidentScopeCondition(alcance));
  const [porEstado, sinSeccion] = await Promise.all([
    db
      .select({ status: schema.eventReports.status, total: count() })
      .from(schema.eventReports)
      .where(abiertasDelAlcance)
      .groupBy(schema.eventReports.status),
    db
      .select({ total: count() })
      .from(schema.eventReports)
      .where(and(abiertasDelAlcance, isNull(schema.eventReports.sectionId)))
  ]);
  const cuantas = (estado: string) => porEstado.find((f) => f.status === estado)?.total ?? 0;
  const totalReports = porEstado.reduce((suma, f) => suma + f.total, 0);
  const pendingCount = cuantas("pendiente");
  const activeCount = cuantas("active");
  const resolvedCount = cuantas("in_progress");
  const missingSectionCount = sinSeccion[0]?.total ?? 0;

  const { page } = await searchParams;
  const paginaPedida = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const totalPaginas = Math.max(1, Math.ceil(totalReports / POR_PAGINA));
  // Pedir una página que ya no existe —se cerraron incidencias mientras tanto— deja la pantalla
  // en blanco sin explicar nada: se cae a la última que sí tiene contenido.
  const pagina = Math.min(paginaPedida, totalPaginas);

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
      sectionMunicipality: schema.electoralSections.municipality,
      latitude: schema.eventReports.latitude,
      longitude: schema.eventReports.longitude,
      status: schema.eventReports.status,
      mediaUrls: schema.eventReports.mediaUrls,
      createdAt: schema.eventReports.createdAt,
    })
    .from(schema.eventReports)
    .leftJoin(schema.electoralSections, eq(schema.eventReports.sectionId, schema.electoralSections.id))
    // Solo lo que sigue requiriendo trabajo. Lo resuelto, archivado o rechazado
    // vive en el Historial: mezclarlo aquí enterraba lo que hay que atender.
    .where(abiertasDelAlcance)
    .orderBy(desc(schema.eventReports.createdAt))
    .limit(POR_PAGINA)
    .offset((pagina - 1) * POR_PAGINA);

  // 2. Catálogo de secciones para el asignador, acotado a los municipios que esta pantalla usa
  //
  // Antes se traían las 3,791 secciones de Jalisco con todas sus colonias y ese catálogo
  // (≈420 KB de JSON) viajaba al navegador como prop de cada fila de la tabla. Quien trabaja en
  // Tonalá solo puede asignar 131 de ellas: acotarlo lo deja en ≈15 KB. Se añaden los municipios
  // de las incidencias que esta persona sí ve —y el de la sección ya asignada— para que el
  // selector siga sirviendo cuando el reporte cayó fuera de su municipio.
  const municipiosDelCatalogo = new Set<string>();
  const municipioPropio = await municipioDelUsuario(session.userId);
  if (municipioPropio) municipiosDelCatalogo.add(municipioPropio.toLowerCase());
  for (const r of reports) {
    // Se normaliza contra el catálogo antes de comparar: lo que trae la incidencia es texto
    // capturado en campo ("TONALA", "Zapopan Jal.") y la sección guarda el nombre del INE.
    for (const texto of [r.municipality, r.sectionMunicipality]) {
      const municipio = resolverMunicipio(texto);
      if (municipio) municipiosDelCatalogo.add(municipio.toLowerCase());
    }
  }
  // Sin un solo municipio al que acotar —la cuenta de administración estatal, que no pertenece a
  // ninguno y aún no ve incidencias— se conserva todo Jalisco: es lo único que deja el selector
  // utilizable, y es un caso de una sola cuenta.
  const todoJalisco = municipiosDelCatalogo.size === 0;

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
        -- El municipio de la sección primero (viene del INE); el de sus colonias solo si falta.
        -- Antes se ignoraba el de la sección y, sin colonias ligadas, se inventaba 'Tonalá',
        -- que el asignador luego guardaba sobre la incidencia.
        COALESCE(es.municipality, MIN(col.municipality)) AS municipality,
        COALESCE(ARRAY_AGG(DISTINCT col.name) FILTER (WHERE col.name IS NOT NULL), '{}') AS colonies
      FROM electoral_sections es
      LEFT JOIN section_colonies sc ON sc.section_id = es.id
      LEFT JOIN colonies col ON col.id = sc.colony_id
      GROUP BY es.id, es.section_num, es.municipality
      -- El filtro va en HAVING y no en WHERE porque se compara contra el mismo COALESCE que
      -- devuelve la consulta: una sección sin municipio propio se clasifica por el de sus
      -- colonias, que es un agregado.
      ${
        todoJalisco
          ? sql``
          : sql`HAVING LOWER(COALESCE(es.municipality, MIN(col.municipality), '')) IN (${sql.join(
              [...municipiosDelCatalogo].map((m) => sql`${m}`),
              sql`, `
            )})`
      }
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight flex items-center gap-3">
            <AlertTriangle className="text-red-600 h-8 w-8" /> Centro de Gestión de Incidencias
          </h1>
          <p className="text-gray-500 mt-1">
            Acepta los reportes que llegan de campo, asígnales su sección y sigue su avance.
          </p>
        </div>
        <Link
          href="/historial-incidencias"
          className="text-sm font-semibold px-4 py-2.5 rounded-xl whitespace-nowrap"
          style={{ background: "#eef2f8", color: "#0b1f3a" }}
        >
          Ver historial →
        </Link>
      </div>

      {pendingCount > 0 ? (
        <div
          className="rounded-2xl px-5 py-4 flex items-center gap-3"
          style={{ background: "#fefce8", border: "1px solid #fde68a" }}
        >
          <Clock className="h-5 w-5" style={{ color: "#a16207" }} />
          <p className="text-sm font-semibold" style={{ color: "#713f12" }}>
            {pendingCount === 1
              ? "Hay 1 reporte esperando aceptación."
              : `Hay ${pendingCount} reportes esperando aceptación.`}
          </p>
        </div>
      ) : null}

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
                    {Array.isArray(r.mediaUrls) && r.mediaUrls.length > 0 && (
                      <div className="mt-2 max-w-xs">
                        <MediaGallery media={r.mediaUrls} title="Evidencias" />
                      </div>
                    )}
                  </td>

                  {/* Location & Coords */}
                  <td className="px-4 py-3 md:px-6 md:py-4">
                    <div className="flex items-start gap-1.5 text-xs text-gray-700 whitespace-nowrap">
                      <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-gray-800">{r.municipality || "Municipio sin determinar"}</div>
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
                    No hay incidencias abiertas a tu cargo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPaginas > 1 ? (
        <div className="flex items-center justify-between gap-3">
          {pagina > 1 ? (
            <Link
              href={`/admin-incidencias?page=${pagina - 1}`}
              className="text-sm font-semibold px-4 py-2.5 rounded-xl whitespace-nowrap"
              style={{ background: "#eef2f8", color: "#0b1f3a" }}
            >
              ← Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="text-[13px] font-semibold text-gray-500">
            Página {pagina} de {totalPaginas} · {totalReports} abiertas
          </span>
          {pagina < totalPaginas ? (
            <Link
              href={`/admin-incidencias?page=${pagina + 1}`}
              className="text-sm font-semibold px-4 py-2.5 rounded-xl whitespace-nowrap"
              style={{ background: "#eef2f8", color: "#0b1f3a" }}
            >
              Ver más →
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </div>
  );
}
