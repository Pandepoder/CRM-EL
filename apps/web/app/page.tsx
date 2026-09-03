import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session-server";
import { getHomePathForRole } from "@tonala/ui";
import Link from "next/link";
import { ArrowRight, Map, Users, ShieldCheck } from "lucide-react";

/**
 * Portada pública.
 *
 * Antes era una plantilla genérica: fondo gris, un cuadrado azul vacío en lugar
 * del logo y un texto de producto ("la plataforma definitiva") que no mencionaba
 * ni una vez a Edgar López ni a Tonalá. Quien llegaba aquí no sabía de quién era
 * la campaña.
 *
 * Ahora usa la misma identidad que la pantalla de acceso —el monograma EL, el
 * azul #0b1f3a y el retrato del candidato— y las mismas curvas de animación que
 * el resto de la aplicación, para que no parezca una página aparte.
 */
export default async function HomePage() {
  const session = await getServerSession();

  // Si ya tiene sesión, mandarlo a su panel operativo
  if (session.isLoggedIn) {
    redirect(getHomePathForRole(session.roleKey));
  }

  const capacidades = [
    {
      icono: Map,
      titulo: "Territorio en vivo",
      texto:
        "Las 113 secciones de Tonalá con su cartografía oficial del INE, y encima el trabajo de cada brigada: contactos, visitas e incidencias.",
      tinte: "#1d4ed8",
      fondo: "#eff6ff"
    },
    {
      icono: Users,
      titulo: "Padrón y brigadas",
      texto:
        "Registra ciudadanos, ligalos a su colonia y sección, y reparte el trabajo entre los equipos que operan cada zona.",
      tinte: "#047857",
      fondo: "#ecfdf5"
    },
    {
      icono: ShieldCheck,
      titulo: "Cada quien lo suyo",
      texto:
        "Cada brigada ve su propio trabajo y nada más. Los permisos se comprueban en el servidor, no solo en la pantalla.",
      tinte: "#6d28d9",
      fondo: "#f5f3ff"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: "#f7f8fb" }}>
      <style>{`
        @keyframes el-entrada {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes el-retrato {
          from { opacity: 0; transform: scale(1.06); }
          to   { opacity: 1; transform: scale(1); }
        }
        .el-anim {
          opacity: 0;
          animation: el-entrada .7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .el-tarjeta {
          transition: transform .3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow .3s ease, border-color .3s ease;
        }
        .el-tarjeta:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 40px -24px rgba(11, 31, 58, .45);
          border-color: #c7d2e4;
        }
        .el-cta { transition: transform .25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow .25s ease, background .2s ease; }
        .el-cta:hover { transform: translateY(-2px); box-shadow: 0 14px 28px -14px rgba(11, 31, 58, .6); }
        .el-enlace { transition: color .2s ease; }

        /* Quien pide menos movimiento ve la página quieta, no invisible. */
        @media (prefers-reduced-motion: reduce) {
          .el-anim { animation: none; opacity: 1; }
          .el-tarjeta:hover, .el-cta:hover { transform: none; }
          .el-foto { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      {/* Barra superior */}
      <header
        className="w-full px-6 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20"
        style={{
          background: "rgba(255,255,255,.86)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid #e6eaf2"
        }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/brand/el-monograma-color.png"
            alt="Edgar López"
            width={34}
            height={34}
            style={{ width: 34, height: 34, objectFit: "contain", display: "block" }}
          />
          <span className="font-bold text-lg tracking-tight" style={{ color: "#0b1f3a" }}>
            Tonalá OS
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/conoceme"
            className="el-enlace font-semibold text-sm px-3 py-2 rounded-lg"
            style={{ color: "#0b1f3a" }}
          >
            Conóceme
          </Link>
          <Link
            href="/login"
            className="el-enlace font-semibold text-sm px-4 py-2 rounded-lg"
            style={{ color: "#0b1f3a", background: "#eef2f8" }}
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Portada con la identidad de la campaña */}
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
              background:
                "radial-gradient(900px 380px at 78% 12%, rgba(96,165,250,.20), transparent 62%)",
              pointerEvents: "none"
            }}
          />
          <div className="max-w-6xl mx-auto px-6 sm:px-8 py-14 sm:py-20 grid gap-10 lg:gap-14 lg:grid-cols-[1.05fr_.95fr] items-center relative">
            <div>
              <p
                className="el-anim text-xs font-bold uppercase mb-5"
                style={{ letterSpacing: ".16em", color: "#93c5fd", animationDelay: ".05s" }}
              >
                Edgar López · Un Tonalá Posible
              </p>
              <h1
                className="el-anim font-extrabold tracking-tight mb-5"
                style={{
                  fontSize: "clamp(2.1rem, 5vw, 3.4rem)",
                  lineHeight: 1.05,
                  textWrap: "balance",
                  animationDelay: ".12s"
                }}
              >
                La estructura territorial, en una sola pantalla
              </h1>
              <p
                className="el-anim mb-8"
                style={{
                  fontSize: "1.075rem",
                  lineHeight: 1.6,
                  color: "#c8d6ec",
                  maxWidth: "34rem",
                  animationDelay: ".2s"
                }}
              >
                Brigadas, padrón ciudadano, visitas e incidencias sobre la cartografía
                real de Tonalá. Cada equipo captura lo suyo y lo ve reflejado al momento.
              </p>

              <div className="el-anim flex flex-wrap items-center gap-3" style={{ animationDelay: ".28s" }}>
                <Link
                  href="/register"
                  className="el-cta inline-flex items-center justify-center gap-2 font-bold rounded-xl"
                  style={{ background: "#fff", color: "#0b1f3a", padding: "0.95rem 1.5rem", fontSize: "1rem" }}
                >
                  Solicitar acceso <ArrowRight size={18} />
                </Link>
                <Link
                  href="/login"
                  className="el-cta inline-flex items-center justify-center font-semibold rounded-xl"
                  style={{
                    color: "#fff",
                    padding: "0.95rem 1.4rem",
                    border: "1px solid rgba(255,255,255,.32)"
                  }}
                >
                  Ya soy parte de la estructura
                </Link>
              </div>
            </div>

            {/* Retrato del candidato */}
            <div className="relative hidden sm:block">
              <div
                className="el-foto"
                style={{
                  borderRadius: 20,
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,.18)",
                  boxShadow: "0 30px 70px -30px rgba(0,0,0,.65)",
                  opacity: 0,
                  animation: "el-retrato .9s cubic-bezier(0.16, 1, 0.3, 1) .18s forwards"
                }}
              >
                <img
                  src="/media/edgar-hero.jpg"
                  alt="Edgar López en territorio"
                  style={{ width: "100%", height: "clamp(260px, 38vw, 420px)", objectFit: "cover", display: "block" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Qué hace el sistema */}
        <section className="max-w-6xl mx-auto px-6 sm:px-8 py-14 sm:py-16">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {capacidades.map((c, i) => {
              const Icono = c.icono;
              return (
                <article
                  key={c.titulo}
                  className="el-anim el-tarjeta rounded-2xl p-6"
                  style={{
                    background: "#fff",
                    border: "1px solid #e6eaf2",
                    animationDelay: `${0.34 + i * 0.08}s`
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-xl mb-4"
                    style={{ width: 46, height: 46, background: c.fondo, color: c.tinte }}
                  >
                    <Icono size={22} />
                  </div>
                  <h3 className="font-bold text-lg mb-2" style={{ color: "#0b1f3a" }}>
                    {c.titulo}
                  </h3>
                  <p style={{ color: "#5b6780", fontSize: ".94rem", lineHeight: 1.6 }}>{c.texto}</p>
                </article>
              );
            })}
          </div>

          <div
            className="el-anim mt-10 rounded-2xl px-6 py-7 sm:px-8 flex flex-wrap items-center justify-between gap-4"
            style={{ background: "#fff", border: "1px solid #e6eaf2", animationDelay: ".6s" }}
          >
            <div>
              <h2 className="font-bold text-xl mb-1" style={{ color: "#0b1f3a" }}>
                ¿Vas a operar en campo?
              </h2>
              <p style={{ color: "#5b6780", fontSize: ".94rem" }}>
                Solicita tu acceso y un administrador te asignará tu brigada.
              </p>
            </div>
            <Link
              href="/register"
              className="el-cta inline-flex items-center gap-2 font-bold rounded-xl"
              style={{ background: "#0b1f3a", color: "#fff", padding: "0.85rem 1.4rem" }}
            >
              Solicitar acceso <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer
        className="py-7 px-6 text-center"
        style={{ background: "#fff", borderTop: "1px solid #e6eaf2" }}
      >
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
        <p style={{ color: "#8b95a9", fontSize: ".82rem" }}>
          © 2026 Edgar López · Un Tonalá Posible
        </p>
      </footer>
    </div>
  );
}
