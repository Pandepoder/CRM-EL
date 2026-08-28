import { requirePageRole } from "@/lib/authorization";
import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { AlertTriangle, MapPin } from "lucide-react";
import { desc } from "drizzle-orm";
import { StatusSelector } from "./StatusSelector";

export default async function AdminIncidenciasPage() {
  await requirePageRole("admin");

  const db = getDatabaseClient();
  const reports = await db
    .select()
    .from(schema.eventReports)
    .orderBy(desc(schema.eventReports.createdAt));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-blue-950 tracking-tight flex items-center gap-3">
            <AlertTriangle className="text-red-600 h-8 w-8" /> Gestión de Incidencias
          </h1>
          <p className="text-gray-500 mt-2">Revisión y actualización de reportes e incidencias operativas.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Incidencia</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Ubicación</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900">{r.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate" title={r.description || ""}>
                      {r.description}
                    </div>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      {r.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-1 text-sm text-gray-700">
                      <MapPin size={14} className="text-gray-400 mt-0.5" />
                      <div>
                        <div>{r.municipality || "N/A"} - {r.district || "N/A"}</div>
                        <div className="text-xs text-gray-400">{r.latitude}, {r.longitude}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600" suppressHydrationWarning>
                      {r.createdAt?.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <StatusSelector reportId={r.id} currentStatus={r.status || "active"} />
                  </td>
                </tr>
              ))}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    No hay incidencias reportadas.
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
