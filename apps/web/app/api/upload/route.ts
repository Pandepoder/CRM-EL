import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { registrarError } from "@/lib/registro";
import { getDatabaseClient } from "@/lib/db-client";
import { urlDeArchivo } from "@/lib/archivos";
import { schema } from "@tonala/shared/database";

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_SIZE = 60 * 1024 * 1024; // 60 MB

// El tipo declarado por el cliente decide la extension con la que se guarda el
// archivo, nunca el nombre que venga en el formulario. `public/uploads` lo sirve
// Next como estatico, asi que un archivo terminado en .html o .svg se entregaria
// con su propio Content-Type y ejecutaria scripts en el mismo origen de la app:
// una foto de incidencia se convierte en robo de sesion del coordinador que la
// abre. Con este mapa solo pueden existir en disco las extensiones de aqui.
const IMAGE_TYPE_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  // Variante no estandar, pero la mandan algunos navegadores y selectores de
  // archivo de Android. Antes colaba por el `startsWith("image/")`; al quitarlo
  // habria empezado a rechazar fotos buenas en campo.
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  // Live Photos de iPhone.
  "image/heic-sequence": ".heic",
  "image/heif-sequence": ".heif",
  "image/gif": ".gif"
};

const VIDEO_TYPE_TO_EXT: Record<string, string> = {
  "video/mp4": ".mp4",
  // Lo que graba la camara de muchos Android, sobre todo gama de entrada.
  "video/3gpp": ".3gp",
  "video/3gpp2": ".3g2",
  "video/x-m4v": ".m4v",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-matroska": ".mkv",
  "video/avi": ".avi",
  "video/x-msvideo": ".avi"
};

export interface UploadedFileResponse {
  url: string;
  type: "image" | "video";
  name: string;
  size: number;
}

export async function POST(req: Request) {
  const actor = await actorFromSession();
  if (!actor) return unauthorized();

  try {
    const formData = await req.formData();
    const files = formData.getAll("file") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No se enviaron archivos para subir." }, { status: 400 });
    }

    // Primero se revisan TODOS los archivos y después se escribe: antes, si el segundo de dos
    // archivos no pasaba la revisión, el primero ya estaba en disco y quedaba huérfano.
    const aceptados: { file: File; ext: string; tipo: "image" | "video" }[] = [];
    for (const file of files) {
      if (!(file instanceof File) || file.size === 0) continue;

      // Sin el `|| mimeType.startsWith("image/")` que habia aqui: bastaba
      // declarar "image/svg+xml" —o cualquier "image/loquesea"— para saltarse
      // la lista blanca entera.
      const mimeType = file.type.toLowerCase().split(";")[0]?.trim() ?? "";
      const imageExt = IMAGE_TYPE_TO_EXT[mimeType];
      const videoExt = VIDEO_TYPE_TO_EXT[mimeType];

      if (!imageExt && !videoExt) {
        return NextResponse.json(
          { error: `Tipo de archivo no soportado: ${file.name} (${file.type}). Solo se permiten fotos y videos.` },
          { status: 400 }
        );
      }

      if (imageExt && file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `La imagen ${file.name} excede el límite máximo de 15 MB.` },
          { status: 400 }
        );
      }

      if (videoExt && file.size > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { error: `El video ${file.name} excede el límite máximo de 60 MB.` },
          { status: 400 }
        );
      }

      // La extension sale del tipo validado, no de `file.name`: el nombre lo
      // elige quien sube el archivo y era la via para dejar un .html en
      // public/uploads.
      aceptados.push({ file, ext: imageExt ?? videoExt ?? ".bin", tipo: videoExt ? "video" : "image" });
    }

    if (aceptados.length === 0) {
      return NextResponse.json({ error: "No se enviaron archivos para subir." }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const uploadedFiles: UploadedFileResponse[] = [];
    const escritos: string[] = [];
    try {
      for (const { file, ext, tipo } of aceptados) {
        const uniqueFilename = `${Date.now()}-${randomUUID()}${ext}`;
        const filePath = path.join(uploadDir, uniqueFilename);
        await writeFile(filePath, Buffer.from(await file.arrayBuffer()));
        escritos.push(filePath);
        uploadedFiles.push({ url: urlDeArchivo(uniqueFilename), type: tipo, name: file.name, size: file.size });
      }

      // Quién subió cada archivo: decide quién puede verlo mientras el registro que lo usará todavía
      // no existe, y que nadie adjunte como propia la foto de otra persona. Ver `lib/archivos.ts`.
      await getDatabaseClient()
        .insert(schema.uploadedFiles)
        .values(uploadedFiles.map((f) => ({
          fileName: f.url.split("/").pop()!,
          uploadedByUserId: actor.actorId,
          mediaType: f.type,
          sizeBytes: f.size
        })));
    } catch (error) {
      // Un archivo sin dueño registrado solo lo vería quien pudiera ver el registro que lo usa, y
      // ese registro nunca llegará a existir: se borra en vez de dejarlo en disco.
      await Promise.all(escritos.map((f) => unlink(f).catch(() => undefined)));
      throw error;
    }

    return NextResponse.json({
      ok: true,
      files: uploadedFiles,
      file: uploadedFiles[0] // convenient shortcut for single upload
    });
  } catch (error: any) {
    registrarError("Upload error", error);
    return NextResponse.json(
      { error: "Error al procesar y guardar los archivos multimedia." },
      { status: 500 }
    );
  }
}
