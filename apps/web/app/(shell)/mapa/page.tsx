"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";

// ─── Category config ─────────────────────────────────────────────────────────
const CATEGORIES: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  emergencia: { label: "Emergencia",          emoji: "🚨", color: "#ef4444", bg: "#fef2f2" },
  incidencia: { label: "Incidencia",          emoji: "⚠️", color: "#f59e0b", bg: "#fffbeb" },
  mitin:      { label: "Mitin / Evento",      emoji: "👥", color: "#10b981", bg: "#f0fdf4" },
  propaganda: { label: "Propaganda",          emoji: "📌", color: "#3b82f6", bg: "#eff6ff" },
  servicios:  { label: "Falla de Servicios",  emoji: "💡", color: "#8b5cf6", bg: "#f5f3ff" },
  sospechoso: { label: "Actividad Sospechosa",emoji: "👀", color: "#1f2937", bg: "#f8fafc" },
  brigada:    { label: "Brigada",             emoji: "🚶", color: "#ec4899", bg: "#fdf2f8" },
};

type ReportFeature = {
  properties: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    createdAt: string;
  };
  geometry: { type: "Point"; coordinates: [number, number] };
};

// ─── Leaflet Map Component (loaded dynamically, SSR-safe) ─────────────────────
function LeafletMapInner() {
  const [L, setL] = useState<any>(null);
  const [mapRef, setMapRef] = useState<any>(null);
  const [markersLayer, setMarkersLayer] = useState<any>(null);

  const [allReports, setAllReports] = useState<ReportFeature[]>([]);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set(Object.keys(CATEGORIES))
  );

  // New report form
  const [newReportCoords, setNewReportCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reportForm, setReportForm] = useState({ title: "", description: "", category: "incidencia" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // UI toggles
  const [showFilters, setShowFilters] = useState(false);

  // ── Fetch reports ──────────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/map/reports?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAllReports(data.features ?? []);
      }
    } catch (err) {
      console.error("Error cargando reportes:", err);
    }
  }, []);

  // Poll every 10s
  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 10_000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  // ── Initialize Leaflet ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    import("leaflet").then((leaflet) => {
      const leafletModule = leaflet.default || leaflet;
      setL(leafletModule);

      // Fix default icon paths for webpack
      delete (leafletModule.Icon.Default.prototype as any)._getIconUrl;
      leafletModule.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const container = document.getElementById("leaflet-map-container");
      if (!container || (container as any)._leaflet_id) return;

      const map = leafletModule.map(container, {
        center: [20.63, -103.22],
        zoom: 13,
        zoomControl: false,
      });

      // Add zoom control to bottom-right
      leafletModule.control.zoom({ position: "bottomright" }).addTo(map);

      // OSM tile layer
      leafletModule.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap Contributors",
        maxZoom: 19,
      }).addTo(map);

      // Layer group for markers
      const layer = leafletModule.layerGroup().addTo(map);
      setMarkersLayer(layer);
      setMapRef(map);

      // Click on map → open new report form
      map.on("click", (e: any) => {
        setNewReportCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    });

    return () => {
      // cleanup handled by Leaflet internally
    };
  }, []);

  // ── Render markers whenever data or filters change ──────────────────────────
  useEffect(() => {
    if (!L || !markersLayer || !mapRef) return;

    markersLayer.clearLayers();

    const filtered = allReports.filter((r) =>
      activeCategories.has(r.properties.category)
    );

    filtered.forEach((report) => {
      const [lng, lat] = report.geometry.coordinates;
      const cat = CATEGORIES[report.properties.category] ?? {
        label: report.properties.category,
        emoji: "📍",
        color: "#64748b",
        bg: "#f8fafc",
      };

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width:36px;height:36px;border-radius:50%;
          background:${cat.color};border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:16px;cursor:pointer;
        ">${cat.emoji}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      });

      const date = new Date(report.properties.createdAt).toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const popupHtml = `
        <div style="font-family:'Segoe UI',system-ui,sans-serif;min-width:220px;max-width:280px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="width:30px;height:30px;border-radius:8px;background:${cat.bg};
              display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${cat.emoji}</div>
            <div>
              <div style="font-size:10px;font-weight:800;text-transform:uppercase;
                letter-spacing:.5px;color:${cat.color}">${cat.label}</div>
              <div style="font-size:11px;color:#94a3b8;margin-top:1px">${date}</div>
            </div>
          </div>
          <h3 style="margin:0 0 4px;font-size:14px;font-weight:800;color:#0f172a;line-height:1.3">${report.properties.title}</h3>
          <p style="margin:0;font-size:12px;color:#475569;line-height:1.5">${report.properties.description}</p>
        </div>
      `;

      L.marker([lat, lng], { icon })
        .bindPopup(popupHtml, { closeButton: true, maxWidth: 300, offset: [0, -5] })
        .addTo(markersLayer);
    });
  }, [L, markersLayer, mapRef, allReports, activeCategories]);

  // ── Toggle a category ───────────────────────────────────────────────────────
  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // ── Submit new report ──────────────────────────────────────────────────────
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportCoords) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/map/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...reportForm,
          latitude: newReportCoords.lat,
          longitude: newReportCoords.lng,
        }),
      });
      if (res.ok) {
        setReportSuccess(true);
        setReportForm({ title: "", description: "", category: "incidencia" });
        await fetchReports();
        setTimeout(() => {
          setReportSuccess(false);
          setNewReportCoords(null);
        }, 1800);
      } else {
        alert("Error al guardar reporte. Intenta de nuevo.");
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "600px" }}>

      {/* Leaflet CSS */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Map container */}
      <div
        id="leaflet-map-container"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow-soft)",
          background: "#e5e7eb",
          zIndex: 0,
        }}
      />

      {/* ── TOP-LEFT: Report count + filter ───────────────────────────────────── */}
      <div style={{ position: "absolute", top: "12px", left: "12px", zIndex: 1000, display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{
          background: "white", borderRadius: "12px", padding: "10px 16px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.12)", display: "flex", alignItems: "center", gap: "10px",
        }}>
          <span style={{
            width: "10px", height: "10px", background: "#22c55e", borderRadius: "50%",
            display: "inline-block", boxShadow: "0 0 0 3px #bbf7d0",
          }} />
          <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a" }}>
            {allReports.filter((r) => activeCategories.has(r.properties.category)).length} reportes
          </span>
          <button
            onClick={() => setShowFilters((p) => !p)}
            style={{
              marginLeft: "4px", background: showFilters ? "#1e3a8a" : "#f1f5f9",
              color: showFilters ? "white" : "#475569",
              border: "none", borderRadius: "8px", padding: "5px 10px",
              fontWeight: 700, fontSize: "12px", cursor: "pointer",
            }}
          >
            🔽 Filtros
          </button>
        </div>

        {/* Filter dropdown */}
        {showFilters && (
          <div style={{
            background: "white", borderRadius: "14px", padding: "14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.16)", minWidth: "240px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", color: "#64748b" }}>Categorías</span>
              <button
                onClick={() => setActiveCategories(new Set(Object.keys(CATEGORIES)))}
                style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb", border: "none", background: "none", cursor: "pointer" }}
              >Todas</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <label key={key} style={{
                  display: "flex", alignItems: "center", gap: "10px", padding: "7px 10px",
                  borderRadius: "8px", background: activeCategories.has(key) ? cat.bg : "#f8fafc",
                  cursor: "pointer", transition: "background .15s",
                }}>
                  <input
                    type="checkbox" checked={activeCategories.has(key)}
                    onChange={() => toggleCategory(key)}
                    style={{ accentColor: cat.color }}
                  />
                  <span style={{ fontSize: "15px" }}>{cat.emoji}</span>
                  <span style={{
                    fontSize: "13px", fontWeight: 600,
                    color: activeCategories.has(key) ? cat.color : "#94a3b8",
                  }}>{cat.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: New report ────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: "360px",
        background: "white", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        transform: newReportCoords ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
        zIndex: 1100, display: "flex", flexDirection: "column",
        borderRadius: "0 12px 12px 0", overflow: "hidden",
      }}>
        {/* Panel header */}
        <div style={{
          padding: "20px 20px 16px", borderBottom: "1px solid #f1f5f9",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>📍 Nuevo Reporte</h3>
            {newReportCoords && (
              <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" }}>
                {newReportCoords.lat.toFixed(5)}, {newReportCoords.lng.toFixed(5)}
              </p>
            )}
          </div>
          <button
            onClick={() => setNewReportCoords(null)}
            style={{
              width: "32px", height: "32px", borderRadius: "8px",
              border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "16px", color: "#64748b",
            }}
          >✕</button>
        </div>

        {/* Panel body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {reportSuccess ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "200px", gap: "12px" }}>
              <div style={{ fontSize: "48px" }}>✅</div>
              <p style={{ fontWeight: 800, color: "#166534", fontSize: "16px" }}>¡Reporte guardado!</p>
              <p style={{ fontSize: "13px", color: "#64748b", textAlign: "center" }}>El marcador ya aparece en el mapa.</p>
            </div>
          ) : (
            <form id="report-form" onSubmit={handleSubmitReport} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Category selector */}
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", color: "#64748b", marginBottom: "10px" }}>Categoría *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <label key={key} style={{
                      display: "flex", alignItems: "center", gap: "6px", padding: "8px 10px",
                      border: `2px solid ${reportForm.category === key ? cat.color : "#e2e8f0"}`,
                      borderRadius: "9px", cursor: "pointer",
                      background: reportForm.category === key ? cat.bg : "white",
                      transition: "all .15s",
                    }}>
                      <input type="radio" name="category" value={key} checked={reportForm.category === key} onChange={() => setReportForm((p) => ({ ...p, category: key }))} style={{ display: "none" }} />
                      <span style={{ fontSize: "16px" }}>{cat.emoji}</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: reportForm.category === key ? cat.color : "#94a3b8", lineHeight: 1.2 }}>{cat.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", color: "#64748b", marginBottom: "6px" }}>Título del evento *</label>
                <input
                  required type="text" placeholder="Ej. Lona vandalizada en Calle Morelos"
                  value={reportForm.title}
                  onChange={(e) => setReportForm((p) => ({ ...p, title: e.target.value }))}
                  style={{ width: "100%", padding: "11px 12px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", outline: "none", background: "#f8fafc", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".5px", color: "#64748b", marginBottom: "6px" }}>Descripción *</label>
                <textarea
                  required rows={4} placeholder="Describe lo que observas..."
                  value={reportForm.description}
                  onChange={(e) => setReportForm((p) => ({ ...p, description: e.target.value }))}
                  style={{ width: "100%", padding: "11px 12px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "14px", outline: "none", resize: "none", background: "#f8fafc", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>
            </form>
          )}
        </div>

        {/* Panel footer */}
        {!reportSuccess && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid #f1f5f9", flexShrink: 0, display: "flex", gap: "10px" }}>
            <button type="button" onClick={() => setNewReportCoords(null)} style={{ flex: 1, padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", background: "white", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
              Cancelar
            </button>
            <button form="report-form" type="submit" disabled={isSubmitting} style={{ flex: 2, padding: "12px", border: "none", borderRadius: "10px", background: isSubmitting ? "#cbd5e1" : "#1e3a8a", color: "white", fontWeight: 700, fontSize: "14px", cursor: isSubmitting ? "not-allowed" : "pointer" }}>
              {isSubmitting ? "Guardando..." : "Guardar Reporte"}
            </button>
          </div>
        )}
      </div>

      {/* ── Hint bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: "16px", left: "50%", transform: "translateX(-50%)",
        background: "rgba(15,23,42,0.8)", color: "white", padding: "8px 16px", borderRadius: "999px",
        fontSize: "12px", fontWeight: 600, zIndex: 1000, pointerEvents: "none",
        opacity: !newReportCoords ? 1 : 0, transition: "opacity 0.2s", whiteSpace: "nowrap",
      }}>
        Clic en el mapa para agregar reporte
      </div>
    </div>
  );
}

// ─── Dynamic export (no SSR for Leaflet) ──────────────────────────────────────
export default dynamic(() => Promise.resolve(LeafletMapInner), {
  ssr: false,
  loading: () => (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "600px", flexDirection: "column", gap: "12px",
    }}>
      <div style={{
        width: "40px", height: "40px", border: "3px solid #e2e8f0",
        borderTop: "3px solid var(--blue-600)", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "var(--muted)", fontSize: "14px" }}>Cargando mapa...</p>
    </div>
  ),
});


