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

      {/* QUICK DEMO ACCESS BUTTONS — gated: never render unless explicitly enabled */}
      {process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true" ? (
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
      ) : null}

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
    // Panel de marca a la izquierda y formulario a la derecha. En móvil la foto
    // se reduce a una banda: quien entra desde el campo necesita el formulario
    // a la vista sin desplazarse, no una portada a pantalla completa.
    <main className="min-h-screen bg-white lg:grid lg:grid-cols-[1.05fr_1fr]">
      <section className="relative flex h-44 flex-col justify-end overflow-hidden bg-[#0b1f3a] p-6 sm:h-56 lg:h-auto lg:p-12">
        <img
          src="/media/edgar-retrato.jpg"
          alt="Edgar López en el Comité Directivo del PAN Jalisco"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1f3a] via-[#0b1f3a]/75 to-[#0b1f3a]/20 lg:bg-gradient-to-tr lg:from-[#0b1f3a] lg:via-[#0b1f3a]/80 lg:to-transparent" />

        <div className="relative flex flex-col gap-3 lg:gap-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
            Edgar López
          </p>
          <h2 className="max-w-md text-2xl font-black leading-tight text-white text-balance sm:text-3xl lg:text-5xl">
            Un Tonalá Posible
          </h2>
          <p className="hidden max-w-sm text-sm leading-relaxed text-white/80 lg:block">
            Plataforma territorial de la estructura: registro ciudadano, brigadas,
            incidencias y cartografía electoral en un solo lugar.
          </p>
          <div className="hidden pt-2 lg:block">
            <Redes tono="claro" />
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0f7ff] text-[#2878c7]">
              <ShieldCheck size={30} />
            </div>
            <h1 className="m-0 text-[27px] font-extrabold leading-tight text-[#0b1f3a]">
              Iniciar sesión
            </h1>
            <p className="mt-2 text-[15px] text-slate-500">
              Acceso operativo al panel de Tonalá OS.
            </p>
          </div>

          <Suspense fallback={<div className="py-5 text-center text-slate-500">Cargando...</div>}>
            <LoginForm />
          </Suspense>

          <div className="mt-10 flex flex-col items-center gap-4 border-t border-slate-100 pt-6 lg:hidden">
            <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Sigue a Edgar López
            </p>
            <Redes tono="oscuro" />
          </div>
        </div>
      </section>

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
