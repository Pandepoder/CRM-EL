"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/**
 * Video de YouTube con carga diferida ("fachada").
 *
 * Un iframe de YouTube corriente descarga alrededor de medio megabyte y planta
 * las cookies de Google en cuanto la página abre, aunque nadie le dé a
 * reproducir. Aquí solo se muestra la miniatura —que YouTube sirve como imagen
 * suelta, unos 30 KB— y el reproductor se inserta cuando la persona toca el
 * botón. Para quien entra a la página y no ve ningún video, el coste en datos
 * es cero.
 *
 * Se usa el dominio `youtube-nocookie.com`, que no deja rastreo hasta que
 * empieza la reproducción.
 */

/**
 * Los Shorts se incrustan igual que cualquier video: su identificador —el trozo
 * que va después de `/shorts/` en la dirección— sirve tal cual en el
 * reproductor. Lo que sí cambia es la forma: son verticales, así que el marco va
 * en 9:16 y la miniatura se pide en su proporción original (`oardefault`). La
 * miniatura estándar de YouTube es apaisada y recortaría la cabeza.
 */
const PROPORCION = { corto: "9 / 16", horizontal: "16 / 9" } as const;

export default function VideoYoutube({
  id,
  titulo,
  descripcion,
  formato = "corto"
}: {
  id: string;
  titulo: string;
  descripcion?: string;
  formato?: "corto" | "horizontal";
}) {
  const [reproduciendo, setReproduciendo] = useState(false);
  // `oardefault` es la miniatura en proporción original, la buena para Shorts;
  // no todos los videos la tienen, así que si falla se cae a la estándar.
  const [miniatura, setMiniatura] = useState(
    formato === "corto"
      ? `https://i.ytimg.com/vi/${id}/oardefault.jpg`
      : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  );

  return (
    <article
      className="rounded-2xl overflow-hidden h-full flex flex-col"
      style={{ background: "#fff", border: "1px solid #e6eaf2" }}
    >
      <div style={{ position: "relative", aspectRatio: PROPORCION[formato], background: "#0b1f3a" }}>
        {reproduciendo ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`}
            title={titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setReproduciendo(true)}
            aria-label={`Reproducir: ${titulo}`}
            className="grupo-video"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              padding: 0,
              border: 0,
              cursor: "pointer",
              background: "transparent"
            }}
          >
            <img
              src={miniatura}
              alt=""
              loading="lazy"
              onError={() => setMiniatura(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(11,31,58,.08) 0%, rgba(11,31,58,.58) 100%)"
              }}
            />
            <span
              aria-hidden="true"
              className="boton-play"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(255,255,255,.94)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 30px -10px rgba(0,0,0,.6)",
                transition: "transform .25s cubic-bezier(0.34, 1.56, 0.64, 1)"
              }}
            >
              <Play size={24} style={{ color: "#0b1f3a", marginLeft: 3 }} fill="#0b1f3a" />
            </span>
          </button>
        )}
      </div>

      <div className="px-4 py-3.5 flex-1">
        <h3 className="font-bold text-sm mb-0.5" style={{ color: "#0b1f3a", lineHeight: 1.35 }}>
          {titulo}
        </h3>
        {descripcion ? (
          <p style={{ color: "#5b6780", fontSize: ".84rem", lineHeight: 1.5 }}>{descripcion}</p>
        ) : null}
      </div>

      <style>{`
        .grupo-video:hover .boton-play { transform: translate(-50%, -50%) scale(1.09); }
        .grupo-video:focus-visible { outline: 3px solid #2563eb; outline-offset: -3px; }
        @media (prefers-reduced-motion: reduce) {
          .grupo-video:hover .boton-play { transform: translate(-50%, -50%); }
        }
      `}</style>
    </article>
  );
}
