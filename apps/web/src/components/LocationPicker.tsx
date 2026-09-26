"use client";

import { useState, useEffect, useRef } from "react";
// @ts-ignore
import { MapPin, Search, Navigation, Check, Loader2, Sparkles, Crosshair } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { CENTRO_JALISCO, buscarMunicipio } from "@/lib/municipios-jalisco";

export type LocationValue = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  address?: string | undefined;
  locationText?: string | undefined;
  /**
   * Calle y número del punto, si el mapa los conoce: lo que va en «Calle y número» de un domicilio.
   * `address` es la dirección entera (sitio, calle, colonia, CP y municipio) para enseñarla.
   */
  street?: string | undefined;
  municipality?: string | undefined;
  colony?: string | undefined;
  sectionId?: string | undefined;
  sectionNum?: number | undefined;
};

/**
 * El pin: una gota cuya punta es el punto que se guarda. Antes era un círculo con el ancla en su centro
 * y, además, un `translate(-50%, -50%)` dentro: se dibujaba 17 px a la izquierda y 29 px arriba de
 * donde se hacía clic (medido), así que quien arrastraba el pin hasta la puerta de una casa guardaba un
 * punto a decenas de metros de ella.
 */
const ANCHO_PIN = 30;
const ALTO_PIN = 42;
const HTML_PIN = `
  <svg width="${ANCHO_PIN}" height="${ALTO_PIN}" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg" style="display:block; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.35));">
    <path d="M15 1C7.3 1 1 7.2 1 14.9c0 10.4 12.3 24.6 13.2 25.6a1.1 1.1 0 0 0 1.6 0C16.7 39.5 29 25.3 29 14.9 29 7.2 22.7 1 15 1z" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
    <circle cx="15" cy="15" r="5" fill="#ffffff"/>
  </svg>`;

/** A menos de este zoom un clic no alcanza para marcar una casa: el mapa se acerca al punto. */
const ZOOM_PARA_AFINAR = 16;

export function LocationPicker({
  value,
  onChange,
  defaultMunicipality,
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
  // La dirección que se detectó para el punto marcado, para enseñarla aquí mismo: el `value` que manda
  // quien usa el componente no siempre la trae de vuelta.
  const [direccionDelPunto, setDireccionDelPunto] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // El mapa y sus eventos se crean una sola vez. Sin esto, cada clic llamaba a `onChange` y leía `value`
  // tal como eran al abrir el mapa: los datos de antes y quien escucha, de antes.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;
  // Cada punto pide su dirección al servidor. Si se hacen dos clics seguidos y la respuesta del primero
  // llega después, ganaba la del primero: el pin quedaba en un lugar y se guardaba otro. Solo cuenta
  // la respuesta del último punto.
  const ultimaSolicitud = useRef(0);

  // Sin coordenadas, el mapa arranca en el centro del municipio de captura y, si no se
  // conoce, en el de Jalisco. Antes arrancaba siempre en la plaza de Tonalá.
  const municipioConocido = buscarMunicipio(value.municipality || defaultMunicipality);
  const centroInicial = municipioConocido?.center ?? CENTRO_JALISCO;
  const hayPunto = typeof value.latitude === "number" && typeof value.longitude === "number";
  const currentLat = hayPunto ? value.latitude! : centroInicial[0];
  const currentLng = hayPunto ? value.longitude! : centroInicial[1];

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;
    let observador: ResizeObserver | null = null;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const L = await import("leaflet");
      if (!isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if ((mapContainerRef.current as any)._leaflet_id) {
        (mapContainerRef.current as any)._leaflet_id = null;
      }

      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: hayPunto ? 17 : municipioConocido ? 12 : 8,
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

      const icono = L.divIcon({
        className: "custom-map-picker-pin",
        html: HTML_PIN,
        iconSize: [ANCHO_PIN, ALTO_PIN],
        // La punta de la gota, abajo al centro, es el punto.
        iconAnchor: [ANCHO_PIN / 2, ALTO_PIN]
      });

      // Sin punto todavía no hay pin: uno en el centro del municipio parecía un domicilio ya marcado.
      const marker = L.marker([currentLat, currentLng], { icon: icono, draggable: true, autoPan: true });
      if (hayPunto) marker.addTo(map);

      const fijar = (lat: number, lng: number) => {
        if (!map.hasLayer(marker)) marker.addTo(map);
        marker.setLatLng([lat, lng]);
        if (map.getZoom() < ZOOM_PARA_AFINAR) map.setView([lat, lng], ZOOM_PARA_AFINAR + 1);
        void handleCoordsSelected(lat, lng);
      };

      map.on("click", (e: any) => fijar(e.latlng.lat, e.latlng.lng));
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        void handleCoordsSelected(pos.lat, pos.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
      // Para las pruebas en el navegador, como `__leafletMap` en el mapa principal.
      (window as any).__mapaSelector = map;

      // El diálogo que lo contiene se anima al abrir y cambia de alto con los avisos: si Leaflet se queda
      // con el tamaño de antes, centra y proyecta mal, y el pin no cae sobre el punto que se guarda. Se
      // vuelve a medir cada vez que el contenedor cambia, como en el mapa principal.
      const contenedor = mapContainerRef.current;
      if (typeof ResizeObserver !== "undefined") {
        observador = new ResizeObserver(() => {
          if (isMounted && mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        });
        observador.observe(contenedor);
      }
      for (const ms of [100, 300, 600]) {
        setTimeout(() => {
          if (isMounted && mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        }, ms);
      }
    }

    void initMap();

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      isMounted = false;
      observador?.disconnect();
      window.removeEventListener("resize", handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  /** Pone el pin en un punto sin pedir su dirección (la búsqueda y el GPS la piden aparte). */
  const moverPin = (lat: number, lng: number, zoom: number) => {
    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (!map.hasLayer(marker)) marker.addTo(map);
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng], zoom);
  };

  /**
   * El punto marcado es el que se guarda, tal cual: la dirección, la colonia y la sección se buscan para
   * ese punto, pero nunca lo mueven. `precisionGps`: el radio que dio el dispositivo, para decirlo.
   */
  const handleCoordsSelected = async (lat: number, lng: number, precisionGps?: number) => {
    const solicitud = ++ultimaSolicitud.current;
    const avisoGps =
      precisionGps === undefined
        ? ""
        : precisionGps > 50
          ? ` Señal débil: el punto puede estar a ±${Math.round(precisionGps)} m. Arrastra el pin al lugar exacto antes de guardar.`
          : ` GPS ±${Math.round(precisionGps)} m.`;
    setIsReverseGeocoding(true);
    setStatusMessage("Identificando calle, colonia y sección...");

    const coordenadas = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    const soloElPunto = () => {
      const v = valueRef.current;
      setDireccionDelPunto(null);
      onChangeRef.current({
        ...v,
        latitude: lat,
        longitude: lng,
        address: v.address || coordenadas,
        locationText: v.locationText || coordenadas,
        // La calle de un punto anterior no es la de este.
        street: undefined
      });
      setStatusMessage(`✓ Punto fijado: ${coordenadas}.${avisoGps}`);
    };

    try {
      const res = await fetch(`/api/map/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (solicitud !== ultimaSolicitud.current) return;
      if (!res.ok) {
        soloElPunto();
        return;
      }
      const data = await res.json();
      if (solicitud !== ultimaSolicitud.current) return;
      const v = valueRef.current;
      const detectedAddress = data.formattedAddress || data.address || coordenadas;
      setSearchQuery(detectedAddress);
      setDireccionDelPunto(detectedAddress);

      // Lo que el punto no trae (sin sección: fuera de la cartografía; sin colonia) se deja vacío: los
      // datos de un punto anterior no describen este.
      onChangeRef.current({
        latitude: lat,
        longitude: lng,
        address: detectedAddress,
        locationText: detectedAddress,
        street: data.street ? `${data.street}${data.houseNumber ? ` #${data.houseNumber}` : ""}` : undefined,
        municipality: data.municipality || v.municipality || defaultMunicipality,
        colony: data.colony || data.neighborhood || undefined,
        sectionId: data.sectionId || undefined,
        sectionNum: data.sectionNum || undefined
      });

      // Se dice con qué se armó la dirección. Antes todo salía como "confirmada", aunque
      // fuera solo la colonia o aunque OpenStreetMap no hubiera contestado: quien captura
      // no tenía forma de saber cuándo convenía corregir el punto a mano.
      if (data.addressPrecision === "domicilio") {
        setStatusMessage(`✓ Ubicación confirmada: ${detectedAddress}.${avisoGps}`);
      } else if (data.addressPrecision === "aproximada") {
        setStatusMessage(`Aproximada (sin calle en el mapa): ${detectedAddress}. El punto sí es el que marcaste.${avisoGps}`);
      } else {
        setStatusMessage(`Sin referencia de calle en este momento: ${detectedAddress}. Puedes escribirla a mano.${avisoGps}`);
      }
    } catch {
      if (solicitud === ultimaSolicitud.current) soloElPunto();
    } finally {
      if (solicitud === ultimaSolicitud.current) setIsReverseGeocoding(false);
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
      const municipio = value.municipality || defaultMunicipality || "";
      const res = await fetch(
        `/api/map/geocode?q=${encodeURIComponent(searchQuery.trim())}&municipality=${encodeURIComponent(municipio)}`
      );
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.results) ? data.results : [];
        setSearchResults(list);

        if (list.length === 0 && data.saturado) {
          // No es lo mismo que el buscador no encuentre la dirección a que no
          // haya podido preguntar. Nominatim limita por peticiones y todas las
          // de este sistema salen por la misma IP, así que en jornada con varias
          // personas capturando es un caso real, no teórico. Decirlo evita que
          // se dé por inexistente un domicilio que sí está.
          setStatusMessage(
            "El buscador de direcciones no está respondiendo ahora mismo. Marca el punto en el mapa; la dirección se puede escribir a mano."
          );
        } else if (list.length === 0) {
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
    // Un resultado nuevo deja sin efecto una dirección que venía en camino para otro punto.
    ultimaSolicitud.current++;
    setIsReverseGeocoding(false);
    moverPin(item.lat, item.lng, 17);
    const direccion = item.formattedAddress || item.displayName || searchQuery;
    setDireccionDelPunto(direccion);

    onChangeRef.current({
      latitude: item.lat,
      longitude: item.lng,
      address: direccion,
      locationText: direccion,
      street: item.street || undefined,
      municipality: item.municipality || defaultMunicipality,
      colony: item.colony || undefined,
      sectionId: item.sectionId || undefined,
      sectionNum: item.sectionNum || undefined
    });

    // OSM casi nunca tiene el número de casa en Tonalá. Cuando el resultado es
    // solo la calle hay que decirlo: el pin cae en el punto de la vía, que puede
    // quedar a varias cuadras del domicilio real.
    setStatusMessage(
      item.precision === "calle"
        ? `Ubicado en ${direccion} (calle, sin número). Arrastra el pin a la casa exacta.`
        : `✓ Ubicado en: ${direccion}. Si la casa no es esa, arrastra el pin.`
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
        const { latitude, longitude, accuracy } = pos.coords;
        moverPin(latitude, longitude, 18);
        // El dispositivo dice con cuánta precisión fijó el punto. Bajo techo o con mala señal un
        // teléfono devuelve fácilmente un radio de cientos de metros —a veces la antena de telefonía en
        // vez del GPS—. No se bloquea (en campo un punto aproximado vale más que ninguno), pero se dice,
        // y ya no lo tapa el mensaje de la dirección que llega después.
        void handleCoordsSelected(latitude, longitude, accuracy);
        setIsLocatingGPS(false);
      },
      (err) => {
        console.warn("GPS error:", err);
        setStatusMessage(
          err.code === err.PERMISSION_DENIED
            ? "El navegador no dio permiso para usar tu ubicación. Actívalo en los ajustes del sitio o marca el punto en el mapa."
            : "No se pudo obtener el GPS. Marca el punto en el mapa o busca la dirección."
        );
        setIsLocatingGPS(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const direccionVisible = direccionDelPunto || value.address || value.locationText;

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

      {/* INTERACTIVE MAP CONTAINER */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-slate-100 w-full h-[300px] sm:h-[360px]">
        <div
          ref={mapContainerRef}
          className="w-full h-full"
          style={{ width: "100%", height: "100%", zIndex: 1 }}
        />

        {/* Map Instructions Badge */}
        <div className="absolute top-2 left-12 right-2 sm:right-auto z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-200 shadow-sm flex items-center gap-1.5 text-[11px] font-bold text-gray-700 pointer-events-none">
          <Crosshair size={13} className="text-red-600 shrink-0" />
          <span className="truncate">Toca el mapa o arrastra el pin: la punta es el punto que se guarda</span>
        </div>

        {/* Loading Overlay */}
        {(isSearching || isLocatingGPS) && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="bg-gray-950 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold">
              <Loader2 size={16} className="animate-spin text-blue-400" />
              <span>{statusMessage || "Identificando datos territoriales..."}</span>
            </div>
          </div>
        )}
      </div>

      {statusMessage && !isSearching && !isLocatingGPS && (
        <p role="status" className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
          {isReverseGeocoding && <Loader2 size={12} className="animate-spin text-blue-600 shrink-0" />}
          <span>{statusMessage}</span>
        </p>
      )}

      {/* Active Selected Location Confirmation Card */}
      {hayPunto ? (
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Check size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm break-words">
                {direccionVisible || "Ubicación fijada en el mapa"}
              </p>
              <p className="text-[11px] text-emerald-800 font-medium break-words">
                {value.colony ? `Col. ${value.colony}` : ""}
                {value.sectionNum ? ` · Sección INE #${value.sectionNum}` : ""}
                {value.municipality ? ` · ${value.municipality}` : ""}
                {` (${value.latitude!.toFixed(6)}, ${value.longitude!.toFixed(6)})`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-500 flex items-center gap-2">
          <MapPin size={14} className="text-gray-400 shrink-0" />
          <span>No se ha marcado un punto en el mapa aún. Toca el mapa para fijar el domicilio.</span>
        </div>
      )}
    </div>
  );
}
