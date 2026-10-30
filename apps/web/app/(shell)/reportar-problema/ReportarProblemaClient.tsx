"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, LifeBuoy, Loader2, Send } from "lucide-react";

import { MediaUploader, type MediaFile } from "@/components/MediaUploader";
import { avisar } from "@/lib/avisos";
import { enviarOEncolar, TEXTO_DE_ESPERA } from "@/lib/cola-de-envios";
import {
  ESTADOS_DE_PROBLEMA,
  LARGO_MAXIMO_DESCRIPCION,
  leerContextoDelReporte,
  leerUltimaPantalla,
  lugarDesdeRuta,
  TIPOS_DE_PROBLEMA,
  type LugarParaReportar,
  type TipoDeProblema
} from "@/lib/problemas";
import type { ReporteParaQuienReporta } from "@/lib/problemas-servicio";
import { agregarFrase } from "@/lib/resultados-rapidos";
import { useUsuarioActualId } from "@/lib/usuario-contexto";

/**
 * El formulario cabe en una pantalla de teléfono, con «Enviar» a la vista, y se llena en tres o cuatro
 * toques: dónde (ya elegido: la pantalla del aviso de error o la última donde estuvo la persona), qué pasó
 * (cuatro botones) y una frase rápida. La captura es un botón chico que se abre si se quiere. Lo técnico —la
 * pantalla, el teléfono, si había señal— se manda solo. Sin señal, se guarda en el teléfono y se envía
 * después, como un alta.
 */

const nuevaClave = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function fecha(iso: string) {
  return new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
}

export default function ReportarProblemaClient({
  lugares,
  desde,
  reportes
}: Readonly<{ lugares: LugarParaReportar[]; desde: string | null; reportes: ReporteParaQuienReporta[] }>) {
  const router = useRouter();
  const usuarioId = useUsuarioActualId();
  const [lugar, setLugar] = useState<string>(() => lugarDesdeRuta(desde, lugares) ?? "");
  const [lugarSugerido, setLugarSugerido] = useState(false);
  const [tipo, setTipo] = useState<TipoDeProblema | "">("");
  const [descripcion, setDescripcion] = useState("");
  const [conCaptura, setConCaptura] = useState(false);
  const [foto, setFoto] = useState<MediaFile[]>([]);
  const [errorDelAviso, setErrorDelAviso] = useState<string | null>(null);
  const [rutaDeOrigen, setRutaDeOrigen] = useState<string | null>(desde);
  const [clave, setClave] = useState(nuevaClave);
  const [enviando, setEnviando] = useState(false);
  const [problemaCampo, setProblemaCampo] = useState<{ campo: string; mensaje: string } | null>(null);
  const [listo, setListo] = useState<{ enviado: boolean; texto: string } | null>(null);
  // Las respuestas que eran nuevas al abrir: se siguen marcando aunque ya queden vistas.
  const [nuevas] = useState(() => new Set(reportes.filter((r) => r.nuevaRespuesta).map((r) => r.id)));

  useEffect(() => {
    // Desde un aviso de error o «No pudimos cargar esta pantalla»: lo que decía y dónde.
    const contexto = leerContextoDelReporte();
    if (contexto) {
      setErrorDelAviso(contexto.error);
      setRutaDeOrigen(contexto.ruta);
      setLugar((actual) => actual || lugarDesdeRuta(contexto.ruta, lugares) || "");
      setTipo((actual) => actual || "falla");
      return;
    }
    // Desde el menú: la pantalla donde estaba justo antes.
    if (!desde) {
      const ultima = leerUltimaPantalla();
      const sugerido = lugarDesdeRuta(ultima, lugares);
      if (sugerido) {
        setLugar((actual) => actual || sugerido);
        setLugarSugerido(true);
        setRutaDeOrigen(ultima);
      }
    }
  }, [desde, lugares]);

  // Abrir «Mis reportes» es ver las respuestas: se quita el número del menú.
  useEffect(() => {
    if (nuevas.size === 0) return;
    void fetch("/api/problemas/vistos", { method: "POST" })
      .then((r) => (r.ok ? router.refresh() : undefined))
      .catch(() => undefined);
  }, [nuevas, router]);

  const tipoElegido = TIPOS_DE_PROBLEMA.find((t) => t.clave === tipo);
  const pantallas = useMemo(() => lugares.filter((l) => l.grupo === "pantalla"), [lugares]);
  const funciones = useMemo(() => lugares.filter((l) => l.grupo === "funcion"), [lugares]);
  const etiquetaDelLugar = lugares.find((l) => l.clave === lugar)?.etiqueta;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setProblemaCampo(null);
    if (!lugar) return setProblemaCampo({ campo: "lugar", mensaje: "Elige de la lista dónde pasó." });
    if (!tipo) return setProblemaCampo({ campo: "tipo", mensaje: "Toca qué pasó." });
    if (descripcion.trim().length < 3) return setProblemaCampo({ campo: "descripcion", mensaje: "Cuéntanos en pocas palabras qué pasó: toca una frase de abajo o escribe." });

    setEnviando(true);
    const r = await enviarOEncolar({
      clave,
      tipo: "problema",
      url: "/api/problemas",
      cuerpo: {
        lugar,
        tipo,
        descripcion: descripcion.trim(),
        foto: foto[0]?.url ?? null,
        ruta: rutaDeOrigen,
        error: errorDelAviso,
        clientRequestId: clave,
        dispositivo: {
          navegador: navigator.userAgent,
          pantalla: `${window.innerWidth}x${window.innerHeight}`,
          enLinea: navigator.onLine,
          idioma: navigator.language
        }
      },
      descripcion: `Reporte: ${etiquetaDelLugar ?? "Otra cosa"}`,
      usuarioId
    });
    setEnviando(false);

    if (r.estado === "rechazado") {
      setProblemaCampo({ campo: r.campo ?? "", mensaje: r.error });
      return;
    }
    if (r.estado === "sin-cola") {
      avisar(r.error);
      return;
    }
    setListo(
      r.estado === "enviado"
        ? { enviado: true, texto: "Lo vas a ver abajo, en «Mis reportes», con su respuesta cuando la haya." }
        : { enviado: false, texto: TEXTO_DE_ESPERA[r.motivo] }
    );
    setTipo("");
    setDescripcion("");
    setFoto([]);
    setConCaptura(false);
    setErrorDelAviso(null);
    setLugarSugerido(false);
    setClave(nuevaClave());
    if (r.estado === "enviado") router.refresh();
  }

  const misReportes = (
    <section id="mis-reportes" aria-labelledby="mis-reportes-titulo" className="space-y-2 scroll-mt-24">
      <h2 id="mis-reportes-titulo" className="text-lg font-black text-slate-900">
        {nuevas.size > 0 ? (nuevas.size === 1 ? "Te respondieron" : `Te respondieron ${nuevas.size} reportes`) : "Mis reportes"}
      </h2>
      {reportes.length === 0 ? (
        <p className="text-sm text-slate-600">Todavía no has reportado nada. Cuando lo hagas, aquí verás en qué va.</p>
      ) : (
        <ul className="space-y-2">
          {reportes.map((r) => {
            const t = TIPOS_DE_PROBLEMA.find((x) => x.clave === r.tipo);
            const estado = ESTADOS_DE_PROBLEMA[r.estado];
            const esNueva = nuevas.has(r.id);
            return (
              <li key={r.id} className={`rounded-2xl border bg-white p-3.5 space-y-1.5 ${esNueva ? "border-emerald-300 ring-2 ring-emerald-100" : "border-gray-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-extrabold text-gray-900 min-w-0">
                    <span aria-hidden="true">{t?.emoji}</span> {r.lugar}
                  </p>
                  <span className={`shrink-0 text-xs font-extrabold px-2 py-0.5 rounded-full border ${estado.estilo}`}>{estado.paraQuienReporta}</span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-3">{r.descripcion}</p>
                {r.respuesta && (
                  <p className="text-sm rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-emerald-950">
                    {esNueva && <span className="mr-1.5 text-[11px] font-black uppercase tracking-wide text-emerald-700">Nueva</span>}
                    <strong>Respuesta:</strong> {r.respuesta}
                  </p>
                )}
                {!r.respuesta && esNueva && <p className="text-xs font-extrabold text-emerald-700">Cambió de estado</p>}
                <p className="text-xs font-semibold text-gray-500">{fecha(r.creado)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const claseCampo = (campo: string) =>
    problemaCampo?.campo === campo ? "border-rose-400 ring-2 ring-rose-100" : "border-gray-200";

  return (
    <div className="max-w-2xl mx-auto px-4 pt-3 pb-4 md:p-6 space-y-4">
      {/* En el teléfono el nombre ya está arriba, en el encabezado: aquí solo lo que hace falta. */}
      <header className="space-y-1">
        <h1 className="hidden md:flex text-3xl font-black text-slate-900 tracking-tight items-center gap-2">
          <LifeBuoy className="text-blue-600 shrink-0" size={28} aria-hidden="true" /> Reportar un problema
        </h1>
        {/* Quien viene de un aviso de error ya sabe para qué está aquí: en el teléfono, más espacio al formulario. */}
        <p className={`text-sm text-slate-600 ${errorDelAviso ? "hidden md:block" : ""}`}>¿Algo falla o no se entiende? Cuéntanos y te respondemos aquí abajo.</p>
      </header>

      {/* Quien llega por «Ver respuesta» viene a leerla: con respuestas nuevas, sus reportes van primero. */}
      {nuevas.size > 0 && misReportes}

      {listo && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={22} aria-hidden="true" />
          <div className="space-y-2">
            <p className="font-extrabold text-emerald-950">{listo.enviado ? "¡Gracias! Recibimos tu reporte." : "Tu reporte está a salvo."}</p>
            <p className="text-sm font-semibold text-emerald-900">{listo.texto}</p>
            <button type="button" onClick={() => setListo(null)} className="min-h-[40px] px-3 rounded-xl bg-white border border-emerald-200 text-sm font-bold text-emerald-800 cursor-pointer">
              Reportar otra cosa
            </button>
          </div>
        </div>
      )}

      {!listo && (
        <form onSubmit={enviar} className="rounded-3xl border border-gray-200 bg-white p-4 md:p-5 space-y-4 shadow-sm" noValidate>
          {errorDelAviso && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[13px] leading-snug text-amber-950 line-clamp-2" title={errorDelAviso}>
              <strong>Te salió:</strong> «{errorDelAviso}»
            </p>
          )}

          <div>
            <label htmlFor="reporte-lugar" className="block text-sm font-extrabold text-gray-900 mb-1">1. ¿Dónde pasó?</label>
            <select
              id="reporte-lugar"
              value={lugar}
              onChange={(e) => {
                setLugar(e.target.value);
                setLugarSugerido(false);
              }}
              aria-invalid={problemaCampo?.campo === "lugar"}
              aria-describedby={lugarSugerido ? "reporte-lugar-ayuda" : undefined}
              className={`w-full min-h-[48px] px-3 rounded-xl border bg-gray-50 text-base font-semibold text-gray-900 ${claseCampo("lugar")}`}
            >
              <option value="">Elige la pantalla o la función…</option>
              <optgroup label="Pantallas del menú">
                {pantallas.map((l) => <option key={l.clave} value={l.clave}>{l.etiqueta}</option>)}
              </optgroup>
              <optgroup label="Otras funciones">
                {funciones.map((l) => <option key={l.clave} value={l.clave}>{l.etiqueta}</option>)}
              </optgroup>
            </select>
            {lugarSugerido && (
              <p id="reporte-lugar-ayuda" className="text-xs font-semibold text-gray-600 mt-1">Es donde estabas. Cámbialo si fue en otra parte.</p>
            )}
          </div>

          <fieldset>
            <legend className="block text-sm font-extrabold text-gray-900 mb-1">2. ¿Qué pasó?</legend>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Qué pasó">
              {TIPOS_DE_PROBLEMA.map((t) => (
                <button
                  key={t.clave}
                  type="button"
                  role="radio"
                  aria-checked={tipo === t.clave}
                  onClick={() => setTipo(t.clave)}
                  className={`min-h-[44px] px-3 rounded-2xl border-2 text-left text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer transition-colors ${
                    tipo === t.clave ? "border-blue-600 bg-blue-50 text-blue-950" : `bg-white text-gray-800 hover:bg-gray-50 ${problemaCampo?.campo === "tipo" ? "border-rose-300" : "border-gray-200"}`
                  }`}
                >
                  <span className="text-xl leading-none" aria-hidden="true">{t.emoji}</span>
                  <span className="leading-tight">{t.etiqueta}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="reporte-descripcion" className="block text-sm font-extrabold text-gray-900 mb-1">
              3. {tipoElegido?.pregunta ?? "Cuéntanos qué pasó"}
            </label>
            {/* Las frases van primero y en una sola fila que se desliza: con un toque ya hay algo escrito. */}
            {tipoElegido && (
              <div className="flex gap-1.5 overflow-x-auto pb-1.5 -mx-1 px-1" aria-label="Frases rápidas">
                {tipoElegido.frases.map((frase) => (
                  <button
                    key={frase}
                    type="button"
                    onClick={() => setDescripcion((t) => agregarFrase(t, frase))}
                    className="shrink-0 min-h-[36px] px-3 rounded-full border border-blue-200 bg-blue-50 text-xs font-bold text-blue-900 hover:bg-blue-100 cursor-pointer whitespace-nowrap"
                  >
                    {frase}
                  </button>
                ))}
              </div>
            )}
            <textarea
              id="reporte-descripcion"
              rows={2}
              maxLength={LARGO_MAXIMO_DESCRIPCION}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              aria-invalid={problemaCampo?.campo === "descripcion"}
              placeholder="Por ejemplo: toqué «Guardar» y no pasó nada."
              className={`w-full p-3 rounded-xl border bg-gray-50 text-base font-medium text-gray-900 resize-none ${claseCampo("descripcion")}`}
            />
          </div>

          {conCaptura ? (
            <MediaUploader
              value={foto}
              onChange={setFoto}
              maxFiles={1}
              soloImagenes
              label="Captura de pantalla"
              helperText="Una foto de lo que viste ayuda mucho a encontrarlo."
            />
          ) : (
            <button
              type="button"
              onClick={() => setConCaptura(true)}
              className="min-h-[40px] px-3 rounded-xl border border-dashed border-gray-300 text-sm font-bold text-gray-700 inline-flex items-center gap-2 cursor-pointer hover:bg-gray-50"
            >
              <Camera size={16} aria-hidden="true" /> Agregar una captura (opcional)
            </button>
          )}

          {problemaCampo && (
            <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-bold text-rose-800">
              {problemaCampo.mensaje}
            </p>
          )}

          {/* En el teléfono, «Enviar» se queda a la vista sobre la barra de abajo aunque la pantalla sea chica:
              no hay que deslizar para encontrarlo. */}
          <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-10 -mx-4 px-4 pt-2 pb-2 bg-white/95 backdrop-blur border-t border-gray-100 space-y-1.5 md:static md:mx-0 md:px-0 md:pt-0 md:pb-0 md:bg-transparent md:border-0 md:backdrop-blur-none">
            <button
              type="submit"
              disabled={enviando}
              className="w-full min-h-[52px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-base font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {enviando ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
              {enviando ? "Enviando…" : "Enviar reporte"}
            </button>
            <p className="text-xs font-semibold text-gray-600 text-center">
              Se envía también en qué pantalla estabas{errorDelAviso ? ", lo que te salió" : ""} y tu tipo de teléfono. Nunca tu contraseña.
            </p>
          </div>
        </form>
      )}

      {nuevas.size === 0 && misReportes}
    </div>
  );
}
