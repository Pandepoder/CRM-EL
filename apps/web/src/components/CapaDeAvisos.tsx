"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { anotarCapaDeAvisos, EVENTO_AVISO, type Aviso } from "@/lib/avisos";
import { vibrar } from "@/lib/celebraciones";
import { guardarContextoDelReporte, rutaParaReportar } from "@/lib/problemas";

/**
 * Los avisos del panel (`avisar()`, en `lib/avisos.ts`): abajo, por encima de la barra del teléfono, hasta
 * tres a la vez. Se pueden cerrar con la X.
 *
 * Un aviso de error lleva «Reportar este problema»: abre «Reportar un problema» con la pantalla y el mensaje
 * ya puestos (§9 del plan), que es cuando la persona sabe exactamente qué falló. Por eso un error no se borra
 * solo: se queda hasta que la persona lo cierra o se va a otra pantalla (a los 9 segundos se iba antes de que
 * alguien que lee despacio se decidiera). Los de éxito e información sí se van solos.
 */
type AvisoEnPantalla = Aviso & { id: number; ruta: string };

const DURACION: Record<Aviso["tipo"], number | null> = { error: null, info: 6000, exito: 4500 };

export function CapaDeAvisos() {
  const [avisos, setAvisos] = useState<AvisoEnPantalla[]>([]);
  const ruta = usePathname();
  const router = useRouter();
  // La pantalla en la que salió cada aviso: el reporte dice dónde pasó, no a dónde se fue después.
  const rutaActual = useRef(ruta);

  const quitar = (id: number) => setAvisos((previos) => previos.filter((x) => x.id !== id));

  const reportar = (aviso: AvisoEnPantalla) => {
    guardarContextoDelReporte({ ruta: aviso.ruta, error: aviso.texto });
    quitar(aviso.id);
    router.push(rutaParaReportar(aviso.ruta));
  };

  const accion = (aviso: AvisoEnPantalla) => {
    if (!aviso.accion) return;
    quitar(aviso.id);
    router.push(aviso.accion.href);
  };

  // Al cambiar de pantalla, los errores de la anterior ya no aplican.
  useEffect(() => {
    rutaActual.current = ruta;
    setAvisos((previos) => previos.filter((a) => a.tipo !== "error" || a.ruta === ruta));
  }, [ruta]);

  useEffect(() => {
    const desanotar = anotarCapaDeAvisos();
    const alAvisar = (e: Event) => {
      const aviso = (e as CustomEvent<Aviso>).detail;
      if (!aviso?.texto) return;
      const id = Date.now() + Math.random();
      if (aviso.tipo === "error") vibrar([40, 60, 40]);
      setAvisos((previos) => [...previos.slice(-2), { ...aviso, id, ruta: rutaActual.current }]);
      const duracion = aviso.duracion !== undefined ? aviso.duracion : DURACION[aviso.tipo];
      if (duracion !== null) window.setTimeout(() => quitar(id), duracion);
    };
    window.addEventListener(EVENTO_AVISO, alAvisar);
    return () => {
      window.removeEventListener(EVENTO_AVISO, alAvisar);
      desanotar();
    };
  }, []);

  if (avisos.length === 0) return null;
  return (
    <div className="avisos-pila">
      {avisos.map((a) => {
        const Icono = a.tipo === "error" ? AlertCircle : a.tipo === "exito" ? CheckCircle2 : Info;
        const ofrecerReporte = !a.accion && a.tipo === "error" && !ruta.startsWith("/reportar-problema");
        return (
          <div key={a.id} className={`aviso-panel aviso-panel--${a.tipo}`} role={a.tipo === "error" ? "alert" : "status"}>
            <Icono size={20} className="shrink-0" aria-hidden="true" />
            <div className="aviso-panel__cuerpo">
              <p className="aviso-panel__texto">{a.texto}</p>
              {a.accion && (
                <button type="button" onClick={() => accion(a)} className="aviso-panel__reportar">
                  {a.accion.etiqueta}
                </button>
              )}
              {ofrecerReporte && (
                <button type="button" onClick={() => reportar(a)} className="aviso-panel__reportar">
                  Reportar este problema
                </button>
              )}
            </div>
            <button type="button" onClick={() => quitar(a.id)} className="aviso-panel__cerrar" aria-label="Cerrar aviso">
              <X size={18} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
