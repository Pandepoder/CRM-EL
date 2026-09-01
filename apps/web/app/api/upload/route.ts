import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

import { actorFromSession, unauthorized } from "@/lib/api-helpers";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_IMAGE_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_SIZE = 60 * 1024 * 1024; // 60 MB

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/gif"
]);

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/avi"
]);

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

      const mimeType = file.type.toLowerCase();
      const isImage = ALLOWED_IMAGE_TYPES.has(mimeType) || mimeType.startsWith("image/");
      const isVideo = ALLOWED_VIDEO_TYPES.has(mimeType) || mimeType.startsWith("video/");

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

      // Safe filename generation
      const originalExt = path.extname(file.name).toLowerCase() || (isImage ? ".jpg" : ".mp4");
      const safeExt = originalExt.replace(/[^a-z0-9.]/gi, "");
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
