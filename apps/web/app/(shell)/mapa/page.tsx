"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
// import "leaflet.markercluster/dist/MarkerCluster.css"; // Removing cluster to avoid L undefined issues for now

// Lucide icon SVGs manually baked to avoid ReactDOMServer overhead in loops
const SVGS = {
  TriangleAlert: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  AlertCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
  Users: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  Megaphone: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`,
  Wrench: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  Eye: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
  MapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`,
};

const CATEGORIES: Record<string, { label: string; svg: string; color: string; bg: string }> = {
  emergencia: { label: "Emergencia",          svg: SVGS.TriangleAlert, color: "#ef4444", bg: "#fef2f2" },
  incidencia: { label: "Incidencia",          svg: SVGS.AlertCircle,   color: "#f59e0b", bg: "#fffbeb" },
  mitin:      { label: "Mitin / Evento",      svg: SVGS.Users,         color: "#10b981", bg: "#f0fdf4" },
  propaganda: { label: "Propaganda",          svg: SVGS.Megaphone,     color: "#3b82f6", bg: "#eff6ff" },
  servicios:  { label: "Falla de Servicios",  svg: SVGS.Wrench,        color: "#8b5cf6", bg: "#f5f3ff" },
  sospechoso: { label: "Actividad Sospechosa",svg: SVGS.Eye,           color: "#1f2937", bg: "#f8fafc" },
  brigada:    { label: "Brigada",             svg: SVGS.MapPin,        color: "#ec4899", bg: "#fdf2f8" },
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

export default function MapaPage() {
  const [L, setL] = useState<any>(null);
  const [mapRef, setMapRef] = useState<any>(null);
  const [markersLayer, setMarkersLayer] = useState<any>(null);
  const [geoJsonLayer, setGeoJsonLayer] = useState<any>(null);
  const [allReports, setAllReports] = useState<ReportFeature[]>([]);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(Object.keys(CATEGORIES)));

  const [newReportCoords, setNewReportCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [reportForm, setReportForm] = useState({ title: "", description: "", category: "incidencia" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;

    import("leaflet").then((leaflet) => {
      const leafletModule = leaflet.default || leaflet;
      setL(leafletModule);

      const container = document.getElementById("leaflet-map-container");
      if (!container || (container as any)._leaflet_id) return;

      const map = leafletModule.map(container, {
        center: [20.6248, -103.2422],
        zoom: 13,
        zoomControl: false,
      });

      leafletModule.control.zoom({ position: "bottomright" }).addTo(map);

      leafletModule.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap Contributors",
        maxZoom: 19,
      }).addTo(map);

      const layer = leafletModule.layerGroup().addTo(map);
      setMarkersLayer(layer);
      setMapRef(map);

      map.on("click", (e: any) => {
        setNewReportCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      });
    });
  }, []);

  // Load geojson independently
  useEffect(() => {
    if (!L || !mapRef || geoJsonLayer) return;
    fetch("/api/map/sections/geojson")
      .then(res => res.json())
      .then(data => {
        const layer = L.geoJSON(data, {
          style: {
            color: "#3b82f6",
            weight: 2,
            opacity: 0.3,
            fillOpacity: 0.05
          }
        }).addTo(mapRef);
        layer.bringToBack();
        setGeoJsonLayer(layer);
      })
      .catch(console.error);
  }, [L, mapRef, geoJsonLayer]);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/map/reports");
      const data = await res.json();
      setAllReports(data.features || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Render markers whenever data or filters change
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
        svg: SVGS.AlertCircle,
        color: "#64748b",
        bg: "#f8fafc"
      };

      const icon = L.divIcon({
        html: `<div style="background-color:${cat.bg}; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:${cat.color}; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">${cat.svg}</div>`,
        className: "custom-div-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });

      const date = new Date(report.properties.createdAt).toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const popupHtml = `
        <div style="font-family:'Segoe UI',system-ui,sans-serif;min-width:220px;max-width:280px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="width:30px;height:30px;border-radius:8px;background:${cat.bg}; color:${cat.color};
              display:flex;align-items:center;justify-content:center;flex-shrink:0">${cat.svg}</div>
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

  const toggleCategory = (cat: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

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
        alert("Error al guardar el reporte.");
      }
    } catch (err) {
      alert("Error de conexión al guardar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "600px" }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div id="leaflet-map-container" style={{ position: "absolute", inset: 0, borderRadius: "12px", overflow: "hidden", border: "1px solid var(--line)", boxShadow: "var(--shadow-soft)", background: "#e5e7eb", zIndex: 0 }} />

      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, width: "320px", display: "flex", flexDirection: "column", gap: "12px", pointerEvents: "none" }}>
        
        {/* Filters Card */}
        <div style={{ background: "white", borderRadius: "16px", padding: "16px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)", pointerEvents: "auto", border: "1px solid rgba(0,0,0,0.05)" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "700", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
            Filtros del Mapa
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => toggleCategory(key)}
                style={{
                  display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "8px", border: "1px solid transparent",
                  backgroundColor: activeCategories.has(key) ? cat.bg : "#f1f5f9",
                  color: activeCategories.has(key) ? cat.color : "#64748b",
                  cursor: "pointer", transition: "all 0.2s", textAlign: "left", width: "100%",
                }}
              >
                <div 
                  style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "6px", backgroundColor: activeCategories.has(key) ? "white" : "transparent" }}
                  dangerouslySetInnerHTML={{ __html: cat.svg }}
                />
                <span style={{ fontSize: "13px", fontWeight: activeCategories.has(key) ? "600" : "400", flex: 1 }}>{cat.label}</span>
                <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: activeCategories.has(key) ? cat.color : "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "12px" }}>
                  {activeCategories.has(key) ? "✓" : ""}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {newReportCoords && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(15,23,42,0.4)", backdropFilter: "blur(2px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "16px", width: "90%", maxWidth: "400px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>Nuevo Reporte</h3>
            
            {reportSuccess ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: "#10b981" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#d1fae5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>✓</div>
                <div style={{ fontWeight: "600" }}>¡Reporte guardado exitosamente!</div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#475569" }}>Categoría</label>
                  <select
                    value={reportForm.category}
                    onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", backgroundColor: "white" }}
                  >
                    {Object.entries(CATEGORIES).map(([k, c]) => (
                      <option key={k} value={k}>{c.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#475569" }}>Título</label>
                  <input
                    type="text"
                    required
                    value={reportForm.title}
                    onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                    placeholder="Ej. Baches en la calle principal"
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#475569" }}>Descripción</label>
                  <textarea
                    required
                    rows={3}
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    placeholder="Detalles de la incidencia..."
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", resize: "none" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setNewReportCoords(null)}
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "white", color: "#475569", fontWeight: "600", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: "#3b82f6", color: "white", fontWeight: "600", cursor: "pointer", opacity: isSubmitting ? 0.7 : 1 }}
                  >
                    {isSubmitting ? "Guardando..." : "Guardar Reporte"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
