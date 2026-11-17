import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";
import sharp from "sharp";

import { ALTO_JALISCO, ANCHO_JALISCO, PUNTOS_JALISCO, RED_JALISCO } from "@/lib/proyeccion-jalisco";
import { MARCA } from "@/lib/marca";

/**
 * La imagen que sale en WhatsApp y Facebook al compartir Conóceme.
 *
 * Se arma al compilar con lo que diga `marca.ts` (nombre, eslogan, lema y foto): si cambia la marca, cambia
 * sola, sin que nadie edite una imagen a mano. Solo lleva material de campaña, nunca una cifra de la operación.
 * La pide el robot de cada red sin sesión, por eso el middleware la deja pasar.
 *
 * Sale en JPG: en PNG pesaba más de medio mega, y WhatsApp deja sin foto los enlaces con imágenes pesadas.
 * `sharp` (el mismo que usa Next para optimizar imágenes) convierte la foto y el resultado.
 */
export const alt = `${MARCA.firma} · ${MARCA.lema}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";

const PUBLICO = path.join(process.cwd(), "public");
const FUENTES = path.join(process.cwd(), "src", "fonts");

async function comoDato(rutaPublica: string): Promise<string> {
  // El generador (satori) no lee WebP: todo entra como PNG.
  const png = await sharp(await readFile(path.join(PUBLICO, rutaPublica))).resize({ width: 720, withoutEnlargement: true }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** La misma constelación de la página, dibujada como imagen: satori no pinta SVG dentro del árbol. */
function constelacion(): string {
  const puntos = PUNTOS_JALISCO.map((p, i) =>
    `<circle cx="${p.x}" cy="${p.y}" r="${i % 9 === 0 ? 8 : 5}" fill="${i % 9 === 0 ? "#5eeaae" : "#8ec5ff"}" opacity="${i % 9 === 0 ? 0.95 : 0.6}"/>`
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ANCHO_JALISCO} ${ALTO_JALISCO}"><path d="${RED_JALISCO}" fill="none" stroke="#8ec5ff" stroke-width="1.6" opacity="0.28"/>${puntos}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export default async function ImagenParaCompartir() {
  const [negrita, semi, monograma, foto] = await Promise.all([
    readFile(path.join(FUENTES, "figtree-latin-800-normal.woff")),
    readFile(path.join(FUENTES, "figtree-latin-600-normal.woff")),
    comoDato(MARCA.monograma.blanco),
    MARCA.retratoSinFondo ? comoDato(MARCA.retratoSinFondo) : MARCA.retrato ? comoDato(MARCA.retrato) : Promise.resolve(null)
  ]);
  const { inicio, suave, acento, comillas } = MARCA.eslogan;
  const altoConstelacion = Math.round((620 * ALTO_JALISCO) / ANCHO_JALISCO);

  const imagen = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Figtree",
          color: "#fff",
          background: "linear-gradient(160deg, #06152c 0%, #0a2342 55%, #0c2f66 100%)"
        }}
      >
        <img src={constelacion()} width={620} height={altoConstelacion} style={{ position: "absolute", right: -40, top: 10 }} />

        {foto ? (
          <div style={{ position: "absolute", top: 0, right: 0, width: 640, height: 630, display: "flex" }}>
            <div
              style={{
                position: "absolute",
                left: 175,
                top: 40,
                width: 420,
                height: 420,
                borderRadius: "50%",
                background: "radial-gradient(circle at 34% 28%, #6fa3ff 0%, #2a6ff0 30%, #1450c8 60%, #0c2f66 100%)",
                boxShadow: "0 0 120px 30px rgba(42,111,240,0.45)"
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 140,
                top: 5,
                width: 490,
                height: 490,
                borderRadius: "50%",
                border: "2px solid rgba(142,197,255,0.35)"
              }}
            />
            <img src={foto} width={640} height={665} style={{ position: "absolute", left: 10, top: 18, objectFit: "contain" }} />
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: 170,
                background: "linear-gradient(180deg, rgba(12,47,102,0) 0%, #0c2f66 92%)"
              }}
            />
          </div>
        ) : null}

        <div style={{ position: "absolute", left: 72, top: 64, width: 600, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src={monograma} width={58} height={58} />
            <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.01em" }}>{MARCA.firma}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 44, color: "#8ec5ff", fontSize: 20, fontWeight: 600, letterSpacing: "0.16em" }}>
            <div style={{ width: 34, height: 3, borderRadius: 3, background: "linear-gradient(100deg, #8ec5ff, #5eeaae)" }} />
            {`${MARCA.referente.corto.toUpperCase()} · JALISCO`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 18, fontSize: 70, fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.03em" }}>
            {inicio ? <span>{`${comillas ? "“" : ""}${inicio}`}</span> : null}
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              <span style={{ color: "#b6c6de", marginRight: 18 }}>{suave}</span>
              <span style={{ backgroundImage: "linear-gradient(100deg, #8ec5ff, #5eeaae)", backgroundClip: "text", color: "transparent" }}>
                {`${acento}${comillas ? "”" : ""}`}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 40 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 26px",
                borderRadius: 999,
                background: "#fff",
                color: "#0a2342",
                fontSize: 26,
                fontWeight: 800
              }}
            >
              <div style={{ width: 14, height: 14, borderRadius: 7, background: "#12a36f" }} />
              {MARCA.lema}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Figtree", data: negrita, weight: 800, style: "normal" },
        { name: "Figtree", data: semi, weight: 600, style: "normal" }
      ]
    }
  );
  const jpg = await sharp(Buffer.from(await imagen.arrayBuffer())).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpg), { headers: { "Content-Type": contentType } });
}
