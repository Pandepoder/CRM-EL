"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/crm";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = (await response.json()) as { message?: string };
      
      if (!response.ok) {
        setError(data.message ?? "Credenciales inválidas.");
        return;
      }
      router.push(from);
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
            <ShieldCheck size={32} />
          </div>
        </div>
        
        <h1 style={{ textAlign: "center", fontSize: "32px", marginBottom: "8px" }}>Iniciar Sesión</h1>
        <p className="login-sub" style={{ textAlign: "center", marginBottom: "32px" }}>
          Acceso operativo al panel de Tonalá OS.
        </p>

        <form onSubmit={(e) => { void onSubmit(e); }}>
          {error ? <p className="login-error">{error}</p> : null}
          
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
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <label htmlFor="password">Contraseña</label>
              <a href="#" style={{ fontSize: "12px", color: "var(--blue-600)", fontWeight: "bold", textDecoration: "none" }}>¿Olvidaste tu contraseña?</a>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ minHeight: "54px" }}
            />
          </div>

          <button className="action-button" type="submit" disabled={loading} style={{ width: "100%", minHeight: "54px", fontSize: "16px" }}>
            {loading ? "Verificando..." : "Entrar al Sistema"}
          </button>
        </form>

        <p className="login-hint">
          ¿No tienes cuenta? <Link href="/register" style={{ color: "var(--blue-600)", fontWeight: 800, textDecoration: "none" }}>Regístrate aquí</Link>
        </p>
      </div>
    </main>
  );
}
