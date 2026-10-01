"use client";

import { useState } from "react";
import Link from "next/link";
import { UserPlus, CheckCircle2, ArrowLeft, Loader2, ShieldCheck, Mail, Lock, User, MapPin, Home, Phone } from "lucide-react";

import { MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";

export default function RegisterPage() {
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, email, password, phone, municipality, homeAddress, homeColony, homeMunicipality: homeMunicipality || municipality })
      });
      const data = (await response.json()) as { message?: string; pending?: boolean; ok?: boolean };
      if (!response.ok) {
        setError(data.message ?? "No se pudo procesar la solicitud.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <main className="modern-login-layout">
        <div className="modern-login-container" style={{ textAlign: "center", padding: "40px 32px" }}>
          <div style={{
            width: "64px",
            height: "64px",
            background: "#ecfdf5",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px auto",
            color: "#059669"
          }}>
            <CheckCircle2 size={36} />
          </div>

          <h1 className="modern-login-title" style={{ fontSize: "24px", marginBottom: "12px" }}>
            ¡Solicitud Enviada con Éxito!
          </h1>
          
          <p style={{ color: "#475569", fontSize: "15px", lineHeight: "1.6", marginBottom: "24px" }}>
            Tu cuenta para <strong>{email}</strong> ha sido registrada. Por seguridad, el <strong>Administrador del Sistema</strong> revisará y autorizará tu acceso para asignarte tu territorio y rol operativo.
          </p>

          <div style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "32px",
            fontSize: "13px",
            color: "#64748b",
            textAlign: "left"
          }}>
            <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldCheck size={16} color="#2563eb" /> Estado de la Cuenta: Pendiente de Aprobación
            </div>
            Recibirás acceso una vez que el equipo directivo confirme tu asignación de brigada o rol territorial.
          </div>

          <Link href="/login" className="modern-button" style={{ display: "inline-flex", textDecoration: "none", width: "100%", justifyContent: "center" }}>
            <ArrowLeft size={18} /> Volver al Inicio de Sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="modern-login-layout">
      <div className="modern-login-container">
        <div className="modern-login-header">
          <div className="modern-login-icon">
            <UserPlus size={32} />
          </div>
          <h1 className="modern-login-title">Solicitar Acceso</h1>
          <p className="modern-login-subtitle">
            Regístrate como nuevo operador o brigadista de la estructura.
          </p>
        </div>

        <form onSubmit={(e) => { void onSubmit(e); }}>
          {error ? (
            <div className="login-error" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <ShieldCheck size={18} />
              {error}
            </div>
          ) : null}

          <div className="modern-input-wrapper">
            <label htmlFor="displayName">Nombre Completo</label>
            <User size={18} className="modern-input-icon" />
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej. Juan Carlos Pérez Gómez"
              className="modern-input"
            />
          </div>

          <div className="modern-input-wrapper">
            <label htmlFor="email">Correo Electrónico</label>
            <Mail size={18} className="modern-input-icon" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="modern-input"
            />
          </div>

          <div className="modern-input-wrapper">
            <label htmlFor="phone">Teléfono (opcional)</label>
            <Phone size={18} className="modern-input-icon" />
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={20}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="33 1122 3344"
              className="modern-input"
            />
          </div>

          <div className="modern-input-wrapper">
            <label htmlFor="password">Contraseña Deseada</label>
            <Lock size={18} className="modern-input-icon" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="modern-input"
            />
          </div>

          <div className="modern-input-wrapper">
            <label htmlFor="municipality">Municipio donde trabajarás</label>
            <MapPin size={18} className="modern-input-icon" />
            <select
              id="municipality"
              name="municipality"
              required
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
              className="modern-input"
            >
              <option value="" disabled>Selecciona tu municipio</option>
              {MUNICIPIOS_JALISCO.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="modern-input-wrapper">
            <label htmlFor="homeAddress">Tu calle y número</label>
            <Home size={18} className="modern-input-icon" />
            <input
              id="homeAddress"
              name="homeAddress"
              autoComplete="street-address"
              required
              maxLength={300}
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
              placeholder="Av. Tonaltecas #120"
              className="modern-input"
            />
          </div>

          <div className="modern-input-wrapper">
            <label htmlFor="homeColony">Tu colonia</label>
            <MapPin size={18} className="modern-input-icon" />
            <input
              id="homeColony"
              name="homeColony"
              required
              maxLength={150}
              value={homeColony}
              onChange={(e) => setHomeColony(e.target.value)}
              placeholder="Centro"
              className="modern-input"
            />
          </div>

          <div className="modern-input-wrapper">
            <label htmlFor="homeMunicipality">Municipio donde vives</label>
            <MapPin size={18} className="modern-input-icon" />
            <select
              id="homeMunicipality"
              name="homeMunicipality"
              required
              value={homeMunicipality || municipality}
              onChange={(e) => setHomeMunicipality(e.target.value)}
              className="modern-input"
            >
              <option value="" disabled>Selecciona tu municipio</option>
              {MUNICIPIOS_JALISCO.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          </div>

          <button className="modern-button" type="submit" disabled={loading} style={{ marginTop: "12px" }}>
            {loading ? (
              <>
                <Loader2 className="lucide-spin" size={20} style={{ animation: "spin 2s linear infinite" }} />
                Enviando Solicitud...
              </>
            ) : (
              <>
                Enviar Solicitud de Registro
                <UserPlus size={20} />
              </>
            )}
          </button>

          <div style={{ textAlign: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #f1f5f9" }}>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0 }}>
              ¿Ya tienes cuenta asignada?{" "}
              <Link href="/login" style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>
                Iniciar Sesión
              </Link>
            </p>
          </div>
        </form>
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
