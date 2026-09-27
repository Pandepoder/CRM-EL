"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle, Cake, Home, Mail, Phone, UserRound, X } from "lucide-react";

/**
 * Los datos personales del ciudadano en su ficha, y su corrección.
 *
 * Se capturaban (correo, nacimiento, calle y número) y la ficha no los enseñaba; y nadie podía
 * corregirlos: un teléfono mal tecleado en un evento se quedaba así. Corrige quien puede registrar
 * (`canEditData`, la misma regla que `PATCH /api/crm/contacts/[id]`); el domicilio electoral —colonia,
 * sección— sigue en «Territorio».
 */

export type DatosDelCiudadano = {
  contactId: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  maternalLastName?: string | null;
  phoneNumber: string | null;
  email?: string | null;
  birthDate?: string | null;
  birthYearKnown?: boolean;
  address?: string | null;
  addressNumber?: string | null;
  version?: number;
  canEditData?: boolean;
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** La fecha se guarda a mediodía o medianoche UTC: se lee en UTC para no correrla un día. */
function partesDeFecha(iso: string | null | undefined) {
  if (!iso) return null;
  const f = new Date(iso);
  if (Number.isNaN(f.getTime())) return null;
  return { dia: f.getUTCDate(), mes: f.getUTCMonth() + 1, anio: f.getUTCFullYear() };
}

function fechaEnTexto(iso: string | null | undefined, anioConocido: boolean): string | null {
  const p = partesDeFecha(iso);
  if (!p) return null;
  return anioConocido ? `${p.dia} de ${MESES[p.mes - 1]} de ${p.anio}` : `${p.dia} de ${MESES[p.mes - 1]} (año no capturado)`;
}

type Formulario = {
  firstName: string;
  lastName: string;
  maternalLastName: string;
  phone: string;
  email: string;
  birthDay: string;
  birthMonth: string;
  birthYear: string;
  address: string;
  addressNumber: string;
};

function formularioDe(d: DatosDelCiudadano): Formulario {
  const fecha = partesDeFecha(d.birthDate);
  const sinPartes = !d.firstName && !d.lastName && !d.maternalLastName;
  return {
    // Una ficha antigua guarda solo el nombre completo: se ofrece entero en «Nombre(s)».
    firstName: d.firstName ?? (sinPartes ? d.displayName : ""),
    lastName: d.lastName ?? "",
    maternalLastName: d.maternalLastName ?? "",
    phone: d.phoneNumber ?? "",
    email: d.email ?? "",
    birthDay: fecha ? String(fecha.dia) : "",
    birthMonth: fecha ? String(fecha.mes) : "",
    birthYear: fecha && d.birthYearKnown !== false ? String(fecha.anio) : "",
    address: d.address ?? "",
    addressNumber: d.addressNumber ?? ""
  };
}

function Dato({ icono, etiqueta, valor }: { icono: React.ReactNode; etiqueta: string; valor: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <span className="mt-0.5 text-gray-400 shrink-0">{icono}</span>
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-gray-500 uppercase">{etiqueta}</div>
        <div className={`text-sm font-bold break-words ${valor ? "text-gray-900" : "text-gray-400"}`}>{valor || "Sin dato"}</div>
      </div>
    </div>
  );
}

export function DatosPersonales({
  detail,
  onGuardado,
  avisar
}: {
  detail: DatosDelCiudadano;
  onGuardado: () => Promise<void> | void;
  avisar: (tipo: "success" | "error", mensaje: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState<Formulario>(() => formularioDe(detail));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicto, setConflicto] = useState(false);
  const [repetido, setRepetido] = useState<{ mensaje: string; contactoId: string | null } | null>(null);
  const formulario = useRef<HTMLFormElement>(null);

  const domicilio = [detail.address, detail.addressNumber].filter(Boolean).join(" ") || null;
  const nacimiento = fechaEnTexto(detail.birthDate, detail.birthYearKnown !== false);

  function abrir() {
    setF(formularioDe(detail));
    setError(null);
    setConflicto(false);
    setRepetido(null);
    setAbierto(true);
  }

  const poner = (campo: keyof Formulario, valor: string) => setF((x) => ({ ...x, [campo]: valor }));

  async function guardar(confirmarTelefonoRepetido = false) {
    if (guardando) return;
    setError(null);
    setRepetido(null);
    // Solo lo que cambió: así la auditoría no anota lo que nadie tocó.
    const inicial = formularioDe(detail);
    const cuerpo: Record<string, unknown> = { version: detail.version ?? 1 };
    for (const campo of ["firstName", "lastName", "maternalLastName", "phone", "email", "address", "addressNumber"] as const) {
      if (f[campo].trim() !== inicial[campo].trim()) cuerpo[campo] = f[campo];
    }
    if (f.birthDay !== inicial.birthDay || f.birthMonth !== inicial.birthMonth || f.birthYear.trim() !== inicial.birthYear) {
      cuerpo.birthDay = f.birthDay || null;
      cuerpo.birthMonth = f.birthMonth || null;
      cuerpo.birthYear = f.birthYear.trim() || null;
    }
    if (Object.keys(cuerpo).length === 1) {
      setAbierto(false);
      return;
    }
    if (confirmarTelefonoRepetido) cuerpo.confirmarTelefonoRepetido = true;

    setGuardando(true);
    try {
      const res = await fetch(`/api/crm/contacts/${detail.contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo)
      });
      const datos = (await res.json().catch(() => ({}))) as { code?: string; message?: string; campo?: string; contactoExistenteId?: string };
      if (res.ok) {
        setAbierto(false);
        avisar("success", "Datos del ciudadano actualizados.");
        await onGuardado();
        return;
      }
      if (datos.code === "telefono_repetido") {
        setRepetido({ mensaje: datos.message ?? "Ese teléfono ya está en otra ficha.", contactoId: datos.contactoExistenteId ?? null });
        return;
      }
      if (datos.code === "version_conflict") setConflicto(true);
      setError(datos.message ?? "No se pudieron guardar los cambios.");
      if (datos.campo) formulario.current?.querySelector<HTMLElement>(`[name="${datos.campo}"]`)?.focus();
    } catch {
      setError("Sin conexión: no se guardó nada. Intenta de nuevo cuando tengas señal.");
    } finally {
      setGuardando(false);
    }
  }

  const campo = "w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900";
  const etiqueta = "block text-[10px] font-bold text-gray-500 uppercase mb-1";

  return (
    <>
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserRound size={16} className="text-blue-600" />
            <h3 className="font-extrabold text-xs text-gray-900 uppercase">Datos personales</h3>
          </div>
          <button
            type="button"
            hidden={!detail.canEditData}
            onClick={abrir}
            className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
          >
            Editar datos
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Dato icono={<Phone size={15} />} etiqueta="Teléfono" valor={detail.phoneNumber} />
          <Dato icono={<Mail size={15} />} etiqueta="Correo" valor={detail.email} />
          <Dato icono={<Cake size={15} />} etiqueta="Nacimiento" valor={nacimiento} />
          <Dato icono={<Home size={15} />} etiqueta="Calle y número" valor={domicilio} />
        </div>
      </div>

      {abierto && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[110] flex items-center justify-center p-3 sm:p-4 animate-in fade-in" onClick={() => !guardando && setAbierto(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Editar datos personales"
            className="bg-white rounded-3xl max-w-lg w-full shadow-2xl max-h-[88dvh] flex flex-col overflow-hidden border border-gray-100 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <h3 className="font-black text-sm text-gray-900">Editar datos personales</h3>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                disabled={guardando}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center cursor-pointer transition-colors"
                title="Cerrar ventana"
              >
                <X size={16} />
              </button>
            </div>

            <form
              ref={formulario}
              onSubmit={(e) => {
                e.preventDefault();
                void guardar();
              }}
              className="p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1"
            >
              {repetido && (
                <div role="alert" className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold rounded-2xl space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
                    <span>{repetido.mensaje}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {repetido.contactoId && (
                      <Link href={`/crm/contacts/${repetido.contactoId}`} target="_blank" className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-amber-900 font-extrabold">
                        Ver la otra ficha
                      </Link>
                    )}
                    <button type="button" disabled={guardando} onClick={() => void guardar(true)} className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold cursor-pointer disabled:opacity-60">
                      Es otra persona: guardar
                    </button>
                  </div>
                </div>
              )}
              {error && (
                <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
                  <span>
                    {error}
                    {conflicto && (
                      <button
                        type="button"
                        onClick={async () => {
                          setAbierto(false);
                          await onGuardado();
                        }}
                        className="ml-1 underline cursor-pointer"
                      >
                        Recargar la ficha
                      </button>
                    )}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="dp-nombre" className={etiqueta}>Nombre(s) *</label>
                  <input id="dp-nombre" name="firstName" required maxLength={120} value={f.firstName} onChange={(e) => poner("firstName", e.target.value)} className={campo} />
                </div>
                <div>
                  <label htmlFor="dp-paterno" className={etiqueta}>Apellido paterno</label>
                  <input id="dp-paterno" name="lastName" maxLength={120} value={f.lastName} onChange={(e) => poner("lastName", e.target.value)} className={campo} />
                </div>
                <div>
                  <label htmlFor="dp-materno" className={etiqueta}>Apellido materno</label>
                  <input id="dp-materno" name="maternalLastName" maxLength={120} value={f.maternalLastName} onChange={(e) => poner("maternalLastName", e.target.value)} className={campo} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dp-telefono" className={etiqueta}>Teléfono</label>
                  <input id="dp-telefono" name="phone" type="tel" inputMode="tel" maxLength={30} value={f.phone} onChange={(e) => poner("phone", e.target.value)} className={campo} />
                </div>
                <div>
                  <label htmlFor="dp-correo" className={etiqueta}>Correo</label>
                  <input id="dp-correo" name="email" type="email" maxLength={160} value={f.email} onChange={(e) => poner("email", e.target.value)} className={campo} />
                </div>
              </div>

              <fieldset>
                <legend className={etiqueta}>Fecha de nacimiento</legend>
                <div className="grid grid-cols-3 gap-2">
                  <select name="birthDay" aria-label="Día" value={f.birthDay} onChange={(e) => poner("birthDay", e.target.value)} className={campo}>
                    <option value="">Día</option>
                    {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select name="birthMonth" aria-label="Mes" value={f.birthMonth} onChange={(e) => poner("birthMonth", e.target.value)} className={campo}>
                    <option value="">Mes</option>
                    {MESES.map((m, i) => <option key={m} value={String(i + 1)}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                  <input name="birthYear" aria-label="Año (opcional)" placeholder="Año (opcional)" inputMode="numeric" maxLength={4} value={f.birthYear} onChange={(e) => poner("birthYear", e.target.value.replace(/[^0-9]/g, ""))} className={campo} />
                </div>
              </fieldset>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label htmlFor="dp-calle" className={etiqueta}>Calle y número</label>
                  <input id="dp-calle" name="address" maxLength={300} value={f.address} onChange={(e) => poner("address", e.target.value)} className={campo} />
                </div>
                <div>
                  <label htmlFor="dp-numero" className={etiqueta}>Número (si va aparte)</label>
                  <input id="dp-numero" name="addressNumber" maxLength={40} value={f.addressNumber} onChange={(e) => poner("addressNumber", e.target.value)} className={campo} />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">La colonia y la sección se corrigen desde «Territorio». Cada cambio queda registrado con tu nombre.</p>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setAbierto(false)} disabled={guardando} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold text-gray-600 cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={guardando} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50">
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
