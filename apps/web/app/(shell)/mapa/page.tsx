"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  Layers, 
  ExternalLink, 
  X, 
  PlusCircle, 
  Search, 
  ChevronRight, 
  ListFilter, 
  Map as MapIcon, 
  Trash2, 
  MousePointerClick, 
  SlidersHorizontal, 
  Loader2, 
  Download, 
  Edit3, 
  ShieldAlert, 
  Flame, 
  LocateFixed 
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
  "San Pedro Tlaquepaque": { stroke: "#b45309", fill: "#f59e0b" },
  "Zapopan": { stroke: "#047857", fill: "#10b981" },
  "Tlajomulco de Zúñiga": { stroke: "#0e7490", fill: "#06b6d4" },
  "El Salto": { stroke: "#be123c", fill: "#f43f5e" },
  "Zapotlanejo": { stroke: "#334155", fill: "#64748b" },
  "Ixtlahuacán de los Membrillos": { stroke: "#0f766e", fill: "#14b8a6" },
  "Juanacatlán": { stroke: "#4338ca", fill: "#818cf8" },
};

const TILE_STYLES = {
  osm: {
    name: "Estándar",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap Contributors",
    icon: "🗺️"
  },
  positron: {
    name: "Positron Claro",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; CartoDB",
    icon: "🏙️"
  },
  dark: {
    name: "Táctico Oscuro",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; CartoDB",
    icon: "🌙"
  },
  satellite: {
    name: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri World Imagery",
    icon: "🛰️"
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

  // Layer Toggles & Map View Settings
  const [isLayersMenuOpen, setIsLayersMenuOpen] = useState(false);
  const [selectedTileStyle, setSelectedTileStyle] = useState<string>("osm");
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
              <div style="position:relative; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
                <div style="position:absolute; width:28px; height:28px; border-radius:50%; background:rgba(59,130,246,0.35); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
                <div style="width:16px; height:16px; border-radius:50%; background:#2563eb; border:3px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
              </div>
            `,
            className: "gps-user-marker",
            iconSize: [28, 28],
            iconAnchor: [14, 14]
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

      const initialTiles = leafletModule.tileLayer(TILE_STYLES.osm.url, {
        attribution: TILE_STYLES.osm.attribution,
        maxZoom: 19,
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
    if (!L || !mapRef || !tileLayerRef || !style) return;
    setSelectedTileStyle(styleKey);
    tileLayerRef.setUrl(style.url);
    showToast(`🗺️ Vista de mapa: ${style.name}`);
  };

  // 2. Fetch Reports
  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch("/api/map/reports");
      const data = await res.json();
      setAllReports(data.features || []);
    } catch (e) {
      console.error("Failed to fetch reports:", e);
    }
  }, []);

  // 3. Fetch Sections GeoJSON
  const fetchSections = useCallback(async () => {
    try {
      const res = await fetch("/api/map/sections/geojson");
      const data = await res.json();
      setSectionsData(data);
    } catch (e) {
      console.error("Failed to fetch sections:", e);
    }
  }, []);

  // 4. Fetch Users for Assignment
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/users");
      if (res.ok) {
        const data = await res.json();
        setSystemUsers(data || []);
      }
    } catch (e) {
      console.error("Failed to fetch users:", e);
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

  // 11. Render Sections Layer with Centroid Badges
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
          weight: isSelected ? 4 : 2,
          opacity: isSelected ? 1.0 : 0.85,
          fillColor: isSelected ? "#312e81" : theme.fill,
          fillOpacity: isSelected ? 0.38 : 0.18,
          lineJoin: "round",
          lineCap: "round"
        };
      },
      onEachFeature: (feature: any, layerItem: any) => {
        const p = feature.properties as SectionProperties;
        const mun = p.municipality || "Tonalá";
        
        layerItem.bindTooltip(
          `<strong>Sección ${p.section_num} (${mun})</strong><br/><span style="font-size:11px;color:#475569">${p.colonies.slice(0, 2).join(", ") || mun}</span>`,
          { sticky: true, className: "section-map-tooltip" }
        );

        if (showSectionLabels && labelsLayer) {
          const bounds = layerItem.getBounds();
          const center = bounds.getCenter();
          const labelIcon = L.divIcon({
            html: `<div style="background:rgba(15,23,42,0.8); color:white; font-size:10px; font-weight:800; padding:1px 5px; border-radius:4px; border:1px solid rgba(255,255,255,0.4); text-align:center; white-space:nowrap; pointer-events:none; box-shadow:0 1px 3px rgba(0,0,0,0.2); backdrop-filter:blur(2px);">${p.section_num}</div>`,
            className: "section-centroid-label",
            iconSize: [30, 16],
            iconAnchor: [15, 8]
          });
          L.marker(center, { icon: labelIcon, interactive: false }).addTo(labelsLayer);
        }

        layerItem.on({
          mouseover: (e: any) => {
            if (mapClickModeRef.current === "select") {
              e.target.setStyle({ weight: 3.5, fillOpacity: 0.32, opacity: 1.0 });
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
              mapRef.fitBounds(e.target.getBounds(), { padding: [40, 40], maxZoom: 15 });
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

  // 12. Render Incident Markers with Clustering
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

      Object.values(clusters).forEach((cluster) => {
        const count = cluster.reports.length;
        const avgLat = cluster.latSum / count;
        const avgLng = cluster.lngSum / count;

        if (count === 1) {
          renderSingleMarker(cluster.reports[0]!);
        } else {
          const hasEmergency = cluster.reports.some(r => r.properties.category === "emergencia");
          const hasPending = cluster.reports.some(r => r.properties.status === "active");

          const clusterColor = hasEmergency ? "#ef4444" : hasPending ? "#f59e0b" : "#10b981";
          const clusterBg = hasEmergency ? "rgba(239, 68, 68, 0.25)" : hasPending ? "rgba(245, 158, 11, 0.25)" : "rgba(16, 185, 129, 0.25)";

          const clusterIcon = L.divIcon({
            html: `
              <div style="position:relative; width:44px; height:44px; border-radius:50%; background:${clusterBg}; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; transition: transform 0.2s;">
                <div style="width:32px; height:32px; border-radius:50%; background:${clusterColor}; color:white; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; border:2.5px solid white;">
                  ${count}
                </div>
              </div>
            `,
            className: "custom-cluster-badge",
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });

          const clusterMarker = L.marker([avgLat, avgLng], { icon: clusterIcon }).addTo(markersLayer);
          clusterMarker.on("click", () => {
            mapRef.flyTo([avgLat, avgLng], Math.min(zoom + 2, 16), { duration: 0.8 });
          });
        }
      });
    } else {
      filtered.forEach((report) => {
        renderSingleMarker(report);
      });
    }

    function renderSingleMarker(report: ReportFeature) {
      const [lng, lat] = report.geometry.coordinates;
      const cat = CATEGORIES[report.properties.category] ?? {
        label: report.properties.category,
        svg: SVGS.AlertCircle,
        color: "#64748b",
        bg: "#f8fafc"
      };

      const isResolved = report.properties.status === "resolved";

      const icon = L.divIcon({
        html: `
          <div style="position:relative; width:34px; height:34px; border-radius:50%; background-color:${isResolved ? '#f0fdf4' : cat.bg}; display:flex; align-items:center; justify-content:center; color:${isResolved ? '#16a34a' : cat.color}; border: 2.5px solid ${isResolved ? '#16a34a' : 'white'}; box-shadow: 0 4px 8px rgba(0,0,0,0.15); opacity: ${isResolved ? 0.85 : 1}; cursor: pointer;">
            ${cat.svg}
            ${isResolved ? `<div style="position:absolute; bottom:-2px; right:-2px; background:#16a34a; color:white; width:14px; height:14px; border-radius:50%; font-size:10px; display:flex; align-items:center; justify-content:center; border:1.5px solid white;">✓</div>` : ''}
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
        : `<span style="background:#fef3c7; color:#b45309; padding:3px 8px; border-radius:9999px; font-size:10px; font-weight:700; text-transform:uppercase;">● Pendiente</span>`;

      const actionButton = isResolved
        ? `<button onclick="window.__toggleReportStatus('${report.properties.id}', 'active')" style="flex:1; padding:7px 10px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px;">
            ↺ Reabrir
          </button>`
        : `<button onclick="window.__toggleReportStatus('${report.properties.id}', 'resolved')" style="flex:1; padding:7px 10px; background:#16a34a; color:white; border:none; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:4px; box-shadow:0 2px 4px rgba(22,163,74,0.3);">
            ✓ Atendida
          </button>`;

      const popupHtml = `
        <div style="font-family:system-ui,-apple-system,sans-serif; min-width:250px; max-width:300px; padding:4px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <div style="width:24px; height:24px; border-radius:6px; background:${cat.bg}; color:${cat.color}; display:flex; align-items:center; justify-content:center;">${cat.svg}</div>
              <span style="font-size:11px; font-weight:700; color:${cat.color}; text-transform:uppercase;">${cat.label}</span>
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
            <button onclick="window.__deleteReport('${report.properties.id}')" title="Eliminar Incidencia" style="padding:7px 10px; background:#fee2e2; color:#dc2626; border:1px solid #fecaca; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center;">
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
        mapRef.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 15 });
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

    const headers = ["ID", "Titulo", "Categoria", "Estatus", "Municipio", "Seccion", "Latitud", "Longitud", "Fecha_Creacion", "Descripcion"];
    const rows = displayIncidents.map((r) => [
      r.properties.id,
      `"${r.properties.title.replace(/"/g, '""')}"`,
      r.properties.category,
      r.properties.status,
      r.properties.municipality || "Tonalá",
      r.properties.sectionNum || "",
      r.geometry.coordinates[1],
      r.geometry.coordinates[0],
      r.properties.createdAt,
      `"${r.properties.description.replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `incidencias_territoriales_${incidentSubTab}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("📊 Reporte CSV exportado exitosamente");
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "720px", display: "flex", flexDirection: "column" }}>
      
      {/* Top Header Navigation Bar with Responsive Flex-Wrap */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "white", borderBottom: "1px solid #e2e8f0", zIndex: 30, boxShadow: "0 1px 3px rgba(0,0,0,0.05)", flexWrap: "wrap", gap: "8px" }}>
        
        {/* Left: View Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => setActiveTab("map")}
            style={{
              display: "flex", alignItems: "center", gap: "5px", padding: "7px 12px", borderRadius: "8px", border: "none",
              backgroundColor: activeTab === "map" ? "#4f46e5" : "#f1f5f9",
              color: activeTab === "map" ? "white" : "#475569",
              fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "all 0.15s"
            }}
          >
            <MapIcon size={15} />
            <span className="hidden sm:inline">Mapa Cartográfico</span>
            <span className="sm:hidden">Mapa</span>
          </button>
          
          <button
            onClick={() => setActiveTab("list")}
            style={{
              display: "flex", alignItems: "center", gap: "5px", padding: "7px 12px", borderRadius: "8px", border: "none",
              backgroundColor: activeTab === "list" ? "#4f46e5" : "#f1f5f9",
              color: activeTab === "list" ? "white" : "#475569",
              fontSize: "12px", fontWeight: "700", cursor: "pointer", transition: "all 0.15s"
            }}
          >
            <ListFilter size={15} />
            <span className="hidden sm:inline">Centro de Gestión</span>
            <span className="sm:hidden">Incidencias</span>
            <span style={{ background: activeTab === "list" ? "rgba(255,255,255,0.25)" : "#e2e8f0", padding: "1px 6px", borderRadius: "9999px", fontSize: "11px", fontWeight: "800" }}>
              {activeReportsCount}
            </span>
          </button>
        </div>

        {/* Right: Actions and Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          
          {activeTab === "map" && (
            <>
              {/* GPS Locate Me Button for Mobile Field Operators */}
              <button
                onClick={handleLocateMe}
                disabled={isLocatingGPS}
                title="Centrar en mi ubicación GPS"
                style={{
                  display: "flex", alignItems: "center", gap: "4px", padding: "7px 10px", borderRadius: "8px",
                  border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8",
                  fontSize: "12px", fontWeight: "700", cursor: "pointer"
                }}
              >
                <LocateFixed size={14} className={isLocatingGPS ? "animate-spin" : ""} />
                <span className="hidden md:inline">Mi GPS</span>
              </button>

              <button
                onClick={() => setIsQuickIncidentsDrawerOpen(!isQuickIncidentsDrawerOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: "4px", padding: "7px 10px", borderRadius: "8px",
                  border: "1px solid",
                  borderColor: isQuickIncidentsDrawerOpen ? "#ef4444" : "#cbd5e1",
                  backgroundColor: isQuickIncidentsDrawerOpen ? "#fef2f2" : "#f8fafc",
                  color: isQuickIncidentsDrawerOpen ? "#dc2626" : "#334155",
                  fontSize: "12px", fontWeight: "700", cursor: "pointer"
                }}
              >
                <AlertCircle size={14} className={isQuickIncidentsDrawerOpen ? "text-red-600" : "text-slate-500"} />
                <span className="hidden md:inline">Panel</span> ({activeReportsCount})
              </button>

              <button
                onClick={() => setIsLayersMenuOpen(!isLayersMenuOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: "4px", padding: "7px 10px", borderRadius: "8px",
                  border: "1px solid",
                  borderColor: isLayersMenuOpen ? "#6366f1" : "#cbd5e1",
                  backgroundColor: isLayersMenuOpen ? "#eef2ff" : "#f8fafc",
                  color: isLayersMenuOpen ? "#4338ca" : "#334155",
                  fontSize: "12px", fontWeight: "700", cursor: "pointer"
                }}
              >
                <SlidersHorizontal size={14} />
                <span className="hidden md:inline">Capas</span>
              </button>

              <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", padding: "2px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <button
                  onClick={() => {
                    setMapClickMode("select");
                    showToast("🔍 Modo Consulta: Clic en polígono para ver estadísticas de sección");
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px", padding: "5px 8px", borderRadius: "6px", border: "none",
                    backgroundColor: mapClickMode === "select" ? "white" : "transparent",
                    color: mapClickMode === "select" ? "#0f172a" : "#64748b",
                    fontWeight: "700", fontSize: "11px", cursor: "pointer"
                  }}
                >
                  <Layers size={13} />
                  <span className="hidden sm:inline">Consultar</span>
                </button>

                <button
                  onClick={() => {
                    setMapClickMode("report");
                    showToast("📍 Modo 1-Clic: Toca cualquier calle para detectar dirección exacta");
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px", padding: "5px 8px", borderRadius: "6px", border: "none",
                    backgroundColor: mapClickMode === "report" ? "#ef4444" : "transparent",
                    color: mapClickMode === "report" ? "white" : "#64748b",
                    fontWeight: "700", fontSize: "11px", cursor: "pointer"
                  }}
                >
                  <MousePointerClick size={13} />
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
                style={{
                  display: "flex", alignItems: "center", gap: "4px", padding: "7px 10px", borderRadius: "8px",
                  border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626",
                  fontSize: "12px", fontWeight: "700", cursor: "pointer"
                }}
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Purgar</span>
              </button>

              <button
                onClick={handleExportCSV}
                style={{
                  display: "flex", alignItems: "center", gap: "4px", padding: "7px 10px", borderRadius: "8px",
                  border: "1px solid #cbd5e1", background: "#f8fafc", color: "#334155",
                  fontSize: "12px", fontWeight: "700", cursor: "pointer"
                }}
              >
                <Download size={14} />
                <span className="hidden sm:inline">CSV</span>
              </button>
            </>
          )}

          <button
            onClick={() => {
              const defaultCoords = mapRef ? mapRef.getCenter() : { lat: 20.6248, lng: -103.2422 };
              void triggerIncidentCreation(defaultCoords.lat, defaultCoords.lng);
            }}
            style={{
              display: "flex", alignItems: "center", gap: "5px", padding: "7px 14px", borderRadius: "8px", border: "none",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              color: "white", fontSize: "12px", fontWeight: "800", cursor: "pointer",
              boxShadow: "0 2px 6px rgba(239,68,68,0.3)"
            }}
          >
            <PlusCircle size={15} />
            <span>+ Reportar</span>
          </button>
        </div>
      </div>

      {/* Main Content View */}
      <div style={{ position: "relative", flex: 1, width: "100%", height: "100%", minHeight: "660px" }}>
        
        {/* Leaflet Map Canvas */}
        <div 
          id="leaflet-map-container" 
          style={{ 
            position: "absolute", inset: 0, overflow: "hidden", background: "#e5e7eb", zIndex: 0,
            cursor: mapClickMode === "report" ? "crosshair" : "default",
            visibility: activeTab === "map" ? "visible" : "hidden"
          }} 
        />

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 1200, background: "#0f172a", color: "white", padding: "8px 16px", borderRadius: "30px", boxShadow: "0 10px 20px rgba(0,0,0,0.25)", fontSize: "12px", fontWeight: "700", display: "flex", alignItems: "center", gap: "8px", maxWidth: "90%", textAlign: "center" }}>
            {toastMessage}
          </div>
        )}

        {/* Mobile Quick Floating GPS / Mode Action Buttons */}
        {activeTab === "map" && (
          <div style={{ position: "absolute", bottom: 20, right: 16, zIndex: 15, display: "flex", flexDirection: "column", gap: "8px" }}>
            <button
              onClick={handleLocateMe}
              title="Mi Ubicación GPS"
              style={{
                width: "44px", height: "44px", borderRadius: "50%", background: "white", color: "#2563eb",
                border: "1px solid #cbd5e1", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
              }}
            >
              <LocateFixed size={20} className={isLocatingGPS ? "animate-spin" : ""} />
            </button>
          </div>
        )}

        {/* Slide-Over Incidents Drawer */}
        {activeTab === "map" && isQuickIncidentsDrawerOpen && (
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "360px", maxWidth: "88vw", background: "white", zIndex: 25, boxShadow: "-10px 0 25px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", borderLeft: "1px solid #cbd5e1" }}>
            <div style={{ padding: "14px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertCircle size={16} className="text-red-500" />
                  Incidencias ({allReports.length})
                </h3>
              </div>
              <button onClick={() => setIsQuickIncidentsDrawerOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, padding: "10px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
              {allReports.map((r) => {
                const cat = CATEGORIES[r.properties.category] ?? { label: r.properties.category, color: "#64748b", bg: "#f8fafc", svg: SVGS.AlertCircle };
                const isResolved = r.properties.status === "resolved";
                return (
                  <div key={r.properties.id} style={{ background: "#f8fafc", padding: "10px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "3px" }}>
                      <span style={{ fontSize: "10px", fontWeight: "800", color: cat.color, textTransform: "uppercase" }}>{cat.label}</span>
                      <span style={{ fontSize: "10px", color: isResolved ? "#16a34a" : "#dc2626", fontWeight: "700" }}>{isResolved ? "✓ Atendida" : "● Pendiente"}</span>
                    </div>
                    <h4 style={{ margin: "0 0 2px", fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>{r.properties.title}</h4>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
                      <span style={{ fontSize: "10px", color: "#1e40af", fontWeight: "600" }}>📍 {r.properties.municipality || "Tonalá"}</span>
                      <button
                        onClick={() => handleFocusOnMap(r)}
                        style={{ padding: "4px 8px", background: "#4f46e5", color: "white", border: "none", borderRadius: "6px", fontSize: "10px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <MapPin size={10} />
                        Foco
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Map Layers Drawer */}
        {isLayersMenuOpen && (
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 25, width: "290px", maxWidth: "90vw", background: "white", borderRadius: "14px", padding: "14px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", border: "1px solid #cbd5e1" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "13px", fontWeight: "800", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                <SlidersHorizontal size={15} className="text-indigo-600" />
                Capas y Vistas del Mapa
              </h3>
              <button onClick={() => setIsLayersMenuOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                Estilo de Mapa Base
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px" }}>
                {Object.entries(TILE_STYLES).map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => handleChangeTileStyle(key)}
                    style={{
                      padding: "6px 8px", borderRadius: "6px", border: "1px solid",
                      borderColor: selectedTileStyle === key ? "#4f46e5" : "#e2e8f0",
                      backgroundColor: selectedTileStyle === key ? "#eef2ff" : "#f8fafc",
                      color: selectedTileStyle === key ? "#4338ca" : "#334155",
                      fontSize: "10px", fontWeight: "700", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "4px"
                    }}
                  >
                    <span>{style.icon}</span>
                    <span>{style.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>Capas Activas</span>
              
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#1e293b", fontWeight: "600", cursor: "pointer" }}>
                <span>Polígonos Seccionales</span>
                <input type="checkbox" checked={showSections} onChange={(e) => setShowSections(e.target.checked)} style={{ accentColor: "#4f46e5" }} />
              </label>

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#1e293b", fontWeight: "600", cursor: "pointer" }}>
                <span>Números de Sección</span>
                <input type="checkbox" checked={showSectionLabels} onChange={(e) => setShowSectionLabels(e.target.checked)} style={{ accentColor: "#4f46e5" }} />
              </label>

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#1e293b", fontWeight: "600", cursor: "pointer" }}>
                <span>Marcadores de Incidencias</span>
                <input type="checkbox" checked={showIncidents} onChange={(e) => setShowIncidents(e.target.checked)} style={{ accentColor: "#ef4444" }} />
              </label>

              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px", color: "#1e293b", fontWeight: "600", cursor: "pointer" }}>
                <span>Agrupamiento (Clustering)</span>
                <input type="checkbox" checked={enableClustering} onChange={(e) => setEnableClustering(e.target.checked)} style={{ accentColor: "#f59e0b" }} />
              </label>
            </div>
          </div>
        )}

        {/* Floating Search / Municipality Select on Map */}
        {activeTab === "map" && (
          <>
            <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10, width: "320px", maxWidth: "calc(100vw - 24px)", display: "flex", flexDirection: "column", gap: "6px", pointerEvents: "none" }}>
              <div style={{ background: "white", borderRadius: "12px", padding: "10px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", pointerEvents: "auto", border: "1px solid rgba(0,0,0,0.06)" }}>
                <div style={{ marginBottom: "6px" }}>
                  <select
                    value={selectedMunicipality}
                    onChange={(e) => handleMunicipalityChange(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", fontWeight: "700", color: "#0f172a", outline: "none", backgroundColor: "#f8fafc" }}
                  >
                    <option value="all">🗺️ Todos los Municipios (AMG)</option>
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

                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <Search size={14} style={{ position: "absolute", left: "8px", color: "#94a3b8" }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar Sección o Colonia..."
                    style={{ width: "100%", padding: "6px 8px 6px 28px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none" }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "6px", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                      <X size={13} />
                    </button>
                  )}
                </div>

                {searchQuery && (
                  <div style={{ marginTop: "6px", maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "3px" }}>
                    {filteredSectionsList.length > 0 ? (
                      filteredSectionsList.map((sec: SectionProperties) => (
                        <button
                          key={sec.section_num}
                          onClick={() => handleSelectSection(sec)}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderRadius: "6px",
                            background: selectedSection?.section_num === sec.section_num ? "#e0e7ff" : "#f8fafc",
                            border: "1px solid #e2e8f0", cursor: "pointer", textAlign: "left", width: "100%"
                          }}
                        >
                          <div>
                            <div style={{ fontSize: "11px", fontWeight: "700", color: "#0f172a" }}>
                              Sección {sec.section_num} <span style={{ fontSize: "9px", color: "#6366f1" }}>({sec.municipality || 'Tonalá'})</span>
                            </div>
                            <div style={{ fontSize: "10px", color: "#64748b" }}>{sec.colonies.slice(0, 2).join(", ")}</div>
                          </div>
                          <ChevronRight size={13} style={{ color: "#6366f1" }} />
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: "6px", fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>Sin coincidencias</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Floating Section Detail Card (Responsive Bottom Sheet on Mobile) */}
            {selectedSection && (
              <div style={{ position: "absolute", bottom: 16, left: 16, zIndex: 20, width: "340px", maxWidth: "calc(100vw - 32px)", background: "white", borderRadius: "14px", padding: "14px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", border: "1px solid #cbd5e1" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div>
                    <span style={{ display: "inline-block", background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "800", textTransform: "uppercase", marginBottom: "2px" }}>
                      Municipio de {selectedSection.municipality || "Tonalá"}
                    </span>
                    <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>
                      Sección #{selectedSection.section_num}
                    </h2>
                  </div>
                  <button onClick={() => setSelectedSection(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }}>
                    <X size={14} />
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                  <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "10px", fontWeight: "700", color: "#4f46e5" }}>Simpatizantes</div>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>{selectedSection.contactsCount}</div>
                  </div>

                  <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "10px", fontWeight: "700", color: "#10b981" }}>Visitas</div>
                    <div style={{ fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>{selectedSection.visitsCompleted}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  <Link
                    href={`/crm?seccion=${selectedSection.section_num}`}
                    style={{ flex: 1, padding: "7px 10px", background: "#4f46e5", color: "white", borderRadius: "6px", textDecoration: "none", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}
                  >
                    <ExternalLink size={12} />
                    Ver en CRM
                  </Link>
                  <button
                    onClick={() => {
                      const defaultCoords = mapRef ? mapRef.getCenter() : { lat: 20.6248, lng: -103.2422 };
                      void triggerIncidentCreation(defaultCoords.lat, defaultCoords.lng, selectedSection.municipality);
                    }}
                    style={{ padding: "7px 10px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <PlusCircle size={12} />
                    Reportar
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Dedicated Incident Management Center */}
        {activeTab === "list" && (
          <div style={{ position: "absolute", inset: 0, background: "#f8fafc", zIndex: 10, padding: "14px 16px", overflowY: "auto" }}>
            <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
              
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: "#0f172a" }}>
                    Centro de Administración de Incidencias
                  </h1>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Despacho, reasignación y resolución</span>
                </div>
              </div>

              {/* KPI Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px", marginBottom: "14px" }}>
                <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #fde68a" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#b45309" }}>Por Atender</span>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#b45309" }}>{activeReportsCount}</div>
                </div>

                <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #fecaca" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#dc2626" }}>Emergencias</span>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#dc2626" }}>{emergencyReportsCount}</div>
                </div>

                <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#15803d" }}>Resueltas</span>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#15803d" }}>{resolvedReportsCount}</div>
                </div>

                <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#4f46e5" }}>Efectividad</span>
                  <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>{resolutionRate}%</div>
                </div>
              </div>

              {/* Operational Sub-Tabs with Smooth Horizontal Scrolling */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", borderBottom: "2px solid #e2e8f0", paddingBottom: "6px", marginBottom: "12px", overflowX: "auto", whiteSpace: "nowrap" }}>
                <button
                  onClick={() => setIncidentSubTab("active")}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "6px", border: "none",
                    backgroundColor: incidentSubTab === "active" ? "#4f46e5" : "transparent",
                    color: incidentSubTab === "active" ? "white" : "#475569",
                    fontSize: "12px", fontWeight: "700", cursor: "pointer"
                  }}
                >
                  <Flame size={14} />
                  Pendientes ({activeReportsCount})
                </button>

                <button
                  onClick={() => setIncidentSubTab("emergency")}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "6px", border: "none",
                    backgroundColor: incidentSubTab === "emergency" ? "#dc2626" : "transparent",
                    color: incidentSubTab === "emergency" ? "white" : "#dc2626",
                    fontSize: "12px", fontWeight: "700", cursor: "pointer"
                  }}
                >
                  <ShieldAlert size={14} />
                  Emergencias ({emergencyReportsCount})
                </button>

                <button
                  onClick={() => setIncidentSubTab("resolved")}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "6px", border: "none",
                    backgroundColor: incidentSubTab === "resolved" ? "#16a34a" : "transparent",
                    color: incidentSubTab === "resolved" ? "white" : "#475569",
                    fontSize: "12px", fontWeight: "700", cursor: "pointer"
                  }}
                >
                  <CheckCircle2 size={14} />
                  Resueltas ({resolvedReportsCount})
                </button>

                <button
                  onClick={() => setIncidentSubTab("all")}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "6px", border: "none",
                    backgroundColor: incidentSubTab === "all" ? "#0f172a" : "transparent",
                    color: incidentSubTab === "all" ? "white" : "#475569",
                    fontSize: "12px", fontWeight: "700", cursor: "pointer"
                  }}
                >
                  <ListFilter size={14} />
                  Todas ({allReports.length})
                </button>
              </div>

              {/* Filters */}
              <div style={{ background: "white", padding: "10px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px", alignItems: "center" }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <Search size={14} style={{ position: "absolute", left: "8px", color: "#94a3b8" }} />
                    <input
                      type="text"
                      value={incidentSearchQuery}
                      onChange={(e) => setIncidentSearchQuery(e.target.value)}
                      placeholder="Buscar por texto..."
                      style={{ width: "100%", padding: "6px 8px 6px 28px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none", backgroundColor: "#f8fafc" }}
                    />
                  </div>

                  <select
                    value={incidentMunicipalityFilter}
                    onChange={(e) => setIncidentMunicipalityFilter(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", outline: "none", backgroundColor: "#f8fafc", fontWeight: "600" }}
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
                    style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", outline: "none", backgroundColor: "#f8fafc", fontWeight: "600" }}
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
                <div style={{ background: "white", padding: "36px 16px", borderRadius: "12px", textAlign: "center", border: "1px solid #e2e8f0" }}>
                  <AlertCircle size={32} className="text-slate-300 mx-auto mb-2" />
                  <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>No hay incidencias que mostrar</h3>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {displayIncidents.map((r) => {
                    const cat = CATEGORIES[r.properties.category] ?? { label: r.properties.category, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", svg: SVGS.AlertCircle };
                    const isResolved = r.properties.status === "resolved";
                    const isEmergency = r.properties.category === "emergencia" && !isResolved;
                    const date = new Date(r.properties.createdAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });

                    return (
                      <div 
                        key={r.properties.id}
                        style={{
                          background: "white", padding: "12px", borderRadius: "12px",
                          border: "1px solid",
                          borderColor: isEmergency ? "#fca5a5" : isResolved ? "#bbf7d0" : "#e2e8f0",
                          backgroundColor: isResolved ? "#fafdfb" : "white",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: "10px", fontWeight: "800", color: cat.color, background: cat.bg, padding: "2px 6px", borderRadius: "4px" }}>
                            {cat.label}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "10px", color: "#94a3b8" }}>{date}</span>
                            <span style={{ fontSize: "10px", color: isResolved ? "#16a34a" : isEmergency ? "#dc2626" : "#b45309", fontWeight: "700" }}>
                              {isResolved ? "✓ Atendida" : isEmergency ? "● Emergencia" : "● Pendiente"}
                            </span>
                          </div>
                        </div>

                        <h3 style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: "800", color: "#0f172a" }}>
                          {r.properties.title}
                        </h3>

                        <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>
                          {r.properties.description}
                        </p>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "8px", flexWrap: "wrap", gap: "6px" }}>
                          <span style={{ fontSize: "10px", color: "#1e40af", fontWeight: "700" }}>
                            📍 {r.properties.municipality || "Tonalá"} {r.properties.sectionNum ? `(Sec. ${r.properties.sectionNum})` : ""}
                          </span>

                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              onClick={() => handleFocusOnMap(r)}
                              style={{ padding: "4px 8px", background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
                            >
                              <MapPin size={11} />
                              Mapa
                            </button>

                            <button
                              onClick={() => handleOpenEdit(r)}
                              style={{ padding: "4px 8px", background: "#f1f5f9", color: "#4f46e5", border: "1px solid #c7d2fe", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                            >
                              <Edit3 size={11} />
                            </button>

                            {isResolved ? (
                              <button
                                onClick={() => handleToggleReportStatus(r.properties.id, "active")}
                                style={{ padding: "4px 8px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                              >
                                Reabrir
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleReportStatus(r.properties.id, "resolved")}
                                style={{ padding: "4px 8px", background: "#16a34a", color: "white", border: "none", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}
                              >
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
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(5px)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "16px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>Administrar Incidencia</h3>
              <button onClick={() => setEditingReport(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "3px", color: "#334155" }}>Título *</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", outline: "none" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "3px", color: "#334155" }}>Municipio *</label>
                  <select
                    value={editForm.municipality}
                    onChange={(e) => setEditForm({ ...editForm, municipality: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", outline: "none", backgroundColor: "white" }}
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
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "3px", color: "#334155" }}>Categoría *</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", outline: "none", backgroundColor: "white" }}
                  >
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "3px", color: "#334155" }}>Estatus *</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", outline: "none", backgroundColor: "white", fontWeight: "700" }}
                  >
                    <option value="active">● Pendiente</option>
                    <option value="resolved">✓ Resuelta</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "3px", color: "#334155" }}>Asignar Responsable</label>
                  <select
                    value={editForm.assignedToUserId}
                    onChange={(e) => setEditForm({ ...editForm, assignedToUserId: e.target.value })}
                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", outline: "none", backgroundColor: "white" }}
                  >
                    <option value="">-- Sin Asignar --</option>
                    {systemUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.displayName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "3px", color: "#334155" }}>Descripción / Seguimiento *</label>
                <textarea
                  required
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none", resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  style={{ flex: 1, padding: "9px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEditingSubmitting}
                  style={{ flex: 1, padding: "9px", background: "#4f46e5", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                >
                  {isEditingSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PURGE MODAL */}
      {isPurgeModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.6)", backdropFilter: "blur(5px)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "14px" }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "14px", width: "100%", maxWidth: "380px", textAlign: "center" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Trash2 size={22} />
            </div>
            <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: "800", color: "#0f172a" }}>¿Depurar Incidencias Resueltas?</h3>
            <p style={{ margin: "0 0 14px", fontSize: "12px", color: "#64748b" }}>
              Se eliminarán de forma definitiva todas las incidencias marcadas como atendidas.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setIsPurgeModalOpen(false)} style={{ flex: 1, padding: "9px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={handlePurgeResolved} disabled={isPurging} style={{ flex: 1, padding: "9px", background: "#dc2626", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                {isPurging ? "Purgando..." : "Sí, Purgar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW REPORT MODAL */}
      {isReportModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(5px)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "14px" }}>
          <div style={{ background: "white", padding: "22px", borderRadius: "18px", width: "100%", maxWidth: "460px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertCircle size={18} />
                </div>
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "800", color: "#0f172a" }}>Reportar Incidencia</h3>
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
              <div style={{ textAlign: "center", padding: "20px 0", color: "#10b981" }}>
                <CheckCircle2 size={30} style={{ margin: "0 auto 10px" }} />
                <div style={{ fontWeight: "800", fontSize: "15px" }}>¡Incidencia registrada con éxito!</div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                
                <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  {isGeocodingLoading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#6366f1", fontSize: "11px", fontWeight: "600" }}>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Detectando dirección GPS y sección...</span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>
                        📍 {reportForm.address}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                        <span style={{ background: "#dbeafe", color: "#1e40af", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "800" }}>
                          {reportForm.municipality}
                        </span>
                        {detectedLocationInfo?.sectionNum && (
                          <span style={{ background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: "800" }}>
                            Sección #{detectedLocationInfo.sectionNum}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "3px", color: "#334155" }}>Dirección / Calle *</label>
                  <input
                    type="text"
                    required
                    value={reportForm.address}
                    onChange={(e) => setReportForm({ ...reportForm, address: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "3px", color: "#334155" }}>Municipio *</label>
                    <select
                      value={reportForm.municipality}
                      onChange={(e) => setReportForm({ ...reportForm, municipality: e.target.value })}
                      style={{ width: "100%", padding: "7px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", outline: "none", backgroundColor: "white" }}
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
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "3px", color: "#334155" }}>Categoría *</label>
                    <select
                      value={reportForm.category}
                      onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                      style={{ width: "100%", padding: "7px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "11px", outline: "none", backgroundColor: "white" }}
                    >
                      {Object.entries(CATEGORIES).map(([key, cat]) => (
                        <option key={key} value={key}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "3px", color: "#334155" }}>Título *</label>
                  <input
                    type="text"
                    required
                    value={reportForm.title}
                    onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                    placeholder="Ej. Bache profundo / Falla de alumbrado"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", marginBottom: "3px", color: "#334155" }}>Descripción *</label>
                  <textarea
                    required
                    rows={3}
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    placeholder="Detalles de la situación en campo..."
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", outline: "none", resize: "none" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReportModalOpen(false);
                      setNewReportCoords(null);
                      setDetectedLocationInfo(null);
                    }}
                    style={{ flex: 1, padding: "9px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isGeocodingLoading}
                    style={{ flex: 1, padding: "9px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}
                  >
                    {isSubmitting ? "Guardando..." : "Guardar"}
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
