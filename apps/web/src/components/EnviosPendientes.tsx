"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw, Trash2 } from "lucide-react";

import {
  confirmarTelefonoRepetido,
  descartarEnvio,
  enviosDe,
  EVENTO_COLA,
  procesarCola,
  type EnvioEnCola
} from "@/lib/cola-de-envios";

const CADA_MS = 30_000;

/**
 * Aviso de lo que espera en la cola del teléfono (`lib/cola-de-envios.ts`) y motor que lo reenvía:
 * al abrir la pantalla, al volver la conexión, al volver a la pestaña y cada 30 s mientras haya algo
 * pendiente. No flota sobre la pantalla: es una franja al principio del contenido, así que no tapa
 * diálogos ni la barra inferior.
 *
 * `usuarioId`: la sesión abierta, o `null` en el registro público.
 */
export function EnviosPendientes({ usuarioId }: { usuarioId: string | null }) {
  const [envios, setEnvios] = useState<EnvioEnCola[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [recienEnviados, setRecienEnviados] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [porDescartar, setPorDescartar] = useState<string | null>(null);

  const refrescar = useCallback(() => setEnvios(enviosDe(usuarioId)), [usuarioId]);

  const reenviar = useCallback(async () => {
    if (enviosDe(usuarioId).every((e) => e.estado !== "pendiente")) return;
    setEnviando(true);
    try {
      const r = await procesarCola(usuarioId);
      if (r.enviados > 0) setRecienEnviados((n) => n + r.enviados);
    } finally {
      setEnviando(false);
      refrescar();
    }
  }, [usuarioId, refrescar]);

  useEffect(() => {
    refrescar();
    void reenviar();
    const alCambiar = () => refrescar();
    const alConectar = () => void reenviar();
    const alVolver = () => { if (document.visibilityState === "visible") void reenviar(); };
    window.addEventListener(EVENTO_COLA, alCambiar);
    // Otra pestaña que escribe en la cola.
    window.addEventListener("storage", alCambiar);
    window.addEventListener("online", alConectar);
    document.addEventListener("visibilitychange", alVolver);
    const reloj = setInterval(() => void reenviar(), CADA_MS);
    return () => {
      window.removeEventListener(EVENTO_COLA, alCambiar);
      window.removeEventListener("storage", alCambiar);
      window.removeEventListener("online", alConectar);
      document.removeEventListener("visibilitychange", alVolver);
      clearInterval(reloj);
    };
  }, [refrescar, reenviar]);

  useEffect(() => {
    if (recienEnviados === 0) return;
    const t = setTimeout(() => setRecienEnviados(0), 8000);
    return () => clearTimeout(t);
  }, [recienEnviados]);

  const pendientes = envios.filter((e) => e.estado === "pendiente");
  const rechazados = envios.filter((e) => e.estado === "rechazado");

  if (pendientes.length === 0 && rechazados.length === 0) {
    if (recienEnviados === 0) return null;
    return (
      <div role="status" className="envios-aviso envios-aviso--listo">
        <CheckCircle2 size={16} aria-hidden="true" />
        <span>
          {recienEnviados === 1 ? "Se envió el registro que estaba guardado en este teléfono." : `Se enviaron ${recienEnviados} registros que estaban guardados en este teléfono.`}
        </span>
      </div>
    );
  }

  const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios.replace("#", String(n)));

  return (
    <div role="status" className={`envios-aviso ${rechazados.length > 0 ? "envios-aviso--error" : "envios-aviso--espera"}`}>
      <div className="envios-aviso__linea">
        {rechazados.length > 0 ? <AlertTriangle size={16} aria-hidden="true" /> : <CloudOff size={16} aria-hidden="true" />}
        <span className="envios-aviso__texto">
          {pendientes.length > 0 && plural(pendientes.length, "1 registro guardado en este teléfono espera señal para enviarse.", "# registros guardados en este teléfono esperan señal para enviarse.")}
          {pendientes.length > 0 && rechazados.length > 0 && " "}
          {rechazados.length > 0 && plural(rechazados.length, "1 registro no se pudo guardar.", "# registros no se pudieron guardar.")}
        </span>
        {pendientes.length > 0 && (
          <button type="button" className="envios-aviso__boton" onClick={() => void reenviar()} disabled={enviando}>
            <RefreshCw size={14} aria-hidden="true" className={enviando ? "animate-spin" : undefined} />
            {enviando ? "Enviando…" : "Enviar ahora"}
          </button>
        )}
        <button type="button" className="envios-aviso__boton envios-aviso__boton--claro" onClick={() => setAbierto((a) => !a)} aria-expanded={abierto}>
          {abierto ? "Ocultar" : "Ver"}
        </button>
      </div>
      {abierto && (
        <ul className="envios-aviso__lista">
          {envios.map((e) => (
            <li key={e.clave}>
              <div>
                <strong>{e.descripcion}</strong>
                <span className="envios-aviso__detalle">
                  {e.estado === "rechazado" ? `No se guardó: ${e.error ?? "el servidor no lo aceptó."}` : e.error ?? `Guardado ${new Date(e.creadoEn).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}`}
                </span>
              </div>
              {e.estado === "rechazado" && e.codigo === "telefono_repetido" && porDescartar !== e.clave && (
                <button type="button" className="envios-aviso__boton" onClick={() => { confirmarTelefonoRepetido(e.clave); void reenviar(); }}>
                  Es otra persona: guardar
                </button>
              )}
              {/* Descartar borra el registro del teléfono: se pide confirmar, porque no hay otra copia. */}
              {porDescartar === e.clave ? (
                <span className="envios-aviso__confirmar">
                  ¿Borrarlo de este teléfono? No hay otra copia.
                  <button type="button" className="envios-aviso__boton envios-aviso__boton--peligro" onClick={() => { descartarEnvio(e.clave); setPorDescartar(null); }}>Sí, borrar</button>
                  <button type="button" className="envios-aviso__boton envios-aviso__boton--claro" onClick={() => setPorDescartar(null)}>No</button>
                </span>
              ) : (
                <button type="button" className="envios-aviso__boton envios-aviso__boton--claro" onClick={() => setPorDescartar(e.clave)} aria-label={`Descartar ${e.descripcion}`}>
                  <Trash2 size={14} aria-hidden="true" /> Descartar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
