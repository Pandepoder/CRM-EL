import type { CSSProperties } from "react";
import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, CheckCircle2, LogIn } from "lucide-react";

import "../publico.css";

import VideoYoutube from "./VideoYoutube";
import BotonCompartir from "./BotonCompartir";
import Contador from "./Contador";
import EnLosMedios from "./EnLosMedios";
import MapaJalisco from "./MapaJalisco";
import ReelCampana from "./ReelCampana";
import { ConstelacionJalisco } from "@/components/ConstelacionJalisco";
import { EsloganAnimado } from "@/components/EsloganAnimado";
import { ICONO_YOUTUBE, IconoRed, RedesPublicas } from "@/components/RedesPublicas";
import { CATEGORIAS_INCIDENCIA, CATEGORIA_DESCONOCIDA } from "@/lib/categorias-incidencia";
import { direccionPublica } from "@/lib/direccion-publica";
import { EN_LOS_MEDIOS } from "@/lib/en-los-medios";
import { cifrasPublicas } from "@/lib/pulso-publico";
import { tipografiaPublica } from "@/lib/tipografia-publica";
import { videosDelCanal, type VideoDelCanal } from "@/lib/videos-canal";
import { ESLOGAN_EN_TEXTO, ESLOGAN_ES_LARGO, MARCA } from "@/lib/marca";

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

/** Cuántos videos se enseñan: dos filas completas en un teléfono. */
const CUANTOS_VIDEOS = 6;

/**
 * La página se arma en cada visita, pero lo que cuesta —los videos del canal y las cifras del
 * sistema— viene guardado una hora. Se hace así y no con una página estática porque al compilar
 * la imagen no hay base de datos a la que preguntar: con página estática, el sitio recién
 * desplegado se quedaría hasta una hora sin cifras.
 */
export const dynamic = "force-dynamic";

/**
 * Lo que muestran WhatsApp y Facebook al compartir el enlace: antes salía «Jalisco OS — Sistema operativo
 * territorial» y sin imagen. La imagen es `opengraph-image.tsx`; aquí, el título, el texto y la dirección
 * completa con la que los robots la piden.
 */
export async function generateMetadata(): Promise<Metadata> {
  const titulo = `${MARCA.firma} · ${MARCA.lema}`;
  const descripcion = `“${ESLOGAN_EN_TEXTO}” Conoce ${MARCA.primeraPersona ? "mi" : "su"} trabajo en Jalisco: lo que nos pide la gente, dónde estamos trabajando y videos desde el territorio.`;
  return {
    metadataBase: await direccionPublica(),
    title: titulo,
    description: descripcion,
    alternates: { canonical: "/conoceme" },
    openGraph: { type: "website", locale: "es_MX", siteName: MARCA.firma, url: "/conoceme", title: titulo, description: descripcion },
    twitter: { card: "summary_large_image", title: titulo, description: descripcion }
  };
}

/**
 * Respaldo: solo se usa si el canal no responde (servidor sin salida a internet, YouTube caído).
 * Lo normal es que estos videos ni se vean, porque la lista viene del canal.
 *
 * Si algún día hay que fijar uno a mano: el identificador de un Short es lo que va después de
 * `/shorts/` en la dirección, y en un video normal lo que va después de `v=`.
 */
const VIDEOS_DE_RESPALDO: VideoDelCanal[] = [
  // Los títulos son los que tienen los videos en YouTube, leídos de su ficha
  // pública; no se inventó ninguno. Al 20 de septiembre de 2026. Son del canal de Edgar López: si
  // cambia la persona de `marca.ts`, esta lista se vacía o se cambia con ella.
  { id: "XXRMuPPUEec", titulo: "Entre Mentes con Edgar López 🎙️🎥", formato: "horizontal" },
  { id: "i8S0y49utMo", titulo: "¡TONALÁ SE VIVE CON SU GENTE!🇲🇽🤝", formato: "corto" },
  { id: "xioVXXi1QsM", titulo: "DESFILE CÍVICO-MILITAR #tonala", formato: "corto" },
  { id: "WOI0Wi9nO_s", titulo: "AYUDEMOS al comedor comunitario en Loma Bonita", formato: "corto" },
  { id: "11p2xl9RyWk", titulo: "En #tonala siempre de cerca escuchando sus necesidades", formato: "corto" },
  { id: "9Q3KK49ZIVU", titulo: "Las colonias se conocen por su #gente #tonala", formato: "corto" }
];

/** "Hace 3 días" para el video más reciente: da señal de que la página está viva. */
function haceCuanto(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (!Number.isFinite(dias) || dias < 0) return "Nuevo";
  if (dias === 0) return "Nuevo · hoy";
  if (dias === 1) return "Nuevo · ayer";
  if (dias <= 21) return `Nuevo · hace ${dias} días`;
  return "Lo más reciente";
}

/**
 * La etiqueta del primer video. Según de dónde venga la lista hay fecha exacta (canal RSS),
 * solo un "hace 2 semanas" (pestañas del canal) o nada (Shorts, que no la traen).
 */
function etiquetaDeNovedad(v: VideoDelCanal): string | null {
  if (v.publicado) return haceCuanto(v.publicado);
  if (!v.antiguedad) return null;
  return /hora|minuto|d[ií]a/.test(v.antiguedad) ? `Nuevo · ${v.antiguedad}` : "Lo más reciente";
}

export default async function ConocemePage() {
  // Las dos cosas que cuestan se piden a la vez, no una tras otra: YouTube y la base no se
  // necesitan mutuamente, y en fila sus esperas se sumaban.
  //   - Los últimos del canal, sin que nadie tenga que pegar enlaces ni volver a desplegar.
  //   - Cifras del propio sistema. Si la base no responde, `cifras` es null y esas bandas
  //     simplemente no salen: la página nunca enseña un tablero en ceros.
  const [{ videos: VIDEOS }, cifras] = await Promise.all([
    videosDelCanal(CUANTOS_VIDEOS, VIDEOS_DE_RESPALDO),
    cifrasPublicas()
  ]);
  const masPedido = cifras?.categorias[0]?.total ?? 0;
  // Las etiquetas junto al retrato solo salen con un dato real: nunca un cero ni un número de relleno.
  const brigadas = cifras?.brigadasActivas ?? 0;
  const atendidos = cifras?.incidenciasResueltas ?? 0;

  return (
    <div className={`pub welcome-page ${tipografiaPublica.className}`}>
      <div className="pub-progreso" aria-hidden="true" />

      <header className="pub-cabecera">
        {/* Antes habia aqui un "Volver" a la portada. Ahora la raiz redirige a
            esta misma pagina, asi que ese enlace era un bucle: se queda el
            monograma como identidad, sin navegacion a ninguna parte. */}
        <span className="pub-firma">
          <Image src={MARCA.monograma.color} alt="" width={32} height={32} />
          {MARCA.firma}
        </span>
        <Link href="/login" className="pub-entrar">
          <LogIn size={16} aria-hidden="true" />
          Iniciar sesión
        </Link>
      </header>

      <main>
        {/* Retrato y eslogan */}
        <section className="welcome-hero">
          <div className="pub-aurora" aria-hidden="true"><i /><i /><i /></div>
          <ConstelacionJalisco className="welcome-constelacion" />
          <div className="welcome-rejilla">
            {MARCA.retratoSinFondo || MARCA.retrato ? (
              <div className={MARCA.retratoSinFondo ? "welcome-foto welcome-foto--recorte" : "welcome-foto"}>
                {MARCA.retratoSinFondo ? (
                  // Sin fondo, la persona sale del mismo azul de la página: un disco de luz detrás y una órbita.
                  <>
                    <div className="welcome-disco" aria-hidden="true" />
                    <div className="welcome-orbita" aria-hidden="true"><i /></div>
                    <div className="welcome-persona">
                      <Image
                        src={MARCA.retratoSinFondo}
                        alt={MARCA.referente.nombre}
                        fill
                        priority
                        sizes="(max-width: 899px) 92vw, 560px"
                        className="welcome-persona-imagen"
                      />
                    </div>
                    <div className="welcome-foto-pie">
                      <strong>{MARCA.referente.nombre}</strong>
                      <span>{MARCA.lema}</span>
                    </div>
                  </>
                ) : MARCA.retrato ? (
                  <div className="pub-marco">
                    <div className="pub-marco-foto">
                      <Image
                        src={MARCA.retrato}
                        alt={MARCA.referente.nombre}
                        fill
                        priority
                        sizes="(max-width: 899px) 92vw, 460px"
                        className="welcome-foto-imagen"
                      />
                      <div className="welcome-foto-pie">
                        <strong>{MARCA.referente.nombre}</strong>
                        <span>{MARCA.lema}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
                {brigadas > 0 ? (
                  <p className="welcome-dato welcome-dato--arriba">
                    <span className="pub-latido" aria-hidden="true" />
                    <span><b>{brigadas.toLocaleString("es-MX")}</b> {brigadas === 1 ? "brigada trabajando" : "brigadas trabajando"}</span>
                  </p>
                ) : null}
                {atendidos > 0 ? (
                  <p className="welcome-dato welcome-dato--abajo">
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <span><b>{atendidos.toLocaleString("es-MX")}</b> {atendidos === 1 ? "reporte atendido" : "reportes atendidos"}</span>
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="welcome-texto">
              <p className="welcome-ceja">
                {MARCA.referente.corto}{MARCA.referente.cargo ? ` · ${MARCA.referente.cargo}` : ""} · Jalisco
              </p>

              {/* El eslogan es el centro de la página: sin biografía todavía, es lo
                  que tiene que quedarse en la cabeza de quien entra. */}
              <h1 className={ESLOGAN_ES_LARGO ? "welcome-titulo" : "welcome-titulo welcome-titulo--corto"}>
                <span className="sr-only">{ESLOGAN_EN_TEXTO}</span>
                <EsloganAnimado />
              </h1>

              <div className="welcome-acciones">
                <a
                  href={MARCA.redes.youtube ? "#videos" : MARCA.redes.instagram}
                  {...(MARCA.redes.youtube ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                  className="pub-boton"
                >
                  {MARCA.primeraPersona ? "Conoce mi trabajo" : "Conoce su trabajo"}
                  <span className="pub-boton-flecha" aria-hidden="true">
                    {MARCA.redes.youtube ? <ArrowDown size={20} /> : <ArrowUpRight size={20} />}
                  </span>
                </a>
                <RedesPublicas />
              </div>
            </div>
          </div>
        </section>

        {/* Lo que llevamos hecho: cifras del propio sistema */}
        {cifras ? (
          <section className="pulso-banda">
            <div className="pulso-interior">
              <div className="pulso-caja pub-revela">
                <p className="pub-ceja pub-ceja--claro">Lo que llevamos hecho</p>
                <div className="pulso-rejilla">
                  <Contador valor={cifras.incidenciasResueltas} etiqueta="Reportes atendidos" />
                  <Contador valor={cifras.visitasRealizadas} etiqueta="Visitas en campo" />
                  <Contador valor={cifras.coloniasRecorridas} etiqueta="Colonias recorridas" />
                  <Contador valor={cifras.brigadasActivas} etiqueta="Brigadas trabajando" />
                </div>
                <p className="pulso-pie">
                  Cifras del sistema con el que trabajan las brigadas, no de un folleto. Se actualizan solas.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Dónde estamos trabajando */}
        {cifras && cifras.municipios.length > 0 ? (
          <section className="mapa-seccion">
            <div className="pub-aurora pub-aurora--tenue" aria-hidden="true"><i /><i /></div>
            <div className="mapa-interior">
              <div className="mapa-texto pub-revela">
                <h2 className="pub-titulo pub-titulo--oscuro">
                  Jalisco,<br /><span className="pub-acento">municipio por municipio.</span>
                </h2>
                <p className="pub-lead pub-lead--oscuro">
                  Cada punto es un municipio del estado. Los que brillan son en los que ya hay trabajo
                  levantado por las brigadas.
                </p>
                <div className="mapa-fichas">
                  {cifras.municipios.slice(0, 6).map((m) => (
                    <span key={m.municipio} className="mapa-ficha">
                      {m.municipio} <b>{m.total}</b>
                    </span>
                  ))}
                </div>
              </div>
              <div className="mapa-lienzo" data-al-llegar="">
                <MapaJalisco activos={cifras.municipios} />
                <p className="mapa-nota">Los 125 municipios de Jalisco, representados por su centro.</p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Videos: solo si hay canal de YouTube configurado */}
        {MARCA.redes.youtube ? (
          <section id="videos" className="videos-seccion">
            <div className="videos-interior">
              <div className="pub-revela">
                <h2 className="pub-titulo">
                  Historias desde<br /><span className="pub-acento pub-acento--claro">el territorio.</span>
                </h2>
                <p className="pub-lead">Se reproducen solo cuando los tocas: abrir esta página no gasta tus datos.</p>
              </div>

              {VIDEOS.length > 0 ? (
                <div className="videos-rejilla">
                  {VIDEOS.map((v, i) => (
                    <div key={v.id} className="welcome-video-card">
                      {i === 0 && etiquetaDeNovedad(v) ? (
                        <span className="video-nuevo">{etiquetaDeNovedad(v)}</span>
                      ) : null}
                      {/* El formato solo se pasa si se sabe: si no, la tarjeta lo deduce de la miniatura. */}
                      <VideoYoutube id={v.id} titulo={v.titulo} {...(v.formato ? { formato: v.formato } : {})} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="videos-vacio pub-revela">
                  <p className="videos-vacio-titulo">Todavía no hay videos publicados</p>
                  <p>Mientras tanto, los encuentras en el canal de YouTube.</p>
                  <a href={MARCA.redes.youtube} target="_blank" rel="noopener noreferrer" className="videos-canal">
                    <IconoRed path={ICONO_YOUTUBE} size={18} /> Ver el canal
                  </a>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* Notas y entrevistas en otros medios: solo si el equipo ya cargó alguna */}
        <EnLosMedios lista={EN_LOS_MEDIOS} />

        {/* Lo que más nos piden */}
        {cifras && cifras.categorias.length > 0 ? (
          <section className="peticiones">
            <div className="peticiones-interior">
              <div className="pub-revela">
                <h2 className="pub-titulo">
                  Esto es lo que<br /><span className="pub-acento pub-acento--claro">nos pide la gente.</span>
                </h2>
                <p className="pub-lead">Lo que más se reporta en la calle, tal como entra al sistema.</p>
              </div>
              <ul className="peticiones-lista" data-al-llegar="">
                {cifras.categorias.map((c, i) => {
                  const info = CATEGORIAS_INCIDENCIA[c.categoria] ?? CATEGORIA_DESCONOCIDA;
                  const ancho = masPedido > 0 ? Math.max(8, Math.round((c.total / masPedido) * 100)) : 0;
                  return (
                    <li key={c.categoria} className="peticion-fila" style={{ "--i": i } as CSSProperties}>
                      <span
                        className="peticion-icono"
                        style={{ background: info.bg, border: `1px solid ${info.border}`, color: info.color }}
                        dangerouslySetInnerHTML={{ __html: info.svg }}
                      />
                      <span className="peticion-nombre">{info.label}</span>
                      <span className="peticion-barra">
                        <span className="peticion-relleno" style={{ width: `${ancho}%`, background: info.color }} />
                      </span>
                      <span className="peticion-total">{c.total}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}

        {/* Un minuto en territorio: solo con reel propio */}
        {MARCA.reel ? (
          <section className="reel-seccion">
            <div className="pub-aurora pub-aurora--tenue" aria-hidden="true"><i /><i /></div>
            <div className="reel-interior">
              <div className="reel-texto pub-revela">
                <p className="pub-ceja">Un minuto en territorio</p>
                <h2 className="pub-titulo pub-titulo--oscuro">
                  Así se ve<br /><span className="pub-acento">el trabajo en calle.</span>
                </h2>
                <p className="pub-lead pub-lead--oscuro">Se descarga solo si lo tocas.</p>
              </div>
              <div className="pub-revela reel-envoltura">
                <ReelCampana src={MARCA.reel.src} poster={MARCA.reel.poster} titulo="Recorrido de campaña" />
              </div>
            </div>
          </section>
        ) : null}

        {/* Cierre: comparte y sigue */}
        <section className="cierre">
          <div className="pub-aurora pub-aurora--cierre" aria-hidden="true"><i /><i /></div>
          <div className="cierre-interior pub-revela">
            <Image src={MARCA.monograma.blanco} alt="" width={52} height={52} className="cierre-monograma" />
            <h2 className="cierre-titulo">Pásale esta página a tu gente.</h2>
            <p className="cierre-lead">Se abre en cualquier teléfono y no gasta datos hasta que alguien toca un video.</p>
            <BotonCompartir mensaje={`Conoce el trabajo de ${MARCA.referente.corto} en Jalisco:`} />
            <RedesPublicas className="cierre-redes" />
          </div>
        </section>
      </main>

      <footer className="pub-pie">
        <div className="pub-pie-marca">
          <Image src={MARCA.monograma.color} alt="" width={24} height={24} />
          <span>Jalisco OS</span>
        </div>
        <p>© 2026 {MARCA.firma} · {MARCA.lema}</p>
        <nav className="pub-pie-enlaces" aria-label="Avisos legales">
          <Link href="/privacidad">Política de Privacidad</Link>
          <Link href="/terminos">Términos de Uso</Link>
        </nav>
      </footer>
    </div>
  );
}
