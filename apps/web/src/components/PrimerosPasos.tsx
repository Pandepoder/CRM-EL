"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getHomePathForRole } from "@tonala/ui";
import { Sparkles, X } from "lucide-react";

import { cerrarPrimerosPasos, primerosPasosCerrados } from "@/lib/celebraciones";
import { PIE_PARA_REPORTAR, pasosDe } from "@/lib/primeros-pasos";

/**
 * «Primeros pasos»: lo básico de cada rol, en su pantalla de inicio, hasta que la persona lo cierra (L1).
 * Antes nadie explicaba nada después de iniciar sesión: la bienvenida solo existía en las páginas públicas.
 *
 * Solo enseña a dónde ir; cada pantalla sigue decidiendo quién entra. Los pasos viven en
 * `lib/primeros-pasos.ts`, donde se prueba que cada rol solo lea de pantallas que puede abrir.
 */

export function PrimerosPasos({ usuarioId, rol, nombre }: Readonly<{ usuarioId: string; rol: string; nombre: string }>) {
  const ruta = usePathname();
  // Hasta montar no se sabe si ya la cerró (vive en el teléfono): así el servidor y el navegador pintan lo mismo.
  const [visible, setVisible] = useState(false);

  const enInicio = ruta === getHomePathForRole(rol);
  useEffect(() => {
    setVisible(enInicio && !primerosPasosCerrados(usuarioId));
  }, [enInicio, usuarioId]);

  const pasos = pasosDe(rol);
  if (!visible || !pasos) return null;

  const cerrar = () => {
    cerrarPrimerosPasos(usuarioId);
    setVisible(false);
  };
  const primerNombre = nombre.trim().split(/\s+/)[0] || "";

  return (
    <section className="mx-4 mt-4 md:mx-6 rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4 md:p-5 shadow-sm" aria-label="Primeros pasos">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-10 h-10 rounded-2xl bg-indigo-600 text-white grid place-items-center" aria-hidden="true">
          <Sparkles size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-black text-indigo-950">¡Hola{primerNombre ? `, ${primerNombre}` : ""}! Esto es lo básico</h2>
          <p className="text-sm font-semibold text-slate-600">Cuatro cosas y ya sabes moverte. Puedes cerrarlo cuando quieras.</p>
        </div>
        <button type="button" onClick={cerrar} aria-label="Cerrar primeros pasos" className="shrink-0 w-11 h-11 -mr-1 -mt-1 grid place-items-center rounded-xl text-slate-500 hover:bg-white cursor-pointer">
          <X size={20} />
        </button>
      </div>
      <ol className="mt-3 space-y-2">
        {pasos.map((paso, i) => (
          <li key={i} className="flex items-start gap-3 rounded-2xl bg-white/80 border border-white px-3 py-2.5">
            <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-800 text-sm font-black grid place-items-center" aria-hidden="true">{i + 1}</span>
            <span className="text-sm font-semibold text-slate-800 leading-snug">
              {paso.texto}
              {paso.enlace && (
                <>
                  {" "}
                  <a href={paso.enlace.href} className="font-extrabold text-indigo-700 underline underline-offset-2 whitespace-nowrap">{paso.enlace.etiqueta}</a>
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm font-semibold text-slate-700 leading-snug">
        {PIE_PARA_REPORTAR.texto}{" "}
        {PIE_PARA_REPORTAR.enlace && (
          <a href={PIE_PARA_REPORTAR.enlace.href} className="font-extrabold text-indigo-700 underline underline-offset-2 whitespace-nowrap">
            {PIE_PARA_REPORTAR.enlace.etiqueta}
          </a>
        )}
      </p>
      <button type="button" onClick={cerrar} className="mt-3 w-full sm:w-auto min-h-[48px] px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm cursor-pointer">
        ¡Entendido!
      </button>
    </section>
  );
}
