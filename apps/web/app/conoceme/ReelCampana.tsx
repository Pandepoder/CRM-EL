"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/**
 * El video corto de campaña, con la misma idea que los de YouTube: primero solo la portada y el
 * video se descarga cuando alguien lo toca. Son varios megabytes; abrir la página en la calle no
 * debe gastarlos si nadie va a verlo.
 */
export default function ReelCampana({ src, poster, titulo }: { src: string; poster: string; titulo: string }) {
  const [reproduciendo, setReproduciendo] = useState(false);

  return (
    <div className="reel-marco">
      {reproduciendo ? (
        <video
          src={src}
          poster={poster}
          controls
          autoPlay
          playsInline
          preload="auto"
          className="reel-medio"
        />
      ) : (
        <button type="button" onClick={() => setReproduciendo(true)} aria-label={`Reproducir: ${titulo}`} className="reel-boton">
          <img src={poster} alt="" loading="lazy" className="reel-medio" />
          <span aria-hidden="true" className="reel-velo" />
          <span aria-hidden="true" className="reel-play">
            <Play size={26} style={{ color: "#0b1f3a", marginLeft: 3 }} fill="#0b1f3a" />
          </span>
          <span className="reel-titulo">{titulo}</span>
        </button>
      )}
    </div>
  );
}
