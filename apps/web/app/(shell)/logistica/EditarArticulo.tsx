"use client";

import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, Loader2 } from "lucide-react";

import { HojaInferior } from "@/components/HojaInferior";
import { QueEsEsto } from "@/components/QueEsEsto";
import { avisar } from "@/lib/avisos";
import type { ArticuloDeLogistica } from "@/lib/logistica-tipos";

import { archiveItemAction, editItemAction } from "./actions";

const campo = "mt-1 w-full min-h-[44px] px-3 rounded-xl border border-gray-200 bg-gray-50 text-base text-gray-900";

/**
 * Editar un artículo (plan de auditoría de menús, F5.2): administración y dirección. Archivar y devolver a la
 * lista, solo administración: archivar nunca borra, y un artículo archivado no acepta movimientos.
 */
export function EditarArticulo({
  articulo,
  puedeArchivar,
  onCerrar,
  onHecho
}: {
  articulo: ArticuloDeLogistica | null;
  puedeArchivar: boolean;
  onCerrar: () => void;
  onHecho: () => void;
}) {
  const [f, setF] = useState({ nombre: "", clave: "", categoria: "", descripcion: "", imagen: "", minimo: "" });
  const [guardando, setGuardando] = useState(false);
  const [problema, setProblema] = useState<string | null>(null);

  useEffect(() => {
    if (!articulo) return;
    setF({
      nombre: articulo.nombre,
      clave: articulo.clave,
      categoria: articulo.categoria,
      descripcion: articulo.descripcion ?? "",
      imagen: articulo.imagen ?? "",
      minimo: articulo.minimo === null ? "" : String(articulo.minimo)
    });
    setProblema(null);
  }, [articulo]);

  if (!articulo) return <HojaInferior abierta={false} titulo="" onCerrar={onCerrar}>{null}</HojaInferior>;

  async function guardar() {
    if (!articulo) return;
    setProblema(null);
    const datos = new FormData();
    datos.set("itemId", articulo.id);
    datos.set("name", f.nombre);
    datos.set("sku", f.clave);
    datos.set("category", f.categoria);
    datos.set("description", f.descripcion);
    datos.set("imageUrl", f.imagen);
    datos.set("minQuantity", f.minimo);
    setGuardando(true);
    try {
      const r = await editItemAction(datos);
      if (!r.ok) return setProblema(r.error);
      avisar(r.mensaje ?? "Artículo guardado.", "exito");
      onHecho();
    } catch {
      setProblema("Sin conexión: no se guardó. Revisa tu señal y vuelve a intentarlo.");
    } finally {
      setGuardando(false);
    }
  }

  async function archivar(si: boolean) {
    if (!articulo) return;
    if (si && !window.confirm(`¿Archivar «${articulo.nombre}»? Sale de la lista y ya no se entrega; no se borra y puedes devolverlo a la lista.`)) return;
    setGuardando(true);
    try {
      const r = await archiveItemAction(articulo.id, si);
      if (!r.ok) return setProblema(r.error);
      avisar(r.mensaje ?? "Listo.", "exito");
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
      titulo={`Editar: ${articulo.nombre}`}
      subtitulo={`${articulo.almacen} · ${articulo.existencias.toLocaleString("es-MX")} en el almacén`}
      onCerrar={onCerrar}
      ocupado={guardando}
      pie={
        <div className="space-y-2">
          {problema && <p role="alert" className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-bold text-rose-800">{problema}</p>}
          <button
            type="button"
            onClick={guardar}
            disabled={guardando || articulo.archivado}
            className="w-full min-h-[52px] rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-base font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {guardando && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
            Guardar cambios
          </button>
        </div>
      }
    >
      {articulo.archivado && (
        <p className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-bold text-amber-900">
          Este artículo está archivado: no sale en la lista ni se entrega. Devuélvelo a la lista para cambiarlo o moverlo.
        </p>
      )}
      <label className="block text-sm font-extrabold text-gray-900">
        Nombre
        <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} className={campo} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm font-extrabold text-gray-900">
          Clave
          <input value={f.clave} onChange={(e) => setF({ ...f, clave: e.target.value })} className={`${campo} font-mono`} />
        </label>
        <label className="block text-sm font-extrabold text-gray-900">
          Categoría
          <input value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} className={campo} />
        </label>
      </div>
      <label className="block text-sm font-extrabold text-gray-900">
        <span className="inline-flex items-center gap-1">Avisar cuando queden <QueEsEsto termino="porAgotarse" /></span>
        <input
          aria-label="Avisar cuando queden"
          inputMode="numeric"
          value={f.minimo}
          onChange={(e) => setF({ ...f, minimo: e.target.value.replace(/\D/g, "") })}
          placeholder="Ej. 50 (vacío: sin aviso)"
          className={campo}
        />
      </label>
      <label className="block text-sm font-extrabold text-gray-900">
        Descripción <span className="font-semibold text-gray-500">(opcional)</span>
        <textarea rows={2} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} className="mt-1 w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-base text-gray-900 resize-none" />
      </label>
      <label className="block text-sm font-extrabold text-gray-900">
        Foto (dirección web) <span className="font-semibold text-gray-500">(opcional)</span>
        <input type="url" value={f.imagen} onChange={(e) => setF({ ...f, imagen: e.target.value })} placeholder="https://…" className={campo} />
      </label>

      {puedeArchivar && (
        <section className="pt-2 border-t border-gray-100">
          {articulo.archivado ? (
            <button type="button" onClick={() => archivar(false)} disabled={guardando} className="min-h-[44px] px-4 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-900 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <ArchiveRestore size={16} aria-hidden="true" /> Devolver a la lista
            </button>
          ) : (
            <button type="button" onClick={() => archivar(true)} disabled={guardando} className="min-h-[44px] px-4 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50">
              <Archive size={16} aria-hidden="true" /> Archivar artículo
            </button>
          )}
        </section>
      )}
    </HojaInferior>
  );
}
