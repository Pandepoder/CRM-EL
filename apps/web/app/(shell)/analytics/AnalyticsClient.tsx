"use client";

import { useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity,
  BadgeCheck,
  Building2,
  CalendarClock,
  Cake,
  ClipboardList,
  Flame,
  HeartHandshake,
  Map as IconoMapa,
  MessageCircle,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  UsersRound
} from "lucide-react";

import type { AnalisisDemografico } from "@/lib/analisis-demografico";

import {
  BarrasConEtiqueta,
  COLORES,
  Columnas,
  Dona,
  MapaDeCalor,
  Medidor,
  NumeroAnimado,
  SinDatos,
  useMovimientoReducido,
  Tarjeta,
  estiloDelTooltip,
  formatoNumero,
  porcentaje
} from "./graficas";

const ZONA = "America/Mexico_City";

const PERIODOS = [
  { clave: "30", etiqueta: "30 días", dias: 30 },
  { clave: "90", etiqueta: "90 días", dias: 90 },
  { clave: "365", etiqueta: "12 meses", dias: 365 },
  { clave: "todo", etiqueta: "Todo", dias: Infinity }
] as const;
type Periodo = (typeof PERIODOS)[number]["clave"];

/** Fecha AAAA-MM-DD (día de Jalisco) como texto corto. */
const fechaCorta = (dia: string, conAnio = false) =>
  new Date(`${dia}T12:00:00Z`).toLocaleDateString("es-MX", { day: "numeric", month: "short", ...(conAnio ? { year: "2-digit" } : {}), timeZone: "UTC" });

/** Lunes de la semana de un día AAAA-MM-DD. */
function lunesDe(dia: string): string {
  const d = new Date(`${dia}T12:00:00Z`);
  const desplazamiento = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - desplazamiento * 86_400_000).toISOString().slice(0, 10);
}

function serieDelPeriodo(a: AnalisisDemografico, periodo: Periodo) {
  const dias = PERIODOS.find((p) => p.clave === periodo)!.dias;
  const serie = a.crecimiento;
  const desde = Number.isFinite(dias) ? Math.max(0, serie.length - dias) : 0;
  let acumulado = a.previosAlCrecimiento + serie.slice(0, desde).reduce((n, x) => n + x.nuevos, 0);
  const tramo = serie.slice(desde);
  const semanal = tramo.length > 120;
  const puntos: { etiqueta: string; nuevos: number; acumulado: number }[] = [];
  for (const x of tramo) {
    acumulado += x.nuevos;
    const clave = semanal ? lunesDe(x.dia) : x.dia;
    const ultimo = puntos.at(-1);
    const etiqueta = semanal ? `Sem. ${fechaCorta(clave, true)}` : fechaCorta(clave);
    if (ultimo && ultimo.etiqueta === etiqueta) {
      ultimo.nuevos += x.nuevos;
      ultimo.acumulado = acumulado;
    } else puntos.push({ etiqueta, nuevos: x.nuevos, acumulado });
  }
  return { puntos, semanal, nuevosEnPeriodo: tramo.reduce((n, x) => n + x.nuevos, 0) };
}

export default function AnalyticsClient({ analisis: a }: { analisis: AnalisisDemografico }) {
  const [periodo, setPeriodo] = useState<Periodo>("90");
  const quieto = useMovimientoReducido();
  const serie = useMemo(() => serieDelPeriodo(a, periodo), [a, periodo]);
  const t = a.totales;
  const cambio = t.nuevosPrevios30 > 0 ? Math.round(((t.nuevos30 - t.nuevosPrevios30) / t.nuevosPrevios30) * 100) : null;
  const ultimos30 = a.crecimiento.slice(-30);
  const actualizado = new Date(a.generadoEn).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: ZONA });
  const equipos = a.equipos.slice(0, 12);
  const haySurvey = t.encuestas > 0 || a.calificaciones.length > 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      {/* Portada */}
      <section className="relative overflow-hidden rounded-[28px] text-white p-6 sm:p-8 shadow-[0_24px_60px_rgba(11,31,58,.28)] bg-[radial-gradient(120%_140%_at_0%_0%,#1f5c9b_0%,#0f2d52_45%,#0b1f3a_100%)]">
        <div aria-hidden className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div aria-hidden className="absolute right-24 -bottom-24 w-64 h-64 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[.14em] bg-white/10 border border-white/15 rounded-full px-3 py-1">
              <Sparkles size={13} /> Datos al momento
            </span>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mt-3">Tu padrón en números</h1>
            <p className="text-blue-100/80 text-sm mt-1.5">Lo que puedes ver en el directorio, solo ciudadanos activos · Actualizado: {actualizado}</p>
          </div>
          <div className="flex items-end gap-6">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100/70">Ciudadanos</p>
              <p className="text-5xl sm:text-6xl font-black leading-none tabular-nums">
                <NumeroAnimado valor={t.ciudadanos} />
              </p>
            </div>
            <div className="pb-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-100/70">Últimos 30 días</p>
              <p className="text-2xl font-black tabular-nums">+{formatoNumero(t.nuevos30)}</p>
              {cambio !== null && (
                <p className={`inline-flex items-center gap-1 text-xs font-black mt-0.5 ${cambio >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {cambio >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {cambio >= 0 ? "+" : ""}
                  {cambio}% vs. los 30 anteriores
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <Indicador icono={<Building2 size={18} />} color="text-emerald-600 bg-emerald-50" etiqueta="Colonias cubiertas" valor={t.coloniasCubiertas} />
        <Indicador icono={<IconoMapa size={18} />} color="text-blue-700 bg-blue-50" etiqueta="Secciones con presencia" valor={t.seccionesConPresencia} nota={t.municipios > 1 ? `${t.municipios} municipios` : undefined} />
        <Indicador icono={<BadgeCheck size={18} />} color="text-indigo-700 bg-indigo-50" etiqueta="Militancia confirmada" valor={t.confirmados} nota={`${porcentaje(t.confirmados, t.ciudadanos)}% del padrón`} />
        <Indicador icono={<HeartHandshake size={18} />} color="text-rose-600 bg-rose-50" etiqueta="Voluntarios" valor={t.voluntarios} nota={`${porcentaje(t.voluntarios, t.ciudadanos)}% del padrón`} />
        <Indicador icono={<Cake size={18} />} color="text-amber-600 bg-amber-50" etiqueta="Edad promedio" valor={t.edadPromedio ?? 0} decimales={1} sufijo=" años" nota={`Con edad: ${porcentaje(t.conEdad, t.ciudadanos)}%`} vacio={t.edadPromedio === null} />
        <Indicador icono={<Star size={18} />} color="text-cyan-700 bg-cyan-50" etiqueta="Calificación de servicios" valor={t.calificacionPromedio ?? 0} decimales={1} sufijo={` / ${t.escalaCalificacion}`} nota={`${formatoNumero(t.encuestas)} encuestas`} vacio={t.calificacionPromedio === null} />
      </div>

      {/* Crecimiento */}
      <Tarjeta
        titulo="Crecimiento del padrón"
        subtitulo={`${formatoNumero(serie.nuevosEnPeriodo)} nuevos en el periodo · ${serie.semanal ? "por semana" : "por día"}, en hora de Jalisco`}
        icono={<Activity size={18} />}
        accion={
          <div className="flex bg-slate-100 rounded-xl p-1 shrink-0" role="group" aria-label="Periodo">
            {PERIODOS.map((p) => (
              <button
                key={p.clave}
                type="button"
                onClick={() => setPeriodo(p.clave)}
                aria-pressed={periodo === p.clave}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodo === p.clave ? "bg-white text-blue-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>
        }
      >
        {serie.puntos.length === 0 ? (
          <SinDatos />
        ) : (
          <div className="h-72 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serie.puntos} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="relleno-acumulado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2878c7" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2878c7" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} minTickGap={24} />
                <YAxis yAxisId="nuevos" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} width={36} />
                <YAxis yAxisId="total" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} width={44} />
                <Tooltip
                  contentStyle={estiloDelTooltip}
                  formatter={(v, nombre) => [formatoNumero(Number(v)), nombre === "acumulado" ? "Padrón acumulado" : serie.semanal ? "Nuevos en la semana" : "Nuevos del día"]}
                />
                <Area yAxisId="total" type="monotone" dataKey="acumulado" stroke="#2878c7" strokeWidth={2.5} fill="url(#relleno-acumulado)" isAnimationActive={!quieto} />
                <Bar yAxisId="nuevos" dataKey="nuevos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={!quieto} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Tarjeta>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <Tarjeta titulo="Edades" subtitulo={t.edadPromedio !== null ? `En años · promedio ${t.edadPromedio} · ${formatoNumero(t.conEdad)} con año de nacimiento` : "Sin año de nacimiento capturado"} icono={<Cake size={18} />}>
          <Columnas datos={a.edades} color="#f59e0b" />
        </Tarjeta>
        <Tarjeta titulo="¿Cómo llegaron?" subtitulo="Origen del registro" icono={<Sparkles size={18} />}>
          <Dona datos={a.origen} />
        </Tarjeta>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <Tarjeta titulo="Militancia" subtitulo="Del registro a la confirmación en el padrón del partido" icono={<BadgeCheck size={18} />}>
          <Embudo datos={a.militancia} total={t.ciudadanos} />
        </Tarjeta>
        <Tarjeta titulo="¿Cómo prefieren que los contacten?" subtitulo="Canal y horario" icono={<MessageCircle size={18} />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">Canal</p>
              <BarrasConEtiqueta datos={a.canal} color="#10b981" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">Horario</p>
              <BarrasConEtiqueta datos={a.horario} color="#8b5cf6" numerado={false} />
            </div>
          </div>
        </Tarjeta>
      </div>

      <Tarjeta titulo="¿Cuándo se registra la gente?" subtitulo="Registros por día de la semana y hora, en hora de Jalisco" icono={<Flame size={18} />}>
        <MapaDeCalor matriz={a.calor} />
      </Tarjeta>

      {equipos.length > 0 && (
        <Tarjeta
          titulo="Avance por equipo"
          subtitulo={`Ciudadanos que registró la gente de cada equipo (líder e integrantes)${a.equipos.length > equipos.length ? ` · los ${equipos.length} con más` : ""}. Quien está en dos equipos suma en los dos.`}
          icono={<UsersRound size={18} />}
        >
          <div style={{ height: Math.max(180, equipos.length * 44 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={equipos} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barGap={3}>
                <CartesianGrid horizontal={false} stroke="#eef2f7" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
                <YAxis type="category" dataKey="nombre" width={132} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#334155", fontWeight: 700 }} />
                <Tooltip
                  contentStyle={estiloDelTooltip}
                  cursor={{ fill: "rgba(40,120,199,.06)" }}
                  labelFormatter={(nombre) => {
                    const e = equipos.find((x) => x.nombre === nombre);
                    return e ? `${e.nombre} · ${e.municipio} · ${e.integrantes} ${e.integrantes === 1 ? "persona" : "personas"}` : typeof nombre === "string" ? nombre : "";
                  }}
                  formatter={(v, nombre) => [formatoNumero(Number(v)), nombre === "ciudadanos" ? "Ciudadanos" : "Nuevos (30 días)"]}
                />
                <Legend formatter={(v) => (v === "ciudadanos" ? "Ciudadanos" : "Nuevos en 30 días")} iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                <Bar dataKey="ciudadanos" fill="#0f2d52" radius={[0, 8, 8, 0]} maxBarSize={16} isAnimationActive={!quieto} />
                <Bar dataKey="nuevos30" fill="#10b981" radius={[0, 8, 8, 0]} maxBarSize={16} isAnimationActive={!quieto} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>
      )}

      {haySurvey && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          <Tarjeta titulo="Lo que más urge en sus colonias" subtitulo={`${formatoNumero(t.encuestas)} encuestas`} icono={<ClipboardList size={18} />} className="lg:col-span-2">
            <BarrasConEtiqueta datos={a.necesidades} color="#ef4444" />
          </Tarjeta>
          <Tarjeta titulo="Servicios públicos" subtitulo="Calificación que dan" icono={<Star size={18} />}>
            {t.calificacionPromedio === null ? (
              <SinDatos />
            ) : (
              <>
                <Medidor valor={t.calificacionPromedio} maximo={t.escalaCalificacion} etiqueta="promedio" />
                <Columnas datos={a.calificaciones.map((c) => ({ etiqueta: String(c.valor), total: c.total }))} color="#06b6d4" alto={130} unidad="encuestas" />
              </>
            )}
          </Tarjeta>
          <Tarjeta titulo="Lo que esperan del proyecto" icono={<Sparkles size={18} />} className="lg:col-span-2">
            <BarrasConEtiqueta datos={a.expectativas} color="#2878c7" />
          </Tarjeta>
          <Tarjeta titulo="Cómo quieren participar" icono={<HeartHandshake size={18} />}>
            <BarrasConEtiqueta datos={a.participacion} color="#10b981" />
          </Tarjeta>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <Tarjeta titulo="Disponibilidad" subtitulo="Qué tanto quieren involucrarse" icono={<HeartHandshake size={18} />}>
          <Dona datos={a.disponibilidad} colores={[COLORES[3]!, COLORES[1]!, COLORES[0]!, COLORES[2]!, COLORES[4]!, COLORES[5]!]} />
        </Tarjeta>
        <Tarjeta titulo="Áreas de participación" icono={<Users size={18} />}>
          <BarrasConEtiqueta datos={a.areas} color="#8b5cf6" />
        </Tarjeta>
        {a.profesiones.length > 0 && (
          <Tarjeta titulo="Profesiones más comunes" icono={<ClipboardList size={18} />}>
            <BarrasConEtiqueta datos={a.profesiones} color="#0f2d52" tope={8} />
          </Tarjeta>
        )}
        {a.perfiles.length > 0 && (
          <Tarjeta titulo="Habilidades" subtitulo="Perfiles que ofrecen" icono={<BadgeCheck size={18} />}>
            <BarrasConEtiqueta datos={a.perfiles} color="#f59e0b" tope={8} />
          </Tarjeta>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <Tarjeta titulo="Colonias con más presencia" subtitulo={`${formatoNumero(t.coloniasCubiertas)} colonias en total`} icono={<Building2 size={18} />} className={a.municipios.length > 1 ? "" : "lg:col-span-2"}>
          <BarrasConEtiqueta datos={a.colonias} color="#10b981" />
        </Tarjeta>
        {a.municipios.length > 1 && (
          <Tarjeta titulo="Municipios" subtitulo="Donde está el padrón que ves" icono={<IconoMapa size={18} />}>
            <BarrasConEtiqueta datos={a.municipios} color="#2878c7" />
          </Tarjeta>
        )}
      </div>

      <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5 pb-2">
        <CalendarClock size={13} /> Días y horas en hora de Jalisco. Últimos 30 días: {ultimos30.length ? `${fechaCorta(ultimos30[0]!.dia)} a hoy` : "—"}.
      </p>
    </div>
  );
}

function Indicador({
  icono,
  color,
  etiqueta,
  valor,
  nota,
  decimales = 0,
  sufijo = "",
  vacio = false
}: {
  icono: React.ReactNode;
  color: string;
  etiqueta: string;
  valor: number;
  nota?: string | undefined;
  decimales?: number;
  sufijo?: string;
  vacio?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_10px_24px_rgba(11,31,58,.05)] p-4 flex flex-col gap-2 min-w-0">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>{icono}</span>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 leading-tight">{etiqueta}</p>
      <p className="text-2xl font-black text-slate-900 leading-none tabular-nums">
        {vacio ? "—" : <><NumeroAnimado valor={valor} decimales={decimales} /><span className="text-sm text-slate-400 font-bold">{sufijo}</span></>}
      </p>
      {nota && <p className="text-[11px] font-semibold text-slate-400 leading-tight">{nota}</p>}
    </div>
  );
}

/** Embudo de militancia: cada etapa con su parte del padrón. */
function Embudo({ datos, total }: { datos: { clave: string; etiqueta: string; total: number }[]; total: number }) {
  if (datos.length === 0 || total === 0) return <SinDatos />;
  const maximo = Math.max(...datos.map((d) => d.total));
  const colores: Record<string, string> = { no_registrada: "#cbd5e1", simpatizante: "#93c5fd", declarada: "#2878c7", pendiente: "#8b5cf6", confirmada: "#10b981" };
  return (
    <div className="space-y-2.5">
      {datos.map((d) => (
        <div key={d.clave} className="flex items-center gap-3">
          <span className="w-24 sm:w-28 shrink-0 text-sm font-bold text-slate-700 truncate">{d.etiqueta}</span>
          <div className="flex-1 flex justify-center">
            <div
              className="h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-sm animar-barra-centro"
              style={{ width: `${Math.max(12, (d.total / maximo) * 100)}%`, minWidth: "3.5rem", background: colores[d.clave] ?? "#64748b", color: d.clave === "no_registrada" ? "#334155" : "#fff" }}
            >
              {formatoNumero(d.total)}
            </div>
          </div>
          <span className="w-11 shrink-0 text-right text-sm font-black text-slate-900 tabular-nums">{porcentaje(d.total, total)}%</span>
        </div>
      ))}
    </div>
  );
}
