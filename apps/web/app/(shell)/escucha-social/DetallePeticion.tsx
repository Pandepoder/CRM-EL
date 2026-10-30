"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { Landmark, Loader2, MapPin, UserRound } from "lucide-react";

import { HojaInferior } from "@/components/HojaInferior";
import { MediaGallery } from "@/components/MediaGallery";
import { QueEsEsto } from "@/components/QueEsEsto";
import { avisar } from "@/lib/avisos";
import {
  DEPENDENCIAS_SUGERIDAS,
  diaDeJalisco,
  ESTADOS_ESCUCHA,
  LARGO_MAXIMO_NOTAS_ESCUCHA,
  nombreDeCategoriaEscucha,
  nombreDeEstadoEscucha,
  textoDelTurno,
  type FilaDePeticion
} from "@/lib/escucha-social";

async function guardar(id: string, cuerpo: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch(`/api/escucha-social/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) {
      avisar(datos.error || "No se pudo guardar. Vuelve a intentarlo.");
      return false;
    }
    return true;
  } catch {
    avisar("Sin conexión: no se guardó el cambio. Revisa tu señal y vuelve a intentarlo.");
    return false;
  }
}

const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });

/**
 * Una petición: de quién es, qué pidió, dónde y en qué va. Quien la anotó o quien coordina su brigada le cambia
 * el estado y las notas; quien solo la consulta ve una línea que lo dice (ver no es trabajar). Administración la
 * turna a una dependencia con folio y fecha (D6).
 */
export function DetallePeticion({
  peticion,
  esAdministracion,
  onCerrar,
  onCambio
}: {
  peticion: FilaDePeticion | null;
  esAdministracion: boolean;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const idLista = useId();
  const [notas, setNotas] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [turnando, setTurnando] = useState(false);
  const [dependencia, setDependencia] = useState("");
  const [folio, setFolio] = useState("");
  const [fechaTurno, setFechaTurno] = useState("");

  useEffect(() => {
    setNotas(peticion?.notas ?? "");
    setTurnando(false);
    setDependencia("");
    setFolio("");
    setFechaTurno(diaDeJalisco());
  }, [peticion]);

  if (!peticion) return <HojaInferior abierta={false} titulo="" onCerrar={onCerrar}>{null}</HojaInferior>;

  async function cambiarEstado(estado: string) {
    if (!peticion) return;
    setOcupado(true);
    const ok = await guardar(peticion.id, { status: estado, resolutionNotes: notas });
    setOcupado(false);
    if (ok) {
      avisar(`Quedó como «${nombreDeEstadoEscucha(estado)}».`, "exito");
      onCambio();
    }
  }

  async function guardarNotas() {
    if (!peticion) return;
    setOcupado(true);
    const ok = await guardar(peticion.id, { resolutionNotes: notas });
    setOcupado(false);
    if (ok) {
      avisar("Notas guardadas.", "exito");
      onCambio();
    }
  }

  async function turnar(quitar: boolean) {
    if (!peticion) return;
    if (!quitar && dependencia.trim().length < 2) return avisar("Escribe a qué dependencia se turna.");
    if (quitar && !window.confirm("¿Quitar el turno? La petición deja de contar como gestión turnada.")) return;
    setOcupado(true);
    const ok = await guardar(peticion.id, { turno: quitar ? null : { dependencia: dependencia.trim(), folio: folio.trim() || null, fecha: fechaTurno || null } });
    setOcupado(false);
    if (ok) {
      avisar(quitar ? "Turno quitado." : `Turnada a ${dependencia.trim()}.`, "exito");
      onCambio();
    }
  }

  return (
    <HojaInferior abierta titulo={peticion.titulo} subtitulo={`${nombreDeCategoriaEscucha(peticion.categoria)} · ${nombreDeEstadoEscucha(peticion.estado)} · ${fecha(peticion.creada)}`} onCerrar={onCerrar} ocupado={ocupado}>
      <section className="space-y-1">
        <p className="text-sm text-gray-700 flex items-center gap-1.5">
          <UserRound size={15} className="text-gray-400" aria-hidden="true" />
          De:{" "}
          {peticion.vecino ? (
            <Link href={`/crm/contacts/${peticion.vecino.id}`} className="font-extrabold text-blue-700 underline">{peticion.vecino.nombre}</Link>
          ) : peticion.vecinoOculto ? (
            <strong className="text-gray-900">un vecino</strong>
          ) : (
            <strong className="text-gray-900">el barrio</strong>
          )}
        </p>
        <p className="text-xs text-gray-500">Anotó: {peticion.autor ?? "otra estructura"}</p>
      </section>

      <p className="text-sm text-gray-800 bg-gray-50 rounded-2xl p-3 whitespace-pre-wrap">{peticion.descripcion}</p>

      {peticion.lugar && (
        <p className="text-sm text-gray-700 flex items-start gap-1.5">
          <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" aria-hidden="true" /> {peticion.lugar}
        </p>
      )}
      {peticion.fotos.length > 0 && <MediaGallery media={peticion.fotos} title="Fotos" />}

      {peticion.turno && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-900 flex items-start gap-1.5">
          <Landmark size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {textoDelTurno(peticion.turno)}
          {peticion.turno.fecha ? ` · ${fecha(peticion.turno.fecha)}` : ""}
        </p>
      )}

      {peticion.puedeTrabajar ? (
        <section className="space-y-2 pt-2 border-t border-gray-100">
          <label htmlFor="peticion-notas" className="block text-sm font-extrabold text-gray-900">Seguimiento</label>
          <textarea
            id="peticion-notas"
            rows={3}
            value={notas}
            maxLength={LARGO_MAXIMO_NOTAS_ESCUCHA}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Qué se hizo o qué se le respondió al vecino…"
            className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-base text-gray-900"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500">{notas.length.toLocaleString("es-MX")} / {LARGO_MAXIMO_NOTAS_ESCUCHA.toLocaleString("es-MX")}</span>
            <button type="button" onClick={guardarNotas} disabled={ocupado || notas === (peticion.notas ?? "")} className="min-h-[40px] px-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 cursor-pointer disabled:opacity-40">
              Guardar notas
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Estado">
            {ESTADOS_ESCUCHA.map((e) => (
              <button
                key={e.clave}
                type="button"
                aria-pressed={peticion.estado === e.clave}
                disabled={ocupado || peticion.estado === e.clave}
                onClick={() => cambiarEstado(e.clave)}
                className={`min-h-[44px] rounded-xl text-sm font-extrabold cursor-pointer ${peticion.estado === e.clave ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"} disabled:cursor-default`}
              >
                {e.nombre}
              </button>
            ))}
          </div>
        </section>
      ) : (
        <p className="pt-2 border-t border-gray-100 text-sm font-semibold text-gray-600">
          Solo consulta: la atiende quien la anotó o quien coordina su brigada.
        </p>
      )}

      {esAdministracion && peticion.puedeTrabajar && (
        <section className="space-y-2 pt-3 border-t border-gray-100">
          <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-1.5">
            <Landmark size={16} className="text-indigo-600" aria-hidden="true" /> Turnar a una dependencia <QueEsEsto termino="turnar" />
          </h3>
          {peticion.turno && !turnando ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setTurnando(true); setDependencia(peticion.turno!.dependencia ?? ""); setFolio(peticion.turno!.folio ?? ""); setFechaTurno(peticion.turno!.fecha ? diaDeJalisco(new Date(peticion.turno!.fecha)) : diaDeJalisco()); }} className="min-h-[44px] px-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 cursor-pointer">
                Cambiar turno
              </button>
              <button type="button" onClick={() => turnar(true)} disabled={ocupado} className="min-h-[44px] px-3 rounded-xl border border-rose-200 bg-rose-50 text-sm font-bold text-rose-800 cursor-pointer disabled:opacity-50">
                Quitar turno
              </button>
            </div>
          ) : turnando ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">
                Dependencia
                <input autoFocus list={idLista} value={dependencia} onChange={(e) => setDependencia(e.target.value)} placeholder="Ej. SIAPA" className="mt-1 w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-gray-50 text-base text-gray-900" />
                <datalist id={idLista}>
                  {DEPENDENCIAS_SUGERIDAS.map((d) => <option key={d} value={d} />)}
                </datalist>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-bold text-gray-700">
                  Folio (opcional)
                  <input value={folio} onChange={(e) => setFolio(e.target.value)} className="mt-1 w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-gray-50 text-base text-gray-900" />
                </label>
                <label className="block text-xs font-bold text-gray-700">
                  Fecha
                  <input type="date" value={fechaTurno} onChange={(e) => setFechaTurno(e.target.value)} className="mt-1 w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-gray-50 text-base text-gray-900" />
                </label>
              </div>
              <button type="button" onClick={() => turnar(false)} disabled={ocupado} className="w-full min-h-[48px] rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
                {ocupado && <Loader2 size={16} className="animate-spin" aria-hidden="true" />} Turnar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setTurnando(true)} className="min-h-[44px] px-3 rounded-xl bg-indigo-50 border border-indigo-200 text-sm font-bold text-indigo-900 cursor-pointer">
              Turnar a una dependencia
            </button>
          )}
        </section>
      )}
    </HojaInferior>
  );
}
