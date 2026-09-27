import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { readFile, stat } from "fs/promises";
import path from "path";
import { existsSync, createReadStream } from "fs";
import { Readable } from "stream";
import { registrarError } from "@/lib/registro";
import { esNombreDeArchivoValido, puedeVerArchivo } from "@/lib/archivos";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".mp4": "video/mp4",
  ".3gp": "video/3gpp",
  ".3g2": "video/3gpp2",
  ".m4v": "video/x-m4v",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo"
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  // Aquí salen las fotos y los videos de incidencias, visitas y escucha social:
  // domicilios, rostros y credenciales de vecinos. Se servían sin ninguna guarda,
  // así que con el nombre del archivo cualquiera se los descargaba, incluso sin
  // haber iniciado sesión. Sesión activa es el mínimo.
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  const { filename } = await params;
  if (!filename || !esNombreDeArchivoValido(filename)) {
    return new NextResponse("Invalid filename", { status: 400 });
  }

  // Y además, que pueda ver el registro que usa el archivo (A12): con la sesión bastaba, así que un
  // líder bajaba las fotos de las brigadas de otra dirección. Se responde igual que si el archivo no
  // existiera: confirmar que existe ya dice algo del trabajo ajeno. Ver `lib/archivos.ts`.
  if (!(await puedeVerArchivo(filename, actor.actorId))) {
    return new NextResponse("File not found", { status: 404 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  const filePath = path.join(uploadDir, filename);

  if (!existsSync(filePath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  try {
    const fileStat = await stat(filePath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    // Antes: `private, max-age=31536000, immutable`. Con eso el navegador no volvía a preguntar en un
    // año, y en un teléfono compartido de brigada la foto seguía saliendo de la caché para la
    // siguiente sesión aunque ya no pudiera verla. Ahora el navegador la guarda pero pregunta cada
    // vez; si no cambió, la respuesta es un 304 sin cuerpo —la foto no se vuelve a descargar— y la
    // pregunta pasa por la guarda de arriba.
    const etiqueta = `"${fileStat.size.toString(16)}-${Math.floor(fileStat.mtimeMs).toString(16)}"`;
    const cache = { ETag: etiqueta, "Cache-Control": "private, no-cache" };
    if (req.headers.get("if-none-match") === etiqueta) {
      return new NextResponse(null, { status: 304, headers: cache });
    }

    const rangeHeader = req.headers.get("range");

    if (rangeHeader && contentType.startsWith("video/")) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0] || "0", 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileStat.size - 1;
      const chunksize = end - start + 1;

      const nodeStream = createReadStream(filePath, { start, end });
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
          ...cache
        }
      });
    }

    const fileBuffer = await readFile(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileStat.size.toString(),
        // `private`: el archivo ya solo se entrega con sesión, y una caché
        // compartida guardándolo devolvería la misma foto a quien no la tiene.
        ...cache
      }
    });
  } catch (error) {
    registrarError("Error serving uploaded media", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
