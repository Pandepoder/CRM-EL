import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import VideoYoutube from "./VideoYoutube";

/**
 * Conóceme: página pública de campaña.
 *
 * Va fuera del panel operativo a propósito. No es solo para no estorbar a quien
 * entra a capturar a las siete de la mañana: al ser pública y compartible, un
 * brigadista puede abrirla en la puerta de una casa o mandarla por WhatsApp, que
 * es donde de verdad sirve.
 *
 * Los videos se cargan solo al tocarlos (ver VideoYoutube), así que abrir esta
 * página no consume datos de nadie que no quiera verlos.
 */

/**
 * Para añadir un video: pega aquí su identificador de YouTube.
 *
 * En un Short, el identificador es lo que va después de `/shorts/`:
 * `https://www.youtube.com/shorts/AbC123xyz` → `AbC123xyz`.
 * En un video normal, lo que va después de `v=`.
 *
 * `formato` es "corto" para los Shorts (verticales, es lo predeterminado) y
 * "horizontal" para un video apaisado de toda la vida.
 */
const VIDEOS: Array<{
  id: string;
  titulo: string;
  descripcion?: string;
  formato?: "corto" | "horizontal";
}> = [
  // Los títulos son los que tienen los videos en YouTube, leídos de su ficha
  // pública; no se inventó ninguno.
  { id: "UU9QMqIk1B4", titulo: "Platicamos con las y los vecinos de la calle Javier Mina" },
  { id: "2dquM8_pyUs", titulo: "Comunicación directa con SIAPA" },
  { id: "ZU7W-_iD1ro", titulo: "Sistema Integral Municipal de Cuidados de Tonalá" },
  { id: "mRRqvSGBvTQ", titulo: "Nuestro más sincero y orgulloso reconocimiento" },
  { id: "GTDRp1-kcEk", titulo: "Tonalá, Jalisco y el barro" },
  { id: "_KIjnKXLfPA", titulo: "2 de septiembre de 2026" }
];

// Los mismos trazos que usa la pantalla de acceso, para que las redes se vean
// idénticas en las dos páginas.
const ICONO_YOUTUBE =
  "M21.58 7.19a2.51 2.51 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42a2.51 2.51 0 0 0-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81a2.51 2.51 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.51 2.51 0 0 0 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81ZM10 15.02V8.98L15.2 12 10 15.02Z";

const REDES = [
  {
    nombre: "Instagram",
    href: "https://www.instagram.com/edgar_lopezj",
    path: "M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.2 1 .48 1.4.9.4.4.7.8.9 1.4.17.4.37 1 .42 2.2.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.05 1.2-.25 1.8-.42 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.17-1 .37-2.2.42-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.05-1.8-.25-2.2-.42-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.17-.4-.37-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.05-1.2.25-1.8.42-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.17 1-.37 2.2-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 5.2a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm5.9-7.8a1.08 1.08 0 1 1-2.15 0 1.08 1.08 0 0 1 2.15 0Z"
  },
  {
    nombre: "Facebook",
    href: "https://www.facebook.com/share/14khJUZf2aw/",
    path: "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.5-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"
  },
  { nombre: "YouTube", href: "https://youtube.com/@edgarlopezj", path: ICONO_YOUTUBE }
];

function IconoRed({ path, size = 20 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export default function ConocemePage() {
  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "#f7f8fb" }}>
      <style>{`
        @keyframes cm-entrada { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cm-foto { from { opacity: 0; transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }
        .cm-anim { opacity: 0; animation: cm-entrada .7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .cm-red { transition: transform .25s cubic-bezier(0.34, 1.56, 0.64, 1), background .2s ease, border-color .2s ease; }
        .cm-red:hover { transform: translateY(-2px); background: rgba(255,255,255,.16); border-color: rgba(255,255,255,.5); }
        .cm-volver { transition: color .2s ease, background .2s ease; }
        @media (prefers-reduced-motion: reduce) {
          .cm-anim { animation: none; opacity: 1; }
          .cm-foto { animation: none !important; opacity: 1 !important; }
          .cm-red:hover { transform: none; }
        }
      `}</style>

      <header
        className="w-full px-6 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20"
        style={{ background: "rgba(255,255,255,.88)", backdropFilter: "blur(10px)", borderBottom: "1px solid #e6eaf2" }}
      >
        <Link href="/" className="cm-volver flex items-center gap-2 font-semibold text-sm" style={{ color: "#0b1f3a" }}>
          <ArrowLeft size={17} /> Volver
        </Link>
        <Link
          href="/login"
          className="cm-volver font-semibold text-sm px-4 py-2 rounded-lg"
          style={{ color: "#0b1f3a", background: "#eef2f8" }}
        >
          Iniciar sesión
        </Link>
      </header>

      <main className="flex-1">
        {/* Retrato y eslogan */}
        <section
          style={{
            background: "linear-gradient(155deg, #0b1f3a 0%, #12305c 58%, #16407a 100%)",
            color: "#fff",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(820px 360px at 22% 8%, rgba(96,165,250,.20), transparent 62%)"
            }}
          />
          <div className="max-w-5xl mx-auto px-6 sm:px-8 py-14 sm:py-20 relative flex flex-col items-center text-center">
            <div
              className="cm-foto"
              style={{
                width: "clamp(132px, 26vw, 184px)",
                height: "clamp(132px, 26vw, 184px)",
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid rgba(255,255,255,.24)",
                boxShadow: "0 24px 60px -26px rgba(0,0,0,.7)",
                marginBottom: "1.75rem",
                opacity: 0,
                animation: "cm-foto .9s cubic-bezier(0.16, 1, 0.3, 1) .08s forwards"
              }}
            >
              <img
                src="/media/edgar-retrato.jpg"
                alt="Edgar López"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            </div>

            <p
              className="cm-anim text-xs font-bold uppercase mb-4"
              style={{ letterSpacing: ".18em", color: "#93c5fd", animationDelay: ".16s" }}
            >
              Edgar López
            </p>

            {/* El eslogan es el centro de la página: sin biografía todavía, es lo
                que tiene que quedarse en la cabeza de quien entra. */}
            <h1
              className="cm-anim font-extrabold tracking-tight"
              style={{
                fontSize: "clamp(1.95rem, 5.4vw, 3.35rem)",
                lineHeight: 1.08,
                textWrap: "balance",
                maxWidth: "18ch",
                animationDelay: ".24s"
              }}
            >
              Si pasa por tu vida pasa por tu mente
            </h1>

            <div
              className="cm-anim flex items-center gap-3 mt-9"
              style={{ animationDelay: ".34s" }}
            >
              {REDES.map(({ nombre, href, path }) => (
                <a
                  key={nombre}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={nombre}
                  className="cm-red flex items-center justify-center rounded-xl"
                  style={{
                    width: 46,
                    height: 46,
                    background: "rgba(255,255,255,.08)",
                    border: "1px solid rgba(255,255,255,.28)",
                    color: "#fff"
                  }}
                >
                  <IconoRed path={path} />
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Videos */}
        <section className="max-w-5xl mx-auto px-6 sm:px-8 py-14 sm:py-16">
          <h2
            className="cm-anim font-bold tracking-tight mb-2"
            style={{ fontSize: "1.5rem", color: "#0b1f3a", animationDelay: ".4s" }}
          >
            Videos
          </h2>
          <p
            className="cm-anim mb-7"
            style={{ color: "#5b6780", fontSize: ".95rem", animationDelay: ".44s" }}
          >
            Se reproducen solo cuando los tocas: abrir esta página no gasta tus datos.
          </p>

          {VIDEOS.length > 0 ? (
            <div className="grid gap-4 sm:gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {VIDEOS.map((v, i) => (
                <div key={v.id} className="cm-anim" style={{ animationDelay: `${0.5 + i * 0.05}s` }}>
                  <VideoYoutube
                    id={v.id}
                    titulo={v.titulo}
                    {...(v.descripcion ? { descripcion: v.descripcion } : {})}
                    {...(v.formato ? { formato: v.formato } : {})}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="cm-anim rounded-2xl px-6 py-10 text-center"
              style={{ background: "#fff", border: "1px dashed #c7d2e4", animationDelay: ".5s" }}
            >
              <p className="font-semibold mb-1" style={{ color: "#0b1f3a" }}>
                Todavía no hay videos publicados
              </p>
              <p style={{ color: "#5b6780", fontSize: ".92rem" }}>
                Mientras tanto, los encuentras en el canal de YouTube.
              </p>
              <a
                href="https://youtube.com/@edgarlopezj"
                target="_blank"
                rel="noopener noreferrer"
                className="cm-red inline-flex items-center gap-2 font-bold rounded-xl mt-5"
                style={{ background: "#0b1f3a", color: "#fff", padding: "0.8rem 1.35rem" }}
              >
                <IconoRed path={ICONO_YOUTUBE} size={18} /> Ver el canal
              </a>
            </div>
          )}
        </section>
      </main>

      <footer className="py-7 px-6 text-center" style={{ background: "#fff", borderTop: "1px solid #e6eaf2" }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <img
            src="/brand/el-monograma-color.png"
            alt=""
            width={22}
            height={22}
            style={{ width: 22, height: 22, objectFit: "contain" }}
          />
          <span className="font-semibold text-sm" style={{ color: "#0b1f3a" }}>
            Tonalá OS
          </span>
        </div>
        <p style={{ color: "#8b95a9", fontSize: ".82rem" }}>© 2026 Edgar López · Un Tonalá Posible</p>
      </footer>
    </div>
  );
}
