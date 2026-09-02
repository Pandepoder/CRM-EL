"use client";

import { useState, useEffect, useRef } from "react";
// @ts-ignore
import { Search, MapPin, Check, ChevronDown, Sparkles, Hash, Building2, Navigation, Loader2, Crosshair, X } from "lucide-react";
import { LocationPicker } from "@/components/LocationPicker";

export function ColonySelector({ 
  defaultColony, 
  defaultValue,
  defaultMunicipality = "Tonalá",
  municipality: customMunicipality,
  defaultSectionNum,
  defaultSectionId,
  defaultPostalCode = "45400",
  onSelect,
  onChange
}: { 
  defaultColony?: string | undefined;
  defaultValue?: string | undefined;
  defaultMunicipality?: string | undefined;
  municipality?: string | undefined;
  defaultSectionNum?: number | string | undefined;
  defaultSectionId?: string | undefined;
  defaultPostalCode?: string | undefined;
  onSelect?: ((sectionId: string, colony: string, municipality: string, sectionNum?: number, coords?: { lat: number; lng: number }, address?: string) => void) | undefined;
  onChange?: ((colony: string, sectionNum?: number) => void) | undefined;
}) {
  const [municipality, setMunicipality] = useState(customMunicipality || defaultMunicipality || "Tonalá");
  const [sectionNum, setSectionNum] = useState<string>(defaultSectionNum ? String(defaultSectionNum) : "");
  const [selectedSectionId, setSelectedSectionId] = useState<string>(defaultSectionId || "");
  const [colony, setColony] = useState<string>(defaultValue || defaultColony || "");
  const [postalCode, setPostalCode] = useState<string>(defaultPostalCode || "45400");
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  
  // GPS Detection states
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Predictive Autocomplete states
  const [allSections, setAllSections] = useState<any[]>([]);
  const [suggestedColonies, setSuggestedColonies] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showColonyDropdown, setShowColonyDropdown] = useState(false);
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);

  const colonyInputRef = useRef<HTMLInputElement>(null);
  const sectionInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch known sections on mount for 0ms predictive typing
  useEffect(() => {
    fetch("/api/electoral/sections")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.sections) ? data.sections : []);
        setAllSections(list);
      })
      .catch((err) => console.error("Error loading sections:", err));
  }, []);

  // Live predictive query for colonies as user types
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        let url = `/api/catalog/colonies/search?mun=${encodeURIComponent(municipality || "Tonalá")}`;
        if (sectionNum && !isNaN(parseInt(sectionNum, 10))) {
          url += `&section=${encodeURIComponent(sectionNum)}`;
        }
        if (colony.trim().length >= 1) {
          url += `&q=${encodeURIComponent(colony.trim())}`;
        }

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSuggestedColonies(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error fetching colony suggestions:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [sectionNum, municipality, colony]);

  // Handle outside clicks to close predictive dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowColonyDropdown(false);
        setShowSectionDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter sections dynamically
  const filteredSections = allSections.filter((s) => {
    if (!sectionNum.trim()) return true;
    return String(s.sectionNum).includes(sectionNum.trim());
  });

  const handleSelectSection = (s: any) => {
    setSectionNum(String(s.sectionNum));
    setSelectedSectionId(s.id);
    setShowSectionDropdown(false);

    // Auto-predict / focus colony
    if (!colony) {
      setShowColonyDropdown(true);
      colonyInputRef.current?.focus();
    }
  };

  const handleSelectPredictedColony = (item: any) => {
    setColony(item.name);
    if (item.municipality) setMunicipality(item.municipality);
    if (item.postalCode) setPostalCode(item.postalCode);
    if (item.sectionNum && !sectionNum) {
      setSectionNum(String(item.sectionNum));
    }
    setShowColonyDropdown(false);

    if (onSelect) {
      onSelect(item.id, item.name, item.municipality || municipality, sectionNum ? parseInt(sectionNum, 10) : undefined);
    }
    if (onChange) {
      onChange(item.name, item.sectionNum || (sectionNum ? parseInt(sectionNum, 10) : undefined));
    }
  };

  // GPS Auto-detect handler
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert("Tu navegador o dispositivo no soporta geolocalización GPS.");
      return;
    }

    setIsLocatingGPS(true);
    setGpsStatus("Obteniendo coordenadas GPS...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`/api/map/reverse-geocode?lat=${latitude}&lng=${longitude}`);
          if (res.ok) {
            const data = await res.json();
            const detectedMuni = data.municipality || "Tonalá";
            const detectedSecNum = data.sectionNum ? String(data.sectionNum) : "";
            const detectedColony = data.colony || data.neighborhood || "";
            const detectedCP = data.postalCode || "45400";

            setMunicipality(detectedMuni);
            if (detectedSecNum) setSectionNum(detectedSecNum);
            if (data.sectionId) setSelectedSectionId(data.sectionId);
            if (detectedColony) setColony(detectedColony);
            if (detectedCP) setPostalCode(detectedCP);

            setGpsStatus(`✓ Ubicación detectada: ${detectedMuni}${detectedSecNum ? ` · Secc. #${detectedSecNum}` : ""}${detectedColony ? ` (${detectedColony})` : ""}`);

            // Las coordenadas del dispositivo se conservan y se propagan. Antes
            // se usaban solo para deducir colonia y sección y se descartaban, así
            // que el contacto se guardaba sin ubicación exacta: el mapa no podía
            // llevar a nadie a un domicilio, solo al centroide de la sección.
            setCoords({ lat: latitude, lng: longitude });

            if (onSelect) {
              onSelect(
                data.sectionId || "",
                detectedColony,
                detectedMuni,
                detectedSecNum ? parseInt(detectedSecNum, 10) : undefined,
                { lat: latitude, lng: longitude },
                data.formattedAddress || data.address || undefined
              );
            }
          } else {
            setGpsStatus("✓ Coordenadas obtenidas");
          }
        } catch (e) {
          console.error("GPS Reverse geocode error:", e);
          setGpsStatus("Error al consultar datos territoriales.");
        } finally {
          setIsLocatingGPS(false);
        }
      },
      (err) => {
        setIsLocatingGPS(false);
        console.warn("GPS error:", err);
        setGpsStatus("No se pudo acceder al GPS. Verifica los permisos.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div ref={containerRef} className="space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm relative w-full max-w-full box-border">
      {/* Hidden inputs submitted with standard form */}
      <input type="hidden" name="colony" value={colony} />
      <input type="hidden" name="municipality" value={municipality} />
      <input type="hidden" name="sectionNum" value={sectionNum} />
      <input type="hidden" name="sectionId" value={selectedSectionId} />
      <input type="hidden" name="postalCode" value={postalCode} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 pb-3 gap-2">
        <span className="text-xs font-extrabold text-blue-950 uppercase tracking-wider flex items-center gap-2">
          <MapPin size={16} className="text-blue-600" /> Autopredictor de Ubicación y Sección
        </span>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowMapPicker(true)}
            className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-xl border border-blue-200 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Abrir mapa interactivo para buscar domicilio o marcar punto"
          >
            <Crosshair size={13} className="text-blue-600" />
            <span>Abrir Mapa / Buscar Domicilio</span>
          </button>

          <button
            type="button"
            onClick={handleDetectGPS}
            disabled={isLocatingGPS}
            className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Detectar automáticamente Municipio, Sección y Colonia por GPS"
          >
            {isLocatingGPS ? (
              <>
                <Loader2 size={13} className="animate-spin text-blue-600" />
                <span>Detectando GPS...</span>
              </>
            ) : (
              <>
                <Navigation size={13} className="text-blue-600" />
                <span>Mi GPS</span>
              </>
            )}
          </button>

          <span className="text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 border border-emerald-200">
            <Sparkles size={12} className="text-emerald-600" /> Predicción Activa
          </span>
        </div>
      </div>

      {/* DEDICATED FULL-VIEW MAP MODAL */}
      {showMapPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-gray-950/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowMapPicker(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <MapPin size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">Localizador Cartográfico y Domicilio</h3>
                  <p className="text-[11px] text-blue-200">Haz clic en el mapa para fijar el pin y extraer la colonia y sección INE.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMapPicker(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar ventana"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 pb-16">
              <LocationPicker
                label="Seleccionar Ubicación Exacta"
                helperText="Busca una dirección o haz clic en cualquier calle del mapa para colocar el pin."
                defaultMunicipality={municipality || "Tonalá"}
                value={{
                  latitude: coords.lat,
                  longitude: coords.lng,
                  address: colony ? `${colony}, ${municipality}` : "",
                  municipality: municipality,
                  colony: colony,
                  sectionId: selectedSectionId,
                  sectionNum: sectionNum ? parseInt(sectionNum, 10) : undefined
                }}
                onChange={(loc) => {
                  setCoords({ lat: loc.latitude ?? null, lng: loc.longitude ?? null });
                  if (loc.municipality) setMunicipality(loc.municipality);
                  if (loc.colony) setColony(loc.colony);
                  if (loc.sectionNum) setSectionNum(String(loc.sectionNum));
                  if (loc.sectionId) setSelectedSectionId(loc.sectionId);
                  
                  if (onSelect && (loc.colony || loc.address)) {
                    onSelect(
                      loc.sectionId || selectedSectionId || "",
                      loc.colony || colony || loc.address || "",
                      loc.municipality || municipality,
                      loc.sectionNum || (sectionNum ? parseInt(sectionNum, 10) : undefined),
                      loc.latitude && loc.longitude ? { lat: loc.latitude, lng: loc.longitude } : undefined,
                      loc.address
                    );
                  }
                  if (onChange && loc.colony) {
                    onChange(loc.colony, loc.sectionNum || (sectionNum ? parseInt(sectionNum, 10) : undefined));
                  }
                }}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-gray-600 font-semibold truncate">
                {colony ? `Seleccionado: ${colony}${sectionNum ? ` (Secc. #${sectionNum})` : ""}` : "Haz clic en el mapa para fijar dirección"}
              </span>
              <button
                type="button"
                onClick={() => setShowMapPicker(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Check size={14} />
                <span>Confirmar y Aplicar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {gpsStatus && (
        <div className="text-[11px] font-bold text-blue-900 bg-blue-50/90 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center justify-between animate-in fade-in">
          <span>{gpsStatus}</span>
          <button type="button" onClick={() => setGpsStatus(null)} className="text-blue-400 hover:text-blue-700 ml-2"><X size={12} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. Municipio - Predeterminado Tonalá */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Building2 size={13} className="text-gray-500" /> Municipio *
            </span>
            {municipality === "Tonalá" && (
              <span className="text-[10px] text-blue-600 font-bold">Predeterminado</span>
            )}
          </label>
          <select
            value={municipality}
            onChange={(e) => {
              setMunicipality(e.target.value);
              setSuggestedColonies([]);
            }}
            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all cursor-pointer shadow-sm"
          >
            <option value="Tonalá">Tonalá (Predeterminado)</option>
            <option value="Guadalajara">Guadalajara</option>
            <option value="San Pedro Tlaquepaque">Tlaquepaque</option>
            <option value="Zapopan">Zapopan</option>
            <option value="Tlajomulco de Zúñiga">Tlajomulco</option>
            <option value="El Salto">El Salto</option>
            <option value="Zapotlanejo">Zapotlanejo</option>
            <option value="Ixtlahuacán de los Membrillos">Ixtlahuacán</option>
            <option value="Juanacatlán">Juanacatlán</option>
          </select>
        </div>

        {/* 2. Sección Electoral con Autopredictor */}
        <div className="relative">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Hash size={13} className="text-gray-500" /> Sección Electoral
            </span>
            {sectionNum && (
              <span className="text-[10px] text-blue-600 font-bold">#{sectionNum}</span>
            )}
          </label>
          <div className="relative">
            <input
              ref={sectionInputRef}
              type="number"
              min="1"
              max="9999"
              placeholder="Escribe ej. 2704"
              value={sectionNum}
              onFocus={() => setShowSectionDropdown(true)}
              onChange={(e) => {
                setSectionNum(e.target.value);
                setSelectedSectionId("");
                setShowSectionDropdown(true);
              }}
              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
              autoComplete="off"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowSectionDropdown(!showSectionDropdown)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <ChevronDown size={16} className={`transition-transform duration-200 ${showSectionDropdown ? "rotate-180 text-blue-600" : ""}`} />
            </button>
          </div>

          {/* Floating Section Predictions */}
          {showSectionDropdown && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span>Secciones Disponibles</span>
                <button type="button" onClick={() => setShowSectionDropdown(false)} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
              </div>
              {filteredSections.slice(0, 15).map((s) => (
                <button
                  key={s.id || s.sectionNum}
                  type="button"
                  onClick={() => handleSelectSection(s)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors flex items-center justify-between border-b border-gray-50 ${
                    sectionNum === String(s.sectionNum) ? "bg-blue-50/80 font-bold text-blue-900" : "text-gray-700"
                  }`}
                >
                  <span className="font-bold text-sm text-gray-900">Sección #{s.sectionNum}</span>
                  <span className="text-[10px] text-blue-600 font-semibold bg-blue-100/60 px-2 py-0.5 rounded-md">
                    {s.municipality || "Tonalá"}
                  </span>
                </button>
              ))}

              {sectionNum && !allSections.some((s) => String(s.sectionNum) === sectionNum.trim()) && (
                <div className="p-2 bg-gradient-to-r from-emerald-50 to-teal-50 border-t border-emerald-100">
                  <div className="px-2 py-1 text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-emerald-600 shrink-0" />
                    <span>Sección <strong>#{sectionNum}</strong> (Se dará de alta automáticamente)</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Código Postal */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Código Postal
          </label>
          <input
            type="text"
            placeholder="Ej. 45400"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      {/* 4. Colonia con Autopredictor Inteligente */}
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            Colonia / Asentamiento *
          </label>
          <span className="text-[11px] text-blue-700 font-semibold flex items-center gap-1">
            <Search size={12} /> Autopredicción en tiempo real
          </span>
        </div>

        <div className="relative">
          <input
            ref={colonyInputRef}
            type="text"
            required
            placeholder="Escribe tu colonia (ej. Lomas de la Soledad, Centro, Loma Dorada, Jalisco...)"
            value={colony}
            onFocus={() => setShowColonyDropdown(true)}
            onChange={(e) => {
              setColony(e.target.value);
              setShowColonyDropdown(true);
            }}
            className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
            autoComplete="off"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowColonyDropdown(!showColonyDropdown)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <ChevronDown size={16} className={`transition-transform duration-200 ${showColonyDropdown ? "rotate-180 text-blue-600" : ""}`} />
          </button>
        </div>

        {/* Floating Colony Predictions */}
        {showColonyDropdown && (
          <div className="absolute z-40 left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span>
                {loadingSuggestions ? "Buscando coincidencias..." : `Predicciones en ${municipality || "Tonalá"} ${sectionNum ? `(Sección #${sectionNum})` : ""}`}
              </span>
              <button type="button" onClick={() => setShowColonyDropdown(false)} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
            </div>

            {suggestedColonies.length > 0 ? (
              <div className="py-1">
                {suggestedColonies.map((item) => (
                  <button
                    key={item.id || item.name}
                    type="button"
                    onClick={() => handleSelectPredictedColony(item)}
                    className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-blue-50 hover:text-blue-950 border-b border-gray-50/70 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-sm text-gray-900 group-hover:text-blue-950">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {item.municipality || "Tonalá"} {item.postalCode ? `· CP ${item.postalCode}` : ""}
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-100/60 px-2 py-0.5 rounded-full">
                      Seleccionar
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-gray-500">
                {colony.trim() ? "No se encontraron colonias con ese nombre exacto en el catálogo." : "Escribe letras para ver sugerencias."}
              </div>
            )}

            {/* Custom option prompt */}
            {colony.trim() && (
              <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100">
                <button
                  type="button"
                  onClick={() => setShowColonyDropdown(false)}
                  className="w-full text-left px-3 py-2 text-xs font-bold text-blue-900 hover:bg-blue-100/80 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Sparkles size={14} className="text-blue-600 shrink-0" />
                  <span>
                    Usar nombre escrito: <strong>"{colony.trim()}"</strong>
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Pre-selection Badge */}
      {colony && sectionNum && (
        <div className="flex items-center gap-2 text-xs text-emerald-900 bg-emerald-100/90 p-3 rounded-xl border border-emerald-200 shadow-sm animate-in fade-in">
          <Check size={16} className="text-emerald-700 shrink-0 font-bold" />
          <span>
            Preseleccionado: <strong>{colony}</strong> · Sección <strong>#{sectionNum}</strong> ({municipality || "Tonalá"})
          </span>
        </div>
      )}
    </div>
  );
}
