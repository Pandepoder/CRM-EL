"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Lock, MapPin, Save } from "lucide-react";

import { HojaInferior } from "@/components/HojaInferior";
import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { MediaUploader, type MediaFile } from "@/components/MediaUploader";
import { avisar } from "@/lib/avisos";
import type { OpcionSelector } from "@/lib/bitacora-tipos";
import { celebrar } from "@/lib/celebraciones";
import { enviarOEncolar, nuevaClave, TEXTO_DE_ESPERA } from "@/lib/cola-de-envios";
import {
  CATEGORIAS_ESCUCHA,
  LARGO_MAXIMO_DESCRIPCION_ESCUCHA,
  LARGO_MAXIMO_TITULO_ESCUCHA,
  MAXIMO_DE_FOTOS_ESCUCHA,
  pareceTelefono,
  tituloDesdeTexto,
  type ClaveDeCategoriaEscucha
} from "@/lib/escucha-social";
import { useMunicipioUsuario } from "@/lib/municipio-contexto";

import { buscarContactos } from "../equipo/componentes/buscadores";
import { SelectorBuscable } from "../equipo/componentes/SelectorBuscable";

const EMOJI: Record<ClaveDeCategoriaEscucha, string> = { propuesta: "💡", problematica: "⚠️", compromiso: "🤝", seguimiento: "🔁", gestion: "🏛️" };

/**
 * Anotar lo que pide o propone un vecino (plan de auditoría de menús, F3.1): primero quién lo pide —para que
 * quede en su ficha y nadie le pregunte dos veces—, luego qué es y una frase. Dónde y fotos, si se quiere. Sin
 * señal se guarda en el teléfono y se envía solo (`cola-de-envios.ts`, tipo `escucha`).
 */
export function FormularioPeticion({
  abierto,
  vecinoInicial,
  usuarioId,
  onCerrar,
  onGuardada
}: {
  abierto: boolean;
  vecinoInicial: { id: string; nombre: string } | null;
  usuarioId: string;
  onCerrar: () => void;
  onGuardada: () => void;
}) {
  const municipio = useMunicipioUsuario();
  const [vecino, setVecino] = useState<OpcionSelector[]>([]);
  const [delBarrio, setDelBarrio] = useState(false);
  const [categoria, setCategoria] = useState<ClaveDeCategoriaEscucha | "">("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [conLugar, setConLugar] = useState(false);
  const [lugar, setLugar] = useState<LocationValue>({ latitude: null, longitude: null });
  const [conFotos, setConFotos] = useState(false);
  const [fotos, setFotos] = useState<MediaFile[]>([]);
  const [clave, setClave] = useState(() => nuevaClave());
  const [guardando, setGuardando] = useState(false);
  const [problema, setProblema] = useState<{ campo: string; mensaje: string } | null>(null);
  const cajaVecino = useRef<HTMLDivElement | null>(null);
  const cajaTexto = useRef<HTMLTextAreaElement | null>(null);

  // Cada paso deja el cursor en el siguiente, para que en la calle alcancen 5 toques (§7.2): sin vecino elegido,
  // el buscador; al elegir el tipo, el texto.
  useEffect(() => {
    if (!abierto) return;
    setVecino(vecinoInicial ? [{ id: vecinoInicial.id, nombre: vecinoInicial.nombre }] : []);
    setDelBarrio(false);
    if (vecinoInicial) return;
    const t = setTimeout(() => cajaVecino.current?.querySelector("input")?.focus(), 300);
    return () => clearTimeout(t);
  }, [abierto, vecinoInicial]);

  const elegirCategoria = (clave: ClaveDeCategoriaEscucha) => {
    setCategoria(clave);
    // Dentro del mismo toque: así el teléfono abre el teclado (iOS no lo abre si el foco llega después).
    if (!descripcion.trim()) cajaTexto.current?.focus();
  };

  const limpiar = () => {
    setCategoria("");
    setTitulo("");
    setDescripcion("");
    setConLugar(false);
    setLugar({ latitude: null, longitude: null });
    setConFotos(false);
    setFotos([]);
    setProblema(null);
    setClave(nuevaClave());
  };

  const cerrar = () => {
    if (guardando) return;
    if ((descripcion.trim() || fotos.length) && !window.confirm("¿Cerrar sin guardar? Lo que escribiste se perderá.")) return;
    limpiar();
    onCerrar();
  };

  async function guardar() {
    setProblema(null);
    if (vecino.length === 0 && !delBarrio) return setProblema({ campo: "vecino", mensaje: "Busca al vecino que lo pide, o marca «Es una petición del barrio»." });
    if (!categoria) return setProblema({ campo: "categoria", mensaje: "Toca qué es." });
    if (!descripcion.trim()) return setProblema({ campo: "descripcion", mensaje: "Cuenta qué te pidieron." });
    // El texto no va cifrado: un teléfono va en la ficha del vecino, no aquí (§5.2).
    if (pareceTelefono(`${titulo} ${descripcion}`) && !window.confirm("Parece que escribiste un teléfono. Los teléfonos van en la ficha del vecino, no aquí. ¿Guardar así de todos modos?")) return;

    setGuardando(true);
    const r = await enviarOEncolar({
      clave,
      tipo: "escucha",
      url: "/api/escucha-social",
      cuerpo: {
        clientRequestId: clave,
        title: titulo.trim(),
        description: descripcion.trim(),
        categories: [categoria],
        contactId: delBarrio ? null : vecino[0]?.id ?? null,
        locationText: conLugar ? lugar.address || lugar.locationText || "" : "",
        latitude: conLugar ? lugar.latitude ?? null : null,
        longitude: conLugar ? lugar.longitude ?? null : null,
        photoUrls: fotos.map((f) => f.url)
      },
      descripcion: `Petición: ${titulo.trim() || tituloDesdeTexto(descripcion)}`,
      usuarioId
    });
    setGuardando(false);
    if (r.estado === "rechazado") return setProblema({ campo: r.campo ?? "", mensaje: r.error });
    if (r.estado === "sin-cola") return avisar(r.error);
    if (r.estado === "enviado") {
      celebrar({ tipo: "otro", titulo: "Petición anotada" });
      avisar("Petición anotada.", "exito");
    } else {
      avisar(TEXTO_DE_ESPERA[r.motivo], "info");
    }
    limpiar();
    onGuardada();
  }

  // El campo que falla, se llame como lo llama el formulario o como lo llama la API.
  const borde = (...campos: string[]) => (problema && campos.includes(problema.campo) ? "border-rose-400 ring-2 ring-rose-100" : "border-gray-200");

  return (
    <HojaInferior
      abierta={abierto}
      titulo="Anotar una petición"
      subtitulo="Lo que te pide o propone un vecino"
      onCerrar={cerrar}
      ocupado={guardando}
      pie={
        <div className="space-y-2">
          {problema && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-bold text-rose-800">{problema.mensaje}</p>}
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="w-full min-h-[52px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-base font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {guardando ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Save size={18} aria-hidden="true" />}
            {guardando ? "Guardando…" : "Guardar petición"}
          </button>
        </div>
      }
    >
      <section className="space-y-2">
        <h3 className="text-sm font-extrabold text-gray-900">1. ¿Quién lo pide?</h3>
        {!delBarrio && (
          <div ref={cajaVecino} className={`rounded-xl ${problema?.campo === "vecino" || problema?.campo === "contactId" ? "ring-2 ring-rose-200" : ""}`}>
            <SelectorBuscable etiqueta="Vecino" valor={vecino} onCambiar={setVecino} buscar={buscarContactos} placeholder="Busca por nombre…" ayuda="Así queda en su ficha, en «Lo que ha pedido»." />
          </div>
        )}
        <label className="flex items-center gap-2 min-h-[44px] text-sm font-semibold text-gray-800 cursor-pointer">
          <input
            type="checkbox"
            checked={delBarrio}
            onChange={(e) => {
              setDelBarrio(e.target.checked);
              if (e.target.checked) setVecino([]);
            }}
            className="w-5 h-5"
          />
          Es una petición del barrio, no de una persona
        </label>
      </section>

      <fieldset className="space-y-2">
        <legend className="text-sm font-extrabold text-gray-900 mb-1">2. ¿Qué es?</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Qué es">
          {CATEGORIAS_ESCUCHA.map((c) => (
            <button
              key={c.clave}
              type="button"
              role="radio"
              aria-checked={categoria === c.clave}
              onClick={() => elegirCategoria(c.clave)}
              title={c.ayuda}
              className={`min-h-[48px] px-3 rounded-2xl border-2 text-left text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer ${
                categoria === c.clave ? "border-blue-600 bg-blue-50 text-blue-950" : `bg-white text-gray-800 ${problema?.campo === "categoria" || problema?.campo === "categories" ? "border-rose-300" : "border-gray-200"}`
              }`}
            >
              <span className="text-lg leading-none" aria-hidden="true">{EMOJI[c.clave]}</span>
              <span className="leading-tight">{c.nombre}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="peticion-texto" className="block text-sm font-extrabold text-gray-900">3. ¿Qué te pidieron?</label>
        <textarea
          id="peticion-texto"
          ref={cajaTexto}
          rows={3}
          value={descripcion}
          maxLength={LARGO_MAXIMO_DESCRIPCION_ESCUCHA}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej. Piden un taller de oficios para los jóvenes de la colonia…"
          className={`w-full p-3 rounded-xl border bg-gray-50 text-base text-gray-900 resize-none ${borde("descripcion", "description")}`}
        />
        <p className="text-xs font-semibold text-gray-600 flex items-start gap-1.5">
          <Lock size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> No escribas teléfonos ni domicilios: liga al vecino y quedan en su ficha.
        </p>
        <label htmlFor="peticion-titulo" className="block text-xs font-bold text-gray-700 pt-1">
          En una frase (opcional)
          <input
            id="peticion-titulo"
            value={titulo}
            maxLength={LARGO_MAXIMO_TITULO_ESCUCHA}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={descripcion.trim() ? tituloDesdeTexto(descripcion) : "Si la dejas vacía, se toma del texto"}
            className={`mt-1 w-full min-h-[44px] px-3 rounded-xl border bg-gray-50 text-base font-semibold text-gray-900 ${borde("titulo", "title")}`}
          />
        </label>
      </div>

      {conLugar ? (
        <LocationPicker label="4. ¿Dónde? (opcional)" helperText="Usa tu GPS, busca la calle o toca el mapa." defaultMunicipality={municipio || undefined} value={lugar} onChange={setLugar} />
      ) : (
        <button type="button" onClick={() => setConLugar(true)} className="min-h-[44px] px-3 rounded-xl border border-dashed border-gray-300 text-sm font-bold text-gray-700 inline-flex items-center gap-2 cursor-pointer hover:bg-gray-50 mr-2">
          <MapPin size={16} aria-hidden="true" /> Agregar dónde (opcional)
        </button>
      )}
      {conFotos ? (
        <MediaUploader value={fotos} onChange={setFotos} maxFiles={MAXIMO_DE_FOTOS_ESCUCHA} soloImagenes label="Fotos (opcional)" helperText={`Hasta ${MAXIMO_DE_FOTOS_ESCUCHA} fotos`} />
      ) : (
        <button type="button" onClick={() => setConFotos(true)} className="min-h-[44px] px-3 rounded-xl border border-dashed border-gray-300 text-sm font-bold text-gray-700 inline-flex items-center gap-2 cursor-pointer hover:bg-gray-50">
          <Camera size={16} aria-hidden="true" /> Agregar foto (opcional)
        </button>
      )}
    </HojaInferior>
  );
}
