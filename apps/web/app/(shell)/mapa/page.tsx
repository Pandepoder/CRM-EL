"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  Layers, 
  X, 
  PlusCircle, 
  Search, 
  ChevronRight, 
  ListFilter, 
  Trash2, 
  SlidersHorizontal, 
  Loader2, 
  Download, 
  Edit3, 
  ShieldAlert, 
  Flame, 
  LocateFixed,
  Users,
  Compass,
  Check,
  Eye,
  Minimize2
} from "lucide-react";

// Lucide icon SVGs baked for crisp Leaflet HTML markers
const SVGS = {
  TriangleAlert: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  AlertCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
  Users: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  Megaphone: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`,
  Wrench: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  Eye: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
  MapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`,
  Trash: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
};

const CATEGORIES: Record<string, { label: string; svg: string; color: string; bg: string; border: string }> = {
  emergencia: { label: "Emergencia Crítica", svg: SVGS.TriangleAlert, color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  servicios: { label: "Falla de Servicios", svg: SVGS.Wrench, color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  incidencia: { label: "Incidencia Territorial", svg: SVGS.AlertCircle, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  propaganda: { label: "Propaganda / Lona", svg: SVGS.Megaphone, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  mitin: { label: "Mitin / Evento", svg: SVGS.Users, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
  sospechoso: { label: "Actividad Sospechosa", svg: SVGS.Eye, color: "#1f2937", bg: "#f8fafc", border: "#e2e8f0" },
  brigada: { label: "Solicitud de Brigada", svg: SVGS.MapPin, color: "#ec4899", bg: "#fdf2f8", border: "#fbcfe8" },
};

const MUNICIPALITY_COLORS: Record<string, { stroke: string; fill: string }> = {
  "Tonalá": { stroke: "#4f46e5", fill: "#6366f1" },
  "Guadalajara": { stroke: "#7e22ce", fill: "#a855f7" },
  "San Pedro Tlaquepaque": { stroke: "#d97706", fill: "#f59e0b" },
  "Zapopan": { stroke: "#059669", fill: "#10b981" },
  "Tlajomulco de Zúñiga": { stroke: "#0891b2", fill: "#06b6d4" },
  "El Salto": { stroke: "#e11d48", fill: "#f43f5e" },
  "Zapotlanejo": { stroke: "#475569", fill: "#64748b" },
  "Ixtlahuacán de los Membrillos": { stroke: "#0d9488", fill: "#14b8a6" },
  "Juanacatlán": { stroke: "#4338ca", fill: "#818cf8" },
};

const TILE_STYLES = {
  positron: {
    name: "Carto Claro",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; CartoDB & OpenStreetMap",
    icon: "🏙️"
  },
  dark: {
    name: "Táctico Nocturno",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; CartoDB Dark Matter",
    icon: "🌙"
  },
  satellite: {
    name: "Satélite HD",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri World Imagery",
    icon: "🛰️"
  },
  osm: {
    name: "Calles Clásico",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap Contributors",
    icon: "🗺️"
  }
} as const;

const MUNICIPALITY_CENTERS = {
  "all": { center: [20.6300, -103.2800] as [number, number], zoom: 11 },
  "Tonalá": { center: [20.6240, -103.2350] as [number, number], zoom: 13 },
  "Guadalajara": { center: [20.6750, -103.3450] as [number, number], zoom: 13 },
  "San Pedro Tlaquepaque": { center: [20.6050, -103.3250] as [number, number], zoom: 13 },
  "Zapopan": { center: [20.7100, -103.4100] as [number, number], zoom: 12 },
  "Tlajomulco de Zúñiga": { center: [20.4800, -103.4100] as [number, number], zoom: 12 },
  "El Salto": { center: [20.5200, -103.2300] as [number, number], zoom: 13 },
  "Zapotlanejo": { center: [20.6250, -103.0750] as [number, number], zoom: 13 },
  "Ixtlahuacán de los Membrillos": { center: [20.4100, -103.1850] as [number, number], zoom: 13 },
  "Juanacatlán": { center: [20.5050, -103.1600] as [number, number], zoom: 13 },
};

type ReportFeature = {
  properties: {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    createdAt: string;
    sectionNum?: number;
    sectionId?: string;
    municipality?: string;
    assignedToUserId?: string;
    eventDate?: string;
  };
  geometry: { type: "Point"; coordinates: [number, number] };
};

type SectionProperties = {
  id: string;
  section_num: number;
  name: string;
  municipality?: string;
  colonies: string[];
  contactsCount: number;
  visitsScheduled: number;
  visitsCompleted: number;
  incidentsActive: number;
  incidentsResolved: number;
  representatives: Array<{ name: string; role: string }>;
};

type UserOption = {
  id: string;
  displayName: string;
  email: string;
  role: string;
};

declare global {
  interface Window {
    __toggleReportStatus?: (id: string, newStatus: string) => void;
    __deleteReport?: (id: string) => void;
  }
}

export default function MapaPage() {
  const [L, setL] = useState<any>(null);
  const [mapRef, setMapRef] = useState<any>(null);
  const [tileLayerRef, setTileLayerRef] = useState<any>(null);
  const [markersLayer, setMarkersLayer] = useState<any>(null);
  const [geoJsonLayer, setGeoJsonLayer] = useState<any>(null);
  const [labelsLayer, setLabelsLayer] = useState<any>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<any>(null);
  const [allReports, setAllReports] = useState<ReportFeature[]>([]);
  const [sectionsData, setSectionsData] = useState<any>(null);
  const [systemUsers, setSystemUsers] = useState<UserOption[]>([]);
  
  // Views: Map view or Incident Operations Center view
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");

  // Operational Category Sub-Tab in Incident Center:
  const [incidentSubTab, setIncidentSubTab] = useState<"active" | "emergency" | "resolved" | "all">("active");

  // =========================================================================
  // INFORMATION DENSITY SLIDER (0 = Solo Incidencias, 1 = Territorial, 2 = Completo)
  // Vista inicial predeterminada en 0 (Limpia con solo incidencias)
  // =========================================================================
  const [infoDensity, setInfoDensity] = useState<number>(0);

  // =========================================================================
  // ZERO-OVERLAP UNIFIED DRAWER STATE
  // ("none" | "search" | "section" | "incidents" | "layers")
  // =========================================================================
  const [activeDrawer, setActiveDrawer] = useState<"none" | "search" | "section" | "incidents" | "layers">("none");

  // Selected Section for floating detail card / drawer
  const [selectedSection, setSelectedSection] = useState<SectionProperties | null>(null);

  // GPS State
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  // Layer Toggles & Map View Settings (Inicialmente limpias)
  const [selectedTileStyle, setSelectedTileStyle] = useState<string>("positron");
  const [showSections, setShowSections] = useState(false);
  const [showSectionLabels, setShowSectionLabels] = useState(false);
  const [enableClustering, setEnableClustering] = useState(true);

  // Filters & Search for Map
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("all");
  const [activeCategories] = useState<Set<string>>(new Set(Object.keys(CATEGORIES)));

  // Incident Center Specific Filters & Controls
  const [incidentSearchQuery, setIncidentSearchQuery] = useState("");
  const [incidentMunicipalityFilter, setIncidentMunicipalityFilter] = useState<string>("all");
  const [incidentCategoryFilter, setIncidentCategoryFilter] = useState<string>("all");

  // New report creation modal & Reverse Geocoding State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [newReportCoords, setNewReportCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);
  const [detectedLocationInfo, setDetectedLocationInfo] = useState<{
    address?: string;
    sectionNum?: number;
    sectionId?: string;
    municipality?: string;
    colony?: string;
    postcode?: string;
  } | null>(null);
  
  const [reportForm, setReportForm] = useState({ 
    title: "", 
    address: "",
    description: "", 
    category: "servicios",
    municipality: "Tonalá",
    assignedToUserId: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Edit Incident Modal
  const [editingReport, setEditingReport] = useState<ReportFeature | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "servicios",
    municipality: "Tonalá",
    status: "active",
    assignedToUserId: ""
  });
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);

  // Delete / Purge Confirmation Modals
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open / Toggle Drawer uniquely without overlapping
  const toggleDrawer = (drawerName: "search" | "section" | "incidents" | "layers") => {
    if (activeDrawer === drawerName) {
      setActiveDrawer("none");
    } else {
      setActiveDrawer(drawerName);
    }
  };

  // Perform Live Reverse Geocoding with Nominatim & INE Section Matching
  const triggerIncidentCreation = useCallback(async (lat: number, lng: number, explicitMuni?: string) => {
    setNewReportCoords({ lat, lng });
    setIsGeocodingLoading(true);
    setIsReportModalOpen(true);
    
    setReportForm({
      title: "",
      address: "Buscando dirección exacta en mapa...",
      description: "",
      category: "servicios",
      municipality: explicitMuni || (selectedMunicipality !== "all" ? selectedMunicipality : "Tonalá"),
      assignedToUserId: ""
    });

    try {
      const res = await fetch(`/api/map/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        const detectedMuni = explicitMuni || data.municipality || "Tonalá";
        const detectedAddress = data.address || `Ubicación en ${detectedMuni}, Jalisco`;
        
        setDetectedLocationInfo({
          address: detectedAddress,
          sectionNum: data.sectionNum,
          sectionId: data.sectionId,
          municipality: detectedMuni,
          colony: data.colony,
          postcode: data.postcode
        });

        setReportForm((prev) => ({
          ...prev,
          address: detectedAddress,
          municipality: detectedMuni,
          title: prev.title || (data.colony ? `Reporte en ${data.colony}` : `Reporte en ${detectedMuni}`)
        }));
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
    } finally {
      setIsGeocodingLoading(false);
    }
  }, [selectedMunicipality]);

  // Mobile GPS Geolocation Handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador o dispositivo no soporta geolocalización GPS.");
      return;
    }

    setIsLocatingGPS(true);
    showToast("📍 Obteniendo tu ubicación GPS...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocatingGPS(false);
        const { latitude, longitude, accuracy } = position.coords;

        if (mapRef && L) {
          mapRef.flyTo([latitude, longitude], 16, { duration: 1.2 });

          if (userLocationMarker) userLocationMarker.remove();

          const gpsIcon = L.divIcon({
            html: `
              <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
                <div style="position:absolute; width:30px; height:30px; border-radius:50%; background:rgba(37,99,235,0.35); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
                <div style="width:16px; height:16px; border-radius:50%; background:#2563eb; border:3px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.35);"></div>
              </div>
            `,
            className: "gps-user-marker",
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          const marker = L.marker([latitude, longitude], { icon: gpsIcon })
            .bindPopup(`<strong>📍 Estás aquí</strong><br/><span style="font-size:11px;color:#64748b;">Precisión: ±${Math.round(accuracy)}m</span>`)
            .addTo(mapRef);

          setUserLocationMarker(marker);
          showToast(`✓ GPS fijado (±${Math.round(accuracy)}m)`);
        }
      },
      (error) => {
        setIsLocatingGPS(false);
        console.warn("GPS Error:", error);
        showToast("⚠️ No se pudo obtener la señal GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Navigate to Incident on Map
  const handleFocusOnMap = (r: ReportFeature) => {
    const [lng, lat] = r.geometry.coordinates;
    setActiveTab("map");
    setActiveDrawer("none");
    setTimeout(() => {
      if (mapRef) {
        mapRef.flyTo([lat, lng], 16, { duration: 1.0 });
        showToast(`📍 Incidencia: ${r.properties.title}`);
      }
    }, 150);
  };

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === "undefined") return;

    import("leaflet").then((leaflet) => {
      const leafletModule = leaflet.default || leaflet;
      setL(leafletModule);

      const container = document.getElementById("leaflet-map-container");
      if (!container || (container as any)._leaflet_id) return;

      const map = leafletModule.map(container, {
        center: [20.6300, -103.2800],
        zoom: 12,
        zoomControl: false,
      });

      leafletModule.control.zoom({ position: "bottomright" }).addTo(map);

      // Default base layer: CartoDB Positron
      const initialTiles = leafletModule.tileLayer(TILE_STYLES.positron.url, {
        attribution: TILE_STYLES.positron.attribution,
        maxZoom: 19,
        subdomains: "abcd"
      }).addTo(map);

      setTileLayerRef(initialTiles);

      const layer = leafletModule.layerGroup().addTo(map);
      const labels = leafletModule.layerGroup().addTo(map);
      setMarkersLayer(layer);
      setLabelsLayer(labels);
      setMapRef(map);

      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => map.invalidateSize(), 400);

      const handleResize = () => map.invalidateSize();
      window.addEventListener("resize", handleResize);

      map.on("dblclick", (e: any) => {
        void triggerIncidentCreation(e.latlng.lat, e.latlng.lng);
      });

      map.on("click", () => {
        // Auto-close open drawer on map tap if empty
        // so user has uninterrupted view
      });

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    });
  }, [triggerIncidentCreation]);

  // Invalidate map size when tab switches back to map
  useEffect(() => {
    if (activeTab === "map" && mapRef) {
      setTimeout(() => mapRef.invalidateSize(), 100);
      setTimeout(() => mapRef.invalidateSize(), 300);
    }
  }, [activeTab, mapRef]);

  const handleChangeTileStyle = (styleKey: string) => {
    const style = (TILE_STYLES as Record<string, { name: string; url: string; attribution: string; icon: string }>)[styleKey];
    if (!style || !mapRef || !L || !tileLayerRef) return;

    setSelectedTileStyle(styleKey);
    tileLayerRef.setUrl(style.url);
    tileLayerRef.options.attribution = style.attribution;
    showToast(`🗺️ Capa: ${style.name}`);
  };

  // 2. Fetch Incidents
  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/map/reports", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAllReports(data.features || []);
      }
    } catch (error) {
      console.error("Failed to load map reports:", error);
    }
  }, []);

  // 3. Fetch Sections GeoJSON
  const fetchSections = useCallback(async () => {
    try {
      const res = await fetch("/api/map/sections/geojson", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSectionsData(data);
      }
    } catch (error) {
      console.error("Failed to load sections GeoJSON:", error);
    }
  }, []);

  // 4. Fetch Users for Assignment
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/map/users", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSystemUsers(data.users || []);
      }
    } catch (error) {
      console.error("Failed to load system users:", error);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchSections();
    fetchUsers();
  }, [fetchReports, fetchSections, fetchUsers]);

  // 5. Toggle Single Report Status
  const handleToggleReportStatus = useCallback(async (reportId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/map/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        showToast(newStatus === "resolved" ? "✓ Incidencia marcada como atendida" : "↺ Incidencia reabierta");
        await fetchReports();
        await fetchSections();
        if (mapRef) mapRef.closePopup();
      } else {
        alert("Error al actualizar el estado.");
      }
    } catch (e) {
      console.error("Status update error:", e);
      alert("Error de conexión.");
    }
  }, [fetchReports, fetchSections, mapRef]);

  // 6. Delete Single Report
  const handleDeleteReport = useCallback(async (reportId: string) => {
    try {
      const res = await fetch(`/api/map/reports/${reportId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("🗑️ Incidencia eliminada");
        await fetchReports();
        await fetchSections();
        if (mapRef) mapRef.closePopup();
      } else {
        alert("Error al eliminar la incidencia.");
      }
    } catch (e) {
      console.error("Delete error:", e);
      alert("Error de conexión al eliminar.");
    }
  }, [fetchReports, fetchSections, mapRef]);

  useEffect(() => {
    window.__toggleReportStatus = (id: string, newStatus: string) => {
      void handleToggleReportStatus(id, newStatus);
    };
    window.__deleteReport = (id: string) => {
      if (confirm("¿Estás seguro de que deseas eliminar esta incidencia?")) {
        void handleDeleteReport(id);
      }
    };
    return () => {
      delete window.__toggleReportStatus;
      delete window.__deleteReport;
    };
  }, [handleToggleReportStatus, handleDeleteReport]);

  // 7. Purge All Resolved Incidents
  const handlePurgeResolved = async () => {
    setIsPurging(true);
    try {
      const res = await fetch("/api/map/reports/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "purge_resolved",
          municipality: incidentMunicipalityFilter
        })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`🧹 ${data.message}`);
        setIsPurgeModalOpen(false);
        await fetchReports();
        await fetchSections();
      } else {
        alert("Error al depurar incidencias resueltas.");
      }
    } catch (err) {
      console.error("Purge failed:", err);
      alert("Error de conexión al purgar.");
    } finally {
      setIsPurging(false);
    }
  };

  // 8. Open Edit Modal
  const handleOpenEdit = (r: ReportFeature) => {
    setEditingReport(r);
    setEditForm({
      title: r.properties.title,
      description: r.properties.description,
      category: r.properties.category,
      municipality: r.properties.municipality || "Tonalá",
      status: r.properties.status,
      assignedToUserId: r.properties.assignedToUserId || ""
    });
  };

  // 9. Save Edited Incident
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReport) return;

    setIsEditingSubmitting(true);
    try {
      const res = await fetch(`/api/map/reports/${editingReport.properties.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          description: editForm.description,
          category: editForm.category,
          municipality: editForm.municipality,
          status: editForm.status,
          assignedToUserId: editForm.assignedToUserId || null
        })
      });

      if (res.ok) {
        showToast("✓ Incidencia actualizada");
        setEditingReport(null);
        await fetchReports();
        await fetchSections();
      } else {
        alert("Error al actualizar la incidencia.");
      }
    } catch (err) {
      console.error("Edit error:", err);
      alert("Error de red al guardar.");
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  // 10. Render Sections Layer based on Information Density (infoDensity)
  useEffect(() => {
    if (!L || !mapRef || !sectionsData) return;

    if (geoJsonLayer) geoJsonLayer.remove();
    if (labelsLayer) labelsLayer.clearLayers();

    // If infoDensity is 0 (Solo Incidencias) or showSections is false, do not draw polygons
    if (infoDensity === 0 || !showSections) {
      setGeoJsonLayer(null);
      return;
    }

    const filteredFeatures = selectedMunicipality === "all"
      ? sectionsData.features
      : sectionsData.features.filter((f: any) => f.properties?.municipality === selectedMunicipality);

    const layerData = { ...sectionsData, features: filteredFeatures };

    const layer = L.geoJSON(layerData, {
      style: (feature: any) => {
        const mun = feature?.properties?.municipality || "Tonalá";
        const theme = MUNICIPALITY_COLORS[mun] || { stroke: "#4f46e5", fill: "#6366f1" };
        const isSelected = selectedSection?.section_num === feature?.properties?.section_num;

        // Density 1: Subtle line, low fill. Density 2: Full contrast
        const isLevel1 = infoDensity === 1;

        return {
          color: isSelected ? "#1e1b4b" : theme.stroke,
          weight: isSelected ? 3.5 : isLevel1 ? 1.2 : 1.8,
          opacity: isSelected ? 1.0 : isLevel1 ? 0.6 : 0.85,
          fillColor: isSelected ? "#312e81" : theme.fill,
          fillOpacity: isSelected ? 0.40 : isLevel1 ? 0.08 : 0.22,
          lineJoin: "round",
          lineCap: "round"
        };
      },
      onEachFeature: (feature: any, layerItem: any) => {
        const p = feature.properties as SectionProperties;
        const mun = p.municipality || "Tonalá";
        
        layerItem.bindTooltip(
          `
            <div style="font-family:system-ui,sans-serif; padding:4px;">
              <div style="font-size:12px; font-weight:800; color:#0f172a;">Sección ${p.section_num} <span style="font-weight:600; color:#6366f1;">(${mun})</span></div>
              <div style="font-size:10px; color:#475569; margin-top:2px;">${p.colonies.slice(0, 3).join(", ") || mun}</div>
              <div style="display:flex; gap:8px; margin-top:4px; font-size:10px; font-weight:700; color:#1e293b;">
                <span>👥 ${p.contactsCount} simpatizantes</span>
                <span>📋 ${p.visitsCompleted} visitas</span>
              </div>
            </div>
          `,
          { sticky: true, className: "section-map-tooltip" }
        );

        // Show centroid labels if density >= 1 and toggle is enabled
        if (infoDensity >= 1 && showSectionLabels && labelsLayer) {
          const bounds = layerItem.getBounds();
          const center = bounds.getCenter();
          const labelIcon = L.divIcon({
            html: `<div style="background:rgba(15,23,42,0.85); color:#ffffff; font-size:10px; font-weight:800; padding:1.5px 5px; border-radius:5px; border:1px solid rgba(255,255,255,0.4); text-align:center; white-space:nowrap; pointer-events:none; box-shadow:0 2px 5px rgba(0,0,0,0.3); backdrop-filter:blur(4px);">${p.section_num}</div>`,
            className: "section-centroid-label",
            iconSize: [28, 16],
            iconAnchor: [14, 8]
          });
          L.marker(center, { icon: labelIcon, interactive: false }).addTo(labelsLayer);
        }

        layerItem.on({
          mouseover: (e: any) => {
            e.target.setStyle({ weight: 3.2, fillOpacity: 0.35, opacity: 1.0 });
          },
          mouseout: (e: any) => {
            layer.resetStyle(e.target);
          },
          click: (e: any) => {
            L.DomEvent.stopPropagation(e);
            setSelectedSection(p);
            setActiveDrawer("section");
            mapRef.fitBounds(e.target.getBounds(), { padding: [50, 50], maxZoom: 15 });
          }
        });
      }
    }).addTo(mapRef);

    layer.bringToBack();
    setGeoJsonLayer(layer);
  }, [L, mapRef, labelsLayer, sectionsData, showSections, showSectionLabels, infoDensity, selectedSection, selectedMunicipality]);

  const handleMunicipalityChange = (muni: string) => {
    setSelectedMunicipality(muni);
    setSelectedSection(null);
    if (!mapRef) return;
    const config = (MUNICIPALITY_CENTERS as Record<string, { center: [number, number]; zoom: number }>)[muni] || MUNICIPALITY_CENTERS["all"];
    mapRef.flyTo(config.center, config.zoom, { duration: 1.2 });
  };

  // 11. Render Incident Markers with Guaranteed Prominence & Category Logos
  useEffect(() => {
    if (!L || !markersLayer || !mapRef) return;

    markersLayer.clearLayers();

    const filtered = allReports.filter((r) => {
      return activeCategories.has(r.properties.category);
    });

    const zoom = mapRef.getZoom();

    if (enableClustering && zoom <= 14) {
      const gridSize = zoom <= 11 ? 0.05 : zoom <= 13 ? 0.02 : 0.008;
      const clusters: Record<string, { reports: ReportFeature[]; latSum: number; lngSum: number }> = {};

      filtered.forEach((report) => {
        const [lng, lat] = report.geometry.coordinates;
        const key = `${Math.floor(lat / gridSize)}_${Math.floor(lng / gridSize)}`;
        if (!clusters[key]) clusters[key] = { reports: [], latSum: 0, lngSum: 0 };
        clusters[key].reports.push(report);
        clusters[key].latSum += lat;
        clusters[key].lngSum += lng;
      });

      Object.values(clusters).forEach((c) => {
        const count = c.reports.length;
        const avgLat = c.latSum / count;
        const avgLng = c.lngSum / count;

        if (count === 1) {
          const report = c.reports[0]!;
          renderSingleMarker(report, avgLat, avgLng);
        } else {
          const hasEmergency = c.reports.some(r => r.properties.category === "emergencia" && r.properties.status === "active");
          const clusterIcon = L.divIcon({
            html: `
              <div style="position:relative; width:38px; height:38px; border-radius:50%; background:${hasEmergency ? '#dc2626' : '#2563eb'}; color:white; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; border:3px solid white; box-shadow:0 4px 14px rgba(0,0,0,0.3); cursor:pointer;">
                ${count}
                ${hasEmergency ? `<div style="position:absolute; inset:-4px; border-radius:50%; border:2px solid #ef4444; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
              </div>
            `,
            className: "incident-cluster-marker",
            iconSize: [38, 38],
            iconAnchor: [19, 19]
          });

          L.marker([avgLat, avgLng], { icon: clusterIcon })
            .on("click", () => {
              mapRef.flyTo([avgLat, avgLng], zoom + 2, { duration: 0.8 });
            })
            .addTo(markersLayer);
        }
      });
    } else {
      filtered.forEach((report) => {
        const [lng, lat] = report.geometry.coordinates;
        renderSingleMarker(report, lat, lng);
      });
    }

    // Incidents layer must ALWAYS be in front of everything
    if (markersLayer && markersLayer.bringToFront) {
      markersLayer.bringToFront();
    }

    function renderSingleMarker(report: ReportFeature, lat: number, lng: number) {
      const cat = CATEGORIES[report.properties.category] ?? {
        label: report.properties.category,
        svg: SVGS.AlertCircle,
        color: "#64748b",
        bg: "#f8fafc"
      };

      const isResolved = report.properties.status === "resolved";
      const isEmergency = report.properties.category === "emergencia" && !isResolved;

      const icon = L.divIcon({
        html: `
          <div style="position:relative; width:36px; height:36px; border-radius:50%; background-color:${isResolved ? '#f0fdf4' : cat.bg}; display:flex; align-items:center; justify-content:center; color:${isResolved ? '#16a34a' : cat.color}; border: 2.5px solid ${isResolved ? '#16a34a' : isEmergency ? '#ef4444' : 'white'}; box-shadow: 0 4px 12px rgba(0,0,0,0.28); opacity: ${isResolved ? 0.85 : 1}; cursor: pointer; transform: scale(1.05);">
            ${cat.svg}
            ${isResolved ? `<div style="position:absolute; bottom:-2px; right:-2px; background:#16a34a; color:white; width:14px; height:14px; border-radius:50%; font-size:10px; display:flex; align-items:center; justify-content:center; border:1.5px solid white;">✓</div>` : ''}
            ${isEmergency ? `<div style="position:absolute; inset:-3px; border-radius:50%; border:2px solid #ef4444; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
          </div>
        `,
        className: "custom-incident-marker",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20]
      });

      const date = new Date(report.properties.createdAt).toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      const statusBadge = isResolved
        ? `<span style="background:#dcfce7; color:#15803d; padding:3px 8px; border-radius:9999px; font-size:10px; font-weight:700; text-transform:uppercase;">✓ Atendida</span>`
        : isEmergency
        ? `<span style="background:#fee2e2; color:#dc2626; padding:3px 8px; border-radius:9999px; font-size:10px; font-weight:700; text-transform:uppercase;">● Emergencia</span>`
        : `<span style="background:#fef3c7; color:#b45309; padding:3px 8px; border-radius:9999px; font-size:10px; font-weight:700; text-transform:uppercase;">● Pendiente</span>`;

      const actionButton = isResolved
        ? `<button onclick="window.__toggleReportStatus('${report.properties.id}', 'active')" style="flex:1; padding:8px 10px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
            ↺ Reabrir
          </button>`
        : `<button onclick="window.__toggleReportStatus('${report.properties.id}', 'resolved')" style="flex:1; padding:8px 10px; background:#16a34a; color:white; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 2px 6px rgba(22,163,74,0.3);">
            ✓ Marcar Atendida
          </button>`;

      const popupHtml = `
        <div style="font-family:system-ui,-apple-system,sans-serif; min-width:260px; max-width:320px; padding:6px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <div style="width:24px; height:24px; border-radius:6px; background:${cat.bg}; color:${cat.color}; display:flex; align-items:center; justify-content:center;">${cat.svg}</div>
              <span style="font-size:11px; font-weight:800; color:${cat.color}; text-transform:uppercase;">${cat.label}</span>
            </div>
            ${statusBadge}
          </div>

          <h3 style="margin:0 0 4px; font-size:14px; font-weight:800; color:#0f172a; line-height:1.3;">${report.properties.title}</h3>
          <p style="margin:0 0 8px; font-size:12px; color:#475569; line-height:1.4;">${report.properties.description}</p>
          
          <div style="display:flex; align-items:center; justify-content:space-between; padding-top:6px; border-top:1px solid #f1f5f9; font-size:11px; color:#64748b;">
            <span>${report.properties.sectionNum ? `📍 Sección #${report.properties.sectionNum}` : `📍 ${report.properties.municipality || 'Territorio'}`}</span>
            <span>${date}</span>
          </div>

          <div style="display:flex; gap:6px; margin-top:10px;">
            ${actionButton}
            <button onclick="window.__deleteReport('${report.properties.id}')" title="Eliminar Incidencia" style="padding:8px 10px; background:#fee2e2; color:#dc2626; border:1px solid #fecaca; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center;">
              ${SVGS.Trash}
            </button>
          </div>
        </div>
      `;

      L.marker([lat, lng], { icon })
        .bindPopup(popupHtml, { closeButton: true, maxWidth: 320, offset: [0, -5] })
        .addTo(markersLayer);
    }
  }, [L, markersLayer, mapRef, allReports, activeCategories, enableClustering]);

  // Filtered sections for search
  const filteredSectionsList = useMemo(() => {
    if (!sectionsData?.features) return [];
    const query = searchQuery.toLowerCase().trim();
    
    let baseList = sectionsData.features.map((f: any) => f.properties as SectionProperties);
    if (selectedMunicipality !== "all") {
      baseList = baseList.filter((p: SectionProperties) => p.municipality === selectedMunicipality);
    }

    if (!query) return baseList;

    return baseList.filter((p: SectionProperties) => {
      const secMatch = String(p.section_num).includes(query);
      const colMatch = p.colonies.some(c => c.toLowerCase().includes(query));
      const munMatch = (p.municipality || "").toLowerCase().includes(query);
      return secMatch || colMatch || munMatch;
    });
  }, [sectionsData, searchQuery, selectedMunicipality]);

  const handleSelectSection = (p: SectionProperties) => {
    setSelectedSection(p);
    setActiveDrawer("section");
    if (infoDensity === 0) {
      setInfoDensity(1);
      setShowSections(true);
      setShowSectionLabels(true);
    }
    if (!mapRef) return;
    
    if (geoJsonLayer) {
      geoJsonLayer.eachLayer((layer: any) => {
        if (layer.feature?.properties?.section_num === p.section_num) {
          mapRef.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 15 });
        }
      });
    } else if (sectionsData && L) {
      const feat = sectionsData.features?.find((f: any) => f.properties?.section_num === p.section_num);
      if (feat) {
        const tempGeo = L.geoJSON(feat);
        mapRef.fitBounds(tempGeo.getBounds(), { padding: [50, 50], maxZoom: 15 });
      }
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportCoords) return;
    setIsSubmitting(true);
    try {
      const fullDescription = reportForm.address
        ? `${reportForm.description}\n\n📍 Ubicación: ${reportForm.address}`
        : reportForm.description;

      const res = await fetch("/api/map/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reportForm.title,
          description: fullDescription,
          category: reportForm.category,
          latitude: newReportCoords.lat,
          longitude: newReportCoords.lng,
          municipality: reportForm.municipality || "Tonalá",
          sectionId: detectedLocationInfo?.sectionId,
          assignedToUserId: reportForm.assignedToUserId || null
        }),
      });
      if (res.ok) {
        setReportSuccess(true);
        await fetchReports();
        await fetchSections();
        showToast(`✓ Incidencia registrada en ${reportForm.municipality}`);
        setTimeout(() => {
          setReportSuccess(false);
          setIsReportModalOpen(false);
          setNewReportCoords(null);
          setDetectedLocationInfo(null);
          setIsSubmitting(false);
        }, 1000);
      } else {
        alert("Error al guardar el reporte.");
        setIsSubmitting(false);
      }
    } catch (_err) {
      alert("Error de conexión al guardar.");
      setIsSubmitting(false);
    }
  };

  // Metrics for Incident Operations
  const activeReportsCount = allReports.filter(r => r.properties.status === "active").length;
  const resolvedReportsCount = allReports.filter(r => r.properties.status === "resolved").length;
  const emergencyReportsCount = allReports.filter(r => r.properties.category === "emergencia" && r.properties.status === "active").length;
  const resolutionRate = allReports.length > 0 ? Math.round((resolvedReportsCount / allReports.length) * 100) : 100;

  // Filtered & Sorted Incidents for the Incident Management Center
  const displayIncidents = useMemo(() => {
    let base = [...allReports];

    if (incidentSearchQuery.trim()) {
      const q = incidentSearchQuery.toLowerCase().trim();
      base = base.filter((r) => {
        const titleMatch = r.properties.title.toLowerCase().includes(q);
        const descMatch = r.properties.description.toLowerCase().includes(q);
        const secMatch = String(r.properties.sectionNum || "").includes(q);
        const muniMatch = (r.properties.municipality || "").toLowerCase().includes(q);
        return titleMatch || descMatch || secMatch || muniMatch;
      });
    }

    if (incidentMunicipalityFilter !== "all") {
      base = base.filter((r) => r.properties.municipality === incidentMunicipalityFilter);
    }

    if (incidentCategoryFilter !== "all") {
      base = base.filter((r) => r.properties.category === incidentCategoryFilter);
    }

    const actives = base.filter(r => r.properties.status === "active");
    const resolveds = base.filter(r => r.properties.status === "resolved");

    const applySort = (list: ReportFeature[]) => {
      return list.sort((a, b) => {
        const aEmerg = a.properties.category === "emergencia" ? 2 : 1;
        const bEmerg = b.properties.category === "emergencia" ? 2 : 1;
        if (aEmerg !== bEmerg) return bEmerg - aEmerg;
        return new Date(b.properties.createdAt).getTime() - new Date(a.properties.createdAt).getTime();
      });
    };

    const sortedActives = applySort([...actives]);
    const sortedResolveds = applySort([...resolveds]);

    if (incidentSubTab === "active") {
      return sortedActives;
    } else if (incidentSubTab === "emergency") {
      return sortedActives.filter(r => r.properties.category === "emergencia");
    } else if (incidentSubTab === "resolved") {
      return sortedResolveds;
    } else {
      return [...sortedActives, ...sortedResolveds];
    }
  }, [allReports, incidentSearchQuery, incidentMunicipalityFilter, incidentCategoryFilter, incidentSubTab]);

  const handleExportCSV = () => {
    if (displayIncidents.length === 0) {
      alert("No hay incidencias para exportar con los filtros actuales.");
      return;
    }

    const headers = ["ID", "Título", "Categoría", "Estatus", "Municipio", "Sección", "Fecha"];
    const rows = displayIncidents.map((r) => [
      r.properties.id,
      `"${r.properties.title.replace(/"/g, '""')}"`,
      r.properties.category,
      r.properties.status,
      r.properties.municipality || "Tonalá",
      r.properties.sectionNum || "",
      new Date(r.properties.createdAt).toISOString()
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `incidencias_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("✓ CSV exportado");
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 64px)", minHeight: "600px", display: "flex", flexDirection: "column", background: "#0f172a", overflow: "hidden", fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      
      {/* Top Floating Command Bar */}
      <header style={{ position: "absolute", top: "12px", left: "12px", right: "12px", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", padding: "8px 12px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(226, 232, 240, 0.9)", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)", flexWrap: "wrap" }}>
        
        {/* Left: View Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => {
              setActiveTab("map");
              setActiveDrawer("none");
            }}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px", border: "none",
              backgroundColor: activeTab === "map" ? "#2563eb" : "#f1f5f9",
              color: activeTab === "map" ? "#ffffff" : "#475569",
              fontSize: "12px", fontWeight: "800", cursor: "pointer", transition: "all 0.15s"
            }}
          >
            <Compass size={15} />
            <span>Mapa Cartográfico</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab("list");
              setActiveDrawer("none");
            }}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px", border: "none",
              backgroundColor: activeTab === "list" ? "#2563eb" : "#f1f5f9",
              color: activeTab === "list" ? "#ffffff" : "#475569",
              fontSize: "12px", fontWeight: "800", cursor: "pointer", transition: "all 0.15s"
            }}
          >
            <ListFilter size={15} />
            <span>Centro de Mando</span>
            <span style={{ backgroundColor: activeTab === "list" ? "rgba(255,255,255,0.25)" : "#e2e8f0", color: activeTab === "list" ? "white" : "#334155", padding: "1px 6px", borderRadius: "9999px", fontSize: "11px", fontWeight: "800" }}>
              {activeReportsCount}
            </span>
          </button>
        </div>

        {/* Center: Information Density Slider (Slide de Información) */}
        {activeTab === "map" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "5px 12px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
            <span style={{ fontSize: "11px", fontWeight: "800", color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
              <Eye size={13} style={{ color: "#2563eb" }} />
              <span>Nivel de Información:</span>
            </span>

            <input
              type="range"
              min="0"
              max="2"
              step="1"
              value={infoDensity}
              onChange={(e) => {
                const val = Number(e.target.value);
                setInfoDensity(val);
                if (val === 0) {
                  setShowSections(false);
                  setShowSectionLabels(false);
                  setActiveDrawer("none");
                  showToast("📍 Modo Limpio: Solo Incidencias & Calles activas");
                } else if (val === 1) {
                  setShowSections(true);
                  setShowSectionLabels(true);
                  showToast("🗺️ Modo Territorial: Incidencias + Secciones sutiles");
                } else {
                  setShowSections(true);
                  setShowSectionLabels(true);
                  showToast("📊 Modo Detallado: Mapa completo con métricas");
                }
              }}
              style={{ width: "85px", accentColor: "#2563eb", cursor: "pointer" }}
              title="Desliza para ver más o menos capas e información"
            />

            <span style={{ fontSize: "11px", fontWeight: "800", color: infoDensity === 0 ? "#dc2626" : infoDensity === 1 ? "#0284c7" : "#4f46e5", minWidth: "105px" }}>
              {infoDensity === 0 ? "📍 Solo Incidencias" : infoDensity === 1 ? "🗺️ Territorial" : "📊 Todo Detallado"}
            </span>
          </div>
        )}

        {/* Right: Drawer Triggers and Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {activeTab === "map" && (
            <>
              {/* GPS Button */}
              <button
                onClick={handleLocateMe}
                disabled={isLocatingGPS}
                title="Centrar en mi ubicación GPS"
                style={{ display: "flex", alignItems: "center", gap: "5px", padding: "7px 10px", borderRadius: "9px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
              >
                <LocateFixed size={14} className={isLocatingGPS ? "animate-spin" : ""} />
                <span>GPS</span>
              </button>

              {/* Search Drawer Button */}
              <button
                onClick={() => toggleDrawer("search")}
                style={{
                  display: "flex", alignItems: "center", gap: "5px", padding: "7px 10px", borderRadius: "9px",
                  border: "1px solid",
                  borderColor: activeDrawer === "search" ? "#93c5fd" : "#cbd5e1",
                  backgroundColor: activeDrawer === "search" ? "#eff6ff" : "#f8fafc",
                  color: activeDrawer === "search" ? "#1d4ed8" : "#334155",
                  fontSize: "11px", fontWeight: "800", cursor: "pointer"
                }}
              >
                <Search size={14} />
                <span>Buscar</span>
              </button>

              {/* Incidents Drawer Button */}
              <button
                onClick={() => toggleDrawer("incidents")}
                style={{
                  display: "flex", alignItems: "center", gap: "5px", padding: "7px 10px", borderRadius: "9px",
                  border: "1px solid",
                  borderColor: activeDrawer === "incidents" ? "#fca5a5" : "#cbd5e1",
                  backgroundColor: activeDrawer === "incidents" ? "#fef2f2" : "#f8fafc",
                  color: activeDrawer === "incidents" ? "#b91c1c" : "#334155",
                  fontSize: "11px", fontWeight: "800", cursor: "pointer"
                }}
              >
                <AlertCircle size={14} style={{ color: activeDrawer === "incidents" ? "#dc2626" : "#64748b" }} />
                <span>Incidencias ({activeReportsCount})</span>
              </button>

              {/* Layers Drawer Button */}
              <button
                onClick={() => toggleDrawer("layers")}
                style={{
                  display: "flex", alignItems: "center", gap: "5px", padding: "7px 10px", borderRadius: "9px",
                  border: "1px solid",
                  borderColor: activeDrawer === "layers" ? "#c7d2fe" : "#cbd5e1",
                  backgroundColor: activeDrawer === "layers" ? "#eef2ff" : "#f8fafc",
                  color: activeDrawer === "layers" ? "#4338ca" : "#334155",
                  fontSize: "11px", fontWeight: "800", cursor: "pointer"
                }}
              >
                <SlidersHorizontal size={14} />
                <span>Capas</span>
              </button>

              {/* Hide All Drawers Button */}
              {activeDrawer !== "none" && (
                <button
                  onClick={() => setActiveDrawer("none")}
                  title="Ocultar paneles y ver mapa limpio"
                  style={{ display: "flex", alignItems: "center", gap: "4px", padding: "7px 10px", borderRadius: "9px", border: "1px solid #e2e8f0", background: "#ffffff", color: "#64748b", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
                >
                  <Minimize2 size={13} />
                  <span>Ocultar Menú</span>
                </button>
              )}
            </>
          )}

          {activeTab === "list" && (
            <>
              <button
                onClick={() => setIsPurgeModalOpen(true)}
                title="Depurar y limpiar incidencias resueltas"
                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "7px 10px", borderRadius: "9px", border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
              >
                <Trash2 size={14} />
                <span>Purgar</span>
              </button>

              <button
                onClick={handleExportCSV}
                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "7px 10px", borderRadius: "9px", border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
              >
                <Download size={14} />
                <span>Exportar CSV</span>
              </button>
            </>
          )}

          {/* Quick Create Report Button */}
          <button
            onClick={() => {
              const defaultCoords = mapRef ? mapRef.getCenter() : { lat: 20.6248, lng: -103.2422 };
              void triggerIncidentCreation(defaultCoords.lat, defaultCoords.lng);
            }}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "8px 14px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "white", fontSize: "11px", fontWeight: "800", cursor: "pointer", boxShadow: "0 2px 6px rgba(220,38,38,0.35)" }}
          >
            <PlusCircle size={15} />
            <span>+ Reportar</span>
          </button>
        </div>
      </header>

      {/* Main Map Container */}
      <div style={{ position: "relative", width: "100%", height: "100%", flex: 1, minHeight: "500px" }}>
        
        {/* Leaflet Map Canvas */}
        <div 
          id="leaflet-map-container" 
          style={{ 
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%", 
            height: "100%", 
            minHeight: "500px",
            zIndex: 1,
            visibility: activeTab === "map" ? "visible" : "hidden"
          }} 
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div style={{ position: "absolute", top: "72px", left: "50%", transform: "translateX(-50%)", zIndex: 1200, background: "rgba(15, 23, 42, 0.92)", color: "white", padding: "8px 18px", borderRadius: "30px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)", fontSize: "12px", fontWeight: "700", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}>
            {toastMessage}
          </div>
        )}

        {/* =========================================================================
            UNIFIED SLIDE-OVER DRAWER (NEVER OVERLAPS - HOSTS ONE ACTIVE PANEL)
            ========================================================================= */}
        {activeTab === "map" && activeDrawer !== "none" && (
          <div style={{ position: "absolute", top: "72px", right: "12px", bottom: "24px", width: "370px", maxWidth: "calc(100vw - 24px)", background: "rgba(255, 255, 255, 0.96)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderRadius: "16px", border: "1px solid #cbd5e1", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", zIndex: 30, display: "flex", flexDirection: "column", overflow: "hidden", animation: "float-up 0.2s ease" }}>
            
            {/* 1. DRAWER HEADER */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc" }}>
              <h3 style={{ margin: 0, fontWeight: "900", fontSize: "13px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                {activeDrawer === "search" && <><Search size={15} style={{ color: "#2563eb" }} /> Buscar Secciones y Territorio</>}
                {activeDrawer === "section" && <><Layers size={15} style={{ color: "#4f46e5" }} /> Detalle de Sección Electoral</>}
                {activeDrawer === "incidents" && <><AlertCircle size={15} style={{ color: "#dc2626" }} /> Incidencias Activas ({allReports.length})</>}
                {activeDrawer === "layers" && <><SlidersHorizontal size={15} style={{ color: "#2563eb" }} /> Configuración de Capas</>}
              </h3>
              <button 
                onClick={() => setActiveDrawer("none")} 
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                title="Cerrar panel"
              >
                <X size={17} />
              </button>
            </div>

            {/* 2. DRAWER BODY */}
            <div style={{ flex: 1, padding: "14px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
              
              {/* SEARCH PANEL */}
              {activeDrawer === "search" && (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Municipio</label>
                    <select
                      value={selectedMunicipality}
                      onChange={(e) => handleMunicipalityChange(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", color: "#0f172a", outline: "none", cursor: "pointer" }}
                    >
                      <option value="all">🗺️ Todo el Área Metropolitana</option>
                      <option value="Tonalá">📍 Tonalá (46 secciones)</option>
                      <option value="Guadalajara">📍 Guadalajara (10 secciones)</option>
                      <option value="San Pedro Tlaquepaque">📍 Tlaquepaque (8 secciones)</option>
                      <option value="Zapopan">📍 Zapopan (8 secciones)</option>
                      <option value="Tlajomulco de Zúñiga">📍 Tlajomulco (5 secciones)</option>
                      <option value="El Salto">📍 El Salto (4 secciones)</option>
                      <option value="Zapotlanejo">📍 Zapotlanejo (3 secciones)</option>
                      <option value="Ixtlahuacán de los Membrillos">📍 Ixtlahuacán</option>
                      <option value="Juanacatlán">📍 Juanacatlán</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Búsqueda Rápida</label>
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                      <Search size={14} style={{ position: "absolute", left: "9px", color: "#94a3b8" }} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Número de sección o colonia..."
                        style={{ width: "100%", padding: "8px 28px 8px 30px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "600", outline: "none" }}
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "8px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                    <div style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>
                      Secciones Encontradas ({filteredSectionsList.length})
                    </div>
                    {filteredSectionsList.map((sec: SectionProperties) => (
                      <button
                        key={sec.section_num}
                        onClick={() => handleSelectSection(sec)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "8px",
                          backgroundColor: selectedSection?.section_num === sec.section_num ? "#dbeafe" : "#f8fafc",
                          border: "1px solid", borderColor: selectedSection?.section_num === sec.section_num ? "#bfdbfe" : "#e2e8f0",
                          cursor: "pointer", textAlign: "left", width: "100%"
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: "800", color: "#0f172a" }}>
                            Sección #{sec.section_num} <span style={{ fontSize: "10px", color: "#2563eb", fontWeight: "600" }}>({sec.municipality || 'Tonalá'})</span>
                          </div>
                          <div style={{ fontSize: "10px", color: "#64748b" }}>{sec.colonies.slice(0, 3).join(", ") || sec.municipality}</div>
                        </div>
                        <ChevronRight size={13} style={{ color: "#94a3b8" }} />
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* SECTION DETAIL PANEL */}
              {activeDrawer === "section" && (
                selectedSection ? (
                  <>
                    <div>
                      <span style={{ display: "inline-block", background: "#dbeafe", color: "#1e40af", fontWeight: "800", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", padding: "2px 6px", borderRadius: "4px", marginBottom: "4px" }}>
                        {selectedSection.municipality || "Tonalá"}
                      </span>
                      <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "900", color: "#0f172a" }}>
                        Sección Electoral #{selectedSection.section_num}
                      </h2>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px", textAlign: "center" }}>
                        <div style={{ fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Simpatizantes</div>
                        <div style={{ fontSize: "16px", fontWeight: "900", color: "#4f46e5", marginTop: "2px" }}>{selectedSection.contactsCount}</div>
                      </div>

                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px", textAlign: "center" }}>
                        <div style={{ fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Visitas</div>
                        <div style={{ fontSize: "16px", fontWeight: "900", color: "#059669", marginTop: "2px" }}>{selectedSection.visitsCompleted}</div>
                      </div>

                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px", textAlign: "center" }}>
                        <div style={{ fontSize: "9px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Incidencias</div>
                        <div style={{ fontSize: "16px", fontWeight: "900", color: "#d97706", marginTop: "2px" }}>{selectedSection.incidentsActive}</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>
                        Colonias en esta Sección:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxHeight: "110px", overflowY: "auto" }}>
                        {selectedSection.colonies.length > 0 ? (
                          selectedSection.colonies.map((c) => (
                            <span key={c} style={{ background: "#f1f5f9", color: "#334155", fontSize: "10px", fontWeight: "600", padding: "3px 6px", borderRadius: "6px" }}>
                              {c}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>Colonia principal del municipio</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "6px", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                      <Link
                        href={`/crm?seccion=${selectedSection.section_num}`}
                        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", background: "#2563eb", color: "white", textDecoration: "none", fontWeight: "800", padding: "9px", borderRadius: "8px", fontSize: "11px" }}
                      >
                        <Users size={13} />
                        Ver Contactos CRM
                      </Link>

                      <button
                        onClick={() => {
                          const defaultCoords = mapRef ? mapRef.getCenter() : { lat: 20.6248, lng: -103.2422 };
                          void triggerIncidentCreation(defaultCoords.lat, defaultCoords.lng, selectedSection.municipality);
                        }}
                        style={{ display: "flex", alignItems: "center", gap: "4px", background: "#dc2626", color: "white", border: "none", fontWeight: "800", padding: "9px 12px", borderRadius: "8px", fontSize: "11px", cursor: "pointer" }}
                      >
                        <PlusCircle size={13} />
                        + Reportar
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "30px 10px", color: "#94a3b8" }}>
                    <Layers size={28} style={{ margin: "0 auto 8px" }} />
                    <p style={{ fontSize: "12px", margin: 0 }}>Haz clic en una sección en el mapa para ver sus métricas.</p>
                  </div>
                )
              )}

              {/* INCIDENTS LIST PANEL */}
              {activeDrawer === "incidents" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b" }}>Filtro rápido por municipio:</span>
                    <select
                      value={selectedMunicipality}
                      onChange={(e) => handleMunicipalityChange(e.target.value)}
                      style={{ padding: "4px 8px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "10px", fontWeight: "700", outline: "none" }}
                    >
                      <option value="all">Todos</option>
                      <option value="Tonalá">Tonalá</option>
                      <option value="Guadalajara">Guadalajara</option>
                      <option value="San Pedro Tlaquepaque">Tlaquepaque</option>
                      <option value="Zapopan">Zapopan</option>
                    </select>
                  </div>

                  {allReports.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "30px 10px", color: "#94a3b8" }}>
                      <CheckCircle2 size={28} style={{ margin: "0 auto 8px", color: "#16a34a" }} />
                      <p style={{ fontSize: "12px", margin: 0 }}>No hay incidencias pendientes en este momento.</p>
                    </div>
                  ) : (
                    allReports.map((r) => {
                      const cat = CATEGORIES[r.properties.category] ?? { label: r.properties.category, color: "#64748b", bg: "#f8fafc", svg: SVGS.AlertCircle };
                      const isResolved = r.properties.status === "resolved";
                      return (
                        <div key={r.properties.id} style={{ background: "#f8fafc", padding: "10px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                            <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", padding: "2px 5px", borderRadius: "4px", color: cat.color, background: cat.bg }}>
                              {cat.label}
                            </span>
                            <span style={{ fontSize: "10px", fontWeight: "700", color: isResolved ? "#16a34a" : "#dc2626" }}>
                              {isResolved ? "✓ Atendida" : "● Pendiente"}
                            </span>
                          </div>
                          <h4 style={{ margin: "0 0 2px", fontWeight: "800", fontSize: "12px", color: "#0f172a" }}>{r.properties.title}</h4>
                          <p style={{ margin: "0 0 6px", fontSize: "11px", color: "#475569", lineHeight: "1.3" }}>{r.properties.description}</p>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "6px" }}>
                            <span style={{ fontSize: "10px", fontWeight: "700", color: "#1d4ed8" }}>📍 {r.properties.municipality || "Tonalá"}</span>
                            <button
                              onClick={() => handleFocusOnMap(r)}
                              style={{ display: "flex", alignItems: "center", gap: "3px", background: "#2563eb", color: "white", border: "none", fontWeight: "700", padding: "4px 8px", borderRadius: "6px", fontSize: "10px", cursor: "pointer" }}
                            >
                              <MapPin size={10} />
                              Centrar Mapa
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* LAYERS & CONTROLS PANEL */}
              {activeDrawer === "layers" && (
                <>
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
                      Estilo de Mapa Base
                    </span>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                      {Object.entries(TILE_STYLES).map(([key, style]) => (
                        <button
                          key={key}
                          onClick={() => handleChangeTileStyle(key)}
                          style={{
                            display: "flex", alignItems: "center", gap: "6px", padding: "8px", borderRadius: "8px", border: "1px solid",
                            borderColor: selectedTileStyle === key ? "#2563eb" : "#e2e8f0",
                            backgroundColor: selectedTileStyle === key ? "#eff6ff" : "#f8fafc",
                            color: selectedTileStyle === key ? "#1d4ed8" : "#334155",
                            fontSize: "11px", fontWeight: "700", cursor: "pointer"
                          }}
                        >
                          <span>{style.icon}</span>
                          <span>{style.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "10px", borderTop: "1px solid #f1f5f9", fontSize: "11px", fontWeight: "600", color: "#334155" }}>
                    <span style={{ fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>
                      Capas y Elementos
                    </span>
                    
                    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: "#f8fafc", padding: "8px", borderRadius: "8px" }}>
                      <span>Polígonos Seccionales</span>
                      <input type="checkbox" checked={showSections} onChange={(e) => setShowSections(e.target.checked)} style={{ accentColor: "#2563eb" }} />
                    </label>

                    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: "#f8fafc", padding: "8px", borderRadius: "8px" }}>
                      <span>Números de Sección</span>
                      <input type="checkbox" checked={showSectionLabels} onChange={(e) => setShowSectionLabels(e.target.checked)} style={{ accentColor: "#2563eb" }} />
                    </label>

                    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: "#f8fafc", padding: "8px", borderRadius: "8px" }}>
                      <span>Agrupamiento Inteligente (Clusters)</span>
                      <input type="checkbox" checked={enableClustering} onChange={(e) => setEnableClustering(e.target.checked)} style={{ accentColor: "#2563eb" }} />
                    </label>
                  </div>
                </>
              )}

            </div>
          </div>
        )}

        {/* Tab 2: Incident Operations Management Center */}
        {activeTab === "list" && (
          <div style={{ position: "absolute", inset: 0, background: "#f8fafc", zIndex: 20, padding: "20px", overflowY: "auto" }}>
            <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {/* Header */}
              <div>
                <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "900", color: "#0f172a" }}>
                  Centro de Mando e Incidencias Territoriales
                </h1>
                <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>
                  Control operativo, seguimiento y resolución de reportes de campo en tiempo real.
                </p>
              </div>

              {/* KPI Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                <div style={{ background: "white", border: "1px solid #fde68a", borderRadius: "12px", padding: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#92400e", textTransform: "uppercase" }}>Por Atender</div>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#78350f", marginTop: "2px" }}>{activeReportsCount}</div>
                </div>

                <div style={{ background: "white", border: "1px solid #fecaca", borderRadius: "12px", padding: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#991b1b", textTransform: "uppercase" }}>Emergencias Críticas</div>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#b91c1c", marginTop: "2px" }}>{emergencyReportsCount}</div>
                </div>

                <div style={{ background: "white", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#166534", textTransform: "uppercase" }}>Resueltas</div>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#15803d", marginTop: "2px" }}>{resolvedReportsCount}</div>
                </div>

                <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "#64748b", textTransform: "uppercase" }}>Efectividad</div>
                  <div style={{ fontSize: "24px", fontWeight: "900", color: "#2563eb", marginTop: "2px" }}>{resolutionRate}%</div>
                </div>
              </div>

              {/* Filters & SubTabs */}
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                  {[
                    { key: "active", label: `Pendientes (${activeReportsCount})`, icon: Flame },
                    { key: "emergency", label: `Emergencias (${emergencyReportsCount})`, icon: ShieldAlert },
                    { key: "resolved", label: `Resueltas (${resolvedReportsCount})`, icon: CheckCircle2 },
                    { key: "all", label: `Todas (${allReports.length})`, icon: ListFilter },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = incidentSubTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setIncidentSubTab(tab.key as any)}
                        style={{
                          display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "8px", border: "none",
                          backgroundColor: isActive ? "#0f172a" : "#f1f5f9",
                          color: isActive ? "#ffffff" : "#475569",
                          fontSize: "11px", fontWeight: "800", cursor: "pointer"
                        }}
                      >
                        <Icon size={13} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <Search size={14} style={{ position: "absolute", left: "9px", color: "#94a3b8" }} />
                    <input
                      type="text"
                      value={incidentSearchQuery}
                      onChange={(e) => setIncidentSearchQuery(e.target.value)}
                      placeholder="Buscar por texto o colonia..."
                      style={{ width: "100%", padding: "7px 10px 7px 30px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "600", outline: "none" }}
                    />
                  </div>

                  <select
                    value={incidentMunicipalityFilter}
                    onChange={(e) => setIncidentMunicipalityFilter(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", outline: "none", cursor: "pointer" }}
                  >
                    <option value="all">🗺️ Todos los Municipios</option>
                    <option value="Tonalá">📍 Tonalá</option>
                    <option value="Guadalajara">📍 Guadalajara</option>
                    <option value="San Pedro Tlaquepaque">📍 San Pedro Tlaquepaque</option>
                    <option value="Zapopan">📍 Zapopan</option>
                    <option value="Tlajomulco de Zúñiga">📍 Tlajomulco</option>
                    <option value="El Salto">📍 El Salto</option>
                    <option value="Zapotlanejo">📍 Zapotlanejo</option>
                  </select>

                  <select
                    value={incidentCategoryFilter}
                    onChange={(e) => setIncidentCategoryFilter(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", outline: "none", cursor: "pointer" }}
                  >
                    <option value="all">🏷️ Todas las Categorías</option>
                    {Object.entries(CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Incidents Cards List */}
              {displayIncidents.length === 0 ? (
                <div style={{ background: "white", padding: "40px 20px", borderRadius: "14px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                  <AlertCircle size={32} style={{ color: "#94a3b8", margin: "0 auto 8px" }} />
                  <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: "#0f172a" }}>No hay incidencias que coincidan con los filtros</h3>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {displayIncidents.map((r) => {
                    const cat = CATEGORIES[r.properties.category] ?? { label: r.properties.category, color: "#64748b", bg: "#f8fafc", svg: SVGS.AlertCircle };
                    const isResolved = r.properties.status === "resolved";
                    const isEmergency = r.properties.category === "emergencia" && !isResolved;
                    const date = new Date(r.properties.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });

                    return (
                      <div 
                        key={r.properties.id}
                        style={{
                          background: isResolved ? "#fafdfb" : "white",
                          padding: "14px",
                          borderRadius: "12px",
                          border: "1px solid",
                          borderColor: isEmergency ? "#fca5a5" : isResolved ? "#bbf7d0" : "#e2e8f0",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", padding: "2px 6px", borderRadius: "4px", color: cat.color, background: cat.bg }}>
                            {cat.label}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "11px", color: "#94a3b8" }}>{date}</span>
                            <span style={{ fontSize: "11px", fontWeight: "800", color: isResolved ? "#16a34a" : isEmergency ? "#dc2626" : "#d97706" }}>
                              {isResolved ? "✓ Atendida" : isEmergency ? "● Emergencia" : "● Pendiente"}
                            </span>
                          </div>
                        </div>

                        <h3 style={{ margin: "0 0 3px", fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                          {r.properties.title}
                        </h3>

                        <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>
                          {r.properties.description}
                        </p>

                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "8px", gap: "6px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "#1d4ed8" }}>
                            📍 {r.properties.municipality || "Tonalá"} {r.properties.sectionNum ? `· Sección #${r.properties.sectionNum}` : ""}
                          </span>

                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <button
                              onClick={() => handleFocusOnMap(r)}
                              style={{ display: "flex", alignItems: "center", gap: "4px", background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", fontWeight: "700", padding: "5px 10px", borderRadius: "8px", fontSize: "11px", cursor: "pointer" }}
                            >
                              <MapPin size={12} />
                              Ver en Mapa
                            </button>

                            <button
                              onClick={() => handleOpenEdit(r)}
                              style={{ background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe", borderRadius: "8px", padding: "5px 8px", cursor: "pointer" }}
                              title="Editar o Reasignar"
                            >
                              <Edit3 size={13} />
                            </button>

                            {isResolved ? (
                              <button
                                onClick={() => handleToggleReportStatus(r.properties.id, "active")}
                                style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", fontWeight: "700", padding: "5px 10px", borderRadius: "8px", fontSize: "11px", cursor: "pointer" }}
                              >
                                Reabrir
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleReportStatus(r.properties.id, "resolved")}
                                style={{ display: "flex", alignItems: "center", gap: "4px", background: "#16a34a", color: "white", border: "none", fontWeight: "700", padding: "5px 12px", borderRadius: "8px", fontSize: "11px", cursor: "pointer" }}
                              >
                                <Check size={13} />
                                Resolver
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingReport && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: "14px", backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "480px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <h3 style={{ margin: 0, fontWeight: "900", fontSize: "15px", color: "#0f172a" }}>Administrar Incidencia</h3>
              <button onClick={() => setEditingReport(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Título *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", fontWeight: "600", outline: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Municipio *</label>
                  <select
                    value={editForm.municipality}
                    onChange={(e) => setEditForm({ ...editForm, municipality: e.target.value })}
                    style={{ width: "100%", padding: "7px 8px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", outline: "none" }}
                  >
                    <option value="Tonalá">Tonalá</option>
                    <option value="Guadalajara">Guadalajara</option>
                    <option value="San Pedro Tlaquepaque">Tlaquepaque</option>
                    <option value="Zapopan">Zapopan</option>
                    <option value="Tlajomulco de Zúñiga">Tlajomulco</option>
                    <option value="El Salto">El Salto</option>
                    <option value="Zapotlanejo">Zapotlanejo</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Categoría *</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    style={{ width: "100%", padding: "7px 8px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", outline: "none" }}
                  >
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Estatus *</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={{ width: "100%", padding: "7px 8px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "800", outline: "none" }}
                  >
                    <option value="active">● Pendiente</option>
                    <option value="resolved">✓ Resuelta</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Asignar Responsable</label>
                  <select
                    value={editForm.assignedToUserId}
                    onChange={(e) => setEditForm({ ...editForm, assignedToUserId: e.target.value })}
                    style={{ width: "100%", padding: "7px 8px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", outline: "none" }}
                  >
                    <option value="">-- Sin Asignar --</option>
                    {systemUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Descripción / Seguimiento *</label>
                <textarea
                  required
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", outline: "none", resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  style={{ flex: 1, padding: "9px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEditingSubmitting}
                  style={{ flex: 1, padding: "9px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}
                >
                  {isEditingSubmitting ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PURGE MODAL */}
      {isPurgeModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: "14px", backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "380px", padding: "20px", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
              <Trash2 size={22} />
            </div>
            <h3 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: "900", color: "#0f172a" }}>¿Depurar Incidencias Resueltas?</h3>
            <p style={{ margin: "0 0 14px", fontSize: "12px", color: "#64748b", lineHeight: "1.4" }}>
              Se eliminarán de forma definitiva todas las incidencias marcadas como atendidas.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setIsPurgeModalOpen(false)} style={{ flex: 1, padding: "8px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handlePurgeResolved} disabled={isPurging} style={{ flex: 1, padding: "8px", background: "#dc2626", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}>
                {isPurging ? "Purgando..." : "Sí, Purgar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW REPORT MODAL */}
      {isReportModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: "14px", backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "440px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertCircle size={16} />
                </div>
                <h3 style={{ margin: 0, fontWeight: "900", fontSize: "14px", color: "#0f172a" }}>Registrar Incidencia</h3>
              </div>
              <button 
                onClick={() => {
                  setIsReportModalOpen(false);
                  setNewReportCoords(null);
                  setDetectedLocationInfo(null);
                }}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {reportSuccess ? (
              <div style={{ textAlign: "center", padding: "28px 16px", color: "#16a34a" }}>
                <CheckCircle2 size={34} style={{ margin: "0 auto 8px" }} />
                <div style={{ fontWeight: "900", fontSize: "15px" }}>¡Incidencia registrada con éxito!</div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "12px" }}>
                
                {/* Location Detection Box */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px" }}>
                  {isGeocodingLoading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#2563eb", fontSize: "11px", fontWeight: "700" }}>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Detectando dirección GPS y sección...</span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: "800", color: "#0f172a" }}>
                        📍 {reportForm.address}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                        <span style={{ background: "#dbeafe", color: "#1e40af", fontSize: "10px", fontWeight: "800", padding: "1px 5px", borderRadius: "4px" }}>
                          {reportForm.municipality}
                        </span>
                        {detectedLocationInfo?.sectionNum && (
                          <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "10px", fontWeight: "800", padding: "1px 5px", borderRadius: "4px" }}>
                            Sección #{detectedLocationInfo.sectionNum}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Dirección / Calle *</label>
                  <input
                    type="text"
                    required
                    value={reportForm.address}
                    onChange={(e) => setReportForm({ ...reportForm, address: e.target.value })}
                    style={{ width: "100%", padding: "7px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "600", outline: "none" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Municipio *</label>
                    <select
                      value={reportForm.municipality}
                      onChange={(e) => setReportForm({ ...reportForm, municipality: e.target.value })}
                      style={{ width: "100%", padding: "7px 8px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", outline: "none" }}
                    >
                      <option value="Tonalá">Tonalá</option>
                      <option value="Guadalajara">Guadalajara</option>
                      <option value="San Pedro Tlaquepaque">Tlaquepaque</option>
                      <option value="Zapopan">Zapopan</option>
                      <option value="Tlajomulco de Zúñiga">Tlajomulco</option>
                      <option value="El Salto">El Salto</option>
                      <option value="Zapotlanejo">Zapotlanejo</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Categoría *</label>
                    <select
                      value={reportForm.category}
                      onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                      style={{ width: "100%", padding: "7px 8px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", outline: "none" }}
                    >
                      {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <option key={key} value={key}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Título del Reporte *</label>
                  <input
                    type="text"
                    required
                    value={reportForm.title}
                    onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                    placeholder="Ej. Falla de alumbrado / Bache peligroso"
                    style={{ width: "100%", padding: "7px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "600", outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Descripción de Campo *</label>
                  <textarea
                    required
                    rows={3}
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    placeholder="Detalles sobre lo observado en el territorio..."
                    style={{ width: "100%", padding: "7px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", outline: "none", resize: "none" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "8px", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReportModalOpen(false);
                      setNewReportCoords(null);
                      setDetectedLocationInfo(null);
                    }}
                    style={{ flex: 1, padding: "9px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isGeocodingLoading}
                    style={{ flex: 1, padding: "9px", background: "#dc2626", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}
                  >
                    {isSubmitting ? "Guardando..." : "Registrar Reporte"}
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
