"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Mail, Lock, ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
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
      const localPath = (value: string | null | undefined) => {
        if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
        const url = new URL(value, window.location.origin);
        if (url.origin !== window.location.origin || url.pathname === "/login" || url.pathname === "/") return null;
        return url.pathname + url.search + url.hash;
      };
      const target = localPath(from) || localPath(data.redirectTo) || "/crm";
      window.location.href = target;
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form aria-busy={loading} onSubmit={(e) => { void onSubmit(e); }}>
      {error ? (
        <div id="login-error-message" role="alert" className="login-error" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertCircle size={18} aria-hidden="true" />
          {error}
        </div>
      ) : null}

      <div className="modern-input-wrapper">
        <label htmlFor="email">Correo electrónico</label>
        <Mail size={18} className="modern-input-icon" />
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className="modern-input"
        />
      </div>

      <div className="modern-input-wrapper">
        <label htmlFor="password">Contraseña</label>
        <Lock size={18} className="modern-input-icon" />
        <input
          aria-describedby={error ? "login-error-message" : undefined}
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="modern-input login-password"
        />
        <button type="button" className="password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword}>
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
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
            Entrar a mi panel
            <ArrowRight size={20} />
          </>
        )}
      </button>

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

const REDES = [
  {
    nombre: "Instagram",
    href: "https://www.instagram.com/edgar_lopezj",
    path: "M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.2 1 .48 1.4.9.4.4.7.8.9 1.4.17.4.37 1 .42 2.2.06 1.3.07 1.7.07 4.9s0 3.6-.07 4.9c-.05 1.2-.25 1.8-.42 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.17-1 .37-2.2.42-1.3.06-1.7.07-4.9.07s-3.6 0-4.9-.07c-1.2-.05-1.8-.25-2.2-.42-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.17-.4-.37-1-.42-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.9c.05-1.2.25-1.8.42-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.17 1-.37 2.2-.42C8.4 2.2 8.8 2.2 12 2.2Zm0 5.2a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm5.9-7.8a1.08 1.08 0 1 1-2.15 0 1.08 1.08 0 0 1 2.15 0Z"
  },
  {
    nombre: "Facebook",
    href: "https://www.facebook.com/share/14khJUZf2aw/",
    path: "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.5-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z"
  },
  {
    nombre: "YouTube",
    href: "https://youtube.com/@edgarlopezj",
    path: "M21.58 7.19a2.51 2.51 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42a2.51 2.51 0 0 0-1.77 1.77C2 8.75 2 12 2 12s0 3.25.42 4.81a2.51 2.51 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.51 2.51 0 0 0 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81ZM10 15.02V8.98L15.2 12 10 15.02Z"
  }
] as const;

function Redes({ tono }: { tono: "claro" | "oscuro" }) {
  const base =
    tono === "claro"
      ? "border-white/25 text-white hover:bg-white hover:text-[#0b1f3a]"
      : "border-slate-200 text-slate-500 hover:bg-[#0b1f3a] hover:text-white hover:border-[#0b1f3a]";
  return (
    <div className="flex items-center gap-3">
      {REDES.map((r) => (
        <a
          key={r.nombre}
          href={r.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${r.nombre} de Edgar López`}
          title={r.nombre}
          className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${base}`}
        >
          <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
            <path d={r.path} />
          </svg>
        </a>
      ))}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="login-premium">
      <header className="login-topbar">
        <Link href="/conoceme" className="login-back"><ArrowLeft size={17} /><span>Volver a la bienvenida</span></Link>
        <span className="login-wordmark"><img src="/brand/el-monograma-blanco.png" alt="" width={28} height={28} /> Edgar López</span>
      </header>
      <div className="login-composition">
        <section className="login-brand" aria-label="Edgar López, Tonalá">
          <div className="login-halo" aria-hidden="true"><i /><i /></div>
          <p className="login-eyeline">TONALÁ, JALISCO</p>
          <h2>&ldquo;Si pasa por tu vida<br /><span>pasa por tu mente.&rdquo;</span></h2>
          <div className="login-portrait"><img src="/media/edgar-retrato.jpg" alt="Edgar López" width={300} height={330} /><span>EDGAR LÓPEZ</span></div>
          <div className="login-brand-bottom"><span>Un Tonalá Posible</span><Redes tono="claro" /></div>
        </section>
        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-panel-heading">
            <span className="login-access-icon"><ShieldCheck size={24} /></span>
            <span className="login-panel-kicker">TU ESPACIO DE TRABAJO</span>
            <h1 id="login-title">Qué gusto verte<br /><span>de nuevo.</span></h1>
            <p>Inicia sesión para continuar con tu equipo.</p>
          </div>
          <Suspense fallback={<p role="status">Cargando formulario…</p>}><LoginForm /></Suspense>
          <p className="login-footer-note"><Lock size={13} aria-hidden="true" /> Acceso para integrantes autorizados</p>
        </section>
      </div>
      <footer className="login-bottom">EL · Tonalá OS <span>Conecta. Organiza. Da seguimiento.</span></footer>
    </main>
  );
}
