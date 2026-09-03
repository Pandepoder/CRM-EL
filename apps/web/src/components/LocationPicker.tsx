"use client";

import { useState, useEffect, useRef } from "react";
// @ts-ignore
import { MapPin, Search, Navigation, Check, Loader2, Sparkles, Crosshair } from "lucide-react";
import "leaflet/dist/leaflet.css";

export type LocationValue = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  address?: string | undefined;
  locationText?: string | undefined;
  municipality?: string | undefined;
  colony?: string | undefined;
  sectionId?: string | undefined;
  sectionNum?: number | undefined;
};

export function LocationPicker({
  value,
  onChange,
  defaultMunicipality = "Tonalá",
  label = "Ubicación del Evento o Incidencia *",
  helperText = "Escribe el domicilio del lugar, selecciónalo en el mapa interactivo o usa tu GPS actual."
}: {
  value: LocationValue;
  onChange: (val: LocationValue) => void;
  defaultMunicipality?: string | undefined;
  label?: string | undefined;
  helperText?: string | undefined;
}) {
  const [searchQuery, setSearchQuery] = useState(value.address || value.locationText || "");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const currentLat = value.latitude ?? 20.6248; // Default Tonalá Centro
  const currentLng = value.longitude ?? -103.2422;

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const L = await import("leaflet");

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if ((mapContainerRef.current as any)._leaflet_id) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: value.latitude ? 16 : 14,
        zoomControl: true
      });

      // Mismos tiles que el mapa principal. Antes se usaban los de CARTO
      // (basemaps.cartocdn.com), que pasaron a exigir clave y devolvían las
      // baldosas con "API KEY REQUIRED" estampado encima: quien registraba una
      // incidencia elegía la ubicación sobre un mapa ilegible.
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19
      }).addTo(map);

      // Custom pulsing pin icon
      const customPinIcon = L.divIcon({
        className: "custom-map-picker-pin",
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; transform: translate(-50%, -50%);">
            <div style="position: absolute; width: 32px; height: 32px; background: rgba(220, 38, 38, 0.25); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 28px; height: 28px; background: #dc2626; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker([currentLat, currentLng], {
        icon: customPinIcon,
        draggable: true
      }).addTo(map);

      // On map click -> move pin & reverse geocode
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        handleCoordsSelected(lat, lng);
      });

      // On marker drag end -> reverse geocode
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        handleCoordsSelected(pos.lat, pos.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Invalidate size once rendered
      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 300);
      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 600);
    }

    initMap();

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener("resize", handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Sync map position when external coordinates change
  const handleCoordsSelected = async (lat: number, lng: number, manualAddress?: string) => {
    setIsReverseGeocoding(true);
    setStatusMessage("Identificando calle, colonia y sección...");

    try {
      const res = await fetch(`/api/map/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        const detectedAddress = manualAddress || data.formattedAddress || data.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        
        setSearchQuery(detectedAddress);

        onChange({
          latitude: lat,
          longitude: lng,
          address: detectedAddress,
          locationText: detectedAddress,
          municipality: data.municipality || value.municipality || defaultMunicipality,
          colony: data.colony || data.neighborhood || value.colony,
          sectionId: data.sectionId || value.sectionId,
          sectionNum: data.sectionNum || value.sectionNum
        });

        setStatusMessage(`✓ Ubicación confirmada: ${detectedAddress}`);
      } else {
        onChange({
          ...value,
          latitude: lat,
          longitude: lng,
          address: manualAddress || value.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          locationText: manualAddress || value.locationText || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
        });
        setStatusMessage(`✓ Coordenadas fijadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    } catch {
      onChange({
        ...value,
        latitude: lat,
        longitude: lng,
        address: manualAddress || value.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        locationText: manualAddress || value.locationText || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
      });
      setStatusMessage(`✓ Coordenadas fijadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Search Address / Place Name
  const handleSearchAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      // El municipio de captura orienta la búsqueda; sin él todo se resuelve
      // contra Tonalá aunque se esté trabajando en otro municipio.
      const municipio = value.municipality || defaultMunicipality || "Tonalá";
      const res = await fetch(
        `/api/map/geocode?q=${encodeURIComponent(searchQuery.trim())}&municipality=${encodeURIComponent(municipio)}`
      );
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.results) ? data.results : [];
        setSearchResults(list);

        if (list.length === 0) {
          setStatusMessage("No se encontró esa dirección. Márcala directamente en el mapa.");
        } else if (list.length === 1) {
          applySearchResult(list[0]);
        } else {
          // Con varias coincidencias se muestran todas y elige quien captura.
          //
          // Antes se aplicaba la primera de inmediato y `applySearchResult`
          // terminaba vaciando la lista en el mismo lote de renderizado, así
          // que las otras coincidencias no llegaban a dibujarse nunca: el
          // buscador se quedaba con una calle equivocada y no había forma de
          // corregirlo salvo marcando el punto a mano en el mapa.
          mapInstanceRef.current?.setView([list[0].lat, list[0].lng], 15);
          setStatusMessage(`${list.length} coincidencias. Elige la correcta o marca el punto exacto en el mapa.`);
        }
      }
    } catch (err) {
      console.error("Geocode error:", err);
      setStatusMessage("Error al buscar dirección. Puedes marcarla en el mapa.");
    } finally {
      setIsSearching(false);
    }
  };

  const applySearchResult = (item: any) => {
    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([item.lat, item.lng], 16);
      markerRef.current.setLatLng([item.lat, item.lng]);
    }

    onChange({
      latitude: item.lat,
      longitude: item.lng,
      address: item.formattedAddress || item.displayName || searchQuery,
      locationText: item.formattedAddress || item.displayName || searchQuery,
      municipality: item.municipality || defaultMunicipality,
      colony: item.colony || value.colony,
      sectionId: item.sectionId || value.sectionId,
      sectionNum: item.sectionNum || value.sectionNum
    });

    // OSM casi nunca tiene el número de casa en Tonalá. Cuando el resultado es
    // solo la calle hay que decirlo: el pin cae en el punto de la vía, que puede
    // quedar a varias cuadras del domicilio real.
    setStatusMessage(
      item.precision === "calle"
        ? `Ubicado en ${item.formattedAddress || item.displayName} (calle, sin número). Ajusta el pin en el mapa.`
        : `✓ Ubicado en: ${item.formattedAddress || item.displayName}`
    );
    setSearchResults([]);
  };

  // GPS Device Locator
  const handleGPS = () => {
    if (!navigator.geolocation) {
      alert("Tu dispositivo no soporta geolocalización GPS.");
      return;
    }

    setIsLocatingGPS(true);
    setStatusMessage("Obteniendo señal GPS de tu dispositivo...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 17);
          markerRef.current.setLatLng([latitude, longitude]);
        }
        handleCoordsSelected(latitude, longitude);
        setIsLocatingGPS(false);
      },
      (err) => {
        console.warn("GPS error:", err);
        alert("No se pudo obtener el GPS. Por favor escribe la dirección o selecciónala en el mapa.");
        setIsLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="w-full max-w-full space-y-4 box-border overflow-hidden">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div className="min-w-0 flex-1">
          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 truncate">
            <MapPin className="text-red-500 shrink-0" size={15} />
            <span className="truncate">{label}</span>
          </label>
          {helperText && <p className="text-xs text-gray-500 mt-0.5">{helperText}</p>}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleGPS}
            disabled={isLocatingGPS}
            title="Usar ubicación GPS del dispositivo actual"
            className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl border border-orange-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isLocatingGPS ? <Loader2 size={13} className="animate-spin text-orange-600" /> : <Navigation size={13} className="text-orange-600" />}
            <span>Mi GPS</span>
          </button>
        </div>
      </div>

      {/* SEARCH BAR / ADDRESS INPUT */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Escribe calle, colonia o lugar (ej. Juárez #123, Tonalá Centro)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearchAddress())}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
          </div>

          <button
            type="button"
            onClick={() => handleSearchAddress()}
            disabled={isSearching || !searchQuery.trim()}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>Ubicar Domicilio</span>
          </button>
        </div>

        {/* Search Results Suggestions */}
        {searchResults.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-2 space-y-1 max-h-48 overflow-y-auto">
            <p className="text-[11px] font-bold text-gray-400 uppercase px-2 py-1">Coincidencias encontradas:</p>
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applySearchResult(item)}
                className="w-full text-left p-2.5 hover:bg-blue-50 rounded-lg text-xs font-semibold text-gray-800 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <MapPin size={14} className="text-red-500 shrink-0" />
                  <span className="truncate">{item.formattedAddress || item.displayName}</span>
                </div>
                <span className="flex items-center gap-1 shrink-0">
                  {item.precision === "calle" && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                      sin número
                    </span>
                  )}
                  {item.sectionNum && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                      Secc. #{item.sectionNum}
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* INTERACTIVE MAP CONTAINER - 360PX HIGH WITH VISIBILITY */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-slate-100 w-full" style={{ height: "360px", minHeight: "320px" }}>
        <div
          ref={mapContainerRef}
          className="w-full h-full"
          style={{ width: "100%", height: "100%", zIndex: 1 }}
        />

        {/* Map Instructions Badge */}
        <div className="absolute top-2 left-2 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-200 shadow-sm flex items-center gap-1.5 text-[11px] font-bold text-gray-700 pointer-events-none">
          <Crosshair size={13} className="text-red-600" />
          <span>Haz clic en el mapa o arrastra el pin para seleccionar la ubicación exacta</span>
        </div>

        {/* Loading Overlay */}
        {(isReverseGeocoding || isSearching || isLocatingGPS) && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="bg-gray-950 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold">
              <Loader2 size={16} className="animate-spin text-blue-400" />
              <span>{statusMessage || "Identificando datos territoriales..."}</span>
            </div>
          </div>
        )}
      </div>

      {/* Active Selected Location Confirmation Card */}
      {value.latitude && value.longitude ? (
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Check size={16} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">
                {value.address || value.locationText || "Ubicación fijada en el mapa"}
              </p>
              <p className="text-[11px] text-emerald-800 font-medium">
                {value.colony ? `Col. ${value.colony}` : ""}
                {value.sectionNum ? ` · Sección INE #${value.sectionNum}` : ""}
                {value.municipality ? ` · ${value.municipality}` : ""}
                {` (${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)})`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-500 flex items-center gap-2">
          <MapPin size={14} className="text-gray-400" />
          <span>No se ha marcado un punto en el mapa aún. Haz clic en el mapa arriba para fijar el domicilio.</span>
        </div>
      )}
    </div>
  );
}
