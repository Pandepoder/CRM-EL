"use client";

import Link from "next/link";
import { Clock, Map as IconoMapa, MapPin, MoreHorizontal, UserCheck, Users } from "lucide-react";

import { MarcaMunicipio } from "@/components/MarcaMunicipio";
import { MediaGallery } from "@/components/MediaGallery";
import { CATEGORIAS_INCIDENCIA, CATEGORIA_DESCONOCIDA } from "@/lib/categorias-incidencia";
import { ESTADOS_INCIDENCIA, ESTADO_DESCONOCIDO } from "@/lib/estados-incidencia";
import type { FilaDeIncidencia } from "@/lib/incidencias-consulta";
import { haceCuanto, urgenciaPorDias } from "@/lib/incidencias-filtros";

import { StatusSelector } from "./StatusSelector";

const TONO_DE_DIAS = {
  reciente: "bg-emerald-50 text-emerald-800 border-emerald-200",
  atencion: "bg-amber-50 text-amber-900 border-amber-200",
  urgente: "bg-rose-50 text-rose-800 border-rose-200"
} as const;

/**
 * Una incidencia en la lista: qué es, cuánto lleva, dónde, quién la reportó y quién la atiende, y lo que se
 * puede hacer con ella. En el teléfono es una tarjeta; en la computadora, un renglón con las acciones a la
 * derecha. Lo que se ve pero no se trabaja dice de quién es, sin botones (plan de auditoría de menús, §4.7).
 */
export function TarjetaIncidencia({
  fila,
  puedeAsignar,
  onAsignar,
  onMas,
  onCambio
}: {
  fila: FilaDeIncidencia;
  puedeAsignar: boolean;
  onAsignar: () => void;
  onMas: () => void;
  onCambio: () => void;
}) {
  const categoria = CATEGORIAS_INCIDENCIA[fila.categoria] ?? CATEGORIA_DESCONOCIDA;
  const estado = ESTADOS_INCIDENCIA[fila.estado] ?? ESTADO_DESCONOCIDO;
  const abierta = !estado.cerrada;
  const urgencia = urgenciaPorDias(fila.dias);

  const reporto = fila.reporto ?? "Otra estructura";
  const atiende =
    fila.sinAsignar
      ? null
      : [fila.atiendeEquipo ?? (fila.atiendeEquipoAjeno ? "Otro equipo" : null), fila.atiendePersona ?? (fila.atiendePersonaAjena ? "Otra estructura" : null)]
          .filter(Boolean)
          .join(" · ");

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:grid md:grid-cols-[minmax(0,1fr)_14rem_auto] md:gap-5 md:items-start space-y-3 md:space-y-0">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md border" style={{ background: categoria.bg, color: categoria.color, borderColor: categoria.border }}>
            {categoria.label}
          </span>
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md border" style={{ background: estado.bg, color: estado.color, borderColor: estado.border }}>
            {estado.label}
          </span>
          {abierta ? (
            <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border inline-flex items-center gap-1 ${TONO_DE_DIAS[urgencia]}`} title={new Date(fila.creada).toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}>
              <Clock size={11} aria-hidden="true" /> {haceCuanto(fila.dias)}
            </span>
          ) : fila.cerrada ? (
            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-md border bg-slate-50 text-slate-600 border-slate-200">
              Cerrada el {new Date(fila.cerrada).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" })}
            </span>
          ) : null}
        </div>
        <p className="text-base md:text-sm font-extrabold text-gray-900 leading-snug">{fila.titulo}</p>
        {fila.descripcion && <p className="text-sm text-gray-600 line-clamp-2">{fila.descripcion}</p>}
        <p className="text-xs text-gray-600 flex items-center gap-1 flex-wrap">
          <MapPin size={12} className="text-gray-400 shrink-0" aria-hidden="true" />
          <MarcaMunicipio nombre={fila.municipio} esGeneral={fila.municipioEsGeneral} />
          {fila.seccion ? <span>· Sección {fila.seccion}</span> : <span className="text-amber-700 font-bold">· Sin sección</span>}
        </p>
        {fila.fotos.length > 0 && (
          <div className="max-w-xs">
            <MediaGallery media={fila.fotos} title="Fotos" />
          </div>
        )}
      </div>

      <div className="text-xs space-y-1 md:pt-1">
        <p className="text-gray-600">
          {fila.esAvisoDeCampo ? "Aviso de" : "Reportó"}: <strong className="text-gray-900">{reporto}</strong>
        </p>
        <p className="text-gray-600 flex items-center gap-1">
          {atiende ? <UserCheck size={12} className="text-gray-400" aria-hidden="true" /> : <Users size={12} className="text-amber-600" aria-hidden="true" />}
          Atiende:{" "}
          {atiende ? <strong className="text-gray-900">{atiende}</strong> : <strong className="text-amber-700">Sin asignar</strong>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 md:justify-end md:min-w-[15rem]">
        {fila.puedeTrabajar ? (
          <>
            <StatusSelector key={fila.estado} reportId={fila.id} currentStatus={fila.estado} modo="acciones" onCambio={onCambio} />
            {puedeAsignar && abierta && (
              <button type="button" onClick={onAsignar} className="min-h-[44px] px-3.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-800 hover:bg-gray-50 cursor-pointer">
                Asignar
              </button>
            )}
          </>
        ) : (
          <p className="text-xs font-semibold text-gray-600 md:text-right">
            Solo consulta: la atiende {fila.atiendeEquipo ? `el equipo ${fila.atiendeEquipo}` : "quien la tiene a su cargo"}.
          </p>
        )}
        {fila.latitud !== null && fila.longitud !== null && (
          <Link
            href={`/mapa?incidencia=${fila.id}`}
            aria-label="Ver en el mapa"
            title="Ver en el mapa"
            className="w-11 h-11 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 inline-flex items-center justify-center"
          >
            <IconoMapa size={18} aria-hidden="true" />
          </Link>
        )}
        {fila.puedeTrabajar && (
          <button type="button" onClick={onMas} aria-label="Más opciones" title="Sección y estado" className="w-11 h-11 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 inline-flex items-center justify-center cursor-pointer">
            <MoreHorizontal size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}
