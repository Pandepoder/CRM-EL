"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, Star, UserCheck, UserRound } from "lucide-react";

import { HojaInferior } from "@/components/HojaInferior";
import { avisar } from "@/lib/avisos";
import { ROLES_ELECTORALES, type Candidato, type CandidatosParaNombrar, type FilaDeCobertura, type RolElectoral } from "@/lib/estructura-electoral";

/** El primer rol que le falta a la sección: así, en lo más común, ya viene elegido. */
function rolQueFalta(fila: FilaDeCobertura): RolElectoral {
  if (fila.conteo.coordinador === 0) return "coordinador";
  if (fila.conteo.representante_general === 0) return "representante_general";
  return "representante_casilla";
}

/**
 * Nombrar en una sección (plan de auditoría de menús, F4.2): qué hará y quién, en una sola lista, sin pestañas.
 * Si es RC, arriba los vecinos que dijeron que quieren ser representantes (D4); después su gente; y un buscador
 * para cualquiera. La casilla, opcional (D5). Todo lo que se lista ya viene recortado al alcance en el servidor.
 */
export function Nombrar({ fila, onCerrar, onNombrado }: { fila: FilaDeCobertura | null; onCerrar: () => void; onNombrado: () => void }) {
  const [rol, setRol] = useState<RolElectoral>("coordinador");
  const [texto, setTexto] = useState("");
  const [lista, setLista] = useState<CandidatosParaNombrar | null>(null);
  const [cargando, setCargando] = useState(false);
  const [elegido, setElegido] = useState<Candidato | null>(null);
  const [casilla, setCasilla] = useState("");
  const [guardando, setGuardando] = useState(false);
  const pedido = useRef(0);

  useEffect(() => {
    if (!fila) return;
    setRol(rolQueFalta(fila));
    setTexto("");
    setElegido(null);
    setCasilla("");
  }, [fila]);

  useEffect(() => {
    if (!fila) return;
    const numero = ++pedido.current;
    setCargando(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/electoral/candidatos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sectionId: fila.seccionId, role: rol, q: texto })
        });
        const d = await res.json().catch(() => null);
        if (numero !== pedido.current) return;
        if (!res.ok || !d) {
          avisar(d?.error || "No se pudo leer a quién nombrar.");
          setLista({ sugeridos: [], gente: [], ciudadanos: [] });
        } else setLista(d as CandidatosParaNombrar);
      } catch {
        if (numero === pedido.current) avisar("Sin conexión: no se pudo leer a quién nombrar.");
      } finally {
        if (numero === pedido.current) setCargando(false);
      }
    }, texto ? 300 : 0);
    return () => clearTimeout(t);
  }, [fila, rol, texto]);

  async function guardar() {
    if (!fila || !elegido) return avisar("Elige a quién vas a nombrar.");
    setGuardando(true);
    try {
      const res = await fetch("/api/electoral/representatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: fila.seccionId,
          role: rol,
          ...(elegido.tipo === "cuenta" ? { userId: elegido.id } : { contactId: elegido.id }),
          ...(rol === "representante_casilla" && casilla.trim() ? { casilla } : {})
        })
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return avisar(d.error || "No se pudo nombrar. Vuelve a intentarlo.");
      const nombreRol = ROLES_ELECTORALES.find((r) => r.clave === rol)?.corto ?? "";
      avisar(`${elegido.nombre} quedó de ${nombreRol} en la sección ${fila.numero}.`, "exito");
      onNombrado();
    } catch {
      avisar("Sin conexión: no se nombró. Revisa tu señal y vuelve a intentarlo.");
    } finally {
      setGuardando(false);
    }
  }

  const grupo = (titulo: string, icono: React.ReactNode, candidatos: Candidato[]) =>
    candidatos.length > 0 && (
      <section className="space-y-1.5">
        <h4 className="text-xs font-extrabold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
          {icono} {titulo}
        </h4>
        <ul className="space-y-1.5">
          {candidatos.map((c) => (
            <li key={`${c.tipo}-${c.id}`}>
              <button
                type="button"
                role="radio"
                aria-checked={elegido?.id === c.id}
                onClick={() => setElegido(c)}
                className={`w-full min-h-[48px] px-3 py-2 rounded-xl border-2 text-left cursor-pointer flex items-center justify-between gap-2 ${
                  elegido?.id === c.id ? "border-indigo-600 bg-indigo-50" : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-extrabold text-gray-900 truncate">{c.nombre}</span>
                  <span className="block text-xs text-gray-600 truncate">{c.detalle ?? (c.tipo === "cuenta" ? "Tu gente" : "Ciudadano")}</span>
                </span>
                {elegido?.id === c.id && <UserCheck size={18} className="text-indigo-700 shrink-0" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
      </section>
    );

  const vacio = lista && !cargando && lista.sugeridos.length + lista.gente.length + lista.ciudadanos.length === 0;

  return (
    <HojaInferior
      abierta={Boolean(fila)}
      titulo={fila ? `Nombrar en la sección ${fila.numero}` : ""}
      subtitulo={fila?.colonias.slice(0, 3).join(", ") || undefined}
      onCerrar={onCerrar}
      ocupado={guardando}
      pie={
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || !elegido}
          className="w-full min-h-[52px] rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-base font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {guardando && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
          {elegido ? `Nombrar a ${elegido.nombre.split(" ")[0]}` : "Elige a quién"}
        </button>
      }
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-extrabold text-gray-900 mb-1">¿Qué hará?</legend>
        <div className="space-y-1.5" role="radiogroup" aria-label="Qué hará">
          {ROLES_ELECTORALES.map((r) => (
            <button
              key={r.clave}
              type="button"
              role="radio"
              aria-checked={rol === r.clave}
              onClick={() => {
                setRol(r.clave);
                setElegido(null);
              }}
              className={`w-full min-h-[48px] px-3 py-2 rounded-xl border-2 text-left cursor-pointer ${rol === r.clave ? "border-indigo-600 bg-indigo-50" : "border-gray-200 bg-white"}`}
            >
              <span className="block text-sm font-extrabold text-gray-900">{r.nombre}</span>
              <span className="block text-xs text-gray-600">{r.ayuda}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {rol === "representante_casilla" && (
        <label className="block text-sm font-extrabold text-gray-900">
          Casilla (opcional)
          <input
            value={casilla}
            onChange={(e) => setCasilla(e.target.value.toUpperCase())}
            maxLength={8}
            placeholder="Ej. B, C1, E1"
            className="mt-1 w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-gray-50 text-base font-bold text-gray-900 uppercase"
          />
        </label>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-extrabold text-gray-900">¿Quién?</h3>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Busca a tu gente o a un ciudadano…"
            aria-label="Buscar a quién nombrar"
            className="w-full min-h-[48px] pl-10 pr-4 rounded-2xl border border-gray-200 bg-white text-base text-gray-900"
          />
        </div>
        {cargando && !lista ? (
          <p className="text-sm text-gray-500 flex items-center gap-2" role="status">
            <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Buscando…
          </p>
        ) : (
          <div className={`space-y-4 ${cargando ? "opacity-60" : ""}`}>
            {lista && grupo("Quieren ser representantes de casilla", <Star size={13} className="text-amber-500" aria-hidden="true" />, lista.sugeridos)}
            {lista && grupo("Tu gente", <UserRound size={13} aria-hidden="true" />, lista.gente)}
            {lista && grupo("Ciudadanos", <UserRound size={13} aria-hidden="true" />, lista.ciudadanos)}
            {vacio && (
              <p className="text-sm text-gray-600">
                {texto.trim().length >= 2 ? "Nadie con ese nombre en tu estructura." : "Escribe un nombre para buscar entre tus ciudadanos."}
              </p>
            )}
          </div>
        )}
      </section>
    </HojaInferior>
  );
}
