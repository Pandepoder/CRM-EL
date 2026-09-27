"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";

import { AvatarPersona } from "@/components/AvatarPersona";

/**
 * La foto de perfil propia, con el botón para cambiarla desde el teléfono (3.6). Antes no existía
 * forma de poner una foto: `user_profiles` no tenía columna y la barra lateral pintaba iniciales
 * (C15). Se sube con `/api/upload`, igual que cualquier evidencia, y se guarda con
 * `PATCH /api/auth/profile`.
 */
export function FotoDePerfilEditable({
  nombre,
  fotoUrl,
  tamano = 80
}: {
  nombre: string;
  fotoUrl: string | null;
  tamano?: number;
}) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState(fotoUrl);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(url: string | null) {
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: url })
    });
    const datos = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new Error(datos.error || "No se pudo guardar la foto.");
    setFoto(url);
    // La barra lateral la lee en el servidor: se refresca para que la vea ahí también.
    router.refresh();
  }

  async function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setOcupado(true);
    setError(null);
    try {
      const datos = new FormData();
      datos.append("file", archivo);
      const res = await fetch("/api/upload", { method: "POST", body: datos });
      const subida = (await res.json().catch(() => ({}))) as { error?: string; file?: { url: string; type: string } };
      if (!res.ok || !subida.file) throw new Error(subida.error || "No se pudo subir la foto.");
      if (subida.file.type !== "image") throw new Error("Elige una foto, no un video.");
      await guardar(subida.file.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sin conexión. Intenta de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  async function quitar() {
    setOcupado(true);
    setError(null);
    try {
      await guardar(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sin conexión. Intenta de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <div className="relative">
        <AvatarPersona nombre={nombre} fotoUrl={foto} tamano={tamano} className="border-2 border-white/30 shadow-lg" />
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          disabled={ocupado}
          className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white text-blue-900 shadow-md flex items-center justify-center cursor-pointer disabled:opacity-60"
          aria-label={foto ? "Cambiar foto de perfil" : "Poner foto de perfil"}
          title={foto ? "Cambiar foto de perfil" : "Poner foto de perfil"}
        >
          {ocupado ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        </button>
        <input ref={entrada} type="file" accept="image/*" onChange={alElegir} className="hidden" />
      </div>
      {foto && !ocupado && (
        <button type="button" onClick={quitar} className="text-[11px] font-bold text-blue-200 hover:text-white inline-flex items-center gap-1 cursor-pointer">
          <Trash2 size={11} /> Quitar foto
        </button>
      )}
      {error && <p role="alert" className="text-[11px] font-bold text-rose-200 max-w-[10rem] text-center">{error}</p>}
    </div>
  );
}
