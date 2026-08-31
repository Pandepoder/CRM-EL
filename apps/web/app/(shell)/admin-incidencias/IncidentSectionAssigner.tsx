"use client";

import { useState } from "react";
// @ts-ignore
import { MapPin, Check, Plus, Loader2, Sparkles, X, Layers, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

type SectionOption = {
  id: string;
  sectionNum: number;
  municipality?: string;
  colonies?: string[];
};

type Props = {
  reportId: string;
  reportTitle: string;
  currentSectionId?: string | null;
  currentSectionNum?: number | null;
  currentMunicipality?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  availableSections: SectionOption[];
};

export function IncidentSectionAssigner({
  reportId,
  reportTitle,
  currentSectionId,
  currentSectionNum,
  currentMunicipality,
  latitude,
  longitude,
  availableSections = [],
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isNewSectionOpen, setIsNewSectionOpen] = useState(false);
  
  // Selection state
  const [selectedSectionId, setSelectedSectionId] = useState<string>(currentSectionId || "");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Auto-detect state
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedSection, setDetectedSection] = useState<{
    sectionId: string;
    sectionNum: number;
    municipality: string;
    address?: string;
  } | null>(null);

  // New section form state
  const [newSectionForm, setNewSectionForm] = useState({
    sectionNum: "",
    municipality: currentMunicipality || "Tonalá",
    colony: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Filtered sections for fast search
  const filteredSections = availableSections.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const numMatch = String(s.sectionNum).includes(q);
    const muniMatch = (s.municipality || "").toLowerCase().includes(q);
    const colMatch = s.colonies?.some((c) => c.toLowerCase().includes(q));
    return numMatch || muniMatch || colMatch;
  });

  // 1. Auto-detect section using GPS coordinates
  const handleAutoDetect = async () => {
    if (!latitude || !longitude) {
      alert("Esta incidencia no tiene coordenadas registradas.");
      return;
    }

    setIsDetecting(true);
    try {
      const res = await fetch(`/api/map/reverse-geocode?lat=${latitude}&lng=${longitude}`);
      if (res.ok) {
        const data = await res.json();
        if (data.sectionId && data.sectionNum) {
          setDetectedSection({
            sectionId: data.sectionId,
            sectionNum: data.sectionNum,
            municipality: data.municipality || "Tonalá",
            address: data.formattedAddress || data.address
          });
          setSelectedSectionId(data.sectionId);
        } else {
          alert("No se encontró una sección exacta para estas coordenadas. Puedes crear una nueva.");
        }
      } else {
        alert("Error al autodetectar sección.");
      }
    } catch (_err) {
      alert("Error de conexión al autodetectar.");
    } finally {
      setIsDetecting(false);
    }
  };

  // 2. Assign selected section to this report
  const handleSaveAssignment = async (secIdToAssign?: string) => {
    const finalSecId = secIdToAssign || selectedSectionId;
    if (!finalSecId) {
      alert("Por favor selecciona una sección.");
      return;
    }

    setIsSaving(true);
    try {
      const matched = availableSections.find((s) => s.id === finalSecId);
      const res = await fetch(`/api/map/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: finalSecId,
          municipality: matched?.municipality || currentMunicipality || "Tonalá"
        })
      });

      if (res.ok) {
        setIsOpen(false);
        router.refresh();
      } else {
        alert("Error al asignar la sección.");
      }
    } catch (_err) {
      alert("Error de conexión al guardar.");
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Create a brand new electoral section in DB and assign it
  const handleCreateNewSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(newSectionForm.sectionNum);
    if (!num || num <= 0) {
      alert("Por favor ingresa un número de sección válido.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/electoral/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionNum: num,
          municipality: newSectionForm.municipality,
          colony: newSectionForm.colony.trim() || undefined
        })
      });

      if (res.ok) {
        const data = await res.json();
        const createdSec = data.section;
        
        // Immediately assign to the report
        if (createdSec?.id) {
          await handleSaveAssignment(createdSec.id);
        } else {
          setIsOpen(false);
          router.refresh();
        }
      } else {
        const errData = await res.json();
        alert(errData.error || "Error al crear la nueva sección electoral.");
      }
    } catch (_err) {
      alert("Error de conexión al crear sección.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {/* Trigger Badge */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-extrabold border transition-all shadow-sm hover:scale-105 cursor-pointer ${
          currentSectionNum
            ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 animate-pulse"
        }`}
        title="Clic para autodetectar, asignar o crear sección electoral"
      >
        <MapPin size={12} className={currentSectionNum ? "text-blue-600" : "text-amber-600"} />
        <span>{currentSectionNum ? `Sección #${currentSectionNum}` : "⚠️ Sin Sección (Asignar)"}</span>
        <ChevronDown size={12} className="opacity-60" />
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <Layers size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Autoselector de Sección Electoral</h3>
                  <p className="text-xs text-gray-500 truncate max-w-xs">{reportTitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              
              {/* Option 1: Auto-detection with GPS */}
              {latitude && longitude && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-emerald-600" /> Autodetección Inteligente por GPS
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </span>
                  </div>

                  {detectedSection ? (
                    <div className="bg-white border border-emerald-300 rounded-lg p-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-extrabold text-gray-900">
                          ✓ Sección #{detectedSection.sectionNum} ({detectedSection.municipality})
                        </div>
                        {detectedSection.address && (
                          <div className="text-[11px] text-gray-500 truncate max-w-[240px]">
                            {detectedSection.address}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveAssignment(detectedSection.sectionId)}
                        disabled={isSaving}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-sm flex items-center gap-1"
                      >
                        <Check size={12} /> Confirmar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAutoDetect}
                      disabled={isDetecting}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all"
                    >
                      {isDetecting ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Analizando polígonos territoriales...
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} /> Autodetectar Sección por Coordenadas
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Option 2: Search & select existing section */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Seleccionar de la Base de Datos</span>
                  {selectedSectionId && (
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <Check size={12} /> Preseleccionada
                    </span>
                  )}
                </label>
                
                <input
                  type="text"
                  placeholder="Escribe # de sección o colonia..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />

                <div className="border border-gray-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto bg-white shadow-inner">
                  {filteredSections.length > 0 ? (
                    filteredSections.map((sec) => {
                      const isSelected = selectedSectionId === sec.id;
                      return (
                        <button
                          key={sec.id}
                          type="button"
                          onClick={() => setSelectedSectionId(sec.id)}
                          className={`w-full text-left px-3 py-2 text-xs border-b border-gray-50 flex items-center justify-between transition-colors ${
                            isSelected ? "bg-blue-100/80 text-blue-950 font-bold" : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          <div>
                            <span className="font-bold text-sm text-gray-900">Sección #{sec.sectionNum}</span>
                            <span className="text-[11px] text-gray-500 ml-2">({sec.municipality || "Tonalá"})</span>
                            {sec.colonies && sec.colonies.length > 0 && (
                              <div className="text-[10px] text-gray-500 truncate max-w-[220px]">
                                {sec.colonies.slice(0, 2).join(", ")}
                              </div>
                            )}
                          </div>
                          {isSelected && <Check size={15} className="text-blue-700 font-bold shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 text-center text-xs text-gray-500">
                      No se encontraron secciones con "{searchQuery}".
                    </div>
                  )}
                </div>
              </div>

              {/* Option 3: Create New Section if missing in DB */}
              <div className="border-t border-gray-100 pt-3">
                {!isNewSectionOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsNewSectionOpen(true)}
                    className="w-full py-2 border border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} /> ¿No está en la lista? Crear Nueva Sección en la BD
                  </button>
                ) : (
                  <form onSubmit={handleCreateNewSection} className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-indigo-900 flex items-center gap-1">
                        <Plus size={13} className="text-indigo-600" /> Registrar Sección Electoral Nueva
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsNewSectionOpen(false)}
                        className="text-[11px] text-gray-500 hover:text-gray-700 font-bold"
                      >
                        Ocultar
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase"># Sección *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="9999"
                          placeholder="Ej. 2785"
                          value={newSectionForm.sectionNum}
                          onChange={(e) => setNewSectionForm({ ...newSectionForm, sectionNum: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs font-bold border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase">Municipio *</label>
                        <select
                          value={newSectionForm.municipality}
                          onChange={(e) => setNewSectionForm({ ...newSectionForm, municipality: e.target.value })}
                          className="w-full px-2 py-1.5 text-xs font-bold border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
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
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 uppercase">Colonia / Referencia</label>
                      <input
                        type="text"
                        placeholder="Ej. Col. Nueva Santa Cruz"
                        value={newSectionForm.colony}
                        onChange={(e) => setNewSectionForm({ ...newSectionForm, colony: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                    >
                      {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                      Crear Sección y Asignar a la Incidencia
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => handleSaveAssignment()}
                disabled={isSaving || !selectedSectionId}
                className="px-4 py-1.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-1.5"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Guardar Asignación
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
