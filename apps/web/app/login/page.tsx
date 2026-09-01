"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Mail, Lock, ArrowRight, Loader2, Shield, MapPin, Footprints, ClipboardList } from "lucide-react";

const demoButtonIconStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" } as const;

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

      {/* QUICK DEMO ACCESS BUTTONS */}
      <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px", textAlign: "center" }}>
          Acceso Rápido de Demostración (1 Clic)
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setEmail("admin@tonala.gob.mx");
              setPassword("TonalaDemo2026");
              setLoading(true);
              try {
                const res = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: "admin@tonala.gob.mx", password: "TonalaDemo2026" })
                });
                const data = await res.json() as { redirectTo?: string };
                window.location.href = data.redirectTo || "/crm/contacts";
              } catch {
                setError("Error de conexión");
                setLoading(false);
              }
            }}
            style={{ padding: "8px 10px", fontSize: "12px", fontWeight: 600, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: "8px", cursor: "pointer", textAlign: "center" }}
          >
            <span style={demoButtonIconStyle}><Shield size={14} /> Administrador</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setEmail("coordinador.demo@tonala-os.local");
              setPassword("TonalaDemo2026");
              setLoading(true);
              try {
                const res = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: "coordinador.demo@tonala-os.local", password: "TonalaDemo2026" })
                });
                const data = await res.json() as { redirectTo?: string };
                window.location.href = data.redirectTo || "/crm/contacts";
              } catch {
                setError("Error de conexión");
                setLoading(false);
              }
            }}
            style={{ padding: "8px 10px", fontSize: "12px", fontWeight: 600, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e40af", borderRadius: "8px", cursor: "pointer", textAlign: "center" }}
          >
            <span style={demoButtonIconStyle}><MapPin size={14} /> Coordinador</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setEmail("responsable.demo@tonala-os.local");
              setPassword("TonalaDemo2026");
              setLoading(true);
              try {
                const res = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: "responsable.demo@tonala-os.local", password: "TonalaDemo2026" })
                });
                const data = await res.json() as { redirectTo?: string };
                window.location.href = data.redirectTo || "/equipo";
              } catch {
                setError("Error de conexión");
                setLoading(false);
              }
            }}
            style={{ padding: "8px 10px", fontSize: "12px", fontWeight: 600, background: "#fefce8", border: "1px solid #fef08a", color: "#854d0e", borderRadius: "8px", cursor: "pointer", textAlign: "center" }}
          >
            <span style={demoButtonIconStyle}><Footprints size={14} /> Brigadista</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              setEmail("capturista.demo@tonala-os.local");
              setPassword("TonalaDemo2026");
              setLoading(true);
              try {
                const res = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: "capturista.demo@tonala-os.local", password: "TonalaDemo2026" })
                });
                const data = await res.json() as { redirectTo?: string };
                window.location.href = data.redirectTo || "/crm/contacts";
              } catch {
                setError("Error de conexión");
                setLoading(false);
              }
            }}
            style={{ padding: "8px 10px", fontSize: "12px", fontWeight: 600, background: "#faf5ff", border: "1px solid #e9d5ff", color: "#6b21a8", borderRadius: "8px", cursor: "pointer", textAlign: "center" }}
          >
            <span style={demoButtonIconStyle}><ClipboardList size={14} /> Capturista</span>
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: "20px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
        <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
          ¿Eres nuevo brigadista u operador?{" "}
          <Link href="/register" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>
            Solicitar Acceso
          </Link>
        </p>
      </div>
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
