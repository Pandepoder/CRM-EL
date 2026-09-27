"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { Conteo } from "@/lib/analisis-demografico";

/** La paleta de las gráficas: los azules de la marca y acentos que se distinguen entre sí. */
export const COLORES = ["#2878c7", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#ef4444", "#84cc16", "#0f2d52", "#f97316"];

export const formatoNumero = (n: number) => n.toLocaleString("es-MX");
export const porcentaje = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

/**
 * ¿Pidió la persona menos movimiento en su teléfono o computadora? Entonces las gráficas aparecen ya
 * dibujadas. En el servidor no se sabe: se anima, y React corrige al hidratar sin error.
 */
export function useMovimientoReducido(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const consulta = window.matchMedia?.("(prefers-reduced-motion: reduce)");
      consulta?.addEventListener("change", avisar);
      return () => consulta?.removeEventListener("change", avisar);
    },
    () => Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
    () => false
  );
}

/** Cuenta de 0 al valor al aparecer; sin animación si la persona la pidió así. */
export function NumeroAnimado({ valor, decimales = 0 }: { valor: number; decimales?: number }) {
  const [mostrado, setMostrado] = useState(0);
  const anterior = useRef(0);
  useEffect(() => {
    const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reducir) {
      setMostrado(valor);
      anterior.current = valor;
      return;
    }
    const desde = anterior.current;
    const inicio = performance.now();
    const duracion = 900;
    let cuadro = 0;
    const paso = (t: number) => {
      const avance = Math.min(1, (t - inicio) / duracion);
      const suave = 1 - Math.pow(1 - avance, 3);
      setMostrado(desde + (valor - desde) * suave);
      if (avance < 1) cuadro = requestAnimationFrame(paso);
      else anterior.current = valor;
    };
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [valor]);
  return <>{mostrado.toLocaleString("es-MX", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })}</>;
}

export function Tarjeta({
  titulo,
  subtitulo,
  icono,
  children,
  className = "",
  accion
}: {
  titulo: string;
  subtitulo?: string;
  icono?: ReactNode;
  children: ReactNode;
  className?: string;
  accion?: ReactNode;
}) {
  return (
    <section className={`bg-white rounded-3xl border border-slate-100 shadow-[0_10px_24px_rgba(11,31,58,.06)] p-5 sm:p-6 ${className}`}>
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {icono && <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">{icono}</span>}
          <div className="min-w-0">
            <h2 className="text-[15px] font-extrabold text-slate-900 leading-tight">{titulo}</h2>
            {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
          </div>
        </div>
        {accion}
      </header>
      {children}
    </section>
  );
}

export function SinDatos({ texto = "Todavía no hay datos para mostrar." }: { texto?: string }) {
  return <div className="h-40 flex items-center justify-center text-sm text-slate-400 text-center px-4">{texto}</div>;
}

const estiloDelTooltip = {
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  boxShadow: "0 12px 28px rgba(11,31,58,.14)",
  fontSize: 12,
  fontWeight: 600
};

/** Dona con el total al centro y la leyenda con porcentajes. */
export function Dona({ datos, unidad = "ciudadanos", colores = COLORES }: { datos: Conteo[]; unidad?: string; colores?: string[] }) {
  const quieto = useMovimientoReducido();
  const total = datos.reduce((n, d) => n + d.total, 0);
  if (total === 0) return <SinDatos />;
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative w-44 h-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={datos} dataKey="total" nameKey="etiqueta" innerRadius="68%" outerRadius="100%" paddingAngle={2} stroke="none" isAnimationActive={!quieto}>
              {datos.map((d, i) => (
                <Cell key={d.clave} fill={colores[i % colores.length] ?? COLORES[0]!} />
              ))}
            </Pie>
            <Tooltip contentStyle={estiloDelTooltip} formatter={(v) => [`${formatoNumero(Number(v))} ${unidad}`, ""]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-slate-900 leading-none">
            <NumeroAnimado valor={total} />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-1">{unidad}</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5">
        {datos.map((d, i) => (
          <li key={d.clave} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colores[i % colores.length] }} />
            <span className="text-slate-700 font-semibold truncate">{d.etiqueta}</span>
            <span className="ml-auto tabular-nums text-slate-500 text-xs font-bold">{formatoNumero(d.total)}</span>
            <span className="tabular-nums text-slate-900 text-xs font-black w-10 text-right">{porcentaje(d.total, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barras horizontales hechas con divs: se leen completas en el teléfono, sin cortar etiquetas. */
export function BarrasConEtiqueta({
  datos,
  color = "#2878c7",
  unidad = "",
  tope,
  numerado = true
}: {
  datos: Conteo[];
  color?: string;
  unidad?: string;
  tope?: number;
  /** Numerar solo lo que va de más a menos; un orden propio (mañana, tarde, noche) no es un ranking. */
  numerado?: boolean;
}) {
  const lista = tope ? datos.slice(0, tope) : datos;
  const maximo = Math.max(1, ...lista.map((d) => d.total));
  const total = datos.reduce((n, d) => n + d.total, 0);
  if (lista.length === 0) return <SinDatos />;
  return (
    <ul className="space-y-2.5">
      {lista.map((d, i) => (
        <li key={d.clave}>
          <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
            <span className="font-semibold text-slate-700 truncate">
              {numerado && <span className="text-slate-400 font-bold tabular-nums mr-1.5">{i + 1}.</span>}
              {d.etiqueta}
            </span>
            <span className="tabular-nums text-xs font-black text-slate-900 shrink-0">
              {formatoNumero(d.total)}
              {unidad} <span className="text-slate-400 font-bold">· {porcentaje(d.total, total)}%</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full animar-barra"
              style={{ width: `${Math.max(2, (d.total / maximo) * 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Columnas verticales con degradado (edades, calificaciones). */
export function Columnas({ datos, color = "#2878c7", alto = 220, unidad = "ciudadanos" }: { datos: { etiqueta: string; total: number }[]; color?: string; alto?: number; unidad?: string }) {
  const quieto = useMovimientoReducido();
  if (datos.every((d) => d.total === 0)) return <SinDatos />;
  const idDegradado = `degradado-${color.replace("#", "")}`;
  return (
    <div style={{ height: alto }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 18, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={idDegradado} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.45} />
            </linearGradient>
          </defs>
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} interval={0} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} allowDecimals={false} />
          <Tooltip contentStyle={estiloDelTooltip} cursor={{ fill: "rgba(40,120,199,.06)" }} formatter={(v) => [`${formatoNumero(Number(v))} ${unidad}`, ""]} />
          <Bar dataKey="total" fill={`url(#${idDegradado})`} radius={[10, 10, 4, 4]} maxBarSize={56} isAnimationActive={!quieto} label={{ position: "top", fontSize: 11, fontWeight: 800, fill: "#0f172a" }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Medidor semicircular: el promedio sobre la escala. */
export function Medidor({ valor, maximo, etiqueta }: { valor: number; maximo: number; etiqueta: string }) {
  const quieto = useMovimientoReducido();
  const parte = Math.max(0, Math.min(1, valor / maximo));
  const color = parte >= 0.7 ? "#10b981" : parte >= 0.45 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative h-40">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart data={[{ valor }]} startAngle={180} endAngle={0} innerRadius="72%" outerRadius="100%" cy="85%">
          <PolarAngleAxis type="number" domain={[0, maximo]} tick={false} axisLine={false} />
          <RadialBar dataKey="valor" cornerRadius={12} fill={color} background={{ fill: "#eef2f7" }} isAnimationActive={!quieto} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-x-0 bottom-3 flex flex-col items-center pointer-events-none">
        <span className="text-3xl font-black text-slate-900 leading-none">
          <NumeroAnimado valor={valor} decimales={1} />
          <span className="text-base text-slate-400 font-bold"> / {maximo}</span>
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">{etiqueta}</span>
      </div>
    </div>
  );
}

const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIAS_LARGOS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
const ESCALA_DE_CALOR = ["#eef4fb", "#cfe3f7", "#9cc5ee", "#5a9ddf", "#2878c7", "#173f70", "#0b1f3a"];

/** Mapa de calor: registros por día de la semana y hora, en hora de Jalisco. */
export function MapaDeCalor({ matriz }: { matriz: number[][] }) {
  const maximo = Math.max(0, ...matriz.flat());
  if (maximo === 0) return <SinDatos />;
  let pico = { dia: 0, hora: 0, total: 0 };
  matriz.forEach((fila, dia) => fila.forEach((total, hora) => { if (total > pico.total) pico = { dia, hora, total }; }));
  // Raíz cuadrada: con una hora que concentra casi todo (un evento), en escala lineal las demás se
  // veían todas iguales de pálidas.
  const pasos = ESCALA_DE_CALOR.length - 1;
  const tono = (n: number) => (n === 0 ? ESCALA_DE_CALOR[0]! : ESCALA_DE_CALOR[Math.max(1, Math.ceil(Math.sqrt(n / maximo) * pasos))]!);
  return (
    <div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: "28px repeat(24, minmax(0, 1fr))" }} role="img" aria-label={`Registros por día y hora. La hora con más registros: ${DIAS_LARGOS[pico.dia]} a las ${pico.hora}:00.`}>
        <span />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="text-[9px] text-slate-400 font-bold text-center leading-none pb-1">{h % 3 === 0 ? h : ""}</span>
        ))}
        {matriz.map((fila, dia) => (
          <FilaDeCalor key={dia} dia={dia} fila={fila} tono={tono} />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <p className="text-xs text-slate-600">
          Hora con más registros: <b className="text-slate-900">{DIAS_LARGOS[pico.dia]} a las {pico.hora}:00</b> ({formatoNumero(pico.total)})
        </p>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          Menos
          {ESCALA_DE_CALOR.map((c) => (
            <span key={c} className="w-3.5 h-3.5 rounded-[4px]" style={{ background: c }} />
          ))}
          Más
        </div>
      </div>
    </div>
  );
}

function FilaDeCalor({ dia, fila, tono }: { dia: number; fila: number[]; tono: (n: number) => string }) {
  return (
    <>
      <span className="text-[10px] font-bold text-slate-500 self-center">{DIAS_CORTOS[dia]}</span>
      {fila.map((total, hora) => (
        <span
          key={hora}
          title={`${DIAS_LARGOS[dia]} ${hora}:00 — ${formatoNumero(total)} ${total === 1 ? "registro" : "registros"}`}
          className="aspect-square rounded-[4px] transition-transform hover:scale-125"
          style={{ background: tono(total) }}
        />
      ))}
    </>
  );
}

export { estiloDelTooltip };
