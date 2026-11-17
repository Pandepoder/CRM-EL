"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Check, Loader2, Eye, EyeOff, AlertCircle, Info } from "lucide-react";
import { MARCA } from "@/lib/marca";

export function FormularioAcceso() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  // Llega aquí desde /api/auth/salir: la sesión estaba abierta, pero la cuenta ya no está activa.
  // Antes no llegaba nunca: se quedaba en un bucle de redirecciones sin ningún mensaje.
  const cuentaInactiva = searchParams.get("motivo") === "cuenta-inactiva";
  const sesionCerrada = searchParams.get("motivo") === "sesion-cerrada";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Cada intento fallido vuelve a sacudir el aviso, aunque el mensaje sea el mismo.
  const [intentos, setIntentos] = useState(0);
  // La contraseña ya pasó y el panel está cargando: en una red lenta tarda, y sin esto parecería trabado.
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    // Con el botón «atrás» el navegador puede devolver la página tal como quedó, con la cortina puesta.
    const alVolver = (e: PageTransitionEvent) => {
      if (e.persisted) setEntrando(false);
    };
    window.addEventListener("pageshow", alVolver);
    return () => window.removeEventListener("pageshow", alVolver);
  }, []);

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
        setIntentos((n) => n + 1);
        return;
      }
      const localPath = (value: string | null | undefined) => {
        if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
        const url = new URL(value, window.location.origin);
        if (url.origin !== window.location.origin || url.pathname === "/login" || url.pathname === "/") return null;
        return url.pathname + url.search + url.hash;
      };
      const target = localPath(from) || localPath(data.redirectTo) || "/crm";
      setEntrando(true);
      window.location.href = target;
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setIntentos((n) => n + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-formulario" aria-busy={loading} onSubmit={(e) => { void onSubmit(e); }}>
      {cuentaInactiva && !error ? (
        <div role="status" className="login-aviso">
          <Info size={18} aria-hidden="true" />
          Se cerró tu sesión porque tu cuenta ya no está activa. Si crees que es un error, habla con quien coordina tu equipo.
        </div>
      ) : null}
      {sesionCerrada && !error ? (
        <div role="status" className="login-aviso">
          <Info size={18} aria-hidden="true" />
          Se cerró tu sesión porque cambiaron tu acceso (tu rol, tu municipio o tu contraseña). Vuelve a entrar.
        </div>
      ) : null}
      {error ? (
        <div key={intentos} id="login-error-message" role="alert" className="login-aviso login-aviso--error">
          <AlertCircle size={18} aria-hidden="true" />
          {error}
        </div>
      ) : null}

      <div className="login-campo">
        <label htmlFor="email">Correo electrónico</label>
        <div className="login-campo-caja">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="login-entrada"
          />
          <Mail size={18} className="login-campo-icono" aria-hidden="true" />
          {/* Solo avisa que el correo está bien escrito, no que exista la cuenta. */}
          <Check size={18} className="login-campo-ok" aria-hidden="true" />
        </div>
      </div>

      <div className="login-campo">
        <label htmlFor="password">Contraseña</label>
        <div className="login-campo-caja">
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
            className="login-entrada login-entrada--clave"
          />
          <Lock size={18} className="login-campo-icono" aria-hidden="true" />
          <button
            type="button"
            className="login-ver-clave"
            onClick={() => setShowPassword(value => !value)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff key="ocultar" size={18} /> : <Eye key="mostrar" size={18} />}
          </button>
        </div>
      </div>

      <div className="login-acepto">
        <span className="login-acepto-casilla">
          <input type="checkbox" id="terms" required />
          <span aria-hidden="true"><Check size={15} strokeWidth={3.5} /></span>
        </span>
        <label htmlFor="terms">
          Al acceder a este sistema, confirmo que tengo autorización estricta para manejar datos ciudadanos y acepto los
          <Link href="/terminos"> Términos de Uso</Link> y la
          <Link href="/privacidad"> Política de Privacidad</Link>.
        </label>
      </div>

      <button className="login-boton" type="submit" disabled={loading || entrando}>
        {loading ? (
          <>
            <Loader2 className="login-girando" size={20} aria-hidden="true" />
            Verificando...
          </>
        ) : (
          <>
            Entrar a mi panel
            <ArrowRight className="login-boton-flecha" size={20} aria-hidden="true" />
          </>
        )}
      </button>

      {/* No hay recuperación por correo: la contraseña la cambia quien coordina, desde Usuarios. Antes no
          había ninguna pista de qué hacer si se olvidaba (L8). */}
      <p className="login-olvido">
        <strong>¿Olvidaste tu contraseña?</strong> Pídele a quien coordina tu equipo que te asigne una nueva.
      </p>

      <p className="login-solicitar">
        ¿Eres nuevo brigadista u operador? <Link href="/register">Solicitar acceso</Link>
      </p>

      {entrando ? (
        <div className="login-cortina" role="status">
          <div className="pub-aurora" aria-hidden="true"><i /><i /><i /></div>
          <img src={MARCA.monograma.blanco} alt="" width={72} height={72} />
          <p>Entrando a tu panel…</p>
        </div>
      ) : null}
    </form>
  );
}
