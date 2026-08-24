import { requirePageRole } from "@/lib/authorization";
import Link from "next/link";
import { getDatabaseClient } from "@/lib/db-client";

import { getServerSession } from "@/lib/session-server";
import { redirect } from "next/navigation";
import { actorFromSession, permissionChecker } from '@/lib/api-helpers';
import { createCrmDependencies } from '@/lib/crm-deps';
import { listContacts } from '@tonala/modules/contacts/application';
import { DevelopmentLogger } from '@tonala/shared/observability';
import { Search, Plus, Users, ChevronLeft, ChevronRight, Download } from "lucide-react";

const PAGE_SIZE = 25;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePageRole("admin", "territorial_coordinator", "capturist");
  const session = await getServerSession();
  if (!session.isLoggedIn) redirect("/login");

  const { q = "", page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const actor = await actorFromSession();
  if (!actor) redirect("/login");

  const db = getDatabaseClient();
  const { contactsReader } = await createCrmDependencies(db);

  const result = await listContacts(actor, { q, page: currentPage, pageSize: PAGE_SIZE }, {
    contactsReader,
    permissionChecker,
    logger: new DevelopmentLogger()
  });

  if (!result.ok) {
    throw new Error(result.error.publicMessage || result.error.message);
  }

  const { items: contactsList, total: totalCount } = result.value;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const buildUrl = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/crm/contacts${s ? `?${s}` : ""}`;
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: "var(--blue-950)", letterSpacing: "-0.5px" }}>
            Directorio Ciudadano
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "14px" }}>
            {totalCount} ciudadano{totalCount !== 1 ? "s" : ""} registrado{totalCount !== 1 ? "s" : ""}
            {q && ` · Buscando: "${q}"`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <a
            href={`/api/crm/contacts/export${q ? '?q=' + encodeURIComponent(q) : ''}`}
            download
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "white", border: "1px solid #e2e8f0", color: "#475569", padding: "11px 20px", borderRadius: "12px", fontWeight: 700, fontSize: "14px", textDecoration: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          >
            <Download size={16} /> Exportar CSV
          </a>
          <Link
            href="/crm/contacts/nuevo"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "#0f172a", color: "white", padding: "11px 20px", borderRadius: "12px", fontWeight: 700, fontSize: "14px", textDecoration: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          >
            <Plus size={16} /> Nuevo Ciudadano
          </Link>
        </div>
      </div>

      {/* Search bar */}
      <form method="GET" action="/crm/contacts" style={{ marginBottom: "20px" }}>
        <div style={{ position: "relative", maxWidth: "480px" }}>
          <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o teléfono..."
            style={{ width: "100%", padding: "12px 14px 12px 42px", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "14px", background: "white", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
          />
          {q && (
            <Link
              href="/crm/contacts"
              style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", textDecoration: "none", fontSize: "18px", lineHeight: 1 }}
            >×</Link>
          )}
        </div>
      </form>

      {/* Table */}
      {contactsList.length === 0 ? (
        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #f1f5f9", padding: "80px 24px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ width: "64px", height: "64px", background: "#f1f5f9", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Users size={28} color="#94a3b8" />
          </div>
          <h2 style={{ margin: "0 0 8px", color: "var(--blue-950)", fontSize: "20px" }}>
            {q ? `Sin resultados para "${q}"` : "No hay ciudadanos registrados"}
          </h2>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "14px" }}>
            {q ? "Intenta con otro nombre o teléfono." : "Comienza registrando el primer contacto."}
          </p>
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: "16px", border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f8fafc", background: "#f8fafc" }}>
                  {["Nombre", "Teléfono", "Colonia", "Habilidad Táctica", "Disponibilidad", ""].map((h, i) => (
                    <th key={i} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: 700 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contactsList.map(c => (
                  <tr key={c.contactId} className="hover:bg-gray-50 transition-colors" style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px" }}>{c.displayName}</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                        {new Date(c.createdAt).toLocaleDateString("es-MX")}
                      </div>
                    </td>
                    <td style={{ padding: "14px 16px", color: "#475569" }}>{c.phone || "—"}</td>
                    <td style={{ padding: "14px 16px" }}>
                      {c.colony ? (
                        <span style={{ display: "inline-block", padding: "3px 10px", background: "#dcfce7", color: "#166534", borderRadius: "999px", fontSize: "12px", fontWeight: 600 }}>
                          {c.colony}
                        </span>
                      ) : <span style={{ color: "#94a3b8" }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px", color: "#475569", fontSize: "13px" }}>{c.skill || "—"}</td>
                    <td style={{ padding: "14px 16px" }}>
                      {c.availability ? (
                        <span style={{ display: "inline-block", padding: "3px 10px", background: "#f3e8ff", color: "#6b21a8", borderRadius: "999px", fontSize: "12px", fontWeight: 600 }}>
                          {c.availability}
                        </span>
                      ) : <span style={{ color: "#94a3b8" }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <Link
                        href={`/crm/contacts/${c.contactId}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 14px", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#1e3a8a", fontWeight: 700, fontSize: "12px", textDecoration: "none", background: "#f8fafc" }}
                      >
                        Ver ficha →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderTop: "1px solid #f1f5f9", flexWrap: "wrap", gap: "12px" }}>
              <span style={{ fontSize: "13px", color: "#64748b" }}>
                Página {currentPage} de {totalPages} · {totalCount} registros
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                {currentPage > 1 ? (
                  <Link href={buildUrl(currentPage - 1)} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#374151", fontWeight: 600, fontSize: "13px", textDecoration: "none", background: "white" }}>
                    <ChevronLeft size={14} /> Anterior
                  </Link>
                ) : (
                  <span style={{ padding: "8px 14px", border: "1px solid #f1f5f9", borderRadius: "8px", color: "#cbd5e1", fontSize: "13px", background: "#f8fafc" }}>
                    <ChevronLeft size={14} /> Anterior
                  </span>
                )}
                {currentPage < totalPages ? (
                  <Link href={buildUrl(currentPage + 1)} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: "8px", color: "#374151", fontWeight: 600, fontSize: "13px", textDecoration: "none", background: "white" }}>
                    Siguiente <ChevronRight size={14} />
                  </Link>
                ) : (
                  <span style={{ padding: "8px 14px", border: "1px solid #f1f5f9", borderRadius: "8px", color: "#cbd5e1", fontSize: "13px", background: "#f8fafc" }}>
                    Siguiente <ChevronRight size={14} />
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}




