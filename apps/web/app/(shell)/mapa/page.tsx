"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
  MousePointerClick, 
  SlidersHorizontal, 
  Loader2, 
  Download, 
  Edit3, 
  ShieldAlert, 
  Flame, 
  LocateFixed,
  Users,
  Compass,
  Check
} from "lucide-react";

// Lucide icon SVGs baked for fast rendering in Leaflet HTML markers
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
  "all": { center: [20.6300, -103.3000] as [number, number], zoom: 11 },
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
  const [tempMarkerLayer, setTempMarkerLayer] = useState<any>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<any>(null);
  const [allReports, setAllReports] = useState<ReportFeature[]>([]);
  const [sectionsData, setSectionsData] = useState<any>(null);
  const [systemUsers, setSystemUsers] = useState<UserOption[]>([]);
  
  // Views: Map view or Incident Operations Center view
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");

  // Operational Category Sub-Tab in Incident Center:
  const [incidentSubTab, setIncidentSubTab] = useState<"active" | "emergency" | "resolved" | "all">("active");

  // Mobile Drawer & Locate State
  const [isQuickIncidentsDrawerOpen, setIsQuickIncidentsDrawerOpen] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  // Interaction Mode in Map: 'select' or 'report'
  const [mapClickMode, setMapClickMode] = useState<"select" | "report">("select");
  const mapClickModeRef = useRef<"select" | "report">("select");
  mapClickModeRef.current = mapClickMode;

  // Layer Toggles & Map View Settings (Default to clean Carto Positron)
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false);
  const [selectedTileStyle, setSelectedTileStyle] = useState<string>("positron");
  const [showSections, setShowSections] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);
  const [enableClustering, setEnableClustering] = useState(true);
  const [showSectionLabels, setShowSectionLabels] = useState(true);

  // Filters & Search for Map
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("all");
  const [activeCategories] = useState<Set<string>>(new Set(Object.keys(CATEGORIES)));

  // Incident Center Specific Filters & Controls
  const [incidentSearchQuery, setIncidentSearchQuery] = useState("");
  const [incidentMunicipalityFilter, setIncidentMunicipalityFilter] = useState<string>("all");
  const [incidentCategoryFilter, setIncidentCategoryFilter] = useState<string>("all");

  // Selected Section for floating detail card / bottom sheet
  const [selectedSection, setSelectedSection] = useState<SectionProperties | null>(null);

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
    setTimeout(() => setToastMessage(null), 3500);
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
    showToast("📍 Obteniendo tu ubicación GPS en campo...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocatingGPS(false);
        const { latitude, longitude, accuracy } = position.coords;

        if (mapRef && L) {
          mapRef.flyTo([latitude, longitude], 16, { duration: 1.2 });

          // Remove old GPS marker if any
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
          showToast(`✓ Ubicación GPS fijada (±${Math.round(accuracy)}m)`);
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
    setIsQuickIncidentsDrawerOpen(false);
    setTimeout(() => {
      if (mapRef) {
        mapRef.flyTo([lat, lng], 16, { duration: 1.0 });
        showToast(`📍 Centrado en: ${r.properties.title}`);
      }
    }, 100);
  };

  // 1. Load Leaflet dynamically
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

      // Default to CartoDB Positron for ultra clean look
      const initialTiles = leafletModule.tileLayer(TILE_STYLES.positron.url, {
        attribution: TILE_STYLES.positron.attribution,
        maxZoom: 19,
        subdomains: "abcd"
      }).addTo(map);

      setTileLayerRef(initialTiles);

      const layer = leafletModule.layerGroup().addTo(map);
      const labels = leafletModule.layerGroup().addTo(map);
      const tempLayer = leafletModule.layerGroup().addTo(map);
      setMarkersLayer(layer);
      setLabelsLayer(labels);
      setTempMarkerLayer(tempLayer);
      setMapRef(map);

      map.on("click", (e: any) => {
        if (mapClickModeRef.current === "report") {
          void triggerIncidentCreation(e.latlng.lat, e.latlng.lng);
        }
      });

      map.on("dblclick", (e: any) => {
        void triggerIncidentCreation(e.latlng.lat, e.latlng.lng);
      });
    });
  }, [triggerIncidentCreation]);

  const handleChangeTileStyle = (styleKey: string) => {
    const style = (TILE_STYLES as Record<string, { name: string; url: string; attribution: string; icon: string }>)[styleKey];
    if (!style || !mapRef || !L || !tileLayerRef) return;

    setSelectedTileStyle(styleKey);
    tileLayerRef.setUrl(style.url);
    tileLayerRef.options.attribution = style.attribution;
    showToast(`🗺️ Capa base: ${style.name}`);
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
        showToast(newStatus === "resolved" ? "✓ Incidencia atendida (enviada al historial)" : "↺ Incidencia reabierta");
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

  // 8. Purge All Resolved Incidents
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

  // 9. Open Edit Modal
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

  // 10. Save Edited Incident
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

  // 11. Render Sections Layer with Seamless Voronoi Styling
  useEffect(() => {
    if (!L || !mapRef || !sectionsData) return;

    if (geoJsonLayer) geoJsonLayer.remove();
    if (labelsLayer) labelsLayer.clearLayers();

    if (!showSections) {
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

        return {
          color: isSelected ? "#1e1b4b" : theme.stroke,
          weight: isSelected ? 3.5 : 1.8,
          opacity: isSelected ? 1.0 : 0.85,
          fillColor: isSelected ? "#312e81" : theme.fill,
          fillOpacity: isSelected ? 0.42 : 0.20,
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

        if (showSectionLabels && labelsLayer) {
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
            if (mapClickModeRef.current === "select") {
              e.target.setStyle({ weight: 3.2, fillOpacity: 0.38, opacity: 1.0 });
            }
          },
          mouseout: (e: any) => {
            layer.resetStyle(e.target);
          },
          click: (e: any) => {
            L.DomEvent.stopPropagation(e);
            if (mapClickModeRef.current === "report") {
              void triggerIncidentCreation(e.latlng.lat, e.latlng.lng, mun);
            } else {
              setSelectedSection(p);
              mapRef.fitBounds(e.target.getBounds(), { padding: [50, 50], maxZoom: 15 });
            }
          },
          dblclick: (e: any) => {
            L.DomEvent.stopPropagation(e);
            void triggerIncidentCreation(e.latlng.lat, e.latlng.lng, mun);
          }
        });
      }
    }).addTo(mapRef);

    layer.bringToBack();
    setGeoJsonLayer(layer);
  }, [L, mapRef, labelsLayer, sectionsData, showSections, showSectionLabels, selectedSection, selectedMunicipality, triggerIncidentCreation]);

  const handleMunicipalityChange = (muni: string) => {
    setSelectedMunicipality(muni);
    setSelectedSection(null);
    if (!mapRef) return;
    const config = (MUNICIPALITY_CENTERS as Record<string, { center: [number, number]; zoom: number }>)[muni] || MUNICIPALITY_CENTERS["all"];
    mapRef.flyTo(config.center, config.zoom, { duration: 1.2 });
  };

  // 12. Render Incident Markers with High-Tech Icons
  useEffect(() => {
    if (!L || !markersLayer || !mapRef) return;

    markersLayer.clearLayers();

    if (!showIncidents) return;

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
              <div style="position:relative; width:38px; height:38px; border-radius:50%; background:${hasEmergency ? '#dc2626' : '#4f46e5'}; color:white; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:800; border:3px solid white; box-shadow:0 4px 12px rgba(0,0,0,0.25); cursor:pointer;">
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
          <div style="position:relative; width:34px; height:34px; border-radius:50%; background-color:${isResolved ? '#f0fdf4' : cat.bg}; display:flex; align-items:center; justify-content:center; color:${isResolved ? '#16a34a' : cat.color}; border: 2.5px solid ${isResolved ? '#16a34a' : isEmergency ? '#ef4444' : 'white'}; box-shadow: 0 4px 10px rgba(0,0,0,0.2); opacity: ${isResolved ? 0.85 : 1}; cursor: pointer;">
            ${cat.svg}
            ${isResolved ? `<div style="position:absolute; bottom:-2px; right:-2px; background:#16a34a; color:white; width:14px; height:14px; border-radius:50%; font-size:10px; display:flex; align-items:center; justify-content:center; border:1.5px solid white;">✓</div>` : ''}
            ${isEmergency ? `<div style="position:absolute; inset:-3px; border-radius:50%; border:2px solid #ef4444; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
          </div>
        `,
        className: "custom-incident-marker",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18]
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
            <span>${report.properties.sectionNum ? `📍 Sección ${report.properties.sectionNum}` : `📍 ${report.properties.municipality || 'Territorio'}`}</span>
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
  }, [L, markersLayer, mapRef, allReports, activeCategories, showIncidents, enableClustering]);

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
    if (!geoJsonLayer || !mapRef) return;
    
    geoJsonLayer.eachLayer((layer: any) => {
      if (layer.feature?.properties?.section_num === p.section_num) {
        mapRef.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 15 });
      }
    });
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
        if (tempMarkerLayer) tempMarkerLayer.clearLayers();
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

  // Filtered & Strictly Sorted Incidents for the Incident Management Center
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
    link.setAttribute("download", `incidencias_territorio_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("✓ Archivo CSV exportado con éxito");
  };

  return (
    <div className="relative flex flex-col w-full h-[calc(100vh-68px)] min-h-[640px] bg-slate-900 overflow-hidden select-none font-sans">
      
      {/* Top Floating Command Bar */}
      <header className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-lg transition-all">
        
        {/* Left: View Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "map"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Compass size={16} />
            <span>Mapa Cartográfico</span>
          </button>
          
          <button
            onClick={() => setActiveTab("list")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "list"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <ListFilter size={16} />
            <span className="hidden sm:inline">Centro de Gestión</span>
            <span className="sm:hidden">Incidencias</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
              activeTab === "list" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
            }`}>
              {activeReportsCount}
            </span>
          </button>
        </div>

        {/* Center: Municipal pills (Desktop) */}
        {activeTab === "map" && (
          <div className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
            {["all", "Tonalá", "Guadalajara", "Zapopan", "San Pedro Tlaquepaque"].map((m) => (
              <button
                key={m}
                onClick={() => handleMunicipalityChange(m)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedMunicipality === m
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {m === "all" ? "Todo el AMG" : m}
              </button>
            ))}
          </div>
        )}

        {/* Right: Actions and Controls */}
        <div className="flex items-center gap-2">
          {activeTab === "map" && (
            <>
              {/* GPS Button */}
              <button
                onClick={handleLocateMe}
                disabled={isLocatingGPS}
                title="Centrar en mi ubicación GPS"
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                <LocateFixed size={15} className={isLocatingGPS ? "animate-spin" : ""} />
                <span className="hidden md:inline">Mi GPS</span>
              </button>

              {/* Incidents Drawer toggle */}
              <button
                onClick={() => setIsQuickIncidentsDrawerOpen(!isQuickIncidentsDrawerOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isQuickIncidentsDrawerOpen
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <AlertCircle size={15} className={isQuickIncidentsDrawerOpen ? "text-red-600" : "text-slate-500"} />
                <span className="hidden md:inline">Incidencias</span>
                <span className="font-extrabold text-[11px]">({activeReportsCount})</span>
              </button>

              {/* Layers Button */}
              <button
                onClick={() => setIsLayersMenuOpen(!isLayersMenuOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  isLayersMenuOpen
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <SlidersHorizontal size={15} />
                <span className="hidden md:inline">Capas</span>
              </button>

              {/* Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => {
                    setMapClickMode("select");
                    showToast("🔍 Modo Consulta: Clic en cualquier polígono para ver métricas");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    mapClickMode === "select"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Layers size={14} />
                  <span className="hidden sm:inline">Consultar</span>
                </button>

                <button
                  onClick={() => {
                    setMapClickMode("report");
                    showToast("📍 Modo 1-Clic: Toca cualquier calle para levantar reporte geolocalizado");
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    mapClickMode === "report"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <MousePointerClick size={14} />
                  <span className="hidden sm:inline">1-Clic</span>
                </button>
              </div>
            </>
          )}

          {activeTab === "list" && (
            <>
              <button
                onClick={() => setIsPurgeModalOpen(true)}
                title="Depurar y limpiar incidencias resueltas"
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all"
              >
                <Trash2 size={15} />
                <span className="hidden sm:inline">Purgar</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                <Download size={15} />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>
            </>
          )}

          {/* Quick Create Button */}
          <button
            onClick={() => {
              const defaultCoords = mapRef ? mapRef.getCenter() : { lat: 20.6248, lng: -103.2422 };
              void triggerIncidentCreation(defaultCoords.lat, defaultCoords.lng);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-lg transition-all active:scale-95"
          >
            <PlusCircle size={16} />
            <span>+ Reportar</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="relative flex-1 w-full h-full">
        
        {/* Leaflet Map Canvas */}
        <div 
          id="leaflet-map-container" 
          className={`absolute inset-0 w-full h-full z-0 transition-opacity duration-300 ${
            activeTab === "map" ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
          }`}
          style={{ cursor: mapClickMode === "report" ? "crosshair" : "default" }}
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl border border-white/20 animate-in fade-in slide-in-from-top-4 duration-200">
            {toastMessage}
          </div>
        )}

        {/* Left Floating Search & Quick Jumper Panel */}
        {activeTab === "map" && (
          <div className="absolute top-20 left-3 z-20 w-80 max-w-[calc(100vw-24px)] flex flex-col gap-2">
            <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl p-3 shadow-xl space-y-2">
              
              {/* Municipality Select */}
              <div>
                <select
                  value={selectedMunicipality}
                  onChange={(e) => handleMunicipalityChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  <option value="all">🗺️ Todo el Área Metropolitana</option>
                  <option value="Tonalá">📍 Tonalá (46 secciones)</option>
                  <option value="Guadalajara">📍 Guadalajara (10 secciones)</option>
                  <option value="San Pedro Tlaquepaque">📍 San Pedro Tlaquepaque (8 secciones)</option>
                  <option value="Zapopan">📍 Zapopan (8 secciones)</option>
                  <option value="Tlajomulco de Zúñiga">📍 Tlajomulco de Zúñiga (5 secciones)</option>
                  <option value="El Salto">📍 El Salto (4 secciones)</option>
                  <option value="Zapotlanejo">📍 Zapotlanejo (3 secciones)</option>
                  <option value="Ixtlahuacán de los Membrillos">📍 Ixtlahuacán</option>
                  <option value="Juanacatlán">📍 Juanacatlán</option>
                </select>
              </div>

              {/* Section Search */}
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar Sección o Colonia..."
                  className="w-full pl-9 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchQuery && (
                <div className="max-h-48 overflow-y-auto space-y-1 pt-1 border-t border-slate-100">
                  {filteredSectionsList.length > 0 ? (
                    filteredSectionsList.map((sec: SectionProperties) => (
                      <button
                        key={sec.section_num}
                        onClick={() => handleSelectSection(sec)}
                        className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                          selectedSection?.section_num === sec.section_num
                            ? "bg-blue-50 border border-blue-200"
                            : "bg-slate-50 hover:bg-slate-100 border border-slate-100"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Sección {sec.section_num} <span className="text-[10px] text-blue-600 font-semibold">({sec.municipality || 'Tonalá'})</span>
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-1">{sec.colonies.slice(0, 2).join(", ")}</div>
                        </div>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400">Sin secciones coincidentes</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Floating Section Detail Card (Bottom Left / Responsive) */}
        {activeTab === "map" && selectedSection && (
          <div className="absolute bottom-6 left-3 z-30 w-96 max-w-[calc(100vw-24px)] bg-white/95 backdrop-blur-md rounded-2xl p-5 border border-slate-200 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="inline-block bg-blue-100 text-blue-800 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md mb-1">
                  {selectedSection.municipality || "Tonalá"}
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Sección Electoral #{selectedSection.section_num}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedSection(null)} 
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-3.5">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simpatizantes</div>
                <div className="text-lg font-black text-indigo-600">{selectedSection.contactsCount}</div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Visitas</div>
                <div className="text-lg font-black text-emerald-600">{selectedSection.visitsCompleted}</div>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Incidencias</div>
                <div className="text-lg font-black text-amber-600">{selectedSection.incidentsActive}</div>
              </div>
            </div>

            {/* Colonies List */}
            <div className="mb-4">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Colonias en esta Sección:
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {selectedSection.colonies.length > 0 ? (
                  selectedSection.colonies.map((c) => (
                    <span key={c} className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg">
                      {c}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">Colonia principal del municipio</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Link
                href={`/crm?seccion=${selectedSection.section_num}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs transition-all shadow-sm"
              >
                <Users size={14} />
                Ver Contactos
              </Link>

              <button
                onClick={() => {
                  const defaultCoords = mapRef ? mapRef.getCenter() : { lat: 20.6248, lng: -103.2422 };
                  void triggerIncidentCreation(defaultCoords.lat, defaultCoords.lng, selectedSection.municipality);
                }}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-all shadow-sm"
              >
                <PlusCircle size={14} />
                Reportar
              </button>
            </div>
          </div>
        )}

        {/* Slide-Over Incidents Drawer */}
        {activeTab === "map" && isQuickIncidentsDrawerOpen && (
          <div className="absolute top-20 right-3 bottom-6 w-96 max-w-[calc(100vw-24px)] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 z-30 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <AlertCircle size={18} className="text-red-500" />
                Incidencias Registradas ({allReports.length})
              </h3>
              <button onClick={() => setIsQuickIncidentsDrawerOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {allReports.map((r) => {
                const cat = CATEGORIES[r.properties.category] ?? { label: r.properties.category, color: "#64748b", bg: "#f8fafc", svg: SVGS.AlertCircle };
                const isResolved = r.properties.status === "resolved";
                return (
                  <div key={r.properties.id} className="bg-slate-50 hover:bg-slate-100/80 p-3 rounded-xl border border-slate-200/70 transition-all">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md" style={{ color: cat.color, background: cat.bg }}>
                        {cat.label}
                      </span>
                      <span className={`text-[10px] font-bold ${isResolved ? "text-emerald-600" : "text-amber-600"}`}>
                        {isResolved ? "✓ Atendida" : "● Pendiente"}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 mb-1">{r.properties.title}</h4>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mb-2">{r.properties.description}</p>
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/50">
                      <span className="text-[10px] font-bold text-blue-700">📍 {r.properties.municipality || "Tonalá"}</span>
                      <button
                        onClick={() => handleFocusOnMap(r)}
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition-all shadow-sm"
                      >
                        <MapPin size={11} />
                        Centrar Mapa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Map Layers Menu */}
        {isLayersMenuOpen && (
          <div className="absolute top-20 right-3 z-30 w-80 max-w-[calc(100vw-24px)] bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal size={15} className="text-blue-600" />
                Configuración del Mapa
              </h3>
              <button onClick={() => setIsLayersMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            {/* Base Layer Switcher */}
            <div className="mb-3.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Estilo de Mapa Base
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(TILE_STYLES).map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => handleChangeTileStyle(key)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedTileStyle === key
                        ? "bg-blue-50 text-blue-700 border-blue-300 shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <span>{style.icon}</span>
                    <span>{style.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Layer Toggles */}
            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-700">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Capas Visibles
              </span>
              
              <label className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg">
                <span>Polígonos Seccionales</span>
                <input type="checkbox" checked={showSections} onChange={(e) => setShowSections(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
              </label>

              <label className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg">
                <span>Números de Sección</span>
                <input type="checkbox" checked={showSectionLabels} onChange={(e) => setShowSectionLabels(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
              </label>

              <label className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg">
                <span>Marcadores de Incidencias</span>
                <input type="checkbox" checked={showIncidents} onChange={(e) => setShowIncidents(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
              </label>

              <label className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg">
                <span>Agrupamiento Inteligente (Clusters)</span>
                <input type="checkbox" checked={enableClustering} onChange={(e) => setEnableClustering(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
              </label>
            </div>
          </div>
        )}

        {/* Tab 2: Incident Operations Management Center */}
        {activeTab === "list" && (
          <div className="absolute inset-0 bg-slate-50 z-20 p-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Centro de Mando e Incidencias Territoriales
                  </h1>
                  <p className="text-slate-500 text-xs mt-1">
                    Control operativo, seguimiento y resolución de reportes de campo en tiempo real.
                  </p>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-sm">
                  <div className="text-xs font-bold text-amber-800 uppercase tracking-wider">Por Atender</div>
                  <div className="text-2xl font-black text-amber-900 mt-1">{activeReportsCount}</div>
                </div>

                <div className="bg-white border border-red-200/80 rounded-2xl p-4 shadow-sm">
                  <div className="text-xs font-bold text-red-800 uppercase tracking-wider">Emergencias Críticas</div>
                  <div className="text-2xl font-black text-red-700 mt-1">{emergencyReportsCount}</div>
                </div>

                <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-sm">
                  <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Resueltas</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{resolvedReportsCount}</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasa de Resolución</div>
                  <div className="text-2xl font-black text-blue-600 mt-1">{resolutionRate}%</div>
                </div>
              </div>

              {/* Filters & SubTabs */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
                  {[
                    { key: "active", label: `Pendientes (${activeReportsCount})`, icon: Flame, color: "blue" },
                    { key: "emergency", label: `Emergencias (${emergencyReportsCount})`, icon: ShieldAlert, color: "red" },
                    { key: "resolved", label: `Resueltas (${resolvedReportsCount})`, icon: CheckCircle2, color: "emerald" },
                    { key: "all", label: `Todas (${allReports.length})`, icon: ListFilter, color: "slate" },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = incidentSubTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setIncidentSubTab(tab.key as any)}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <Icon size={14} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={incidentSearchQuery}
                      onChange={(e) => setIncidentSearchQuery(e.target.value)}
                      placeholder="Buscar por texto o colonia..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
                    />
                  </div>

                  <select
                    value={incidentMunicipalityFilter}
                    onChange={(e) => setIncidentMunicipalityFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
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
                <div className="bg-white p-12 rounded-2xl text-center border border-slate-200">
                  <AlertCircle size={36} className="text-slate-300 mx-auto mb-2" />
                  <h3 className="font-bold text-sm text-slate-800">No hay incidencias que coincidan con los filtros</h3>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayIncidents.map((r) => {
                    const cat = CATEGORIES[r.properties.category] ?? { label: r.properties.category, color: "#64748b", bg: "#f8fafc", svg: SVGS.AlertCircle };
                    const isResolved = r.properties.status === "resolved";
                    const isEmergency = r.properties.category === "emergencia" && !isResolved;
                    const date = new Date(r.properties.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });

                    return (
                      <div 
                        key={r.properties.id}
                        className={`bg-white p-4 rounded-2xl border shadow-sm transition-all ${
                          isEmergency ? "border-red-300 bg-red-50/20" : isResolved ? "border-emerald-200 bg-emerald-50/10" : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md" style={{ color: cat.color, background: cat.bg }}>
                            {cat.label}
                          </span>
                          <div className="flex items-center gap-2.5">
                            <span className="text-[11px] text-slate-400 font-medium">{date}</span>
                            <span className={`text-[11px] font-extrabold ${isResolved ? "text-emerald-600" : isEmergency ? "text-red-600" : "text-amber-600"}`}>
                              {isResolved ? "✓ Atendida" : isEmergency ? "● Emergencia" : "● Pendiente"}
                            </span>
                          </div>
                        </div>

                        <h3 className="font-extrabold text-sm text-slate-900 mb-1">
                          {r.properties.title}
                        </h3>

                        <p className="text-xs text-slate-600 leading-relaxed mb-3">
                          {r.properties.description}
                        </p>

                        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-2">
                          <span className="text-xs font-bold text-blue-700">
                            📍 {r.properties.municipality || "Tonalá"} {r.properties.sectionNum ? `· Sección #${r.properties.sectionNum}` : ""}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleFocusOnMap(r)}
                              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-all"
                            >
                              <MapPin size={13} />
                              Ver en Mapa
                            </button>

                            <button
                              onClick={() => handleOpenEdit(r)}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-colors"
                              title="Editar o Reasignar"
                            >
                              <Edit3 size={15} />
                            </button>

                            {isResolved ? (
                              <button
                                onClick={() => handleToggleReportStatus(r.properties.id, "active")}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                              >
                                Reabrir
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleReportStatus(r.properties.id, "resolved")}
                                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition-all shadow-sm"
                              >
                                <Check size={14} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-extrabold text-base text-slate-900">Administrar Incidencia</h3>
              <button onClick={() => setEditingReport(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Título *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Municipio *</label>
                  <select
                    value={editForm.municipality}
                    onChange={(e) => setEditForm({ ...editForm, municipality: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
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
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Categoría *</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Estatus *</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="active">● Pendiente</option>
                    <option value="resolved">✓ Resuelta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Asignar Responsable</label>
                  <select
                    value={editForm.assignedToUserId}
                    onChange={(e) => setEditForm({ ...editForm, assignedToUserId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="">-- Sin Asignar --</option>
                    {systemUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Descripción / Seguimiento *</label>
                <textarea
                  required
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white resize-none"
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEditingSubmitting}
                  className="flex-1 py-2.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="font-black text-base text-slate-900 mb-1">¿Depurar Incidencias Resueltas?</h3>
            <p className="text-xs text-slate-500 mb-4">
              Se eliminarán de forma definitiva todas las incidencias marcadas como atendidas en el filtro seleccionado.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setIsPurgeModalOpen(false)} className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl">
                Cancelar
              </button>
              <button onClick={handlePurgeResolved} disabled={isPurging} className="flex-1 py-2 text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm">
                {isPurging ? "Purgando..." : "Sí, Purgar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                  <AlertCircle size={18} />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900">Registrar Incidencia</h3>
              </div>
              <button 
                onClick={() => {
                  setIsReportModalOpen(false);
                  setNewReportCoords(null);
                  setDetectedLocationInfo(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {reportSuccess ? (
              <div className="text-center py-8 text-emerald-600 space-y-2">
                <CheckCircle2 size={36} className="mx-auto" />
                <div className="font-black text-base">¡Incidencia registrada con éxito!</div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="p-6 space-y-3.5">
                
                {/* Location Detection Box */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                  {isGeocodingLoading ? (
                    <div className="flex items-center gap-2 text-blue-600 text-xs font-bold">
                      <Loader2 size={15} className="animate-spin" />
                      <span>Detectando dirección GPS y sección...</span>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        📍 {reportForm.address}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                          {reportForm.municipality}
                        </span>
                        {detectedLocationInfo?.sectionNum && (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            Sección #{detectedLocationInfo.sectionNum}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Dirección / Calle *</label>
                  <input
                    type="text"
                    required
                    value={reportForm.address}
                    onChange={(e) => setReportForm({ ...reportForm, address: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Municipio *</label>
                    <select
                      value={reportForm.municipality}
                      onChange={(e) => setReportForm({ ...reportForm, municipality: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
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
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Categoría *</label>
                    <select
                      value={reportForm.category}
                      onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                    >
                      {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <option key={key} value={key}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Título del Reporte *</label>
                  <input
                    type="text"
                    required
                    value={reportForm.title}
                    onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                    placeholder="Ej. Falla de alumbrado / Bache peligroso"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Descripción de Campo *</label>
                  <textarea
                    required
                    rows={3}
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    placeholder="Detalles sobre lo observado en el territorio..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReportModalOpen(false);
                      setNewReportCoords(null);
                      setDetectedLocationInfo(null);
                    }}
                    className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isGeocodingLoading}
                    className="flex-1 py-2.5 text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm"
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
