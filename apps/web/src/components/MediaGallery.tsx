"use client";

import { useState } from "react";
import { Image as ImageIcon, Video, Play, X, Maximize2 } from "lucide-react";

export interface GalleryMediaItem {
  url: string;
  type?: "image" | "video" | undefined;
  name?: string | undefined;
  size?: number | undefined;
}

export function MediaGallery({
  media = [],
  title = "Evidencia Multimedia"
}: {
  media: Array<GalleryMediaItem | string>;
  title?: string;
}) {
  const [activeItem, setActiveItem] = useState<GalleryMediaItem | null>(null);

  if (!media || media.length === 0) return null;

  const normalizedItems: GalleryMediaItem[] = media
    .filter(Boolean)
    .map((item) => {
      if (typeof item === "string") {
        const isVid = item.endsWith(".mp4") || item.endsWith(".webm") || item.endsWith(".mov");
        return { url: item, type: isVid ? "video" : "image", name: "Evidencia" };
      }
      const isVid = item.type === "video" || item.url.endsWith(".mp4") || item.url.endsWith(".webm") || item.url.endsWith(".mov");
      return { ...item, type: isVid ? "video" : "image" };
    });

  if (normalizedItems.length === 0) return null;

  return (
    <div style={{ marginTop: "10px", width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "6px",
          fontSize: "10px",
          fontWeight: "800",
          color: "#475569",
          textTransform: "uppercase"
        }}
      >
        <ImageIcon size={13} style={{ color: "#2563eb" }} />
        <span>
          {title} ({normalizedItems.length})
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: normalizedItems.length === 1 ? "1fr" : "repeat(auto-fill, minmax(90px, 1fr))",
          gap: "6px"
        }}
      >
        {normalizedItems.map((item, idx) => {
          const isVideo = item.type === "video";

          return (
            <div
              key={item.url + idx}
              onClick={() => setActiveItem(item)}
              style={{
                position: "relative",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #cbd5e1",
                cursor: "pointer",
                background: "#0f172a",
                aspectRatio: normalizedItems.length === 1 ? "16/9" : "1",
                maxHeight: normalizedItems.length === 1 ? "180px" : "auto"
              }}
            >
              {isVideo ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                    color: "white"
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: "rgba(37, 99, 235, 0.9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "4px"
                    }}
                  >
                    <Play size={16} fill="white" />
                  </div>
                  <span style={{ fontSize: "9px", fontWeight: "800", textTransform: "uppercase" }}>Ver Video</span>
                </div>
              ) : (
                <img
                  src={item.url}
                  alt={item.name || "Evidencia"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "transform 0.2s"
                  }}
                />
              )}

              {/* Badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: "3px",
                  left: "3px",
                  background: "rgba(0,0,0,0.7)",
                  backdropFilter: "blur(4px)",
                  borderRadius: "4px",
                  padding: "1px 5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  color: "white",
                  fontSize: "8px",
                  fontWeight: "800"
                }}
              >
                {isVideo ? <Video size={10} /> : <ImageIcon size={10} />}
                <span>{isVideo ? "Video" : "Foto"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox / Video Player Modal */}
      {activeItem && (
        <div
          onClick={() => setActiveItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "88vh",
              background: "#0f172a",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                zIndex: 20,
                display: "flex",
                gap: "8px"
              }}
            >
              <button
                onClick={() => setActiveItem(null)}
                style={{
                  background: "rgba(0, 0, 0, 0.7)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer"
                }}
              >
                <X size={20} />
              </button>
            </div>

            {activeItem.type === "video" ? (
              <video
                src={activeItem.url}
                controls
                autoPlay
                style={{
                  maxWidth: "90vw",
                  maxHeight: "82vh",
                  display: "block",
                  outline: "none"
                }}
              />
            ) : (
              <img
                src={activeItem.url}
                alt={activeItem.name || "Evidencia fotográfica"}
                style={{
                  maxWidth: "90vw",
                  maxHeight: "82vh",
                  objectFit: "contain",
                  display: "block"
                }}
              />
            )}

            <div
              style={{
                padding: "8px 14px",
                background: "rgba(15, 23, 42, 0.95)",
                color: "#e2e8f0",
                fontSize: "11px",
                fontWeight: "700",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <span>{activeItem.name || "Evidencia Multimedia"}</span>
              <a
                href={activeItem.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#38bdf8", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
              >
                <Maximize2 size={12} /> Abrir original
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
