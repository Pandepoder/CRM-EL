"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

/**
 * Presentación de campaña antes del formulario, en las páginas donde aterriza
 * un QR o un enlace de WhatsApp.
 *
 * Conóceme existía desde el principio, pero su único enlace en toda la
 * aplicación era un texto pequeño en la cabecera de la portada: quien escaneaba
 * un código en la calle nunca llegaba a verlo.
 *
 * Se muestra ya visible en el primer render, sin esperar a que el navegador
 * decida: si se dibujara solo después de comprobar el almacenamiento local,
 * habría un parpadeo con el formulario a la vista, que es justo lo contrario de
 * lo que se busca. Quien ya la vio la descarta en cuanto carga.
 *
 * El botón de continuar es lo más grande de la pantalla a propósito. Añadir un
 * paso a alguien que está en la puerta de su casa cuesta registros, y la única
 * forma de que cueste poco es que salir de aquí sea evidente.
 */

export type BienvenidaConocemeProps = Readonly<{
  /** Texto del botón que lleva al formulario. */
  accion: string;
  /** Quién invita, cuando se conoce: sale del QR personal del brigadista. */
  invitadoPor?: string | undefined;
  /** Distingue el recuerdo entre el registro ciudadano y el alta de brigada. */
  clave: string;
}>;

export function BienvenidaConoceme({ accion, invitadoPor, clave }: BienvenidaConocemeProps) {
  const [visible, setVisible] = useState(true);
  const botonRef = useRef<HTMLButtonElement | null>(null);
  const recuerdo = `bienvenida-vista:${clave}`;

  useEffect(() => {
    try {
      if (localStorage.getItem(recuerdo) === "1") {
        setVisible(false);
        return;
      }
    } catch {
      // Navegador sin almacenamiento o en privado: se muestra, que es el
      // comportamiento seguro.
    }
    botonRef.current?.focus();
  }, [recuerdo]);

  useEffect(() => {
    if (!visible) return;
    const alEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") continuar();
    };
    document.addEventListener("keydown", alEscape);
    // El fondo no debe poder desplazarse por detrás de la capa.
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alEscape);
      document.body.style.overflow = previo;
    };
  });

  function continuar() {
    try {
      localStorage.setItem(recuerdo, "1");
    } catch {
      /* sin persistencia: se volverá a mostrar, no es grave */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="bienvenida" role="dialog" aria-modal="true" aria-label="Conoce a Edgar López">
      <div className="bienvenida-caja">
        <div className="bienvenida-foto">
          <Image
            src="/media/edgar-retrato.jpg"
            alt="Edgar López"
            fill
            sizes="(max-width: 640px) 100vw, 420px"
            style={{ objectFit: "cover", objectPosition: "top center" }}
            priority
          />
          <div className="bienvenida-velo" />
          <div className="bienvenida-titulo">
            <Image
              src="/brand/el-monograma-blanco.png"
              alt=""
              width={44}
              height={44}
              style={{ width: 44, height: 44, objectFit: "contain" }}
            />
            <strong>Edgar López</strong>
            <span>Un Tonalá Posible</span>
          </div>
        </div>

        <div className="bienvenida-cuerpo">
          {invitadoPor ? (
            <p className="bienvenida-invita">
              Te invita <strong>{invitadoPor}</strong>
            </p>
          ) : null}

          <p className="bienvenida-texto">
            Antes de continuar, conoce el proyecto: registro ciudadano, brigadas en territorio y
            atención de incidencias en tu colonia.
          </p>

          <button ref={botonRef} type="button" className="bienvenida-continuar" onClick={continuar}>
            {accion}
            <ArrowRight size={20} />
          </button>

          <Link href="/conoceme" className="bienvenida-ver">
            <PlayCircle size={17} />
            Ver videos y conocer a Edgar
          </Link>
        </div>
      </div>
    </div>
  );
}
