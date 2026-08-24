"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

function LoginForm() {
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json() as { message?: string };
      
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
    <form onSubmit={(e) => { void onSubmit(e); }}>
      {error ? <p className="login-error">{error}</p> : null}
      
      <div className="input-group">
        <label htmlFor="email">Correo Institucional</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@tonala.gob.mx"
          style={{ minHeight: "54px" }}
        />
      </div>

      <div className="input-group" style={{ marginBottom: "24px" }}>
        <label htmlFor="password">Contraseña de Acceso</label>
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

      <div style={{ marginBottom: "24px", display: "flex", alignItems: "flex-start", gap: "12px", fontSize: "12px", color: "var(--gray-600)", lineHeight: "1.5" }}>
        <input type="checkbox" id="terms" required style={{ marginTop: "3px" }} />
        <label htmlFor="terms">
          Al acceder a este sistema, confirmo que tengo autorización estricta para manejar datos ciudadanos y acepto los 
          <Link href="/terminos" style={{ color: "var(--blue-600)", textDecoration: "underline" }}> Términos de Uso</Link> y la 
          <Link href="/privacidad" style={{ color: "var(--blue-600)", textDecoration: "underline" }}> Política de Privacidad</Link>.
        </label>
      </div>

      <button className="action-button" type="submit" disabled={loading} style={{ width: "100%", minHeight: "54px", fontSize: "16px" }}>
        {loading ? "Verificando..." : "Entrar al Sistema"}
      </button>
    </form>
  );
}

export default function LoginPage() {
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

        <Suspense fallback={<div style={{ textAlign: "center", padding: "20px" }}>Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
