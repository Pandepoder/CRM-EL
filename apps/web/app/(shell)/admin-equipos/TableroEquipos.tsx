"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { Check, Crown, GripVertical, Search, Trash2, Undo2, UserPlus, Users, X } from "lucide-react";

import { AvatarPersona } from "@/components/AvatarPersona";
import { MarcaMunicipio } from "@/components/MarcaMunicipio";
import type { ColumnaDelTablero, PersonaDelTablero, Tablero } from "@/lib/integrantes-equipo";

/**
 * Tablero de equipos: cada equipo que gobierna quien lo abre es una columna con la foto de su gente, y
 * a un lado las personas que puede sumar. Se arrastra con el ratón, con el dedo (manteniendo presionado)
 * o con el teclado (espacio para tomar, flechas para mover, espacio para soltar).
 *
 * Arrastrar a alguien a un equipo lo SUMA, aunque ya esté en otro (decisión del dueño, 2026-09-26): se
 * queda en los dos. Para sacarlo de un equipo se arrastra a «Quitar» o se toca su ×. Cada cambio se
 * puede deshacer. Todo pasa por la API de integrantes, que decide igual que este tablero
 * (`lib/integrantes-equipo.ts`).
 */

type Arrastre = { persona: PersonaDelTablero; desde: string | null };
type Aviso = { texto: string; tipo: "ok" | "error"; deshacer?: () => void };

const ZONA_QUITAR = "quitar";

// Primero donde está el puntero (lo natural con ratón y dedo); si no está sobre nada, lo que más se
// encima (el teclado mueve el elemento, no un puntero).
const deteccion: CollisionDetection = (args) => {
  const bajoElPuntero = pointerWithin(args);
  return bajoElPuntero.length ? bajoElPuntero : rectIntersection(args);
};

async function llamar(teamId: string, userId: string, accion: "sumar" | "quitar"): Promise<string | null> {
  try {
    const res =
      accion === "sumar"
        ? await fetch(`/api/admin/teams/${teamId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) })
        : await fetch(`/api/admin/teams/${teamId}/members?userId=${encodeURIComponent(userId)}`, { method: "DELETE" });
    if (res.ok) return null;
    const datos = (await res.json().catch(() => ({}))) as { error?: string };
    return datos.error ?? "No se pudo guardar el cambio.";
  } catch {
    return "Sin conexión: no se guardó el cambio.";
  }
}

const porNombre = (a: PersonaDelTablero, b: PersonaDelTablero) => a.nombre.localeCompare(b.nombre, "es");
const primerNombre = (nombre: string) => nombre.split(/\s+/)[0] ?? nombre;

export default function TableroEquipos({ tablero }: { tablero: Tablero }) {
  const router = useRouter();
  // Estable entre servidor y navegador: sin él, dnd-kit numera sus ids de accesibilidad con un contador
  // propio y React avisa que el HTML del servidor no coincide.
  const idDelTablero = useId();
  const [columnas, setColumnas] = useState<ColumnaDelTablero[]>(tablero.columnas);
  const [disponibles, setDisponibles] = useState<PersonaDelTablero[]>(tablero.disponibles);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [soloSinEquipo, setSoloSinEquipo] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [eligiendoPara, setEligiendoPara] = useState<PersonaDelTablero | null>(null);
  const pendientes = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lo que manda el servidor tras un cambio (router.refresh) reemplaza la copia local, salvo con un
  // cambio todavía en camino.
  useEffect(() => {
    if (pendientes.current > 0) return;
    setColumnas(tablero.columnas);
    setDisponibles(tablero.disponibles);
  }, [tablero]);

  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current); }, []);

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Con el dedo: mantener presionado un momento. Así deslizar sigue moviendo la página.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    // Teclado: espacio toma y suelta; Enter queda para elegir el equipo de una lista.
    useSensor(KeyboardSensor, { keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] } })
  );
  // Algunos navegadores disparan un clic al soltar sobre la misma ficha: no debe abrir la lista.
  const soltadoEn = useRef(0);
  const tocar = (p: PersonaDelTablero) => {
    if (Date.now() - soltadoEn.current > 350) setEligiendoPara(p);
  };

  const nombreDe = (teamId: string) => columnas.find((c) => c.id === teamId)?.nombre ?? "el equipo";
  const estaEn = (col: ColumnaDelTablero, personaId: string) => col.lider?.id === personaId || col.integrantes.some((p) => p.id === personaId);

  function avisar(a: Aviso) {
    setAviso(a);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(null), a.deshacer ? 7000 : 4500);
  }

  function aplicar(persona: PersonaDelTablero, teamId: string, accion: "sumar" | "quitar") {
    const delta = accion === "sumar" ? 1 : -1;
    setColumnas((cs) =>
      cs.map((c) =>
        c.id !== teamId
          ? c
          : {
              ...c,
              integrantes:
                accion === "sumar"
                  ? [...c.integrantes.filter((p) => p.id !== persona.id), { ...persona, equipos: persona.equipos + 1 }].sort(porNombre)
                  : c.integrantes.filter((p) => p.id !== persona.id)
            }
      )
    );
    const ajustar = (p: PersonaDelTablero) => (p.id === persona.id ? { ...p, equipos: Math.max(0, p.equipos + delta) } : p);
    setDisponibles((ds) => ds.map(ajustar));
    setColumnas((cs) => cs.map((c) => ({ ...c, integrantes: c.integrantes.map(ajustar) })));
  }

  async function cambiar(persona: PersonaDelTablero, teamId: string, accion: "sumar" | "quitar", esDeshacer = false) {
    const equipo = nombreDe(teamId);
    pendientes.current++;
    aplicar(persona, teamId, accion);
    const error = await llamar(teamId, persona.id, accion);
    pendientes.current--;
    if (error) {
      aplicar(persona, teamId, accion === "sumar" ? "quitar" : "sumar");
      avisar({ texto: error, tipo: "error" });
      return;
    }
    const actualizada = { ...persona, equipos: Math.max(0, persona.equipos + (accion === "sumar" ? 1 : -1)) };
    avisar(
      esDeshacer
        ? { texto: "Cambio deshecho.", tipo: "ok" }
        : {
            texto: accion === "sumar" ? `${persona.nombre} ahora está en ${equipo}.` : `${persona.nombre} salió de ${equipo}.`,
            tipo: "ok",
            deshacer: () => void cambiar(actualizada, teamId, accion === "sumar" ? "quitar" : "sumar", true)
          }
    );
    if (pendientes.current === 0) router.refresh();
  }

  function sumarA(persona: PersonaDelTablero, teamId: string) {
    const col = columnas.find((c) => c.id === teamId);
    if (!col) return;
    if (estaEn(col, persona.id)) {
      avisar({ texto: `${persona.nombre} ya está en ${col.nombre}.`, tipo: "ok" });
      return;
    }
    void cambiar(persona, teamId, "sumar");
  }

  function alSoltar(e: DragEndEvent) {
    setArrastre(null);
    soltadoEn.current = Date.now();
    const datos = e.active.data.current as Arrastre | undefined;
    if (!datos || !e.over) return;
    if (e.over.id === ZONA_QUITAR) {
      if (datos.desde) void cambiar(datos.persona, datos.desde, "quitar");
      return;
    }
    const destino = String(e.over.id).replace(/^col:/, "");
    if (destino === datos.desde) return;
    sumarA(datos.persona, destino);
  }

  const visibles = useMemo(() => {
    const q = busqueda.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    return disponibles.filter(
      (p) => (!soloSinEquipo || p.equipos === 0) && (!q || p.nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(q))
    );
  }, [disponibles, busqueda, soloSinEquipo]);
  const sinEquipo = disponibles.filter((p) => p.equipos === 0).length;

  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Tomaste a ${(active.data.current as Arrastre | undefined)?.persona.nombre ?? "una persona"}.`,
    onDragOver: ({ over }) => (over ? (over.id === ZONA_QUITAR ? "Sobre «Quitar del equipo»." : `Sobre ${nombreDe(String(over.id).replace(/^col:/, ""))}.`) : "Fuera de los equipos."),
    onDragEnd: ({ over }) => (over ? "Soltaste." : "Soltaste fuera: no cambió nada."),
    onDragCancel: () => "Cancelado: no cambió nada."
  };

  return (
    <DndContext
      id={idDelTablero}
      sensors={sensores}
      collisionDetection={deteccion}
      onDragStart={(e: DragStartEvent) => setArrastre((e.active.data.current as Arrastre | undefined) ?? null)}
      onDragEnd={alSoltar}
      onDragCancel={() => setArrastre(null)}
      accessibility={{
        announcements: anuncios,
        screenReaderInstructions: {
          draggable: "Para sumar a esta persona a un equipo: espacio para tomarla, flechas para moverla y espacio para soltarla sobre el equipo. Escape cancela."
        }
      }}
    >
      <p className="text-sm text-slate-500 -mt-1">
        Arrastra a una persona a un equipo para sumarla (se queda también en los que ya estaba). En el teléfono, mantén presionado y arrastra; o tócala y elige
        el equipo. Para sacar a alguien, arrástralo a «Quitar» o toca su ×.
      </p>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Personas que se pueden sumar */}
        <aside className="w-full lg:w-80 shrink-0 lg:sticky lg:top-4 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-slate-900 flex items-center gap-2">
                <Users size={17} className="text-blue-700" /> Personas
              </h2>
              <span className="text-xs font-bold text-slate-400">{visibles.length} de {disponibles.length}</span>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre"
                aria-label="Buscar personas"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={soloSinEquipo} onChange={(e) => setSoloSinEquipo(e.target.checked)} className="w-4 h-4 accent-blue-600" />
              Solo quienes no están en ningún equipo ({sinEquipo})
            </label>
          </div>
          <ul className="p-2 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto lg:max-h-[calc(100dvh-16rem)]" aria-label="Personas que puedes sumar">
            {visibles.length === 0 && <li className="p-4 text-sm text-slate-400 text-center w-full">Nadie coincide.</li>}
            {visibles.map((p) => (
              <li key={p.id} className="shrink-0 lg:shrink">
                <FichaArrastrable id={`disp:${p.id}`} persona={p} desde={null} onTocar={() => tocar(p)} variante="lista" />
              </li>
            ))}
          </ul>
        </aside>

        {/* Equipos */}
        <div className="flex-1 min-w-0 w-full grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
          {columnas.map((c) => (
            <ColumnaEquipo
              key={c.id}
              columna={c}
              arrastre={arrastre}
              yaEsta={arrastre ? estaEn(c, arrastre.persona.id) : false}
              onQuitar={(p) => void cambiar(p, c.id, "quitar")}
              onTocar={tocar}
            />
          ))}
        </div>
      </div>

      <ZonaQuitar visible={Boolean(arrastre?.desde)} equipo={arrastre?.desde ? nombreDe(arrastre.desde) : ""} />

      <DragOverlay zIndex={115} dropAnimation={null}>
        {arrastre ? (
          <div className="flex items-center gap-2.5 bg-white rounded-2xl pl-2 pr-4 py-2 shadow-[0_18px_40px_rgba(11,31,58,.28)] ring-2 ring-blue-500 rotate-[-2deg] cursor-grabbing">
            <AvatarPersona nombre={arrastre.persona.nombre} fotoUrl={arrastre.persona.foto} tamano={36} />
            <span className="font-bold text-sm text-slate-900 whitespace-nowrap">{arrastre.persona.nombre}</span>
          </div>
        ) : null}
      </DragOverlay>

      {eligiendoPara && (
        <ElegirEquipo
          persona={eligiendoPara}
          columnas={columnas}
          estaEn={estaEn}
          onElegir={(teamId) => {
            sumarA(eligiendoPara, teamId);
            setEligiendoPara(null);
          }}
          onCerrar={() => setEligiendoPara(null)}
        />
      )}

      <div aria-live="polite" className="fixed left-1/2 -translate-x-1/2 z-[1200] w-[calc(100%-2rem)] max-w-md" style={{ bottom: "calc(var(--relleno-inferior-contenido, 28px) + 12px)" }}>
        {aviso && (
          <div
            role={aviso.tipo === "error" ? "alert" : "status"}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 shadow-xl text-sm font-semibold ${aviso.tipo === "error" ? "bg-rose-600 text-white" : "bg-slate-900 text-white"}`}
          >
            {aviso.tipo === "ok" ? <Check size={16} className="shrink-0 text-emerald-300" /> : <X size={16} className="shrink-0" />}
            <span className="flex-1">{aviso.texto}</span>
            {aviso.deshacer && (
              <button
                type="button"
                onClick={() => {
                  const d = aviso.deshacer;
                  setAviso(null);
                  d?.();
                }}
                className="inline-flex items-center gap-1 font-black text-amber-300 hover:text-amber-200 min-h-[32px] px-1"
              >
                <Undo2 size={15} /> Deshacer
              </button>
            )}
          </div>
        )}
      </div>
    </DndContext>
  );
}

function FichaArrastrable({
  id,
  persona,
  desde,
  onTocar,
  onQuitar,
  variante
}: {
  id: string;
  persona: PersonaDelTablero;
  desde: string | null;
  onTocar: () => void;
  onQuitar?: () => void;
  variante: "lista" | "integrante";
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { persona, desde } satisfies Arrastre });
  const { onKeyDown: alTeclearParaArrastrar, ...escuchas } = listeners ?? {};
  return (
    <div
      ref={setNodeRef}
      className={`group flex items-center gap-2.5 rounded-2xl border bg-white transition-all touch-manipulation ${
        isDragging ? "opacity-40 border-dashed border-blue-300" : "border-slate-100 hover:border-blue-200 hover:shadow-sm"
      } ${variante === "lista" ? "p-2 w-56 lg:w-auto" : "p-2"}`}
    >
      <div
        {...escuchas}
        {...attributes}
        onClick={onTocar}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isDragging) {
            e.preventDefault();
            onTocar();
            return;
          }
          alTeclearParaArrastrar?.(e);
        }}
        aria-label={`${persona.nombre}. Espacio para arrastrar a un equipo; Enter o toque para elegir el equipo de una lista.`}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-grab active:cursor-grabbing rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <GripVertical size={14} className="text-slate-300 shrink-0 hidden sm:block" />
        <AvatarPersona nombre={persona.nombre} fotoUrl={persona.foto} tamano={36} />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-900 truncate">{persona.nombre}</span>
          <span className="block text-[11px] font-semibold text-slate-400 truncate">
            {persona.rol ?? "Sin rol"}
            {variante === "lista" && (persona.equipos === 0 ? <span className="text-amber-600"> · sin equipo</span> : ` · ${persona.equipos} ${persona.equipos === 1 ? "equipo" : "equipos"}`)}
          </span>
        </span>
      </div>
      {onQuitar && (
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar a ${persona.nombre} de este equipo`}
          title="Quitar de este equipo"
          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-600 hover:bg-rose-50 focus-visible:text-rose-600 outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function ColumnaEquipo({
  columna: c,
  arrastre,
  yaEsta,
  onQuitar,
  onTocar
}: {
  columna: ColumnaDelTablero;
  arrastre: Arrastre | null;
  yaEsta: boolean;
  onQuitar: (p: PersonaDelTablero) => void;
  onTocar: (p: PersonaDelTablero) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${c.id}` });
  // En el teléfono las columnas van una debajo de otra: con todos a la vista, llegar arrastrando al
  // tercer equipo pedía recorrer la página entera. Se ven cinco y el resto a un toque.
  const [todos, setTodos] = useState(false);
  const A_LA_VISTA = 5;
  const ocultos = Math.max(0, c.integrantes.length - A_LA_VISTA);
  const esOrigen = arrastre?.desde === c.id;
  const recibe = Boolean(arrastre) && !esOrigen && !yaEsta;
  return (
    <section
      ref={setNodeRef}
      aria-label={`Equipo ${c.nombre}`}
      className={`rounded-3xl border-2 transition-all bg-white overflow-hidden ${
        isOver && recibe ? "border-blue-500 shadow-[0_0_0_6px_rgba(40,120,199,.15)] scale-[1.01]" : isOver && yaEsta ? "border-amber-300" : recibe ? "border-dashed border-blue-200" : "border-slate-100 shadow-sm"
      }`}
    >
      <header className="px-4 py-3 bg-[linear-gradient(135deg,#0f2d52,#1f5c9b)] text-white">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-extrabold truncate">{c.nombre}</h3>
          <span className="text-[11px] font-black bg-white/15 rounded-full px-2 py-0.5 shrink-0">{c.integrantes.length + (c.lider ? 1 : 0)}</span>
        </div>
        <div className="text-[11px] text-blue-100/80 mt-0.5 flex items-center gap-1.5">
          <MarcaMunicipio nombre={c.municipio.nombre} esGeneral={c.municipio.esGeneral} />
        </div>
      </header>
      <div className="p-3 space-y-2 min-h-[120px]">
        {c.lider && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 border border-amber-100 p-2">
            <AvatarPersona nombre={c.lider.nombre} fotoUrl={c.lider.foto} tamano={36} />
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-900 truncate">{c.lider.nombre}</span>
              <span className="text-[11px] font-black text-amber-700 inline-flex items-center gap-1">
                <Crown size={12} /> Al frente
              </span>
            </span>
          </div>
        )}
        {c.integrantes.map((p, i) => (
          <div key={p.id} className={!todos && i >= A_LA_VISTA ? "max-sm:hidden" : undefined}>
            <FichaArrastrable id={`m:${c.id}:${p.id}`} persona={p} desde={c.id} onTocar={() => onTocar(p)} onQuitar={() => onQuitar(p)} variante="integrante" />
          </div>
        ))}
        {ocultos > 0 && (
          <button
            type="button"
            onClick={() => setTodos((v) => !v)}
            aria-expanded={todos}
            className="sm:hidden w-full text-xs font-black text-blue-700 bg-blue-50 rounded-xl py-2.5"
          >
            {todos ? "Ver menos" : `Ver ${ocultos} más`}
          </button>
        )}
        <div
          className={`rounded-2xl border-2 border-dashed text-xs font-bold text-center py-3 px-2 transition-colors ${
            isOver && recibe ? "border-blue-400 bg-blue-50 text-blue-700" : isOver && yaEsta ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-400"
          }`}
        >
          {isOver && yaEsta ? "Ya está en este equipo" : isOver && recibe ? "Suelta para sumar" : c.integrantes.length === 0 ? "Arrastra personas aquí" : "Arrastra aquí para sumar"}
        </div>
      </div>
    </section>
  );
}

function ZonaQuitar({ visible, equipo }: { visible: boolean; equipo: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: ZONA_QUITAR, disabled: !visible });
  return (
    <div
      ref={setNodeRef}
      aria-hidden={!visible}
      className={`fixed left-1/2 -translate-x-1/2 z-[112] w-[calc(100%-2rem)] max-w-md rounded-2xl border-2 border-dashed px-4 py-4 flex items-center justify-center gap-2 text-sm font-black transition-all ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      } ${isOver ? "bg-rose-600 border-rose-600 text-white scale-105" : "bg-rose-50 border-rose-300 text-rose-700"}`}
      style={{ bottom: "calc(var(--relleno-inferior-contenido, 28px) + 12px)" }}
    >
      <Trash2 size={17} /> Suelta aquí para quitar de {equipo}
    </div>
  );
}

function ElegirEquipo({
  persona,
  columnas,
  estaEn,
  onElegir,
  onCerrar
}: {
  persona: PersonaDelTablero;
  columnas: ColumnaDelTablero[];
  estaEn: (c: ColumnaDelTablero, personaId: string) => boolean;
  onElegir: (teamId: string) => void;
  onCerrar: () => void;
}) {
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => { if (e.key === "Escape") onCerrar(); };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onCerrar}>
      <div role="dialog" aria-modal="true" aria-label={`Sumar a ${persona.nombre} a un equipo`} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden max-h-[80dvh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-4 border-b border-slate-100">
          <AvatarPersona nombre={persona.nombre} fotoUrl={persona.foto} tamano={40} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Sumar a un equipo</p>
            <p className="font-extrabold text-slate-900 truncate">{persona.nombre}</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <ul className="p-2 overflow-y-auto">
          {columnas.map((c) => {
            const ya = estaEn(c, persona.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={ya}
                  onClick={() => onElegir(c.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-left hover:bg-blue-50 disabled:hover:bg-transparent disabled:opacity-60"
                >
                  <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">{ya ? <Check size={17} /> : <UserPlus size={17} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-sm text-slate-900 truncate">{c.nombre}</span>
                    <span className="block text-[11px] text-slate-400">{ya ? `Ya está en este equipo` : `${primerNombre(persona.nombre)} se suma; sigue en sus otros equipos`}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
