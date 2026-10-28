"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";

import { HojaInferior } from "@/components/HojaInferior";
import { avisar } from "@/lib/avisos";
import { esRolElectoral, nombreDeRol, ROLES_ELECTORALES, type FilaDeCobertura, type Nombrado, type RolElectoral } from "@/lib/estructura-electoral";

async function pedir(url: string, method: string, cuerpo?: unknown): Promise<boolean> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      avisar(d.error || d.message || "No se pudo guardar. Vuelve a intentarlo.");
      return false;
    }
    return true;
  } catch {
    avisar("Sin conexión: no se guardó. Revisa tu señal y vuelve a intentarlo.");
    return false;
  }
}

/** Una persona nombrada, con cambiar y quitar si le toca a quien mira. */
function Persona({ n, ocupado, onCambio, setOcupado }: { n: Nombrado; ocupado: boolean; onCambio: () => void; setOcupado: (v: boolean) => void }) {
  const [editando, setEditando] = useState(false);
  const [rol, setRol] = useState<RolElectoral>(esRolElectoral(n.rol) ? n.rol : "coordinador");
  const [casilla, setCasilla] = useState(n.casilla ?? "");

  async function guardar() {
    setOcupado(true);
    const ok = await pedir(`/api/electoral/representatives/${n.id}`, "PATCH", { role: rol, ...(rol === "representante_casilla" ? { casilla } : {}) });
    setOcupado(false);
    if (ok) {
      avisar("Cambio guardado.", "exito");
      setEditando(false);
      onCambio();
    }
  }

  async function quitar() {
    if (!window.confirm(`¿Quitar a ${n.nombre} de ${nombreDeRol(n.rol).toLowerCase()}? Queda anotado quién hizo el cambio.`)) return;
    setOcupado(true);
    const ok = await pedir(`/api/electoral/representatives/${n.id}`, "DELETE");
    setOcupado(false);
    if (ok) {
      avisar(`${n.nombre} ya no está en la sección.`, "exito");
      onCambio();
    }
  }

  const enlace = n.tipo === "ciudadano" ? `/crm/contacts/${n.personaId}` : `/perfil/${n.personaId}`;
  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-3 space-y-2">
      <div className="space-y-2">
        <div className="min-w-0">
          <Link href={enlace} className="block text-sm font-extrabold text-blue-800 underline">{n.nombre}</Link>
          <p className="text-xs text-gray-600">
            {nombreDeRol(n.rol)}
            {n.casilla ? ` · casilla ${n.casilla}` : ""} · {n.tipo === "ciudadano" ? "ciudadano" : "del equipo"}
          </p>
        </div>
        {n.puedeCambiar && !editando && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditando(true)} disabled={ocupado} className="min-h-[40px] px-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 cursor-pointer disabled:opacity-50">
              Cambiar
            </button>
            <button type="button" onClick={quitar} disabled={ocupado} aria-label={`Quitar a ${n.nombre}`} className="min-h-[40px] px-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-800 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1">
              <Trash2 size={13} aria-hidden="true" /> Quitar
            </button>
          </div>
        )}
      </div>
      {!n.puedeCambiar && <p className="text-xs font-semibold text-gray-500">Solo consulta: lo nombró otra estructura.</p>}
      {editando && (
        <div className="space-y-2 pt-1 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Qué hará">
            {ROLES_ELECTORALES.map((r) => (
              <button
                key={r.clave}
                type="button"
                role="radio"
                aria-checked={rol === r.clave}
                onClick={() => setRol(r.clave)}
                className={`min-h-[44px] rounded-xl text-xs font-extrabold cursor-pointer ${rol === r.clave ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-800"}`}
              >
                {r.corto}
              </button>
            ))}
          </div>
          {rol === "representante_casilla" && (
            <input
              value={casilla}
              onChange={(e) => setCasilla(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="Casilla (opcional): B, C1…"
              aria-label="Casilla"
              className="w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-gray-50 text-base font-bold text-gray-900 uppercase"
            />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditando(false)} className="flex-1 min-h-[44px] rounded-xl border border-gray-200 text-sm font-bold text-gray-800 cursor-pointer">
              Cancelar
            </button>
            <button type="button" onClick={guardar} disabled={ocupado} className="flex-1 min-h-[44px] rounded-xl bg-indigo-600 text-white text-sm font-extrabold cursor-pointer disabled:opacity-50">
              Guardar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Una sección (plan de auditoría de menús, F4.2 y F4.3): sus colonias —con «Agregar una colonia», los mismos
 * permisos de siempre— y quién la cubre, con cambiar y quitar si le toca a quien mira.
 */
export function DetalleSeccion({
  fila,
  municipio,
  onCerrar,
  onCambio,
  onNombrar
}: {
  fila: FilaDeCobertura | null;
  municipio: string | null;
  onCerrar: () => void;
  onCambio: () => void;
  onNombrar: (fila: FilaDeCobertura) => void;
}) {
  const [ocupado, setOcupado] = useState(false);
  const [colonia, setColonia] = useState("");
  const [agregando, setAgregando] = useState(false);

  useEffect(() => {
    setColonia("");
    setAgregando(false);
  }, [fila?.seccionId]);

  async function agregarColonia() {
    if (!fila || !municipio || colonia.trim().length < 2) return avisar("Escribe el nombre de la colonia.");
    setOcupado(true);
    const ok = await pedir("/api/electoral/sections", "POST", { sectionNum: fila.numero, municipality: municipio, colony: colonia.trim() });
    setOcupado(false);
    if (ok) {
      avisar(`«${colonia.trim()}» quedó en la sección ${fila.numero}.`, "exito");
      setColonia("");
      setAgregando(false);
      onCambio();
    }
  }

  return (
    <HojaInferior abierta={Boolean(fila)} titulo={fila ? `Sección ${fila.numero}` : ""} subtitulo={municipio ?? undefined} onCerrar={onCerrar} ocupado={ocupado}>
      {fila && (
        <>
          <section className="space-y-2">
            <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
              <MapPin size={15} className="text-gray-500" aria-hidden="true" /> Colonias
            </h3>
            <p className="text-sm text-gray-700">{fila.colonias.length ? fila.colonias.join(", ") : "Todavía no tiene colonias anotadas."}</p>
            {agregando ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={colonia}
                  onChange={(e) => setColonia(e.target.value)}
                  placeholder="Nombre de la colonia"
                  aria-label="Nombre de la colonia"
                  className="flex-1 min-w-0 min-h-[44px] px-3 rounded-xl border border-gray-200 bg-gray-50 text-base text-gray-900"
                />
                <button type="button" onClick={agregarColonia} disabled={ocupado} className="min-h-[44px] px-4 rounded-xl bg-indigo-600 text-white text-sm font-extrabold cursor-pointer disabled:opacity-50">
                  {ocupado ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : "Agregar"}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setAgregando(true)} className="min-h-[40px] px-3 rounded-xl border border-dashed border-gray-300 text-sm font-bold text-gray-700 inline-flex items-center gap-1.5 cursor-pointer">
                <Plus size={14} aria-hidden="true" /> Agregar una colonia
              </button>
            )}
          </section>

          <section className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold text-gray-900">Quién la cubre</h3>
              <button type="button" onClick={() => onNombrar(fila)} className="min-h-[40px] px-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-extrabold text-indigo-900 inline-flex items-center gap-1 cursor-pointer">
                <Plus size={14} aria-hidden="true" /> Nombrar
              </button>
            </div>
            {fila.nombrados.length === 0 ? (
              <p className="text-sm text-gray-600">Nadie nombrado todavía.</p>
            ) : (
              <ul className="space-y-2">
                {fila.nombrados.map((n) => (
                  <Persona key={`${n.id}-${n.rol}-${n.casilla ?? ""}`} n={n} ocupado={ocupado} setOcupado={setOcupado} onCambio={onCambio} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </HojaInferior>
  );
}
