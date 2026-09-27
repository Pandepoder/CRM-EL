"use client";

import { useEffect, useState } from "react";
import {
  User, Phone, Mail, Calendar, MapPin, CheckCircle, Sparkles, ArrowRight, Briefcase, ChevronDown, ChevronUp, AlertCircle,
  MessageSquare, ClipboardList, CloudOff, UserPlus, Users
} from "lucide-react";

import { EnviosPendientes } from "@/components/EnviosPendientes";
import { enviarOEncolar, nuevaClave, TEXTO_DE_ESPERA } from "@/lib/cola-de-envios";
import { MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";

/** Lo que el modo evento recuerda en este teléfono mientras dura el evento. */
type Evento = { municipio: string; seccion: string; registrados: number };

const encuestaVacia = () => ({
  colonyPriorityNeed: "",
  colonyPriorityOther: "",
  tonalaValues: "",
  tonalaValuesOther: "",
  servicesRating: "",
  servicesRatingWhy: "",
  projectExpectations: "",
  projectExpectationsOther: "",
  participationForm: "",
  participationFormOther: "",
  openProposal: ""
});

const formularioVacio = (municipio: string, seccion: string) => ({
  firstName: "",
  lastName: "",
  maternalLastName: "",
  phone: "",
  email: "",
  birthDay: "",
  birthMonth: "",
  birthYear: "",
  address: "",
  colony: "",
  municipality: municipio,
  sectionNum: seccion,
  profession: "",
  preferredContactMethod: "whatsapp",
  preferredContactTime: "indiferente",
  participatingArea: "General",
  knowMeBetter: ""
});

export default function PublicRegistrationClient({
  hostUser,
  slug,
  modoEvento = false,
  municipioSugerido = null
}: {
  hostUser: { id: string; displayName: string };
  slug: string;
  /** Modo evento (kiosco, 3.1): una persona tras otra en el mismo teléfono. */
  modoEvento?: boolean;
  /** El municipio de quien comparte el enlace: sale elegido y la persona lo cambia si hace falta. */
  municipioSugerido?: string | null;
}) {
  // Modo evento: municipio y sección fijados para todo el evento, recordados en este teléfono.
  const llaveEvento = `registro-evento:${slug.toLowerCase()}`;
  const [evento, setEvento] = useState<Evento | null>(null);
  const [configurandoEvento, setConfigurandoEvento] = useState(modoEvento);
  const [borradorEvento, setBorradorEvento] = useState({ municipio: municipioSugerido ?? "", seccion: "" });
  const [formData, setFormData] = useState(() => formularioVacio(municipioSugerido ?? "", ""));

  useEffect(() => {
    if (!modoEvento) return;
    try {
      const guardado = JSON.parse(localStorage.getItem(llaveEvento) ?? "null") as Evento | null;
      if (guardado?.municipio) {
        setEvento(guardado);
        setConfigurandoEvento(false);
        setFormData(formularioVacio(guardado.municipio, guardado.seccion));
      }
    } catch {
      // Sin almacenamiento (modo privado): se configura el evento en cada visita.
    }
  }, [modoEvento, llaveEvento]);

  function guardarEvento(siguiente: Evento | null) {
    setEvento(siguiente);
    try {
      if (siguiente) localStorage.setItem(llaveEvento, JSON.stringify(siguiente));
      else localStorage.removeItem(llaveEvento);
    } catch {
      // Sin almacenamiento: el evento dura lo que la pestaña abierta.
    }
  }

  // Survey State
  const [showSurvey, setShowSurvey] = useState(false);
  const [survey, setSurvey] = useState(encuestaVacia);

  // Clave del registro (R16): si la señal se corta después de que el servidor lo guardó, el reenvío
  // devuelve el mismo registro en vez de rechazarlo como «teléfono ya registrado».
  const [clave, setClave] = useState(() => nuevaClave());
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  /** Guardado en este teléfono, esperando señal. */
  const [enEspera, setEnEspera] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  /** «Registrar a otra persona»: campos limpios; en modo evento, con municipio y sección del evento. */
  function registrarOtra() {
    setFormData(formularioVacio(evento?.municipio ?? municipioSugerido ?? "", evento?.seccion ?? ""));
    setSurvey(encuestaVacia());
    setShowSurvey(false);
    setClave(nuevaClave());
    setSubmitted(false);
    setEnEspera(null);
    setErrorMessage("");
    window.scrollTo({ top: 0 });
  }

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const months = [
    { num: "1", name: "Enero" },
    { num: "2", name: "Febrero" },
    { num: "3", name: "Marzo" },
    { num: "4", name: "Abril" },
    { num: "5", name: "Mayo" },
    { num: "6", name: "Junio" },
    { num: "7", name: "Julio" },
    { num: "8", name: "Agosto" },
    { num: "9", name: "Septiembre" },
    { num: "10", name: "Octubre" },
    { num: "11", name: "Noviembre" },
    { num: "12", name: "Diciembre" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.firstName.trim() || !formData.phone.trim()) {
      setErrorMessage("Por favor ingresa tu nombre y número de teléfono.");
      return;
    }

    if (!formData.birthDay || !formData.birthMonth) {
      setErrorMessage("Por favor selecciona el día y mes de tu cumpleaños.");
      return;
    }

    setLoading(true);
    const r = await enviarOEncolar({
      clave,
      tipo: "registro-publico",
      url: "/api/public/registro",
      cuerpo: {
        slug,
        ...formData,
        survey: showSurvey ? survey : null,
        clientRequestId: clave,
        ...(modoEvento ? { modo: "evento" } : {})
      },
      descripcion: `Registro: ${[formData.firstName, formData.lastName].map((x) => x.trim()).filter(Boolean).join(" ")}`,
      // Sin dueño: el registro público no lleva sesión, y se reenvía desde esta misma página.
      usuarioId: null
    });
    setLoading(false);

    if (r.estado === "enviado" || r.estado === "encolado") {
      if (r.estado === "encolado") setEnEspera(TEXTO_DE_ESPERA[r.motivo]);
      if (evento) guardarEvento({ ...evento, registrados: evento.registrados + 1 });
      setSubmitted(true);
      window.scrollTo({ top: 0 });
      return;
    }
    setErrorMessage(r.error);
    const campo = r.estado === "rechazado" && r.campo ? document.querySelector<HTMLElement>(`[data-campo="${r.campo}"]`) : null;
    if (campo) campo.focus();
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const estiloCampo = "w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500";

  // Modo evento, antes de empezar: quien opera el teléfono fija municipio y sección una sola vez.
  if (modoEvento && configurandoEvento) {
    const listo = Boolean(borradorEvento.municipio);
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <form
          className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!listo) return;
            const siguiente = { municipio: borradorEvento.municipio, seccion: borradorEvento.seccion.trim(), registrados: evento?.registrados ?? 0 };
            guardarEvento(siguiente);
            setFormData(formularioVacio(siguiente.municipio, siguiente.seccion));
            setConfigurandoEvento(false);
          }}
        >
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full text-xs font-bold text-blue-800 border border-blue-100">
              <Users size={13} /> Modo evento
            </span>
            <h1 className="text-xl font-black text-blue-950">¿Dónde es el evento?</h1>
            <p className="text-xs font-medium text-gray-600">
              Se llena una vez. Cada registro saldrá con este municipio y esta sección ya puestos; quien sea de otro lugar lo cambia en su registro. Registros a nombre de <strong>{hostUser.displayName}</strong>.
            </p>
          </div>
          <div>
            <label htmlFor="evento-municipio" className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Municipio *</label>
            <select id="evento-municipio" required value={borradorEvento.municipio} onChange={(e) => setBorradorEvento({ ...borradorEvento, municipio: e.target.value })} className={estiloCampo}>
              <option value="">Selecciona el municipio…</option>
              {MUNICIPIOS_JALISCO.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="evento-seccion" className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Sección electoral (opcional)</label>
            <input id="evento-seccion" inputMode="numeric" pattern="[0-9]*" placeholder="Si casi todos son de la misma sección" value={borradorEvento.seccion} onChange={(e) => setBorradorEvento({ ...borradorEvento, seccion: e.target.value.replace(/\D/g, "") })} className={estiloCampo} />
          </div>
          <button type="submit" disabled={!listo} className="w-full py-4 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-sm rounded-2xl disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2">
            Empezar a registrar <ArrowRight size={16} />
          </button>
        </form>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl space-y-5 animate-in fade-in zoom-in duration-300">
          {enEspera ? (
            <>
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CloudOff size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-blue-950">Registro guardado</h2>
                <p className="text-sm font-medium text-gray-600">{enEspera}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle size={44} />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-blue-950">¡Muchas Gracias!</h2>
                <p className="text-sm font-medium text-gray-600">
                  Tus datos han sido registrados correctamente en la red de <strong>{hostUser.displayName}</strong>.
                </p>
              </div>
            </>
          )}

          {/* Antes esta pantalla no ofrecía nada: para la siguiente persona había que recargar a mano (C18). */}
          <button
            type="button"
            onClick={registrarOtra}
            className={`w-full py-4 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer ${modoEvento ? "bg-blue-700 hover:bg-blue-800 text-white shadow-lg" : "bg-white border border-gray-200 text-blue-900 hover:bg-gray-50"}`}
          >
            <UserPlus size={18} /> Registrar a otra persona
          </button>

          {modoEvento && evento ? (
            <p className="text-xs font-bold text-gray-500">
              {evento.registrados === 1 ? "1 registro" : `${evento.registrados} registros`} en este teléfono · {evento.municipio}{evento.seccion ? ` · Sección ${evento.seccion}` : ""}
            </p>
          ) : (
            <div className="p-4 bg-blue-50/80 rounded-2xl border border-blue-100 text-xs text-blue-900 font-semibold space-y-1">
              <p className="flex items-center justify-center gap-1.5"><Sparkles size={13} /> Estamos construyendo un proyecto cercano, ordenado y con visión para tu municipio.</p>
              <p className="text-gray-500">Nos pondremos en contacto contigo pronto.</p>
            </div>
          )}
          <EnviosPendientes usuarioId={null} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 text-gray-800 py-6 sm:py-8 px-3 sm:px-4 pb-24 flex justify-center">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/20">
        {modoEvento && evento && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 bg-blue-50 border-b border-blue-100 text-xs font-bold text-blue-900">
            <span className="flex items-center gap-1.5">
              <Users size={14} /> Modo evento · {evento.municipio}{evento.seccion ? ` · Sección ${evento.seccion}` : ""} · {evento.registrados === 1 ? "1 registro" : `${evento.registrados} registros`}
            </span>
            <button type="button" onClick={() => { setBorradorEvento({ municipio: evento.municipio, seccion: evento.seccion }); setConfigurandoEvento(true); }} className="underline cursor-pointer">
              Cambiar
            </button>
          </div>
        )}
        <EnviosPendientes usuarioId={null} />
        {/* HERO BANNER */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 p-6 md:p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-cyan-400/10 rounded-full blur-2xl" />
          
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-cyan-200 border border-white/15 mb-3">
            <Sparkles size={13} /> Registro Social
          </span>

          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Súmate con Nosotros
          </h1>

          <p className="text-xs md:text-sm text-blue-200/90 max-w-md mx-auto mt-2 font-medium">
            Invitación personal de <strong className="text-white font-bold">{hostUser.displayName}</strong> para construir una red activa y cercana por nuestra comunidad.
          </p>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-7">
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-2xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. DATOS DE CONTACTO */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <User size={16} className="text-blue-600" />
              <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">1. Datos de Contacto</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Nombre(s) *</label>
                <input
                  type="text"
                  required
                  placeholder="Tu nombre completo"
                  data-campo="firstName" value={formData.firstName}
                  onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Primer Apellido</label>
                <input
                  type="text"
                  placeholder="Apellido paterno"
                  value={formData.lastName}
                  onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Segundo Apellido</label>
                <input
                  type="text"
                  placeholder="Apellido materno"
                  value={formData.maternalLastName}
                  onChange={e => setFormData({ ...formData, maternalLastName: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Teléfono / WhatsApp *</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    required
                    placeholder="10 dígitos (ej. 3312345678)"
                    data-campo="phone" value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Correo Electrónico (Opcional)</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    data-campo="email" value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* CUMPLEAÑOS OBLIGATORIO DÍA Y MES */}
            <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-2">
              <label className="block text-[11px] font-extrabold text-blue-950 uppercase flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-600" />
                <span>Fecha de Cumpleaños * (Día y Mes obligatorios para felicitaciones)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  required
                  data-campo="birthDay" value={formData.birthDay}
                  onChange={e => setFormData({ ...formData, birthDay: e.target.value })}
                  className="p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                >
                  <option value="">Día *</option>
                  {days.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>

                <select
                  required
                  value={formData.birthMonth}
                  onChange={e => setFormData({ ...formData, birthMonth: e.target.value })}
                  className="p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                >
                  <option value="">Mes *</option>
                  {months.map(m => (
                    <option key={m.num} value={m.num}>{m.name}</option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Año (Opcional)"
                  value={formData.birthYear}
                  onChange={e => setFormData({ ...formData, birthYear: e.target.value })}
                  className="p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                />
              </div>
            </div>
          </div>

          {/* 2. INFORMACIÓN TERRITORIAL */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <MapPin size={16} className="text-blue-600" />
              <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">2. Domicilio y Colonia</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="registro-colonia" className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Colonia *</label>
                <input
                  id="registro-colonia"
                  type="text"
                  data-campo="colony"
                  required
                  maxLength={150}
                  placeholder="Escribe tu colonia o fraccionamiento"
                  value={formData.colony}
                  onChange={e => setFormData({ ...formData, colony: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                {/* Era un texto libre: se guardaba «Tonala Jal.», «zapopan» o cualquier cosa (C18, D1).
                    Ahora es la lista de los 125 municipios de Jalisco, la misma del alta interna. */}
                <label htmlFor="registro-municipio" className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Municipio donde vives *</label>
                {/* Obligatorio desde la etapa 5: ningún registro sin municipio. */}
                <select
                  id="registro-municipio"
                  data-campo="municipality"
                  required
                  value={formData.municipality}
                  onChange={e => setFormData({ ...formData, municipality: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecciona tu municipio…</option>
                  {MUNICIPIOS_JALISCO.map((m) => <option key={m.name} value={m.name}>{m.name}</option>)}
                </select>
              </div>

              {modoEvento && (
                <div>
                  <label htmlFor="registro-seccion" className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Sección electoral</label>
                  <input
                    id="registro-seccion"
                    data-campo="sectionNum"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Viene en la credencial INE"
                    value={formData.sectionNum}
                    onChange={e => setFormData({ ...formData, sectionNum: e.target.value.replace(/\D/g, "") })}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Calle y Número (Opcional)</label>
                <input
                  type="text"
                  placeholder="Calle, número exterior/interior"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 3. PARTICIPACIÓN Y OCUPACIÓN */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <Briefcase size={16} className="text-blue-600" />
              <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider">3. Ocupación y Participación</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Ocupación / Oficio / Actividad</label>
                <input
                  type="text"
                  placeholder="¿A qué te dedicas?"
                  value={formData.profession}
                  onChange={e => setFormData({ ...formData, profession: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Área de Interés</label>
                <select
                  value={formData.participatingArea}
                  onChange={e => setFormData({ ...formData, participatingArea: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none cursor-pointer"
                >
                  <option value="General">Participación General</option>
                  <option value="Vecinal">Comité Vecinal y Mejoras</option>
                  <option value="Deporte">Deportes y Juventud</option>
                  <option value="Cultura">Cultura y Tradiciones</option>
                  <option value="Comercio">Comercio y Emprendimiento</option>
                  <option value="Social">Apoyo Social y Familias</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. CONÓCEME MEJOR (TEXTO OFICIAL) */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
            <label className="flex items-start gap-1.5 text-xs font-extrabold text-slate-900">
              <MessageSquare size={14} className="shrink-0 mt-0.5 text-slate-500" />
              <span>Nos gustaría conocerte un poquito mejor. ¿Qué disfrutas hacer, qué temas te interesan o qué te gustaría que recordáramos de ti?</span>
            </label>
            <textarea
              rows={3}
              placeholder="Comparte lo que gustes (opcional)..."
              value={formData.knowMeBetter}
              onChange={e => setFormData({ ...formData, knowMeBetter: e.target.value })}
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 5. ENCUESTA OPCIONAL */}
          <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSurvey(!showSurvey)}
              className="w-full p-4.5 flex items-center justify-between text-left cursor-pointer hover:bg-indigo-50/80 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <ClipboardList size={14} />
                </span>
                <div>
                  <h4 className="font-extrabold text-xs text-indigo-950">Encuesta Opcional de Opinión (2 minutos)</h4>
                  <p className="text-[11px] text-indigo-700 font-medium">Ayúdanos contestando estas preguntas sobre tu municipio.</p>
                </div>
              </div>
              {showSurvey ? <ChevronUp size={16} className="text-indigo-600" /> : <ChevronDown size={16} className="text-indigo-600" />}
            </button>

            {showSurvey && (
              <div className="p-5 pt-2 space-y-5 border-t border-indigo-100 bg-white">
                {/* P1 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-900">1. ¿Qué necesita mejorar primero en tu colonia?</label>
                  <select
                    value={survey.colonyPriorityNeed}
                    onChange={e => setSurvey({ ...survey, colonyPriorityNeed: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Agua potable o drenaje">Agua potable o drenaje</option>
                    <option value="Calles, baches o banquetas">Calles, baches o banquetas</option>
                    <option value="Seguridad">Seguridad</option>
                    <option value="Alumbrado público">Alumbrado público</option>
                    <option value="Recolección de basura y limpieza">Recolección de basura y limpieza</option>
                    <option value="Transporte y movilidad">Transporte y movilidad</option>
                    <option value="Parques, espacios deportivos o culturales">Parques, espacios deportivos o culturales</option>
                    <option value="Salud y apoyos sociales">Salud y apoyos sociales</option>
                    <option value="Medioambiente o bienestar animal">Medioambiente o bienestar animal</option>
                    <option value="Empleo y apoyo a comerciantes y artesanos">Empleo y apoyo a comerciantes y artesanos</option>
                    <option value="Otra">Otra (escribir abajo)</option>
                  </select>
                  {survey.colonyPriorityNeed === "Otra" && (
                    <input
                      type="text"
                      placeholder="Especifica qué necesita mejorar..."
                      value={survey.colonyPriorityOther}
                      onChange={e => setSurvey({ ...survey, colonyPriorityOther: e.target.value })}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    />
                  )}
                </div>

                {/* P2 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-900">2. ¿Qué es lo que más valoras de tu municipio?</label>
                  <select
                    value={survey.tonalaValues}
                    onChange={e => setSurvey({ ...survey, tonalaValues: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Su gente y sentido de comunidad">Su gente y sentido de comunidad</option>
                    <option value="Las tradiciones y la cultura">Las tradiciones y la cultura</option>
                    <option value="La artesanía">La artesanía</option>
                    <option value="Los mercados, tianguis y comercios">Los mercados, tianguis y comercios</option>
                    <option value="La vida familiar">La vida familiar</option>
                    <option value="Sus barrios y comunidades">Sus barrios y comunidades</option>
                    <option value="Otra">Otra (escribir abajo)</option>
                  </select>
                </div>

                {/* P3 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-900">3. ¿Cómo calificarías actualmente los servicios de tu colonia?</label>
                  <div className="grid grid-cols-5 gap-1.5 text-center text-xs font-bold">
                    {[
                      { val: "5", label: "Muy bien" },
                      { val: "4", label: "Bien" },
                      { val: "3", label: "Regular" },
                      { val: "2", label: "Mal" },
                      { val: "1", label: "Muy mal" },
                    ].map(r => (
                      <button
                        key={r.val}
                        type="button"
                        onClick={() => setSurvey({ ...survey, servicesRating: r.val })}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          survey.servicesRating === r.val
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* P4 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-900">4. ¿Qué esperarías de un nuevo proyecto para tu municipio?</label>
                  <select
                    value={survey.projectExpectations}
                    onChange={e => setSurvey({ ...survey, projectExpectations: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Que escuche y permanezca cercano a la gente">Que escuche y permanezca cercano a la gente</option>
                    <option value="Que mejore los servicios públicos">Que mejore los servicios públicos</option>
                    <option value="Que fortalezca la seguridad">Que fortalezca la seguridad</option>
                    <option value="Que apoye a las colonias y comunidades">Que apoye a las colonias y comunidades</option>
                    <option value="Que impulse empleos, comercios y artesanías">Que impulse empleos, comercios y artesanías</option>
                    <option value="Que trabaje con honestidad y dé resultados">Que trabaje con honestidad y dé resultados</option>
                  </select>
                </div>

                {/* P5 */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-900">5. ¿Cómo te gustaría participar?</label>
                  <select
                    value={survey.participationForm}
                    onChange={e => setSurvey({ ...survey, participationForm: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="">Selecciona una opción</option>
                    <option value="Recibir información">Recibir información</option>
                    <option value="Contestar encuestas">Contestar encuestas</option>
                    <option value="Asistir a reuniones o actividades">Asistir a reuniones o actividades</option>
                    <option value="Participar en acciones sociales">Participar en acciones sociales</option>
                    <option value="Compartir ideas o propuestas">Compartir ideas o propuestas</option>
                    <option value="Por ahora solamente deseo mantenerme informado">Por ahora solamente deseo mantenerme informado</option>
                  </select>
                </div>

                {/* P6 - Pregunta abierta final */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-900">
                    6. Si pudieras cambiar, mejorar o proponer algo para tu municipio, ¿qué nos dirías?
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Escribe tu propuesta o mensaje libremente..."
                    value={survey.openProposal}
                    onChange={e => setSurvey({ ...survey, openProposal: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none focus:bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Guardando registro...</span>
            ) : (
              <>
                <span>Completar Registro Social</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-400 text-center">
            Tus datos están protegidos conforme a las políticas de privacidad y uso social del proyecto.
          </p>
        </form>
      </div>
    </div>
  );
}
