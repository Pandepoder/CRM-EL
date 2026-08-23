"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, email, password })
      });
      const data = (await response.json()) as { message?: string; redirectTo?: string };
      if (!response.ok) {
        setError(data.message ?? "No se pudo crear la cuenta.");
        return;
      }
      router.push(data.redirectTo ?? "/onboarding");
      router.refresh();
    } catch {
      setError("Error de conexion. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card" style={{ maxWidth: "480px", borderRadius: "24px", padding: "48px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px", justifyContent: "center" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "var(--blue-50)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--blue-600)" }}>
            <UserPlus size={32} />
          </div>
        </div>
        
        <h1 style={{ textAlign: "center", fontSize: "32px", marginBottom: "8px" }}>Crear Cuenta</h1>
        <p className="login-sub" style={{ textAlign: "center", marginBottom: "32px" }}>
          Únete a la plataforma operativa de Tonalá.
        </p>

        <form onSubmit={(e) => { void onSubmit(e); }}>
          {error ? <p className="login-error">{error}</p> : null}
          
          <div className="field" style={{ marginBottom: "20px" }}>
            <label htmlFor="displayName">Nombre Completo</label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Juan Pérez"
              style={{ minHeight: "54px" }}
            />
          </div>

          <div className="field" style={{ marginBottom: "20px" }}>
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              style={{ minHeight: "54px" }}
            />
          </div>

          <div className="field" style={{ marginBottom: "32px" }}>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ minHeight: "54px" }}
            />
          </div>

          <button className="action-button" type="submit" disabled={loading} style={{ width: "100%", minHeight: "54px", fontSize: "16px" }}>
            {loading ? "Creando cuenta..." : "Registrarse Ahora"}
          </button>
        </form>

        <p className="login-hint">
          ¿Ya tienes cuenta? <Link href="/login" style={{ color: "var(--blue-600)", fontWeight: 800, textDecoration: "none" }}>Iniciar sesión</Link>
        </p>
      </div>
    </main>
  );
}
