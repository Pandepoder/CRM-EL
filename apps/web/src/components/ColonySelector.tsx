"use client";

import { useState, useEffect } from "react";
import { Search, MapPin } from "lucide-react";

export function ColonySelector({ 
  defaultColony, 
  defaultMunicipality,
  onSelect
}: { 
  defaultColony?: string;
  defaultMunicipality?: string;
  onSelect?: (colonyId: string, name: string, municipality: string) => void;
}) {
  const [mode, setMode] = useState<"section" | "zip">("section");
  const [query, setQuery] = useState("");
  const [colonies, setColonies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedColony, setSelectedColony] = useState(defaultColony || "");
  const [selectedMunicipality, setSelectedMunicipality] = useState(defaultMunicipality || "");

  useEffect(() => {
    if (query.length < 1 && mode === "section") {
      setColonies([]);
      return;
    }
    if (query.length < 4 && mode === "zip") {
      setColonies([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/catalog/colonies/search?${mode}=${encodeURIComponent(query)}`);
        const data = await res.json();
        setColonies(data);
        if (data.length === 1 && !selectedColony) {
          setSelectedColony(data[0].name);
          setSelectedMunicipality(data[0].municipality);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, mode]);

  const handleSelectColony = (colonyId: string) => {
    const col = colonies.find(c => c.id === colonyId);
    if (col) {
      setSelectedColony(col.name);
      setSelectedMunicipality(col.municipality);
      if (onSelect) {
        onSelect(col.id, col.name, col.municipality);
      }
    }
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name="colony" value={selectedColony} />
      <input type="hidden" name="municipality" value={selectedMunicipality} />

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input 
            type="radio" 
            name="searchMode" 
            value="section" 
            checked={mode === "section"} 
            onChange={() => { setMode("section"); setQuery(""); setColonies([]); setSelectedColony(""); setSelectedMunicipality(""); }} 
          />
          <span className="text-sm font-semibold text-gray-700">Sección Electoral</span>
        </label>
        <label className="flex items-center gap-2">
          <input 
            type="radio" 
            name="searchMode" 
            value="zip" 
            checked={mode === "zip"} 
            onChange={() => { setMode("zip"); setQuery(""); setColonies([]); setSelectedColony(""); setSelectedMunicipality(""); }} 
          />
          <span className="text-sm font-semibold text-gray-700">Código Postal</span>
        </label>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1 relative">
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
            Buscar por {mode === "section" ? "Número (ej. 2704)" : "Código Postal (ej. 45400)"}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder={mode === "section" ? "Número" : "Código postal"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Buscando...</p>}
      
      {colonies.length > 0 && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Selecciona la Colonia *</label>
          <select 
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            value={colonies.find(c => c.name === selectedColony)?.id || ""}
            onChange={(e) => handleSelectColony(e.target.value)}
            required
          >
            <option value="">-- Selecciona una colonia --</option>
            {colonies.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.municipality} (CP: {c.postalCode})
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedColony && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200 animate-in fade-in">
          <MapPin size={16} />
          <span>Seleccionado: <strong>{selectedColony}</strong> en <strong>{selectedMunicipality}</strong></span>
        </div>
      )}
    </div>
  );
}
