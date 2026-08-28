"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

function LoginForm() {
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

    const formData = new FormData(event.currentTarget);
    const formEmail = formData.get("email") as string;
    const formPassword = formData.get("password") as string;

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formEmail, password: formPassword })
      });
      const data = await response.json() as { message?: string; redirectTo?: string };

      if (!response.ok) {
        setError(data.message ?? "Credenciales inválidas.");
        return;
      }
      const target = from && from !== "/login" && from !== "/" ? from : (data.redirectTo || "/crm");
      window.location.href = target;
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => { void onSubmit(e); }}>
      {error ? (
        <div className="login-error" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <ShieldCheck size={18} />
          {error}
        </div>
      ) : null}

      <div className="modern-input-wrapper">
        <label htmlFor="email">Correo Institucional</label>
        <Mail size={18} className="modern-input-icon" />
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@tonala.gob.mx"
          className="modern-input"
        />
      </div>

      <div className="modern-input-wrapper">
        <label htmlFor="password">Contraseña de Acceso</label>
        <Lock size={18} className="modern-input-icon" />
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="modern-input"
        />
      </div>

      <div className="modern-checkbox-group">
        <input type="checkbox" id="terms" required />
        <label htmlFor="terms">
          Al acceder a este sistema, confirmo que tengo autorización estricta para manejar datos ciudadanos y acepto los
          <Link href="/terminos"> Términos de Uso</Link> y la
          <Link href="/privacidad"> Política de Privacidad</Link>.
        </label>
      </div>

      <button className="modern-button" type="submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="lucide-spin" size={20} style={{ animation: "spin 2s linear infinite" }} />
            Verificando...
          </>
        ) : (
          <>
            Entrar al Sistema
            <ArrowRight size={20} />
          </>
        )}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="modern-login-layout">
      <div className="modern-login-container">
        <div className="modern-login-header">
          <div className="modern-login-icon">
            <ShieldCheck size={32} />
          </div>
          <h1 className="modern-login-title">Iniciar Sesión</h1>
          <p className="modern-login-subtitle">
            Acceso operativo al panel de Tonalá OS.
          </p>
        </div>

        <Suspense fallback={<div style={{ textAlign: "center", padding: "20px" }}>Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </main>
  );
}
