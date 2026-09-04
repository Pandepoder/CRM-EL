"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";

/**
 * Alta de brigadista desde el QR de una brigada.
 *
 * Cuatro campos y nada más. Esto se llena de pie en la banqueta, con el teléfono
 * de otra persona y una señal mala: cada campo de más es alguien que abandona a
 * la mitad. Lo demás —sección, colonia, cargo— lo completa el líder después,
 * desde el sistema.
 */
export default function UnirmeForm({
  slug,
  anfitrion,
  equipo
}: {
  slug: string;
  anfitrion: string;
  equipo: string | null;
}) {
  const [datos, setDatos] = useState({ displayName: "", phone: "", email: "", password: "" });
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cambiar = (campo: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDatos((prev) => ({ ...prev, [campo]: e.target.value }));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/public/unirme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, ...datos })
      });
      const cuerpo = await res.json().catch(() => ({}));
      if (res.ok) {
        setListo(cuerpo.mensaje || "Solicitud enviada.");
      } else {
        setError(cuerpo.error || "No se pudo enviar tu solicitud.");
      }
    } catch {
      setError("No hay conexión. Inténtalo otra vez.");
    } finally {
      setEnviando(false);
    }
  }

  if (listo) {
    return (
      <div
        className="rounded-2xl px-6 py-9 text-center"
        style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
      >
        <div
          className="mx-auto flex items-center justify-center rounded-full mb-4"
          style={{ width: 54, height: 54, background: "#15803d", color: "#fff" }}
        >
          <Check size={28} />
        </div>
        <h2 className="font-extrabold text-xl mb-2" style={{ color: "#14532d" }}>
          ¡Listo!
        </h2>
        <p style={{ color: "#166534", lineHeight: 1.6 }}>{listo}</p>
        <p className="text-sm mt-4" style={{ color: "#3f6212" }}>
          Te avisarán cuando tu cuenta esté activa. Guarda tu correo y contraseña.
        </p>
      </div>
    );
  }

  const campo = {
    width: "100%",
    padding: "0.95rem 1rem",
    borderRadius: 12,
    border: "1px solid #d5dced",
    background: "#fff",
    fontSize: "1rem",
    color: "#0b1f3a",
    outline: "none"
  } as const;

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <div>
        <label htmlFor="nombre" className="block text-xs font-bold uppercase mb-1.5" style={{ letterSpacing: ".08em", color: "#5b6780" }}>
          Tu nombre completo
        </label>
        <input id="nombre" required minLength={3} value={datos.displayName} onChange={cambiar("displayName")}
          autoComplete="name" placeholder="María López Hernández" style={campo} />
      </div>

      <div>
        <label htmlFor="tel" className="block text-xs font-bold uppercase mb-1.5" style={{ letterSpacing: ".08em", color: "#5b6780" }}>
          Tu teléfono
        </label>
        <input id="tel" required type="tel" inputMode="tel" value={datos.phone} onChange={cambiar("phone")}
          autoComplete="tel" placeholder="33 1122 3344" style={campo} />
      </div>

      <div>
        <label htmlFor="correo" className="block text-xs font-bold uppercase mb-1.5" style={{ letterSpacing: ".08em", color: "#5b6780" }}>
          Tu correo
        </label>
        <input id="correo" required type="email" inputMode="email" value={datos.email} onChange={cambiar("email")}
          autoComplete="email" placeholder="maria@correo.com" style={campo} />
      </div>

      <div>
        <label htmlFor="clave" className="block text-xs font-bold uppercase mb-1.5" style={{ letterSpacing: ".08em", color: "#5b6780" }}>
          Crea una contraseña
        </label>
        <input id="clave" required type="password" minLength={6} value={datos.password} onChange={cambiar("password")}
          autoComplete="new-password" placeholder="Mínimo 6 caracteres" style={campo} />
      </div>

      {error ? (
        <p
          className="rounded-xl px-4 py-3 text-sm font-semibold"
          style={{ background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" }}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className="inline-flex items-center justify-center gap-2 font-bold rounded-xl mt-1 disabled:opacity-60"
        style={{
          background: "#0b1f3a",
          color: "#fff",
          padding: "1rem 1.5rem",
          fontSize: "1rem",
          transition: "transform .25s cubic-bezier(0.34, 1.56, 0.64, 1)"
        }}
      >
        {enviando ? <Loader2 size={18} className="animate-spin" /> : null}
        {enviando ? "Enviando…" : equipo ? `Unirme a ${equipo}` : `Unirme con ${anfitrion}`}
        {!enviando ? <ArrowRight size={18} /> : null}
      </button>

      <p className="text-xs text-center mt-1" style={{ color: "#8b95a9" }}>
        {anfitrion} tiene que aceptarte antes de que puedas entrar.
      </p>
    </form>
  );
}
