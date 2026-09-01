"use client";

import { useState, useRef } from "react";
import { Image as ImageIcon, Video, UploadCloud, X, Loader2, Play } from "lucide-react";

export interface MediaFile {
  url: string;
  type: "image" | "video";
  name: string;
  size?: number | undefined;
}

export function MediaUploader({
  value = [],
  onChange,
  maxFiles = 6,
  label = "Evidencia Fotográfica / Video",
  helperText = "Puedes adjuntar fotos o videos (hasta 60 MB)",
  disabled = false
}: {
  value?: MediaFile[];
  onChange: (files: MediaFile[]) => void;
  maxFiles?: number;
  label?: string;
  helperText?: string;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);

  const safeFiles = Array.isArray(value) ? value : [];

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (safeFiles.length + files.length > maxFiles) {
      setUploadError(`Solo puedes adjuntar un máximo de ${maxFiles} archivos.`);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f) formData.append("file", f);
    }

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al subir archivos.");
      }

      const newUploaded: MediaFile[] = data.files || (data.file ? [data.file] : []);
      onChange([...safeFiles, ...newUploaded]);
    } catch (err: any) {
      setUploadError(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    const next = safeFiles.filter((_, i) => i !== index);
    onChange(next);
  };

  return (
    <div style={{ width: "100%" }}>
      {label && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <label style={{ fontSize: "10px", fontWeight: "800", color: "#475569", textTransform: "uppercase" }}>
            {label} ({safeFiles.length}/{maxFiles})
          </label>
          {helperText && <span style={{ fontSize: "9px", color: "#94a3b8" }}>{helperText}</span>}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        disabled={disabled || isUploading || safeFiles.length >= maxFiles}
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      {/* Drop / Click Zone */}
      {safeFiles.length < maxFiles && (
        <div
          onClick={() => {
            if (!disabled && !isUploading) fileInputRef.current?.click();
          }}
          style={{
            border: "2px dashed #cbd5e1",
            borderRadius: "10px",
            padding: "12px",
            textAlign: "center",
            cursor: disabled || isUploading ? "not-allowed" : "pointer",
            background: isUploading ? "#f1f5f9" : "#f8fafc",
            transition: "all 0.15s",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px"
          }}
        >
          {isUploading ? (
            <>
              <Loader2 size={20} className="animate-spin text-blue-600" />
              <span style={{ fontSize: "11px", fontWeight: "700", color: "#2563eb" }}>Subiendo archivos multimedia...</span>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                <UploadCloud size={18} style={{ color: "#2563eb" }} />
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#334155" }}>
                  Tomar foto, video o seleccionar de la galería
                </span>
              </div>
              <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                Formatos: JPG, PNG, WEBP, MP4, MOV (Auto-optimizado)
              </span>
            </>
          )}
        </div>
      )}

      {uploadError && (
        <div style={{ marginTop: "4px", fontSize: "10px", color: "#dc2626", fontWeight: "700" }}>
          ⚠️ {uploadError}
        </div>
      )}

      {/* Uploaded Thumbnails Grid */}
      {safeFiles.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))",
            gap: "8px",
            marginTop: "8px"
          }}
        >
          {safeFiles.map((file, idx) => {
            const isVideo = file.type === "video" || file.url.endsWith(".mp4") || file.url.endsWith(".webm") || file.url.endsWith(".mov");

            return (
              <div
                key={file.url + idx}
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "1",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid #cbd5e1",
                  background: "#0f172a"
                }}
              >
                {isVideo ? (
                  <div
                    onClick={() => setPreviewMedia(file)}
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                      color: "white"
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: "rgba(37, 99, 235, 0.9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "2px"
                      }}
                    >
                      <Play size={14} fill="white" />
                    </div>
                    <span style={{ fontSize: "8px", fontWeight: "800", textTransform: "uppercase" }}>Video</span>
                  </div>
                ) : (
                  <img
                    src={file.url}
                    alt={file.name || "Foto adjunta"}
                    onClick={() => setPreviewMedia(file)}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      cursor: "pointer"
                    }}
                  />
                )}

                {/* Badge Type */}
                <div
                  style={{
                    position: "absolute",
                    bottom: "3px",
                    left: "3px",
                    background: "rgba(0,0,0,0.65)",
                    backdropFilter: "blur(4px)",
                    borderRadius: "4px",
                    padding: "1px 4px",
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    color: "white",
                    fontSize: "8px",
                    fontWeight: "800"
                  }}
                >
                  {isVideo ? <Video size={10} /> : <ImageIcon size={10} />}
                  <span>{isVideo ? "Video" : "Foto"}</span>
                </div>

                {/* Delete Button */}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(idx);
                    }}
                    style={{
                      position: "absolute",
                      top: "3px",
                      right: "3px",
                      background: "rgba(220, 38, 38, 0.9)",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer"
                    }}
                    title="Eliminar archivo"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewMedia && (
        <div
          onClick={() => setPreviewMedia(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "85vh",
              background: "#0f172a",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }}
          >
            <button
              onClick={() => setPreviewMedia(null)}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                zIndex: 10,
                background: "rgba(0,0,0,0.7)",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <X size={18} />
            </button>

            {previewMedia.type === "video" || previewMedia.url.endsWith(".mp4") || previewMedia.url.endsWith(".webm") || previewMedia.url.endsWith(".mov") ? (
              <video
                src={previewMedia.url}
                controls
                autoPlay
                style={{
                  maxWidth: "100%",
                  maxHeight: "80vh",
                  display: "block",
                  outline: "none"
                }}
              />
            ) : (
              <img
                src={previewMedia.url}
                alt={previewMedia.name || "Vista previa"}
                style={{
                  maxWidth: "100%",
                  maxHeight: "80vh",
                  objectFit: "contain",
                  display: "block"
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
