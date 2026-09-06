import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

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
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "image/gif": ".gif"
};

const VIDEO_TYPE_TO_EXT: Record<string, string> = {
  "video/mp4": ".mp4",
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

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const uploadedFiles: UploadedFileResponse[] = [];

    for (const file of files) {
      if (!(file instanceof File) || file.size === 0) continue;

      // Sin el `|| mimeType.startsWith("image/")` que habia aqui: bastaba
      // declarar "image/svg+xml" —o cualquier "image/loquesea"— para saltarse
      // la lista blanca entera.
      const mimeType = file.type.toLowerCase().split(";")[0]?.trim() ?? "";
      const imageExt = IMAGE_TYPE_TO_EXT[mimeType];
      const videoExt = VIDEO_TYPE_TO_EXT[mimeType];
      const isImage = Boolean(imageExt);
      const isVideo = Boolean(videoExt);

      if (!isImage && !isVideo) {
        return NextResponse.json(
          { error: `Tipo de archivo no soportado: ${file.name} (${file.type}). Solo se permiten fotos y videos.` },
          { status: 400 }
        );
      }

      if (isImage && file.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: `La imagen ${file.name} excede el límite máximo de 15 MB.` },
          { status: 400 }
        );
      }

      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        return NextResponse.json(
          { error: `El video ${file.name} excede el límite máximo de 60 MB.` },
          { status: 400 }
        );
      }

      // La extension sale del tipo validado, no de `file.name`: el nombre lo
      // elige quien sube el archivo y era la via para dejar un .html en
      // public/uploads.
      const safeExt = imageExt ?? videoExt ?? ".bin";
      const uniqueFilename = `${Date.now()}-${randomUUID()}${safeExt}`;
      const filePath = path.join(uploadDir, uniqueFilename);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filePath, buffer);

      const fileType: "image" | "video" = isVideo ? "video" : "image";
      uploadedFiles.push({
        url: `/api/uploads/${uniqueFilename}`,
        type: fileType,
        name: file.name,
        size: file.size
      });
    }

    return NextResponse.json({
      ok: true,
      files: uploadedFiles,
      file: uploadedFiles[0] // convenient shortcut for single upload
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error al procesar y guardar los archivos multimedia." },
      { status: 500 }
    );
  }
}
