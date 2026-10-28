"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Loader2, Megaphone, Send } from "lucide-react";

import { LocationPicker, type LocationValue } from "@/components/LocationPicker";
import { MediaUploader, type MediaFile } from "@/components/MediaUploader";
import { avisar } from "@/lib/avisos";
import { estadoDeAviso, tituloDeAviso, TIPOS_DE_AVISO, type MiAviso } from "@/lib/avisos-de-campo";
import { celebrar } from "@/lib/celebraciones";
import { enviarOEncolar, nuevaClave, TEXTO_DE_ESPERA } from "@/lib/cola-de-envios";
import { useMunicipioUsuario } from "@/lib/municipio-contexto";

const LARGO_MAXIMO_FRASE = 500;

const fecha = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Mexico_City" });

const ESTILO_DEL_ESTADO = {
  espera: "bg-amber-50 text-amber-900 border-amber-200",
  bien: "bg-emerald-50 text-emerald-900 border-emerald-200",
  neutro: "bg-slate-100 text-slate-700 border-slate-200"
} as const;

/**
 * Avisar de un problema en la calle sin coordinar (D9). Tres cosas: qué es, dónde, y una foto o una frase si
 * se quiere. El título lo arma el sistema. Sin señal, se queda en el teléfono y se envía solo.
 */
export default function AvisarIncidenciaClient({ avisos, usuarioId }: { avisos: MiAviso[]; usuarioId: string }) {
  const router = useRouter();
  const municipioUsuario = useMunicipioUsuario();
  const [categoria, setCategoria] = useState<string>("");
  const [lugar, setLugar] = useState<LocationValue>({ latitude: null, longitude: null });
  const [frase, setFrase] = useState("");
  const [fotos, setFotos] = useState<MediaFile[]>([]);
  const [conFoto, setConFoto] = useState(false);
  const [clave, setClave] = useState(() => nuevaClave());
  const [enviando, setEnviando] = useState(false);
  const [problema, setProblema] = useState<{ campo: string; mensaje: string } | null>(null);
  const [listo, setListo] = useState<{ enviado: boolean; texto: string } | null>(null);
  const [mapaKey, setMapaKey] = useState(0);
  const [retirando, setRetirando] = useState<string | null>(null);

  // Lo que falta se dice junto a «Enviar» y la pantalla sube hasta el campo: en el teléfono quedaba lejos.
  const falta = (campo: "categoria" | "lugar", mensaje: string) => {
    setProblema({ campo, mensaje });
    document.getElementById(`aviso-${campo}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setProblema(null);
    if (!categoria) return falta("categoria", "Toca qué es.");
    if (typeof lugar.latitude !== "number" || typeof lugar.longitude !== "number") {
      return falta("lugar", "Falta dónde: usa tu GPS, busca la dirección o toca el mapa.");
    }
    const tipo = TIPOS_DE_AVISO.find((t) => t.categoria === categoria)!;
    const direccion = (lugar.address || lugar.locationText || "").trim();
    const texto = frase.trim() || `${tipo.nombre}: aviso de campo.`;

    setEnviando(true);
    const r = await enviarOEncolar({
      clave,
      tipo: "incidencia",
      url: "/api/map/reports",
      cuerpo: {
        clientRequestId: clave,
        title: tituloDeAviso(categoria, lugar.colony),
        description: direccion ? `${texto}\n\nDirección: ${direccion}` : texto,
        category: categoria,
        latitude: lugar.latitude,
        longitude: lugar.longitude,
        municipality: lugar.municipality || municipioUsuario || undefined,
        sectionId: lugar.sectionId || undefined,
        mediaUrls: fotos
      },
      descripcion: `Aviso: ${tipo.nombre}`,
      usuarioId
    });
    setEnviando(false);

    if (r.estado === "rechazado") {
      setProblema({ campo: r.campo ?? "", mensaje: r.error });
      return;
    }
    if (r.estado === "sin-cola") {
      avisar(r.error);
      return;
    }
    if (r.estado === "enviado") celebrar({ tipo: "otro", titulo: "Aviso enviado" });
    setListo(
      r.estado === "enviado"
        ? { enviado: true, texto: "Le llegó a tu líder. Abajo, en «Mis avisos», ves en qué va." }
        : { enviado: false, texto: TEXTO_DE_ESPERA[r.motivo] }
    );
    setCategoria("");
    setFrase("");
    setFotos([]);
    setConFoto(false);
    setLugar({ latitude: null, longitude: null });
    setMapaKey((k) => k + 1);
    setClave(nuevaClave());
    if (r.estado === "enviado") router.refresh();
  }

  async function retirar(aviso: MiAviso) {
    if (!window.confirm(`¿Retirar «${aviso.titulo}»? Queda como rechazado; no se borra.`)) return;
    setRetirando(aviso.id);
    try {
      const res = await fetch(`/api/map/reports/${aviso.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rechazada" })
      });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        avisar(datos.error || "No se pudo retirar. Vuelve a intentarlo.");
        return;
      }
      avisar("Aviso retirado.", "exito");
      router.refresh();
    } catch {
      avisar("Sin conexión: no se retiró. Revisa tu señal y vuelve a intentarlo.");
    } finally {
      setRetirando(null);
    }
  }

  const claseCampo = (campo: string) => (problema?.campo === campo ? "border-rose-400 ring-2 ring-rose-100" : "border-gray-200");

  return (
    <div className="max-w-2xl mx-auto px-4 pt-3 pb-4 md:p-6 space-y-4">
      <header className="space-y-1">
        <h1 className="hidden md:flex text-3xl font-black text-slate-900 tracking-tight items-center gap-2">
          <Megaphone className="text-amber-600 shrink-0" size={28} aria-hidden="true" /> Avisar de una incidencia
        </h1>
        <p className="text-sm text-slate-600">¿Viste un bache, una fuga o una luminaria apagada? Avisa aquí y le llega a tu líder para que lo atienda.</p>
      </header>

      {listo && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={22} aria-hidden="true" />
          <div className="space-y-2">
            <p className="font-extrabold text-emerald-950">{listo.enviado ? "¡Gracias! Tu aviso llegó." : "Tu aviso está a salvo."}</p>
            <p className="text-sm font-semibold text-emerald-900">{listo.texto}</p>
            <button type="button" onClick={() => setListo(null)} className="min-h-[44px] px-3 rounded-xl bg-white border border-emerald-200 text-sm font-bold text-emerald-800 cursor-pointer">
              Avisar de otra cosa
            </button>
          </div>
        </div>
      )}

      {!listo && (
        <form onSubmit={enviar} className="rounded-3xl border border-gray-200 bg-white p-4 md:p-5 space-y-4 shadow-sm" noValidate>
          <fieldset id="aviso-categoria" className="scroll-mt-24">
            <legend className="block text-sm font-extrabold text-gray-900 mb-1">1. ¿Qué es?</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Qué es">
              {TIPOS_DE_AVISO.map((t) => (
                <button
                  key={t.categoria}
                  type="button"
                  role="radio"
                  aria-checked={categoria === t.categoria}
                  onClick={() => setCategoria(t.categoria)}
                  className={`min-h-[48px] px-3 rounded-2xl border-2 text-left text-sm font-extrabold inline-flex items-center gap-2 cursor-pointer transition-colors ${
                    categoria === t.categoria ? "border-amber-500 bg-amber-50 text-amber-950" : `bg-white text-gray-800 hover:bg-gray-50 ${problema?.campo === "categoria" ? "border-rose-300" : "border-gray-200"}`
                  }`}
                >
                  <span className="text-xl leading-none" aria-hidden="true">{t.emoji}</span>
                  <span className="leading-tight">{t.nombre}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div id="aviso-lugar" className={`rounded-2xl border p-1 scroll-mt-24 ${claseCampo("lugar")}`}>
            <LocationPicker
              key={mapaKey}
              label="2. ¿Dónde?"
              helperText="Usa tu GPS, busca la calle o toca el mapa."
              defaultMunicipality={municipioUsuario || undefined}
              value={lugar}
              onChange={setLugar}
            />
          </div>

          <div>
            <label htmlFor="aviso-frase" className="block text-sm font-extrabold text-gray-900 mb-1">3. Una frase (opcional)</label>
            <textarea
              id="aviso-frase"
              rows={2}
              maxLength={LARGO_MAXIMO_FRASE}
              value={frase}
              onChange={(e) => setFrase(e.target.value)}
              placeholder="Por ejemplo: está apagada desde ayer."
              className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-base font-medium text-gray-900 resize-none"
            />
          </div>

          {conFoto ? (
            <MediaUploader value={fotos} onChange={setFotos} maxFiles={2} soloImagenes label="Foto" helperText="Una foto ayuda a tu líder a saber qué es." />
          ) : (
            <button
              type="button"
              onClick={() => setConFoto(true)}
              className="min-h-[44px] px-3 rounded-xl border border-dashed border-gray-300 text-sm font-bold text-gray-700 inline-flex items-center gap-2 cursor-pointer hover:bg-gray-50"
            >
              <Camera size={16} aria-hidden="true" /> Agregar una foto (opcional)
            </button>
          )}

          {problema && (
            <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-bold text-rose-800">
              {problema.mensaje}
            </p>
          )}

          {/* En el teléfono, «Enviar» se queda a la vista sobre la barra de abajo. */}
          <div className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-10 -mx-4 px-4 pt-2 pb-2 bg-white/95 backdrop-blur border-t border-gray-100 space-y-1.5 md:static md:mx-0 md:px-0 md:pt-0 md:pb-0 md:bg-transparent md:border-0 md:backdrop-blur-none">
            <button
              type="submit"
              disabled={enviando}
              className="w-full min-h-[52px] rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-base font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {enviando ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
              {enviando ? "Enviando…" : "Enviar aviso"}
            </button>
            <p className="text-xs font-semibold text-gray-600 text-center">Le llega a tu líder para que lo acepte. Sin señal, se envía solo cuando vuelva.</p>
          </div>
        </form>
      )}

      <section aria-labelledby="mis-avisos-titulo" className="space-y-2">
        <h2 id="mis-avisos-titulo" className="text-lg font-black text-slate-900">Mis avisos</h2>
        {avisos.length === 0 ? (
          <p className="text-sm text-slate-600">Todavía no has avisado de nada. Cuando lo hagas, aquí verás en qué va.</p>
        ) : (
          <ul className="space-y-2">
            {avisos.map((a) => {
              const estado = estadoDeAviso(a.estado, a.motivo);
              const tipo = TIPOS_DE_AVISO.find((t) => t.categoria === a.categoria);
              return (
                <li key={a.id} className="rounded-2xl border border-gray-200 bg-white p-3.5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-extrabold text-gray-900 min-w-0">
                      <span aria-hidden="true">{tipo?.emoji ?? "📍"}</span> {a.titulo}
                    </p>
                    <span className={`shrink-0 text-xs font-extrabold px-2 py-0.5 rounded-full border ${ESTILO_DEL_ESTADO[estado.tono]}`}>{estado.texto}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-500">{fecha(a.creado)}</p>
                    {a.estado === "pendiente" && (
                      <button
                        type="button"
                        onClick={() => retirar(a)}
                        disabled={retirando === a.id}
                        className="min-h-[40px] px-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-60"
                      >
                        {retirando === a.id ? "Retirando…" : "Retirar"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
