"use client";

import { useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Home, Loader2, RotateCw } from "lucide-react";

/**
 * Pantalla que se muestra cuando una vista revienta.
 *
 * Hasta ahora no existía ninguna: la aplicación no tenía un solo `error.tsx`, así que
 * cualquier excepción en un componente de servidor —una consulta contra una columna que la
 * base todavía no tiene, la base saturada, una fila mal cifrada— dejaba el texto crudo de
 * Next ("Application error: a server-side exception has occurred") sin menú, sin reintento y
 * sin decir qué pasó. En campo eso es una brigada parada sin saber si el problema es suyo,
 * del teléfono o del sistema.
 *
 * Lo que se puede decir en el navegador es poco a propósito: en producción Next borra el
 * mensaje del error y solo deja `digest`, un identificador que aparece igual en el registro
 * del servidor. Por eso se muestra: es lo que permite a quien dé soporte encontrar el fallo
 * exacto sin pedirle a quien lo sufrió que describa la pantalla.
 */
export function PantallaDeError({
  error,
  reset,
  titulo = "No pudimos cargar esta pantalla",
  ayuda = "El resto del sistema sigue funcionando. Vuelve a intentarlo; si sigue igual, avisa a quien te dio el acceso.",
  ambito,
  enlaceInicio = { href: "/", etiqueta: "Ir al inicio" }
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
  titulo?: string;
  ayuda?: string;
  /** Nombre de la zona que falló, para el registro. */
  ambito: string;
  /**
   * A dónde lleva el segundo botón, o `null` para no mostrarlo.
   *
   * En el panel, `/` devuelve a cada quien a la pantalla de inicio de su rol. En las páginas
   * públicas no sirve: `/` manda a quien no tiene sesión a Conóceme, así que un ciudadano a
   * media alta por QR saldría del formulario. Ahí solo se ofrece reintentar.
   */
  enlaceInicio?: Readonly<{ href: string; etiqueta: string }> | null;
}>) {
  const router = useRouter();
  const [reintentando, iniciarReintento] = useTransition();

  /**
   * `reset()` por sí solo NO recupera cuando el error vino del servidor.
   *
   * Comprobado apagando la base y volviéndola a encender: la frontera se vuelve a montar con
   * la misma respuesta fallida que ya tenía en memoria, así que el botón se pulsaba y no
   * pasaba nada. Hay que pedirle antes al enrutador que vuelva a traer el árbol del servidor
   * (`router.refresh()`) y solo entonces limpiar la frontera.
   *
   * Un botón que no hace nada es peor que no tener botón: en campo se toca varias veces y se
   * concluye que el sistema está caído cuando ya se había recuperado.
   */
  const reintentar = () => {
    iniciarReintento(() => {
      router.refresh();
      reset();
    });
  };

  useEffect(() => {
    // Queda en la consola con el ámbito y el digest, que son las dos cosas con las que se
    // cruza el registro del servidor. La telemetría estructurada llega en el entregable 1.10.
    console.error(`[${ambito}] La pantalla falló`, {
      digest: error.digest,
      mensaje: error.message
    });
  }, [error, ambito]);

  return (
    <div className="flex items-start justify-center px-4 py-10 sm:py-16">
      <div
        className="w-full max-w-lg rounded-3xl border bg-white p-6 sm:p-8 text-center"
        style={{ borderColor: "var(--line)", boxShadow: "var(--shadow-soft)" }}
        role="alert"
      >
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
        >
          <AlertTriangle size={30} aria-hidden="true" />
        </div>

        <h1 className="text-xl sm:text-2xl font-black" style={{ color: "var(--ink)" }}>
          {titulo}
        </h1>
        <p className="mt-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
          {ayuda}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            type="button"
            onClick={reintentar}
            disabled={reintentando}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white cursor-pointer disabled:opacity-60"
            style={{ background: "var(--blue-700)" }}
          >
            {reintentando ? (
              <>
                <Loader2 size={16} aria-hidden="true" className="animate-spin" /> Reintentando…
              </>
            ) : (
              <>
                <RotateCw size={16} aria-hidden="true" /> Reintentar
              </>
            )}
          </button>
          {enlaceInicio ? (
            <Link
              href={enlaceInicio.href}
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            >
              <Home size={16} aria-hidden="true" /> {enlaceInicio.etiqueta}
            </Link>
          ) : null}
        </div>

        {error.digest ? (
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Clave del fallo: <span className="font-mono normal-case">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
