"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
  Minimize2,
  Moon,
  Building2,
  Satellite,
  Map,
  Lightbulb,
  Construction,
  Droplets,
  ShieldCheck,
  Landmark,
  AlertTriangle,
  Vote
} from "lucide-react";
import type { ComponentType } from "react";

type MapIconType = ComponentType<{ size?: number | string; className?: string }>;
import { PredictiveCombobox } from "@/components/PredictiveCombobox";
import { AddressAutocomplete, type AutocompleteItem } from "@/components/AddressAutocomplete";
import { MediaUploader, type MediaFile } from "@/components/MediaUploader";
import { MediaGallery } from "@/components/MediaGallery";

// Lucide icon SVGs baked for crisp Leaflet HTML markers
import { CATEGORIAS_INCIDENCIA } from "@/lib/categorias-incidencia";

const SVGS = {
  TriangleAlert: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
  AlertCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
  Users: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  Megaphone: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/></svg>`,
  Wrench: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  Eye: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
  MapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`,
  Trash: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
  User: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

// Compact badge used everywhere a contact's confirmed PAN militancy needs a visual mark
const PAN_BADGE_HTML = `<span style="display:inline-flex; align-items:center; justify-content:center; width:1.35em; height:1.35em; border-radius:50%; background:#2563eb; flex-shrink:0;"><span style="color:#fff; font-size:0.7em; font-weight:900; line-height:1;">M</span></span>`;

const CATEGORIES = CATEGORIAS_INCIDENCIA;

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

// Etiqueta corta de cada capa para la barra. Antes se resolvía con ternarios
// encadenados que mandaban a "OSM" todo lo que no fuera calles ni noche, así que
// al mostrar la cuarta capa habría aparecido "OSM" dos veces.
const TILE_LABELS: Record<string, string> = {
  esriStreet: "Calles HD",
  dark: "Noche",
  osm: "OSM",
  satellite: "Satélite"
};

const TILE_STYLES = {
  esriStreet: {
    name: "Calles HD (Color)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors",
    icon: Map
  },
  dark: {
    name: "Táctico Nocturno",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors",
    icon: Moon
  },
  osm: {
    name: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    icon: Building2
  },
  satellite: {
    name: "Satélite HD",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    icon: Satellite
  }
};

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
    assignedToUserId?: string | undefined;
    eventDate?: string | undefined;
    mediaUrls?: MediaFile[] | undefined;
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
  const [contactsLayer, setContactsLayer] = useState<any>(null);
  const [geoJsonLayer, setGeoJsonLayer] = useState<any>(null);
  const [labelsLayer, setLabelsLayer] = useState<any>(null);
  const [userLocationMarker, setUserLocationMarker] = useState<any>(null);
  const [allReports, setAllReports] = useState<ReportFeature[]>([]);
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [showContacts, setShowContacts] = useState(false);
  const [sectionsData, setSectionsData] = useState<any>(null);
  const [systemUsers, setSystemUsers] = useState<UserOption[]>([]);
  
  // Views: Map view or Incident Operations Center view
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");

  // Operational Category Sub-Tab in Incident Center:
  const [incidentSubTab, setIncidentSubTab] = useState<"active" | "emergency" | "resolved" | "all">("active");

  // =========================================================================
  // INFORMATION DENSITY SLIDER (0 = Solo Incidencias, 1 = Territorial, 2 = Completo)
  // Vista inicial en 1 (Territorial con secciones visibles)
  // =========================================================================
  const [infoDensity, setInfoDensity] = useState<number>(1);

  // =========================================================================
  // ZERO-OVERLAP UNIFIED DRAWER STATE
  // ("none" | "search" | "section" | "incidents" | "layers")
  // =========================================================================
  const [activeDrawer, setActiveDrawer] = useState<"none" | "search" | "section" | "incidents" | "layers">("none");
  // En un teléfono la barra completa se apilaba en seis filas y ocupaba el 60%
  // de la pantalla, dejando el mapa en una franja. Se pliega por defecto en
  // pantallas estrechas y se despliega a voluntad.
  const [barraAbierta, setBarraAbierta] = useState(true);
  // Total de contactos ubicables en el alcance del usuario. Se guarda aparte
  // porque el mapa solo carga los del recuadro visible: contar los dibujados
  // convertiría el rótulo en "los que caben en pantalla".
  const [totalContactos, setTotalContactos] = useState(0);
  const [esPantallaEstrecha, setEsPantallaEstrecha] = useState(false);

  // Selected Section for floating detail card / drawer
  const [selectedSection, setSelectedSection] = useState<SectionProperties | null>(null);

  // GPS State
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);

  // Layer Toggles & Map View Settings (OpenStreetMap y Secciones activas por defecto)
  const [selectedTileStyle, setSelectedTileStyle] = useState<string>("osm");
  const [showSections, setShowSections] = useState(true);
  const [showSectionLabels, setShowSectionLabels] = useState(true);
  const [enableClustering, setEnableClustering] = useState(true);
  const [mapZoom, setMapZoom] = useState<number>(12);
  // El dibujado de contactos solo depende del zoom por tramos: agrupa o no según
  // supere 14, y el tamaño de rejilla cambia en 11 y 13. Depender del zoom exacto
  // hacía que cada paso destruyera y reconstruyera los 259 marcadores; con el
  // tramo, solo se rehacen cuando de verdad cambia la forma de agrupar.
  const nivelAgrupacion = mapZoom > 14 ? 0 : mapZoom <= 11 ? 1 : mapZoom <= 13 ? 2 : 3;

  // Filters & Search for Map (Tonalá por defecto, carga por municipio ultra liviana)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>("Tonalá");
  const [availableMunicipalities, setAvailableMunicipalities] = useState<Array<{ name: string; count: number }>>([
    { name: "Tonalá", count: 113 },
    { name: "Guadalajara", count: 997 },
    { name: "Zapopan", count: 500 },
    { name: "San Pedro Tlaquepaque", count: 225 },
    { name: "Tlajomulco de Zúñiga", count: 168 },
    { name: "El Salto", count: 88 },
    { name: "Puerto Vallarta", count: 42 },
    { name: "Zapotlanejo", count: 25 },
    { name: "Lagos de Moreno", count: 70 },
    { name: "Tepatitlán de Morelos", count: 64 },
    { name: "Zapotlán el Grande", count: 55 },
    { name: "Chapala", count: 35 }
  ]);
  const [activeCategories] = useState<Set<string>>(new Set(Object.keys(CATEGORIES)));

  // Incident Center Specific Filters & Controls
  const [incidentSearchQuery, setIncidentSearchQuery] = useState("");
  const [incidentMunicipalityFilter, setIncidentMunicipalityFilter] = useState<string>("Tonalá");
  const [incidentCategoryFilter, setIncidentCategoryFilter] = useState<string>("all");

  // New report creation modal & Reverse Geocoding State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [newReportCoords, setNewReportCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);
  const [detectedLocationInfo, setDetectedLocationInfo] = useState<{
    address?: string | undefined;
    sectionNum?: number | undefined;
    sectionId?: string | undefined;
    municipality?: string | undefined;
    colony?: string | undefined;
    postcode?: string | undefined;
  } | null>(null);
  
  const [reportForm, setReportForm] = useState({ 
    title: "", 
    address: "",
    description: "", 
    category: "servicios",
    municipality: "Tonalá",
    sectionId: "",
    assignedToUserId: "",
    mediaUrls: [] as MediaFile[]
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

  // Perform Live Reverse Geocoding with instant 0ms client-side geometry match + Nominatim
  const triggerIncidentCreation = useCallback(async (lat: number, lng: number, explicitMuni?: string, explicitSectionId?: string) => {
    setNewReportCoords({ lat, lng });
    setIsGeocodingLoading(true);
    setIsReportModalOpen(true);

    // 1. Instant client-side match with loaded sectionsData (0ms instant feedback)
    let instantSectionNum: number | undefined;
    let instantSectionId = explicitSectionId;
    let instantMuni = explicitMuni || (selectedMunicipality !== "all" ? selectedMunicipality : "Tonalá");
    let instantColony: string | undefined;

    if (sectionsData?.features) {
      for (const feat of sectionsData.features) {
        if (feat.geometry) {
          try {
            const poly = feat.geometry.type === "Polygon" ? feat.geometry.coordinates[0] : feat.geometry.coordinates?.[0]?.[0];
            if (poly && poly.length > 2) {
              let inside = false;
              for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                const xi = poly[i][0], yi = poly[i][1];
                const xj = poly[j][0], yj = poly[j][1];
                const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
              }
              if (inside) {
                instantSectionNum = feat.properties?.section_num;
                instantSectionId = feat.properties?.id;
                instantMuni = feat.properties?.municipality || instantMuni;
                instantColony = feat.properties?.colonies?.[0];
                break;
              }
            }
          } catch {
            // fallback
          }
        }
      }
    }

    setDetectedLocationInfo({
      address: `Ubicación en ${instantMuni}`,
      sectionNum: instantSectionNum,
      sectionId: instantSectionId,
      municipality: instantMuni,
      colony: instantColony,
      postcode: "45400"
    });

    setReportForm({
      title: instantColony ? `Reporte en ${instantColony}` : `Reporte en ${instantMuni}`,
      address: `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      description: "",
      category: "servicios",
      municipality: instantMuni,
      sectionId: instantSectionId || "",
      assignedToUserId: "",
      mediaUrls: []
    });

    // 2. Fetch live street address and database verified section from API
    try {
      const res = await fetch(`/api/map/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        const detectedMuni = explicitMuni || data.municipality || instantMuni;
        const detectedAddress = data.formattedAddress || data.address || `Ubicación en ${detectedMuni}, Jalisco`;
        const detectedSecNum = data.sectionNum || instantSectionNum;
        const detectedSecId = data.sectionId || instantSectionId;
        const detectedCol = data.colony || instantColony;

        setDetectedLocationInfo({
          address: detectedAddress,
          sectionNum: detectedSecNum,
          sectionId: detectedSecId,
          municipality: detectedMuni,
          colony: detectedCol,
          postcode: data.postalCode || data.postcode || "45400"
        });

        setReportForm((prev) => ({
          ...prev,
          address: detectedAddress,
          municipality: detectedMuni,
          sectionId: detectedSecId || prev.sectionId,
          title: prev.title || (detectedCol ? `Reporte en ${detectedCol}` : `Reporte en ${detectedMuni}`)
        }));
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
    } finally {
      setIsGeocodingLoading(false);
    }
  }, [selectedMunicipality, sectionsData]);

  // Mobile GPS Geolocation Handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador o dispositivo no soporta geolocalización GPS.");
      return;
    }

    setIsLocatingGPS(true);
    showToast("Obteniendo tu ubicación GPS...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsLocatingGPS(false);
        const { latitude, longitude, accuracy } = position.coords;

        // Auto-detect territory and section
        setNewReportCoords({ lat: latitude, lng: longitude });
        triggerIncidentCreation(latitude, longitude);

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
            .bindPopup(`
              <div style="font-family:sans-serif; min-width:180px;">
                <strong style="font-size:13px; color:#0f172a; display:flex; align-items:center; gap:5px;"><span style="color:#2563eb; display:inline-flex;">${SVGS.MapPin.replace('width="18" height="18"', 'width="14" height="14"')}</span> Ubicación GPS Detectada</strong>
                <p style="margin:4px 0 0 0; font-size:11px; color:#2563eb; font-weight:700;">Precisión: ±${Math.round(accuracy)}m</p>
                <p style="margin:4px 0 0 0; font-size:10px; color:#64748b;">Municipio y sección detectados automáticamente</p>
              </div>
            `)
            .addTo(mapRef);

          setUserLocationMarker(marker);
          showToast(`GPS fijado (±${Math.round(accuracy)}m)`);
        }
      },
      (error) => {
        setIsLocatingGPS(false);
        console.warn("GPS Error:", error);
        showToast("No se pudo obtener la señal GPS.");
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
        showToast(`Incidencia: ${r.properties.title}`);
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
        center: [20.6240, -103.2350],
        zoom: 13,
        zoomControl: false,
      });

      leafletModule.control.zoom({ position: "bottomright" }).addTo(map);

      // Default base layer: OpenStreetMap (OSM)
      const initialTiles = leafletModule.tileLayer(TILE_STYLES.osm.url, {
        attribution: TILE_STYLES.osm.attribution,
        maxZoom: 19
      }).addTo(map);

      setTileLayerRef(initialTiles);

      // Incidencias y contactos vivían en el mismo pane (markerPane, z-index 600)
      // y los contactos se añadían después, así que siempre dibujaban encima:
      // con 289 contactos y 21 incidencias, las incidencias quedaban sepultadas.
      // Panes separados fijan el orden por z-index en vez de por orden de alta.
      map.createPane("contactsPane").style.zIndex = "580";
      map.createPane("incidentsPane").style.zIndex = "640";

      const layer = leafletModule.layerGroup().addTo(map);
      const cLayer = leafletModule.layerGroup().addTo(map);
      const labels = leafletModule.layerGroup().addTo(map);
      setMarkersLayer(layer);
      setContactsLayer(cLayer);
      setLabelsLayer(labels);
      setMapRef(map);
      (window as any).__leafletMap = map;

      map.on("zoomend", () => {
        setMapZoom(map.getZoom());
      });

      // Recarga de contactos al terminar de mover o hacer zoom, con retardo para
      // no lanzar una petición por cada fotograma de la animación.
      let recargaPendiente: ReturnType<typeof setTimeout> | null = null;
      const recargarPorVista = () => {
        if (recargaPendiente) clearTimeout(recargaPendiente);
        recargaPendiente = setTimeout(() => {
          void fetchContactsRef.current?.(map);
        }, 400);
      };
      map.on("moveend", recargarPorVista);
      map.on("zoomend", recargarPorVista);

      setTimeout(() => map.invalidateSize(), 150);
      setTimeout(() => {
        map.invalidateSize();
        // Primera carga de contactos, ya con el recuadro visible. Antes se
        // pedían todos al montar el componente y, en cuanto el mapa encuadraba
        // el municipio, se volvían a pedir recortados: dos peticiones, la
        // primera de ellas con el listado completo que el recorte iba a
        // descartar de inmediato.
        recargarPorVista();
      }, 400);

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
    const style = TILE_STYLES[styleKey as keyof typeof TILE_STYLES];
    if (!style || !mapRef || !L || !tileLayerRef) return;

    setSelectedTileStyle(styleKey);
    tileLayerRef.setUrl(style.url);
    tileLayerRef.options.attribution = style.attribution;
    showToast(`Capa: ${style.name}`);
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

  // 2b. Fetch Contacts (with PAN Militancy & Network Colors)
  // El mapa se inicializa una sola vez, así que sus manejadores no pueden
  // capturar `fetchContacts` directamente: se llega a la versión vigente por
  // referencia.
  const fetchContactsRef = useRef<((mapa?: any, intento?: number) => Promise<void>) | null>(null);

  const fetchContacts = useCallback(async (mapa?: any, intento = 0) => {
    try {
      // Se pide solo el recuadro visible.
      let url = "/api/map/contacts";
      if (mapa) {
        const b = mapa.getBounds();
        const ancho = b.getEast() - b.getWest();
        const alto = b.getNorth() - b.getSouth();
        if (ancho > 0.0001 && alto > 0.0001) {
          url += `?bbox=${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
        } else if (intento < 5) {
          // El contenedor aún no tiene ancho —pestaña en segundo plano, panel
          // plegado, primer diseño en un móvil lento— y el recuadro saldría
          // degenerado. Se espera a que lo tenga en vez de pedir el listado
          // completo, que es lo que ocurría antes sin que nada lo delatara.
          setTimeout(() => void fetchContactsRef.current?.(mapa, intento + 1), 300);
          return;
        }
        // Agotada la espera se piden todos: más vale el listado entero que un
        // mapa vacío.
      }
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAllContacts(data.features || []);
        if (typeof data.cobertura?.ubicables === "number") {
          setTotalContactos(data.cobertura.ubicables);
        }
      }
    } catch (error) {
      console.error("Failed to load map contacts:", error);
    }
  }, []);

  // 3. Fetch Sections GeoJSON on demand strictly for the selected municipality
  const fetchSections = useCallback(async (muni?: string) => {
    const targetMuni = muni || selectedMunicipality || "Tonalá";
    try {
      const res = await fetch(`/api/map/sections/geojson?municipality=${encodeURIComponent(targetMuni)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSectionsData(data);
      }
    } catch (error) {
      console.error("Failed to load sections GeoJSON:", error);
    }
  }, [selectedMunicipality]);

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
    fetchUsers();
    // Los contactos no se piden aquí: los pide el mapa en cuanto conoce su
    // recuadro visible (ver `recargarPorVista`).
  }, [fetchReports, fetchUsers]);

  // Fetch sections strictly for the selected municipality
  useEffect(() => {
    if (selectedMunicipality) {
      void fetchSections(selectedMunicipality);
    }
  }, [selectedMunicipality, fetchSections]);

  // Load complete 124 Jalisco municipalities index on mount
  useEffect(() => {
    fetch("/geo/jalisco-municipalities.json")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAvailableMunicipalities(data);
        }
      })
      .catch(() => {});
  }, []);

  // 5. Toggle Single Report Status
  const handleToggleReportStatus = useCallback(async (reportId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/map/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        showToast(newStatus === "resolved" ? "Incidencia marcada como atendida" : "Incidencia reabierta");
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
        showToast("Incidencia eliminada");
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
        showToast(`${data.message}`);
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

  // 7b. Create New Incident with Photos/Videos
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReportCoords) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title: reportForm.title.trim(),
        description: reportForm.description.trim() ? `${reportForm.description.trim()}\n\nDirección: ${reportForm.address}` : reportForm.address,
        latitude: newReportCoords.lat,
        longitude: newReportCoords.lng,
        category: reportForm.category,
        municipality: reportForm.municipality,
        sectionId: reportForm.sectionId || detectedLocationInfo?.sectionId || null,
        assignedToUserId: reportForm.assignedToUserId || null,
        mediaUrls: reportForm.mediaUrls || []
      };

      const res = await fetch("/api/map/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setReportSuccess(true);
        showToast("Incidencia registrada exitosamente");
        await fetchReports();
        await fetchSections();
        setTimeout(() => {
          setIsReportModalOpen(false);
          setReportSuccess(false);
          setNewReportCoords(null);
          setDetectedLocationInfo(null);
          setReportForm({
            title: "",
            address: "",
            description: "",
            category: "servicios",
            municipality: selectedMunicipality !== "all" ? selectedMunicipality : "Tonalá",
            sectionId: "",
            assignedToUserId: "",
            mediaUrls: []
          });
        }, 1500);
      } else {
        const errData = await res.json().catch(() => ({}));
        // El servidor explica el motivo en `message` cuando deniega por permisos
        // y en `error` en los demás fallos. Antes solo se leía `error`, así que
        // un "solo el líder puede levantar incidencias" se mostraba como un
        // genérico "Error al registrar la incidencia".
        alert(errData.message || errData.error || "Error al registrar la incidencia.");
      }
    } catch (err) {
      console.error("Report submit error:", err);
      alert("Error de conexión al registrar la incidencia.");
    } finally {
      setIsSubmitting(false);
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
        showToast("Incidencia actualizada");
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
                <span>${p.contactsCount} simpatizantes</span>
                <span>${p.visitsCompleted} visitas</span>
              </div>
            </div>
          `,
          { sticky: true, className: "section-map-tooltip" }
        );

        // Etiquetas de sección. Se dibujaban a cualquier zoom, así que alejado
        // se amontonaban por decenas y tapaban el mapa y los marcadores. Solo
        // aparecen cuando hay zoom suficiente para que quepan legibles, y
        // únicamente en las secciones visibles en pantalla.
        // Ojo: esto vive dentro de onEachFeature, así que no puede cortarse con
        // return sin saltarse también los manejadores de clic de más abajo.
        const cabenEtiquetas = mapRef.getZoom() >= 13;
        const boundsSeccion = layerItem.getBounds();
        const visibleEnPantalla = mapRef.getBounds().intersects(boundsSeccion);
        if (infoDensity >= 1 && showSectionLabels && labelsLayer && cabenEtiquetas && visibleEnPantalla) {
          const center = boundsSeccion.getCenter();
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

    // Auto-center on the newly loaded municipality boundary
    if (sectionsData?.features && sectionsData.features.length > 0 && mapRef) {
      try {
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          mapRef.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
        }
      } catch {
        // fallback
      }
    }
  }, [L, mapRef, labelsLayer, sectionsData, showSections, showSectionLabels, infoDensity, selectedSection, selectedMunicipality]);

  const handleMunicipalityChange = (muni: string) => {
    setSelectedMunicipality(muni);
    setSelectedSection(null);
    if (!mapRef) return;

    const config = (MUNICIPALITY_CENTERS as Record<string, { center: [number, number]; zoom: number }>)[muni] || { center: [20.6240, -103.2350], zoom: 13 };
    mapRef.flyTo(config.center, config.zoom, { duration: 1.0 });
    showToast(`Municipio: ${muni}`);
  };

  // 11. Render Incident Markers with Guaranteed Prominence, Radial Dispersion & Zero Overlap
  useEffect(() => {
    if (!L || !markersLayer || !mapRef) return;

    markersLayer.clearLayers();

    // Una incidencia con una categoría fuera del catálogo se sigue dibujando.
    // Antes este filtro la descartaba en silencio: como el catálogo del mapa
    // tenía 7 categorías y la base admite 14, más de la mitad de los reportes se
    // guardaban bien y no aparecían nunca. Quien lo levantaba creía haberlo
    // perdido.
    const filtered = allReports.filter((r) => {
      const cat = r.properties.category;
      return activeCategories.has(cat) || !Object.hasOwn(CATEGORIES, cat);
    });

    const zoom = mapRef.getZoom();

    // 1. Group individual reports by proximity (< 0.00018 deg, ~15m) to avoid stacking ("amontonamiento")
    const proximityGroups: Array<{
      centerLat: number;
      centerLng: number;
      reports: ReportFeature[];
    }> = [];

    filtered.forEach((report) => {
      const [lng, lat] = report.geometry.coordinates;
      let matched = proximityGroups.find((g) => Math.hypot(g.centerLat - lat, g.centerLng - lng) < 0.00018);
      if (!matched) {
        matched = { centerLat: lat, centerLng: lng, reports: [] };
        proximityGroups.push(matched);
      }
      matched.reports.push(report);
    });

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
          renderSingleMarker(c.reports[0]!, avgLat, avgLng, 0, 1);
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

          L.marker([avgLat, avgLng], { icon: clusterIcon, pane: "incidentsPane" })
            .on("click", () => {
              mapRef.flyTo([avgLat, avgLng], Math.min(zoom + 2, 16), { duration: 0.8 });
            })
            .addTo(markersLayer);
        }
      });
    } else {
      // Disperse coincident markers so they never overlap or hide each other
      proximityGroups.forEach((group) => {
        const total = group.reports.length;
        if (total === 1) {
          renderSingleMarker(group.reports[0]!, group.centerLat, group.centerLng, 0, 1);
        } else {
          // Dynamic zoom-aware dispersion radius (~36-44px visual separation on screen)
          const metersPerPixel = (156543.03392 * Math.cos((group.centerLat * Math.PI) / 180)) / Math.pow(2, zoom);
          const pixelOffset = Math.min(48, Math.max(34, 28 + total * 3));
          const radiusMeters = pixelOffset * metersPerPixel;
          const radiusLat = radiusMeters / 111139;
          const radiusLng = radiusMeters / (111139 * Math.cos((group.centerLat * Math.PI) / 180));

          group.reports.forEach((report, idx) => {
            const angle = (2 * Math.PI * idx) / total;
            const dispLat = group.centerLat + radiusLat * Math.cos(angle);
            const dispLng = group.centerLng + radiusLng * Math.sin(angle);

            // Connective spider line
            L.polyline([[group.centerLat, group.centerLng], [dispLat, dispLng]], {
              color: "#94a3b8",
              weight: 2,
              dashArray: "3, 3",
              opacity: 0.85
            }).addTo(markersLayer);

            renderSingleMarker(report, dispLat, dispLng, idx, total);
          });
        }
      });
    }

    // Incidents layer must ALWAYS be in front of everything
    if (markersLayer && markersLayer.bringToFront) {
      markersLayer.bringToFront();
    }

    function renderSingleMarker(report: ReportFeature, lat: number, lng: number, indexInGroup = 0, totalInGroup = 1) {
      const cat = CATEGORIES[report.properties.category] ?? {
        label: report.properties.category,
        svg: SVGS.AlertCircle,
        color: "#64748b",
        bg: "#f8fafc"
      };

      const isResolved = report.properties.status === "resolved";
      const isEmergency = report.properties.category === "emergencia" && !isResolved;

      const badgeHtml = totalInGroup > 1 
        ? `<div style="position:absolute; top:-4px; right:-4px; background:#0f172a; color:white; width:15px; height:15px; border-radius:50%; font-size:9px; font-weight:800; display:flex; align-items:center; justify-content:center; border:1.5px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);">${indexInGroup + 1}</div>`
        : isResolved 
        ? `<div style="position:absolute; bottom:-2px; right:-2px; background:#16a34a; color:white; width:14px; height:14px; border-radius:50%; font-size:10px; display:flex; align-items:center; justify-content:center; border:1.5px solid white;">✓</div>`
        : '';

      const icon = L.divIcon({
        html: `
          <div style="position:relative; width:36px; height:36px; border-radius:50%; background-color:${isResolved ? '#f0fdf4' : cat.bg}; display:flex; align-items:center; justify-content:center; color:${isResolved ? '#16a34a' : cat.color}; border: 2.5px solid ${isResolved ? '#16a34a' : isEmergency ? '#ef4444' : 'white'}; box-shadow: 0 4px 12px rgba(0,0,0,0.28); opacity: ${isResolved ? 0.85 : 1}; cursor: pointer; transform: scale(1.05);">
            ${cat.svg}
            ${badgeHtml}
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

      const multiBadge = totalInGroup > 1
        ? `<div style="font-size:10px; font-weight:800; color:#4338ca; background:#eef2ff; padding:3px 8px; border-radius:6px; margin-bottom:8px; display:inline-block; border:1px solid #c7d2fe;">
            Incidencia ${indexInGroup + 1} de ${totalInGroup} en esta ubicación
          </div>`
        : '';

      const popupHtml = `
        <div style="font-family:system-ui,-apple-system,sans-serif; min-width:260px; max-width:320px; padding:6px;">
          ${multiBadge}
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
            <span>${report.properties.sectionNum ? `Sección #${report.properties.sectionNum}` : `${report.properties.municipality || 'Territorio'}`}</span>
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

      L.marker([lat, lng], { icon, pane: "incidentsPane" })
        .bindPopup(popupHtml, { closeButton: true, maxWidth: 320, offset: [0, -5] })
        .addTo(markersLayer);
    }
  }, [L, markersLayer, mapRef, allReports, activeCategories, enableClustering, mapZoom]);

  // 11b. Render Contacts on Map (with Dynamic Spatial Clustering & PAN Militancy Badges)
  useEffect(() => {
    if (!L || !contactsLayer || !mapRef) return;

    contactsLayer.clearLayers();
    if (!showContacts) return;

    const zoom = mapRef.getZoom();

    if (enableClustering && zoom <= 14) {
      const gridSize = zoom <= 11 ? 0.04 : zoom <= 13 ? 0.015 : 0.006;
      const clusters: Record<string, { contacts: any[]; latSum: number; lngSum: number; panCount: number }> = {};

      allContacts.forEach((contact: any) => {
        const [lng, lat] = contact.geometry.coordinates;
        const key = `${Math.floor(lat / gridSize)}_${Math.floor(lng / gridSize)}`;
        if (!clusters[key]) clusters[key] = { contacts: [], latSum: 0, lngSum: 0, panCount: 0 };
        clusters[key].contacts.push(contact);
        clusters[key].latSum += lat;
        clusters[key].lngSum += lng;
        if (contact.properties?.isPanConfirmed) clusters[key].panCount++;
      });

      Object.values(clusters).forEach((c) => {
        const count = c.contacts.length;
        const avgLat = c.latSum / count;
        const avgLng = c.lngSum / count;

        if (count === 1) {
          renderSingleContact(c.contacts[0], avgLat, avgLng);
        } else {
          // A este zoom casi todo lo que se ve son clusters, así que si el grupo
          // entero son ubicaciones aproximadas hay que decirlo aquí: es donde la
          // gente mira antes de decidir a dónde ir.
          const todosAprox = c.contacts.every((x: any) => x.properties?.isApproximate);
          const clusterIcon = L.divIcon({
            html: `
              <div title="${count} contactos${todosAprox ? " — ubicación aproximada por sección, sin GPS" : ""}" style="position:relative; width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color:white; display:flex; flex-direction:column; align-items:center; justify-content:center; border:2.5px ${todosAprox ? "dashed" : "solid"} #ffffff; box-shadow:0 6px 20px rgba(37,99,235,${todosAprox ? "0.25" : "0.45"}); cursor:pointer; font-family:system-ui,-apple-system,sans-serif; transition:all 0.15s ease;">
                <div style="font-size:13px; font-weight:900; line-height:1; letter-spacing:-0.5px;">${count}</div>
                ${c.panCount > 0
                  ? `<div style="font-size:9px; font-weight:800; color:#93c5fd; margin-top:2px; display:flex; align-items:center; gap:2px;">${PAN_BADGE_HTML} ${c.panCount}</div>`
                  : `<div style="font-size:8px; font-weight:700; color:#bfdbfe; text-transform:uppercase; margin-top:1px;">${todosAprox ? "Aprox" : "Red"}</div>`}
                <div style="position:absolute; inset:-4px; border-radius:50%; border:1.5px ${todosAprox ? "dashed" : "solid"} rgba(59,130,246,0.35); pointer-events:none;"></div>
              </div>
            `,
            className: "contact-cluster-marker",
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });

          L.marker([avgLat, avgLng], { icon: clusterIcon, pane: "contactsPane" })
            .on("click", () => {
              // Zoom vivo, no el capturado al construir: el efecto ya no se
              // rehace en cada paso, así que el de la clausura quedaría atrás.
              mapRef.flyTo([avgLat, avgLng], Math.min(mapRef.getZoom() + 2, 16), { duration: 0.8 });
            })
            .addTo(contactsLayer);
        }
      });
    } else {
      allContacts.forEach((contact: any) => {
        const [lng, lat] = contact.geometry.coordinates;
        renderSingleContact(contact, lat, lng);
      });
    }

    function renderSingleContact(contact: any, lat: number, lng: number) {
      const p = contact.properties;
      const isPan = p.isPanConfirmed;
      const color = p.networkColor || "#2563eb";

      // Un punto derivado del centroide de la sección no es un domicilio. Se
      // dibuja con borde punteado y sin sombra para que se lea como "por aquí"
      // y no como "en esta puerta".
      const aprox = p.isApproximate === true;
      const titulo = aprox
        ? `${p.displayName} — ubicación aproximada${p.sectionNum ? ` (sección ${p.sectionNum})` : ""}, sin GPS`
        : `${p.displayName} (${isPan ? "PAN Confirmado" : "Contacto"})`;

      const contactIcon = L.divIcon({
        html: `
          <div style="position:relative; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="${titulo}">
            <div style="width:30px; height:30px; border-radius:50%; background:${isPan ? '#2563eb' : '#ffffff'}; color:${isPan ? '#ffffff' : color}; border:2.5px ${aprox ? "dashed" : "solid"} ${isPan ? '#ffffff' : color}; display:flex; align-items:center; justify-content:center; box-shadow:${aprox ? "none" : "0 4px 14px rgba(0,0,0,0.25)"}; opacity:${aprox ? "0.75" : "1"}; font-size:12px; font-weight:900;">
              ${isPan ? `<span style="color:#fff; font-size:0.85em; font-weight:900; line-height:1;">M</span>` : SVGS.User}
            </div>
          </div>
        `,
        className: "contact-map-marker",
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -16]
      });

      const popupHtml = `
        <div style="font-family:system-ui,-apple-system,sans-serif; min-width:220px; padding:6px;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:4px;">
            <strong style="font-size:14px; font-weight:800; color:#0f172a;">${p.displayName}</strong>
            ${isPan ? '<span style="background:#2563eb; color:white; font-size:9px; font-weight:800; padding:2px 6px; border-radius:999px;">PAN Confirmado</span>' : ''}
          </div>
          <p style="margin:0 0 2px 0; font-size:11px; color:#475569;">${p.colony || 'Colonia por definir'}, ${p.municipality || 'Tonalá'}</p>
          <p style="margin:0 0 8px 0; font-size:11px; color:#64748b;">Red: <strong style="color:#0f172a;">${p.creatorName || 'Equipo'}</strong></p>
          <a href="/crm/contacts/${p.id}" style="display:block; text-align:center; padding:7px 12px; background:#2563eb; color:white; border-radius:8px; font-size:11px; font-weight:800; text-decoration:none; box-shadow:0 2px 6px rgba(37,99,235,0.3);">Ver Ficha 360°</a>
        </div>
      `;

      L.marker([lat, lng], { icon: contactIcon, pane: "contactsPane" })
        .bindPopup(popupHtml)
        .addTo(contactsLayer);
    }
  }, [L, contactsLayer, mapRef, allContacts, showContacts, enableClustering, nivelAgrupacion]);

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
      const colMatch = p.colonies?.some((c: string) => c.toLowerCase().includes(query));
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
    showToast("CSV exportado");
  };

  useEffect(() => {
    fetchContactsRef.current = fetchContacts;
  }, [fetchContacts]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const aplicar = () => {
      setEsPantallaEstrecha(mq.matches);
      setBarraAbierta(!mq.matches);
    };
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

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

        {/* Center: Municipality Selector & Information Density Slider */}
        {activeTab === "map" && barraAbierta && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {/* Direct Statewide Municipality Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "#f8fafc", padding: "4px 8px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
              <MapPin size={14} style={{ color: "#2563eb", flexShrink: 0 }} />
              <select
                value={selectedMunicipality}
                onChange={(e) => handleMunicipalityChange(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "11px",
                  fontWeight: "800",
                  color: "#0f172a",
                  outline: "none",
                  cursor: "pointer",
                  maxWidth: "200px"
                }}
                title="Seleccionar municipio de Jalisco para enfocar el mapa"
              >
                {availableMunicipalities.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} ({m.count} secc.)
                  </option>
                ))}
              </select>
            </div>

            {/* Information Density Slider */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f8fafc", padding: "5px 12px", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
                <Eye size={13} style={{ color: "#2563eb" }} />
                <span>Nivel:</span>
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
                    showToast("Modo Limpio: Solo Incidencias & Calles activas");
                  } else if (val === 1) {
                    setShowSections(true);
                    setShowSectionLabels(true);
                    showToast("Modo Territorial: Incidencias + Secciones sutiles");
                  } else {
                    setShowSections(true);
                    setShowSectionLabels(true);
                    showToast("Modo Detallado: Mapa completo con métricas");
                  }
                }}
                style={{ width: "75px", accentColor: "#2563eb", cursor: "pointer" }}
                title="Desliza para ver más o menos capas e información"
              />

              <span style={{ fontSize: "11px", fontWeight: "800", color: infoDensity === 0 ? "#dc2626" : infoDensity === 1 ? "#0284c7" : "#4f46e5", minWidth: "95px" }}>
                {infoDensity === 0 ? "Limpio" : infoDensity === 1 ? "Territorial" : "Detallado"}
              </span>
            </div>
          </div>
        )}

        {/* Right: Drawer Triggers and Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {/* Plegado de la barra. En móvil es la diferencia entre ver el mapa o
              ver el panel de control. */}
          {activeTab === "map" && esPantallaEstrecha && (
            <button
              onClick={() => setBarraAbierta((v) => !v)}
              title={barraAbierta ? "Ocultar controles y ver el mapa completo" : "Mostrar controles del mapa"}
              style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: barraAbierta ? "#eff6ff" : "#ffffff", color: barraAbierta ? "#1d4ed8" : "#334155", fontSize: "11px", fontWeight: "800", cursor: "pointer" }}
            >
              {barraAbierta ? <Minimize2 size={14} /> : <SlidersHorizontal size={14} />}
              <span>{barraAbierta ? "Ver mapa" : "Controles"}</span>
            </button>
          )}

          {activeTab === "map" && barraAbierta && (
            <>
              {/* Quick Tile Style Switcher */}
              <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", padding: "2px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                {Object.entries(TILE_STYLES).map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => handleChangeTileStyle(key)}
                    title={style.name}
                    style={{
                      padding: "5px 8px",
                      borderRadius: "6px",
                      border: "none",
                      background: selectedTileStyle === key ? "#2563eb" : "transparent",
                      color: selectedTileStyle === key ? "#ffffff" : "#475569",
                      fontSize: "10px",
                      fontWeight: "800",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                      transition: "all 0.15s"
                    }}
                  >
                    <style.icon size={16} />
                    <span>{TILE_LABELS[key] ?? style.name}</span>
                  </button>
                ))}
              </div>

              {/* Contacts Layer Quick Toggle */}
              <button
                onClick={() => {
                  const nextVal = !showContacts;
                  setShowContacts(nextVal);
                  showToast(nextVal ? "Capa de Contactos y Red activada" : "Capas de Contactos oculta");
                }}
                style={{
                  display: "flex", alignItems: "center", gap: "5px", padding: "7px 10px", borderRadius: "9px",
                  border: "1px solid",
                  borderColor: showContacts ? "#93c5fd" : "#cbd5e1",
                  backgroundColor: showContacts ? "#eff6ff" : "#f8fafc",
                  color: showContacts ? "#1d4ed8" : "#475569",
                  fontSize: "11px", fontWeight: "800", cursor: "pointer"
                }}
                title="Mostrar/Ocultar simpatizantes y militancia PAN en el mapa"
              >
                <Users size={14} style={{ color: showContacts ? "#2563eb" : "#64748b" }} />
                <span>Contactos ({totalContactos || allContacts.length})</span>
              </button>

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

        {/* Floating Live KPI HUD */}
        {activeTab === "map" && (
          <div style={{ position: "absolute", bottom: "16px", left: "16px", zIndex: 20, display: "flex", alignItems: "center", gap: "12px", padding: "8px 16px", borderRadius: "14px", background: "rgba(15, 23, 42, 0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.15)", boxShadow: "0 10px 25px rgba(0,0,0,0.35)", color: "white", fontSize: "11px", fontWeight: "700", pointerEvents: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }}></span>
              <span style={{ color: "#fca5a5", fontWeight: "900" }}>{activeReportsCount}</span>
              <span style={{ color: "#94a3b8", fontSize: "10px" }}>Incidencias</span>
            </div>
            <div style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.2)" }}></div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Users size={11} style={{ color: "#93c5fd" }} />
              <span style={{ color: "#93c5fd", fontWeight: "900" }}>{allContacts.length}</span>
              <span style={{ color: "#94a3b8", fontSize: "10px" }}>Simpatizantes</span>
            </div>
            <div style={{ width: "1px", height: "14px", background: "rgba(255,255,255,0.2)" }}></div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Vote size={11} style={{ color: "#86efac" }} />
              <span style={{ color: "#86efac", fontWeight: "900" }}>{sectionsData?.features?.length || 46}</span>
              <span style={{ color: "#94a3b8", fontSize: "10px" }}>Secciones</span>
            </div>
          </div>
        )}

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div style={{ position: "absolute", top: "72px", left: "50%", transform: "translateX(-50%)", zIndex: 1200, background: "rgba(15, 23, 42, 0.92)", color: "white", padding: "8px 18px", borderRadius: "30px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)", fontSize: "12px", fontWeight: "700", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", width: "max-content", maxWidth: "90vw", textAlign: "center" }}>
            {toastMessage}
          </div>
        )}

        {/* =========================================================================
            UNIFIED SLIDE-OVER DRAWER (NEVER OVERLAPS - HOSTS ONE ACTIVE PANEL)
            ========================================================================= */}
        {activeTab === "map" && activeDrawer !== "none" && (
          <div style={{ position: "absolute", top: "72px", right: "12px", bottom: "calc(64px + env(safe-area-inset-bottom) + 12px)", width: "370px", maxWidth: "calc(100vw - 24px)", background: "rgba(255, 255, 255, 0.98)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", borderRadius: "16px", border: "1px solid #cbd5e1", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", zIndex: 40, display: "flex", flexDirection: "column", overflow: "hidden", animation: "float-up 0.2s ease" }}>
            
            {/* 1. DRAWER HEADER */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontWeight: "900", fontSize: "13px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                {activeDrawer === "search" && <><Search size={15} style={{ color: "#2563eb" }} /> Buscar Secciones y Territorio</>}
                {activeDrawer === "section" && <><Layers size={15} style={{ color: "#4f46e5" }} /> Detalle de Sección Electoral</>}
                {activeDrawer === "incidents" && <><AlertCircle size={15} style={{ color: "#dc2626" }} /> Incidencias Activas ({allReports.length})</>}
                {activeDrawer === "layers" && <><SlidersHorizontal size={15} style={{ color: "#2563eb" }} /> Configuración de Capas</>}
              </h3>
              <button 
                onClick={() => setActiveDrawer("none")} 
                style={{ background: "rgba(0,0,0,0.05)", border: "none", color: "#475569", cursor: "pointer", padding: "6px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Cerrar panel"
              >
                <X size={17} />
              </button>
            </div>

            {/* 2. DRAWER BODY */}
            <div style={{ flex: 1, padding: "14px 14px 40px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}>
              
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
                      {availableMunicipalities.map((m) => (
                        <option key={m.name} value={m.name}>
                          {m.name} ({m.count} secciones)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Búsqueda en Vivo de Calles, Colonias y Secciones</label>
                    <AddressAutocomplete
                      value={searchQuery}
                      onChange={(val) => setSearchQuery(val)}
                      onSelect={(item) => {
                        setSearchQuery(item.title);
                        if (item.sectionNum) {
                          const sec = sectionsData?.features?.find((f: any) => f.properties?.section_num === item.sectionNum);
                          if (sec) {
                            handleSelectSection(sec.properties);
                            return;
                          }
                        }
                        if (item.lat && item.lng && mapRef) {
                          mapRef.flyTo([item.lat, item.lng], 16, { duration: 1.0 });
                          showToast(`Centrado en: ${item.title}`);
                        }
                      }}
                      municipality={selectedMunicipality}
                      placeholder="Escribe calle, colonia o sección..."
                    />
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
                            <span style={{ fontSize: "10px", fontWeight: "700", color: "#1d4ed8", display: "inline-flex", alignItems: "center", gap: "3px" }}><MapPin size={10} /> {r.properties.municipality || "Tonalá"}</span>
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
                          <style.icon size={16} />
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
                    <option value="all">Todos los Municipios</option>
                    <option value="Tonalá">Tonalá</option>
                    <option value="Guadalajara">Guadalajara</option>
                    <option value="San Pedro Tlaquepaque">San Pedro Tlaquepaque</option>
                    <option value="Zapopan">Zapopan</option>
                    <option value="Tlajomulco de Zúñiga">Tlajomulco</option>
                    <option value="El Salto">El Salto</option>
                    <option value="Zapotlanejo">Zapotlanejo</option>
                  </select>

                  <select
                    value={incidentCategoryFilter}
                    onChange={(e) => setIncidentCategoryFilter(e.target.value)}
                    style={{ width: "100%", padding: "7px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "700", outline: "none", cursor: "pointer" }}
                  >
                    <option value="all">Todas las Categorías</option>
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

                        <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>
                          {r.properties.description}
                        </p>

                        {/* Attached Photos / Videos */}
                        {r.properties.mediaUrls && r.properties.mediaUrls.length > 0 && (
                          <div style={{ marginBottom: "10px" }}>
                            <MediaGallery media={r.properties.mediaUrls} title="Evidencias Adjuntas" />
                          </div>
                        )}

                        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: "8px", gap: "6px" }}>
                          <span style={{ fontSize: "11px", fontWeight: "700", color: "#1d4ed8", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <MapPin size={10} /> {r.properties.municipality || "Tonalá"} {r.properties.sectionNum ? `· Sección #${r.properties.sectionNum}` : ""}
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
        <div onClick={() => setEditingReport(null)} style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px", backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "18px", width: "100%", maxWidth: "480px", maxHeight: "88dvh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontWeight: "900", fontSize: "15px", color: "#0f172a" }}>Administrar Incidencia</h3>
              <button 
                onClick={() => setEditingReport(null)} 
                style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#f1f5f9", border: "none", color: "#475569", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: "16px 18px 40px", display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", flex: 1 }}>
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
                  <PredictiveCombobox
                    label="Municipio"
                    required
                    allowCustom={false}
                    value={editForm.municipality}
                    onChange={(val) => setEditForm({ ...editForm, municipality: val })}
                    options={availableMunicipalities.map((m) => ({
                      value: m.name,
                      label: m.name,
                      badge: m.name === "Tonalá" ? "Principal" : `${m.count} secc.`
                    }))}
                  />
                </div>

                <div>
                  <PredictiveCombobox
                    label="Categoría"
                    required
                    allowCustom={false}
                    value={editForm.category}
                    onChange={(val) => setEditForm({ ...editForm, category: val })}
                    options={Object.entries(CATEGORIES).map(([key, cat]) => ({
                      value: key,
                      label: cat.label,
                      badge: "Categoría"
                    }))}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <PredictiveCombobox
                    label="Estatus"
                    required
                    allowCustom={false}
                    value={editForm.status}
                    onChange={(val) => setEditForm({ ...editForm, status: val })}
                    options={[
                      { value: "active", label: "● Pendiente", badge: "Pendiente" },
                      { value: "resolved", label: "✓ Resuelta", badge: "Resuelta" }
                    ]}
                  />
                </div>

                <div>
                  <PredictiveCombobox
                    label="Asignar Responsable"
                    allowCustom={false}
                    placeholder="Buscar operador..."
                    value={editForm.assignedToUserId}
                    onChange={(val) => setEditForm({ ...editForm, assignedToUserId: val })}
                    options={systemUsers.map((u) => ({
                      value: u.id,
                      label: u.displayName,
                      badge: "Operador"
                    }))}
                  />
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
        <div onClick={() => setIsPurgeModalOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: "14px", backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "18px", width: "100%", maxWidth: "380px", maxHeight: "88dvh", overflowY: "auto", overscrollBehavior: "contain", padding: "20px", textAlign: "center", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)" }}>
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

      {/* NEW REPORT MODAL - A PRUEBA DE ERRORES */}
      {isReportModalOpen && (
        <div onClick={() => {
          setIsReportModalOpen(false);
          setNewReportCoords(null);
          setDetectedLocationInfo(null);
        }} style={{ position: "fixed", inset: 0, zIndex: 5000, display: "flex", alignItems: "center", justifyContent: "center", padding: "12px", backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "18px", width: "100%", maxWidth: "480px", maxHeight: "88dvh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)", border: "1px solid #e2e8f0" }}>
            
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#fee2e2", color: "#dc2626", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontWeight: "900", fontSize: "15px", color: "#0f172a" }}>Registrar Incidencia</h3>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b" }}>
                    {newReportCoords ? `Coordenadas: ${newReportCoords.lat.toFixed(5)}, ${newReportCoords.lng.toFixed(5)}` : "Punto territorial"}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsReportModalOpen(false);
                  setNewReportCoords(null);
                  setDetectedLocationInfo(null);
                }}
                style={{ background: "#f1f5f9", border: "none", color: "#475569", cursor: "pointer", width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                title="Cerrar ventana"
              >
                <X size={17} />
              </button>
            </div>

            {reportSuccess ? (
              <div style={{ textAlign: "center", padding: "36px 20px", color: "#16a34a" }}>
                <CheckCircle2 size={42} style={{ margin: "0 auto 10px" }} />
                <div style={{ fontWeight: "900", fontSize: "16px", color: "#0f172a" }}>¡Incidencia Registrada con Éxito!</div>
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                  Se ha georreferenciado y asignado a la sección electoral correspondiente.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} style={{ padding: "16px 18px 40px", display: "flex", flexDirection: "column", gap: "11px", overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", flex: 1 }}>
                
                {/* 1. Location Detection & Section Match Box */}
                <div style={{ background: isGeocodingLoading ? "#eff6ff" : "#f0fdf4", border: `1px solid ${isGeocodingLoading ? "#bfdbfe" : "#bbf7d0"}`, borderRadius: "10px", padding: "10px" }}>
                  {isGeocodingLoading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#2563eb", fontSize: "11px", fontWeight: "700" }}>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Detectando dirección exacta y sección electoral en mapa...</span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                        <MapPin size={15} style={{ color: "#16a34a", marginTop: "1px", flexShrink: 0 }} />
                        <div style={{ fontSize: "11px", fontWeight: "800", color: "#0f172a", lineHeight: "1.3" }}>
                          {reportForm.address || "Ubicación en Territorio"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                        <span style={{ background: "#dbeafe", color: "#1e40af", fontSize: "10px", fontWeight: "800", padding: "2px 6px", borderRadius: "5px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                          <Landmark size={10} /> {reportForm.municipality}
                        </span>
                        {detectedLocationInfo?.sectionNum ? (
                          <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "10px", fontWeight: "800", padding: "2px 6px", borderRadius: "5px", border: "1px solid #86efac" }}>
                            Sección Electoral #{detectedLocationInfo.sectionNum} (Confirmada)
                          </span>
                        ) : (
                          <span style={{ background: "#fef3c7", color: "#b45309", fontSize: "10px", fontWeight: "800", padding: "2px 6px", borderRadius: "5px", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <AlertTriangle size={10} /> Selecciona la sección manualmente
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Quick Category & Title Pills (One-Click Helpers) */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Plantillas Rápidas (1 Clic)</label>
                  <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                    {([
                      { cat: "emergencia", icon: ShieldAlert, label: "Emergencia", title: "Emergencia en territorio" },
                      { cat: "alumbrado", icon: Lightbulb, label: "Alumbrado", title: "Falla de luminaria / alumbrado público" },
                      { cat: "bache", icon: Construction, label: "Bacheo", title: "Bacheo necesario en pavimento" },
                      { cat: "fuga_agua", icon: Droplets, label: "Fuga Agua", title: "Fuga de agua potable" },
                      { cat: "basura", icon: Trash2, label: "Basura", title: "Acumulación de basura o escombros" },
                      { cat: "seguridad", icon: ShieldCheck, label: "Seguridad", title: "Solicitud de patrullaje / vigilancia" },
                      { cat: "brigada", icon: Users, label: "Brigada", title: "Solicitud de apoyo con brigada" },
                    ] as Array<{ cat: string; icon: MapIconType; label: string; title: string }>).map((pill) => (
                      <button
                        key={pill.cat}
                        type="button"
                        onClick={() => {
                          const colStr = detectedLocationInfo?.colony ? ` en Col. ${detectedLocationInfo.colony}` : ` en ${reportForm.municipality}`;
                          setReportForm((prev) => ({
                            ...prev,
                            category: pill.cat,
                            title: `${pill.title}${colStr}`
                          }));
                        }}
                        style={{
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: `1px solid ${reportForm.category === pill.cat ? "#2563eb" : "#e2e8f0"}`,
                          background: reportForm.category === pill.cat ? "#eff6ff" : "#f8fafc",
                          color: reportForm.category === pill.cat ? "#1d4ed8" : "#475569",
                          fontSize: "10px",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px"
                        }}
                      >
                        <pill.icon size={12} />
                        <span>{pill.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Address and Colony Autocomplete with Real-Time Data */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "8px" }}>
                  <div>
                    <AddressAutocomplete
                      value={reportForm.address}
                      onChange={(val) => setReportForm((prev) => ({ ...prev, address: val }))}
                      onSelect={(item: AutocompleteItem) => {
                        const newMuni = item.municipality || reportForm.municipality;
                        const newCol = item.colony || detectedLocationInfo?.colony || "";
                        const newSecNum = item.sectionNum || detectedLocationInfo?.sectionNum;
                        const newSecId = item.sectionId || detectedLocationInfo?.sectionId;

                        setReportForm((prev) => ({
                          ...prev,
                          address: item.address || item.title,
                          colony: newCol,
                          municipality: newMuni,
                          sectionId: newSecId || prev.sectionId,
                          title: prev.title || (newCol ? `Reporte en ${newCol}` : `Reporte en ${newMuni}`)
                        }));

                        setDetectedLocationInfo({
                          address: item.address || item.title,
                          sectionNum: newSecNum,
                          sectionId: newSecId,
                          municipality: newMuni,
                          colony: newCol,
                          postcode: item.postcode || "45400"
                        });

                        if (item.lat && item.lng && mapRef) {
                          setNewReportCoords({ lat: item.lat, lng: item.lng });
                          mapRef.flyTo([item.lat, item.lng], 16, { duration: 1.0 });
                          showToast(`Ubicación seleccionada: ${item.title}`);
                        }
                      }}
                      municipality={reportForm.municipality || selectedMunicipality}
                      label="Dirección / Calle y Número *"
                      placeholder="Escribe calle o lugar..."
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Colonia / Barrio</label>
                    <input
                      type="text"
                      placeholder="Ej. Loma Dorada, Centro..."
                      value={detectedLocationInfo?.colony || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDetectedLocationInfo((prev: any) => prev ? { ...prev, colony: val } : { colony: val });
                        setReportForm((prev) => ({
                          ...prev,
                          colony: val,
                          address: prev.address ? prev.address.replace(/Col\.\s*[^,]+/i, `Col. ${val}`) : prev.address
                        }));
                      }}
                      style={{ width: "100%", padding: "8px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "12px", fontWeight: "600", outline: "none" }}
                    />
                  </div>
                </div>

                {/* 4. Municipality & Section Electoral Controls */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <PredictiveCombobox
                      label="Municipio"
                      required
                      allowCustom={false}
                      value={reportForm.municipality}
                      onChange={(val) => setReportForm({ ...reportForm, municipality: val })}
                      options={availableMunicipalities.map((m) => ({
                        value: m.name,
                        label: m.name,
                        badge: m.name === "Tonalá" ? "Principal" : `${m.count} secc.`
                      }))}
                    />
                  </div>

                  <div>
                    <PredictiveCombobox
                      label="Sección Electoral"
                      placeholder="Buscar sección (ej. 2704)..."
                      allowCustom={false}
                      value={reportForm.sectionId || detectedLocationInfo?.sectionId || ""}
                      onChange={(val) => {
                        const matchedFeat = sectionsData?.features?.find((f: any) => f.properties?.id === val);
                        setReportForm((prev) => ({
                          ...prev,
                          sectionId: val,
                          municipality: matchedFeat?.properties?.municipality || prev.municipality
                        }));
                      }}
                      options={(sectionsData?.features || []).map((f: any) => ({
                        value: f.properties.id,
                        label: `Sección #${f.properties.section_num}`,
                        sublabel: f.properties.municipality || "Tonalá",
                        badge: `Sección ${f.properties.section_num}`
                      }))}
                    />
                  </div>
                </div>

                {/* 5. Category & Assigned User */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <div>
                    <PredictiveCombobox
                      label="Categoría"
                      required
                      allowCustom={false}
                      value={reportForm.category}
                      onChange={(val) => setReportForm({ ...reportForm, category: val })}
                      options={Object.entries(CATEGORIES).map(([key, cat]) => ({
                        value: key,
                        label: cat.label,
                        badge: "Categoría"
                      }))}
                    />
                  </div>

                  <div>
                    <PredictiveCombobox
                      label="Asignar Responsable"
                      allowCustom={false}
                      placeholder="Buscar operador..."
                      value={reportForm.assignedToUserId}
                      onChange={(val) => setReportForm({ ...reportForm, assignedToUserId: val })}
                      options={systemUsers.map((u) => ({
                        value: u.id,
                        label: u.displayName,
                        badge: "Operador"
                      }))}
                    />
                  </div>
                </div>

                {/* 6. Title */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Título del Reporte *</label>
                  <input
                    type="text"
                    required
                    value={reportForm.title}
                    onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                    placeholder="Ej. Falla de alumbrado / Bache peligroso en esquina"
                    style={{ width: "100%", padding: "7px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", fontWeight: "600", outline: "none" }}
                  />
                </div>

                {/* 7. Field Description */}
                <div>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: "800", color: "#475569", textTransform: "uppercase", marginBottom: "3px" }}>Descripción de Campo *</label>
                  <textarea
                    required
                    rows={2}
                    value={reportForm.description}
                    onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                    placeholder="Detalles sobre lo observado en el territorio, referencias físicas..."
                    style={{ width: "100%", padding: "7px 10px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "11px", outline: "none", resize: "none" }}
                  />
                </div>

                {/* 8. Media Uploader (Fotos y Videos) */}
                <div>
                  <MediaUploader
                    value={reportForm.mediaUrls}
                    onChange={(files) => setReportForm((prev) => ({ ...prev, mediaUrls: files }))}
                    label="Evidencia Fotográfica / Video"
                    helperText="Toma fotos o videos del suceso (hasta 60 MB)"
                  />
                </div>

                {/* Modal Footer Buttons */}
                <div style={{ display: "flex", gap: "8px", paddingTop: "8px", borderTop: "1px solid #f1f5f9", marginTop: "2px" }}>
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
                    style={{ flex: 1.5, padding: "9px", background: "#dc2626", color: "white", border: "none", borderRadius: "8px", fontSize: "12px", fontWeight: "800", cursor: "pointer", boxShadow: "0 2px 8px rgba(220,38,38,0.3)" }}
                  >
                    {isSubmitting ? "Guardando..." : "Registrar Incidencia"}
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
