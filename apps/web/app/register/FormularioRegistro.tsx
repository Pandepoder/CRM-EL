"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  AlertCircle, ArrowLeft, ArrowRight, Check, ChevronDown, Eye, EyeOff, Home, Loader2, Lock, Mail, MapPin, Phone, ShieldCheck, User, UserPlus
} from "lucide-react";

import { MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";

/** Los campos que la ruta puede señalar como el del problema (`campo` en la respuesta). */
type Campo = "displayName" | "email" | "phone" | "password" | "municipality" | "homeAddress" | "homeColony" | "homeMunicipality";

const MINIMO_CONTRASENA = 6;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FormularioRegistro() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Opcional: sin él, quien aprueba la solicitud no tenía cómo contactar a la persona.
  const [phone, setPhone] = useState("");
  // Municipio donde va a trabajar: con él se arma la marca que verá y el mapa con el que entra.
  const [municipality, setMunicipality] = useState("");
  // Su domicilio (decisión del dueño, 2026-09-26). El municipio donde vive arranca en el de trabajo, que
  // casi siempre es el mismo, pero se puede cambiar: no decide nada de lo que ve la cuenta.
  const [homeAddress, setHomeAddress] = useState("");
  const [homeColony, setHomeColony] = useState("");
  const [homeMunicipality, setHomeMunicipality] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  // El campo que la ruta dijo que está mal: se marca y recibe el foco, para no buscarlo en un formulario largo.
  const [campoConError, setCampoConError] = useState<Campo | null>(null);
  const [intentos, setIntentos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const tituloListo = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (!submitted) return;
    // En el teléfono el botón quedaba hasta abajo: sin esto, la confirmación se abría fuera de la vista.
    window.scrollTo({ top: 0, behavior: "instant" });
    tituloListo.current?.focus();
  }, [submitted]);

  const vive = homeMunicipality || municipality;
  const grupos = {
    datos: [displayName.trim(), CORREO_VALIDO.test(email.trim()), password.length >= MINIMO_CONTRASENA],
    trabajo: [municipality],
    domicilio: [homeAddress.trim(), homeColony.trim(), vive]
  };
  const listos = Object.values(grupos).flat().filter(Boolean).length;
  const total = Object.values(grupos).flat().length;
  const grupoListo = (g: keyof typeof grupos) => grupos[g].every(Boolean);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCampoConError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, email, password, phone, municipality, homeAddress, homeColony, homeMunicipality: vive })
      });
      const data = (await response.json()) as { message?: string; pending?: boolean; ok?: boolean; campo?: Campo };
      if (!response.ok) {
        setError(data.message ?? "No se pudo procesar la solicitud.");
        setIntentos((n) => n + 1);
        if (data.campo) {
          setCampoConError(data.campo);
          document.getElementById(data.campo)?.focus();
        }
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setIntentos((n) => n + 1);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="registro-listo">
        <svg className="registro-sello" viewBox="0 0 88 88" aria-hidden="true">
          <circle cx="44" cy="44" r="40" />
          <path d="M27 45.5 39 57 61 33" />
        </svg>

        <h1 id="registro-titulo" ref={tituloListo} tabIndex={-1}>¡Solicitud enviada con éxito!</h1>
        <p className="registro-listo-texto">
          Tu cuenta para <strong>{email}</strong> quedó registrada. Antes de entrar, alguien del equipo tiene que aprobarla y asignarte tu brigada.
        </p>

        <ol className="registro-pasos">
          <li className="hecho"><span aria-hidden="true"><Check size={15} strokeWidth={3} /></span>Enviaste tu solicitud</li>
          <li className="espera"><span aria-hidden="true" />Te aprueban y te asignan tu brigada<em>En espera</em></li>
          <li><span aria-hidden="true" />Entras con tu correo y tu contraseña</li>
        </ol>

        <div className="registro-estado">
          <p><ShieldCheck size={16} aria-hidden="true" /> Estado de la cuenta: pendiente de aprobación</p>
          No te llegará ningún correo: avísale a quien te invitó para que apruebe tu solicitud. Después entra con este mismo correo y tu contraseña.
        </div>

        <Link href="/login" className="login-boton registro-volver">
          <ArrowLeft size={18} aria-hidden="true" /> Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  // Marca el campo que la ruta señaló y lo une al aviso; `pista` es la ayuda que el campo ya tenía debajo.
  const marca = (campo: Campo, pista?: string) => {
    const conError = campoConError === campo;
    const describe = [pista, conError ? "registro-error" : null].filter(Boolean).join(" ");
    return { "aria-invalid": conError || undefined, "aria-describedby": describe || undefined };
  };

  return (
    <>
      <div className="login-encabezado">
        <span className="login-escudo"><UserPlus size={22} aria-hidden="true" /></span>
        <span className="login-etiqueta">ÚNETE A LA ESTRUCTURA</span>
        <h1 id="registro-titulo">Solicitar<br /><span>acceso.</span></h1>
        <p>Regístrate como nuevo operador o brigadista de la estructura.</p>
      </div>

      <div className="registro-avance">
        <span>{listos === total ? "Todo listo para enviar" : `${listos} de ${total} datos listos`}</span>
        <span className="registro-avance-barra" aria-hidden="true">
          <span style={{ "--avance": listos / total } as CSSProperties} />
        </span>
      </div>

      <form className="login-formulario registro-formulario" aria-busy={loading} onSubmit={(e) => { void onSubmit(e); }}>
        <fieldset className={grupoListo("datos") ? "registro-grupo listo" : "registro-grupo"}>
          <legend><span aria-hidden="true">{grupoListo("datos") ? <Check size={15} strokeWidth={3} /> : 1}</span>Tus datos</legend>

          <div className="login-campo">
            <label htmlFor="displayName">Nombre completo</label>
            <div className="login-campo-caja">
              <input
                id="displayName" name="displayName" type="text" autoComplete="name" required maxLength={120}
                value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Juan Carlos Pérez Gómez" className="login-entrada" {...marca("displayName")}
              />
              <User size={18} className="login-campo-icono" aria-hidden="true" />
            </div>
          </div>

          <div className="login-campo">
            <label htmlFor="email">Correo electrónico</label>
            <div className="login-campo-caja">
              <input
                id="email" name="email" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com" className="login-entrada" {...marca("email")}
              />
              <Mail size={18} className="login-campo-icono" aria-hidden="true" />
              {/* Solo avisa que el correo está bien escrito, no que esté libre. */}
              <Check size={18} className="login-campo-ok" aria-hidden="true" />
            </div>
          </div>

          <div className="login-campo">
            <label htmlFor="phone">Teléfono <span className="registro-opcional">(opcional)</span></label>
            <div className="login-campo-caja">
              <input
                id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20}
                value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="33 1122 3344" className="login-entrada" {...marca("phone")}
              />
              <Phone size={18} className="login-campo-icono" aria-hidden="true" />
            </div>
          </div>

          <div className="login-campo">
            <label htmlFor="password">Contraseña que quieres usar</label>
            <div className="login-campo-caja">
              <input
                id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required
                minLength={MINIMO_CONTRASENA} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={`Mínimo ${MINIMO_CONTRASENA} caracteres`} className="login-entrada"
                {...marca("password", "registro-pista-clave")}
              />
              <Lock size={18} className="login-campo-icono" aria-hidden="true" />
              <button
                type="button"
                className="login-ver-clave"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff key="ocultar" size={18} /> : <Eye key="mostrar" size={18} />}
              </button>
            </div>
            <p id="registro-pista-clave" className="registro-pista" data-ok={password.length >= MINIMO_CONTRASENA}>
              <Check size={14} strokeWidth={3} aria-hidden="true" />
              {password.length >= MINIMO_CONTRASENA
                ? "La contraseña tiene el largo necesario"
                : `Mínimo ${MINIMO_CONTRASENA} caracteres${password ? `: te faltan ${MINIMO_CONTRASENA - password.length}` : ""}`}
            </p>
          </div>
        </fieldset>

        <fieldset className={grupoListo("trabajo") ? "registro-grupo listo" : "registro-grupo"}>
          <legend><span aria-hidden="true">{grupoListo("trabajo") ? <Check size={15} strokeWidth={3} /> : 2}</span>Dónde trabajarás</legend>

          <div className="login-campo">
            <label htmlFor="municipality">Municipio donde trabajarás</label>
            <div className="login-campo-caja">
              <select
                id="municipality" name="municipality" required
                value={municipality} onChange={(e) => setMunicipality(e.target.value)}
                className="login-entrada" {...marca("municipality")}
              >
                <option value="" disabled>Selecciona tu municipio</option>
                {MUNICIPIOS_JALISCO.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
              <MapPin size={18} className="login-campo-icono" aria-hidden="true" />
              <ChevronDown size={18} className="login-campo-flecha" aria-hidden="true" />
            </div>
          </div>
        </fieldset>

        <fieldset className={grupoListo("domicilio") ? "registro-grupo listo" : "registro-grupo"}>
          <legend><span aria-hidden="true">{grupoListo("domicilio") ? <Check size={15} strokeWidth={3} /> : 3}</span>Dónde vives</legend>

          <div className="login-campo">
            <label htmlFor="homeAddress">Tu calle y número</label>
            <div className="login-campo-caja">
              <input
                id="homeAddress" name="homeAddress" autoComplete="street-address" required maxLength={300}
                value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)}
                placeholder="Av. Tonaltecas #120" className="login-entrada" {...marca("homeAddress")}
              />
              <Home size={18} className="login-campo-icono" aria-hidden="true" />
            </div>
          </div>

          <div className="login-campo">
            <label htmlFor="homeColony">Tu colonia</label>
            <div className="login-campo-caja">
              <input
                id="homeColony" name="homeColony" required maxLength={150}
                value={homeColony} onChange={(e) => setHomeColony(e.target.value)}
                placeholder="Centro" className="login-entrada" {...marca("homeColony")}
              />
              <MapPin size={18} className="login-campo-icono" aria-hidden="true" />
            </div>
          </div>

          <div className="login-campo">
            <label htmlFor="homeMunicipality">Municipio donde vives</label>
            <div className="login-campo-caja">
              <select
                id="homeMunicipality" name="homeMunicipality" required
                value={vive} onChange={(e) => setHomeMunicipality(e.target.value)}
                className="login-entrada" {...marca("homeMunicipality")}
              >
                <option value="" disabled>Selecciona tu municipio</option>
                {MUNICIPIOS_JALISCO.map((m) => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
              <MapPin size={18} className="login-campo-icono" aria-hidden="true" />
              <ChevronDown size={18} className="login-campo-flecha" aria-hidden="true" />
            </div>
          </div>
        </fieldset>

        {/* El aviso va junto al botón: en un formulario largo, arriba quedaba fuera de la vista. */}
        {error ? (
          <div key={intentos} id="registro-error" role="alert" className="login-aviso login-aviso--error">
            <AlertCircle size={18} aria-hidden="true" />
            {error}
          </div>
        ) : null}

        <button className="login-boton" type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="login-girando" size={20} aria-hidden="true" />
              Enviando solicitud...
            </>
          ) : (
            <>
              Enviar solicitud de registro
              <ArrowRight className="login-boton-flecha" size={20} aria-hidden="true" />
            </>
          )}
        </button>

        <p className="login-solicitar">
          ¿Ya tienes cuenta asignada? <Link href="/login">Iniciar sesión</Link>
        </p>
      </form>
    </>
  );
}
