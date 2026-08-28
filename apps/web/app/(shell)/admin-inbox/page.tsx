import { getDatabaseClient } from "@/lib/db-client";
import { schema } from "@tonala/shared/database";
import { desc, eq } from "drizzle-orm";
import { Megaphone, MapPin, Clock, AlertCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminInboxPage() {
  const db = getDatabaseClient();
  const reports = await db.select({
    id: schema.eventReports.id,
    title: schema.eventReports.title,
    description: schema.eventReports.description,
    category: schema.eventReports.category,
    createdAt: schema.eventReports.createdAt,
    sectionNum: schema.electoralSections.sectionNum
  })
  .from(schema.eventReports)
  .leftJoin(schema.electoralSections, eq(schema.eventReports.sectionId, schema.electoralSections.id))
  .orderBy(desc(schema.eventReports.createdAt));

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px" }}>
      <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", fontWeight: 700, fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
        <Megaphone size={16} /> Auditoría de Eventos
      </div>
      <h2 style={{ fontSize: "24px", fontWeight: 800, color: "var(--blue-950)", marginBottom: "8px" }}>
        Reportes e Incidencias
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "24px" }}>
        Registro detallado de todos los eventos e incidencias reportadas en el mapa.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {reports.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", background: "white", borderRadius: "12px", border: "1px solid var(--line)" }}>
            <AlertCircle size={32} color="var(--muted)" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "var(--muted)", margin: 0 }}>No hay eventos registrados.</p>
          </div>
        )}
        {reports.map((report) => {
          const date = report.createdAt ? new Date(report.createdAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "Fecha desconocida";
          return (
            <div key={report.id} style={{ background: "white", padding: "16px 20px", borderRadius: "12px", border: "1px solid var(--line)", display: "flex", gap: "16px", alignItems: "flex-start", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--blue-50)", color: "var(--blue-600)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Megaphone size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>{report.title}</h3>
                  <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                    <Clock size={12} /> {date}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", background: "var(--orange-50)", color: "var(--orange-700)", borderRadius: "4px", textTransform: "uppercase" }}>
                    {report.category}
                  </span>
                  {report.sectionNum && (
                    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", background: "var(--slate-100)", color: "var(--slate-700)", borderRadius: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                      <MapPin size={10} /> Sección {report.sectionNum}
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--slate-600)", lineHeight: 1.5 }}>
                  {report.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
