"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, UserCheck } from "lucide-react";

import { HojaInferior } from "@/components/HojaInferior";
import { avisar } from "@/lib/avisos";
import { normalizar, type TipoDeMovimiento } from "@/lib/logistica-tipos";

import { registerMovementAction } from "./actions";

/** Qué se va a mover: el artículo ya viene elegido desde su tarjeta (F5.1) o desde «Entregado a personas». */
export type Movimiento = {
  tipo: TipoDeMovimiento;
  articuloId: string;
  articulo: string;
  existencias: number;
  /** En una devolución, la persona que regresa y cuánto tiene. */
  persona?: { id: string; nombre: string; tiene: number };
};

const TITULO: Record<TipoDeMovimiento, string> = { out: "Entregar", in: "Resurtir", devolucion: "Registrar devolución" };

/**
 * Entregar, resurtir o recibir una devolución (plan de auditoría de menús, F5.1 y F5.3). Antes era un solo
 * formulario donde había que volver a buscar el artículo que ya se estaba viendo. La cantidad trae el cursor; al
 * entregar, la persona se toca de la lista de tu estructura; al devolver, ya viene elegida y no se puede regresar
 * más de lo que tiene.
 */
export function MovimientoHoja({
  movimiento,
  personas,
  onCerrar,
  onHecho
}: {
  movimiento: Movimiento | null;
  personas: Array<{ id: string; nombre: string }>;
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const [cantidad, setCantidad] = useState("");
  const [persona, setPersona] = useState<{ id: string; nombre: string } | null>(null);
  const [buscar, setBuscar] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);

  useEffect(() => {
    setCantidad("");
    setPersona(movimiento?.persona ? { id: movimiento.persona.id, nombre: movimiento.persona.nombre } : null);
    setBuscar("");
    setNotas("");
    setProblema(null);
  }, [movimiento]);

  const lista = useMemo(() => {
    const t = normalizar(buscar);
    return (t ? personas.filter((p) => normalizar(p.nombre).includes(t)) : personas).slice(0, 30);
  }, [personas, buscar]);

  if (!movimiento) return <HojaInferior abierta={false} titulo="" onCerrar={onCerrar}>{null}</HojaInferior>;
  const tope = movimiento.tipo === "out" ? movimiento.existencias : movimiento.tipo === "devolucion" ? (movimiento.persona?.tiene ?? 0) : null;

  async function guardar() {
    if (!movimiento) return;
    setProblema(null);
    const n = Number(cantidad);
    if (!Number.isInteger(n) || n < 1) return setProblema("Escribe cuántas piezas, un número entero.");
    if (tope !== null && n > tope) return setProblema(movimiento.tipo === "out" ? `Solo hay ${tope} en el almacén.` : `Esa persona tiene ${tope}.`);
    if (movimiento.tipo === "devolucion" && !persona) return setProblema("Elige quién regresa el material.");
    const datos = new FormData();
    datos.set("itemId", movimiento.articuloId);
    datos.set("type", movimiento.tipo);
    datos.set("quantity", String(n));
    datos.set("assignedToUserId", persona?.id ?? "");
    datos.set("notes", notas);
    setGuardando(true);
    try {
      const r = await registerMovementAction(datos);
      if (!r.ok) return setProblema(r.error);
      avisar(
        movimiento.tipo === "out"
          ? `${n} ${movimiento.articulo}${persona ? ` para ${persona.nombre}` : ""}. ${r.mensaje ?? ""}`
          : movimiento.tipo === "devolucion"
            ? `${persona?.nombre ?? "Alguien"} regresó ${n}. ${r.mensaje ?? ""}`
            : `Resurtido: ${r.mensaje ?? ""}`,
        "exito"
      );
      onHecho();
    } catch {
      setProblema("Sin conexión: no se guardó. Revisa tu señal y vuelve a intentarlo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <HojaInferior
      abierta
      titulo={`${TITULO[movimiento.tipo]}: ${movimiento.articulo}`}
      subtitulo={movimiento.tipo === "devolucion" ? `${movimiento.persona?.nombre ?? ""} tiene ${tope}` : `${movimiento.existencias.toLocaleString("es-MX")} en el almacén`}
      onCerrar={onCerrar}
      ocupado={guardando}
      pie={
        <div className="space-y-2">
          {problema && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-bold text-rose-800">{problema}</p>}
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="w-full min-h-[52px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-base font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {guardando && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
            {movimiento.tipo === "out" ? (persona ? `Entregar a ${persona.nombre.split(" ")[0]}` : "Entregar") : movimiento.tipo === "devolucion" ? "Guardar devolución" : "Guardar resurtido"}
          </button>
        </div>
      }
    >
      <label className="block text-sm font-extrabold text-gray-900">
        ¿Cuántas piezas?
        <input
          autoFocus
          inputMode="numeric"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ""))}
          placeholder={tope !== null ? `Hasta ${tope.toLocaleString("es-MX")}` : "Ej. 100"}
          className="mt-1 w-full min-h-[52px] px-3 rounded-xl border border-gray-200 bg-gray-50 text-2xl font-black text-gray-900"
        />
      </label>

      {movimiento.tipo === "out" && (
        <section className="space-y-2">
          <h3 className="text-sm font-extrabold text-gray-900">¿A quién? <span className="font-semibold text-gray-500">(opcional)</span></h3>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Busca a alguien de tu estructura…"
              aria-label="Buscar a quién entregar"
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-base text-gray-900 [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
          <ul className="space-y-1.5 max-h-56 overflow-y-auto overscroll-contain" role="radiogroup" aria-label="A quién">
            {lista.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={persona?.id === p.id}
                  onClick={() => setPersona(persona?.id === p.id ? null : p)}
                  className={`w-full min-h-[44px] px-3 rounded-xl border-2 text-left text-sm font-bold flex items-center justify-between cursor-pointer ${persona?.id === p.id ? "border-blue-600 bg-blue-50 text-blue-950" : "border-gray-200 bg-white text-gray-800"}`}
                >
                  {p.nombre}
                  {persona?.id === p.id && <UserCheck size={16} className="text-blue-700" aria-hidden="true" />}
                </button>
              </li>
            ))}
            {lista.length === 0 && <li className="text-sm text-gray-600">Nadie con ese nombre en tu estructura.</li>}
          </ul>
        </section>
      )}

      <label className="block text-sm font-extrabold text-gray-900">
        Notas <span className="font-semibold text-gray-500">(opcional)</span>
        <textarea
          rows={2}
          maxLength={500}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder={movimiento.tipo === "in" ? "Ej. Llegó el pedido de la imprenta" : "Ej. Para el evento del sábado"}
          className="mt-1 w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-base text-gray-900 resize-none"
        />
      </label>
    </HojaInferior>
  );
}
