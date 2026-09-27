import { ESTADOS_INCIDENCIA, ESTADO_DESCONOCIDO } from "@/lib/estados-incidencia";

import { BLOQUES, PAN_BADGE_HTML, SVGS, calcularResultado, categoriaDe } from "./constantes";
import type { ContactoDelMapa, GrupoDeContactos, ReportFeature, SectionProperties } from "./tipos";

/**
 * Todo el HTML que el mapa entrega a Leaflet —marcadores, globos, etiquetas— se arma aquí.
 *
 * Leaflet no es React: lo que recibe como texto lo pone tal cual en la página. Antes los nombres de
 * los ciudadanos, los títulos y descripciones de las incidencias y los nombres de colonia se pegaban
 * sin escapar en ese HTML, y algunos de esos textos llegan del registro público, sin sesión (A18).
 * Aquí todo valor que viene de datos pasa por `escaparHtml`, sin excepción; los únicos textos que no
 * se escapan son los de este archivo.
 */
export function escaparHtml(valor: string | number | boolean | null | undefined): string {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Una cifra que llega de la API: si no es un número, 0. Nunca se pega texto como si fuera cifra. */
function cifra(valor: unknown): number {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/** Un identificador para un atributo `onclick`: solo UUID, cualquier otra cosa queda vacía. */
function idSeguro(id: string): string {
  return /^[0-9a-f-]{36}$/i.test(id) ? id : "";
}

// ---------------------------------------------------------------------------------------------
// Incidencias

export function iconoIncidencia(report: ReportFeature, compacto: boolean, indice: number, total: number): string {
  const cat = categoriaDe(report.properties.category);
  const resuelta = report.properties.status === "resolved";
  const emergencia = report.properties.category === "emergencia" && !resuelta;
  const marca = total > 1
    ? `<div style="position:absolute; top:-4px; right:-4px; background:#0f172a; color:white; width:15px; height:15px; border-radius:50%; font-size:9px; font-weight:800; display:flex; align-items:center; justify-content:center; border:1.5px solid white;">${indice + 1}</div>`
    : resuelta
      ? `<div style="position:absolute; bottom:-2px; right:-2px; background:#16a34a; color:white; width:14px; height:14px; border-radius:50%; font-size:10px; display:flex; align-items:center; justify-content:center; border:1.5px solid white;">✓</div>`
      : "";
  return `
    <div style="position:relative; width:36px; height:36px; border-radius:50%; background-color:${resuelta ? "#f0fdf4" : cat.bg}; display:flex; align-items:center; justify-content:center; color:${resuelta ? "#16a34a" : cat.color}; border:2.5px solid ${resuelta ? "#16a34a" : emergencia ? "#ef4444" : "white"}; box-shadow:0 4px 12px rgba(0,0,0,0.28); opacity:${resuelta ? 0.85 : 1}; cursor:pointer; transform:scale(${compacto ? 0.8 : 1.05});">
      ${cat.svg}
      ${marca}
      ${emergencia ? `<div style="position:absolute; inset:-3px; border-radius:50%; border:2px solid #ef4444; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ""}
    </div>`;
}

export function iconoGrupoIncidencias(total: number, emergencia: boolean, compacto: boolean): string {
  const lado = compacto ? 28 : 38;
  return `
    <div style="position:relative; width:${lado}px; height:${lado}px; border-radius:50%; background:${emergencia ? "#dc2626" : "#2563eb"}; color:white; display:flex; align-items:center; justify-content:center; font-size:${compacto ? 11 : 13}px; font-weight:800; border:${compacto ? 2 : 3}px solid white; box-shadow:0 4px 14px rgba(0,0,0,0.3); cursor:pointer; ${compacto ? "opacity:0.88;" : ""}">
      ${total}
      ${emergencia ? `<div style="position:absolute; inset:-4px; border-radius:50%; border:2px solid #ef4444; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ""}
    </div>`;
}

/**
 * El globo de una incidencia. Los botones salen solo si la API los va a aceptar
 * (`puedeActualizar`, `puedeBorrar`, que calcula el servidor con la misma regla que PATCH y DELETE).
 * Una actividad de la bitácora no se cierra ni se borra desde aquí: lleva a la Agenda.
 */
export function globoIncidencia(report: ReportFeature, indice: number, total: number): string {
  const p = report.properties;
  const cat = categoriaDe(p.category);
  const estado = ESTADOS_INCIDENCIA[p.status] ?? ESTADO_DESCONOCIDO;
  const emergencia = p.category === "emergencia" && !estado.cerrada;
  const fecha = new Date(p.createdAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
  const id = idSeguro(p.id);

  const insignia = emergencia
    ? `<span style="background:#fee2e2; color:#dc2626; padding:3px 8px; border-radius:9999px; font-size:10px; font-weight:700; text-transform:uppercase;">● Emergencia</span>`
    : `<span style="background:${estado.bg}; color:${estado.color}; border:1px solid ${estado.border}; padding:3px 8px; border-radius:9999px; font-size:10px; font-weight:700; text-transform:uppercase;">${escaparHtml(estado.label)}</span>`;

  let acciones = "";
  if (p.esActividad) {
    acciones = `<a href="/equipo" style="flex:1; display:block; text-align:center; padding:8px 10px; background:#eef2ff; color:#4338ca; border:1px solid #c7d2fe; border-radius:8px; font-size:12px; font-weight:700; text-decoration:none;">Es una actividad: se trabaja en la Agenda</a>`;
  } else {
    const cambiar = p.puedeActualizar && id
      ? estado.cerrada
        ? `<button onclick="window.__toggleReportStatus('${id}', 'active')" style="flex:1; padding:8px 10px; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">↺ Reabrir</button>`
        : `<button onclick="window.__toggleReportStatus('${id}', 'resolved')" style="flex:1; padding:8px 10px; background:#16a34a; color:white; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer;">✓ Marcar atendida</button>`
      : "";
    const borrar = p.puedeBorrar && id
      ? `<button onclick="window.__deleteReport('${id}')" title="Eliminar incidencia" aria-label="Eliminar incidencia" style="padding:8px 10px; background:#fee2e2; color:#dc2626; border:1px solid #fecaca; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;">${SVGS.Trash}</button>`
      : "";
    acciones = cambiar + borrar;
  }

  const varias = total > 1
    ? `<div style="font-size:10px; font-weight:800; color:#4338ca; background:#eef2ff; padding:3px 8px; border-radius:6px; margin-bottom:8px; display:inline-block; border:1px solid #c7d2fe;">${p.esActividad ? "Actividad" : "Incidencia"} ${indice + 1} de ${total} en esta ubicación</div>`
    : "";

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif; min-width:240px; max-width:320px; padding:6px;">
      ${varias}
      <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <div style="width:24px; height:24px; border-radius:6px; background:${cat.bg}; color:${cat.color}; display:flex; align-items:center; justify-content:center;">${cat.svg}</div>
          <span style="font-size:11px; font-weight:800; color:${cat.color}; text-transform:uppercase;">${p.esActividad ? "Actividad · " : ""}${escaparHtml(cat.label)}</span>
        </div>
        ${insignia}
      </div>
      <h3 style="margin:0 0 4px; font-size:14px; font-weight:800; color:#0f172a; line-height:1.3;">${escaparHtml(p.title)}</h3>
      <p style="margin:0 0 8px; font-size:12px; color:#475569; line-height:1.4; white-space:pre-line;">${escaparHtml(p.description)}</p>
      <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding-top:6px; border-top:1px solid #f1f5f9; font-size:11px; color:#64748b;">
        <span>${p.sectionNum ? `Sección ${escaparHtml(p.sectionNum)}` : escaparHtml(p.municipality || "Sin municipio")}</span>
        <span>${escaparHtml(fecha)}</span>
      </div>
      ${acciones ? `<div style="display:flex; gap:6px; margin-top:10px;">${acciones}</div>` : ""}
    </div>`;
}

// ---------------------------------------------------------------------------------------------
// Contactos

export function iconoContacto(c: ContactoDelMapa): string {
  const p = c.properties;
  const pan = p.isPanConfirmed;
  const color = /^#[0-9a-f]{6}$/i.test(p.networkColor) ? p.networkColor : "#2563eb";
  // Un punto derivado del centro de la sección no es un domicilio: borde punteado y sin sombra,
  // para que se lea como "por aquí" y no como "en esta puerta".
  const aprox = p.isApproximate === true;
  const titulo = aprox
    ? `${p.displayName} — ubicación aproximada${p.sectionNum ? ` (sección ${p.sectionNum})` : ""}, sin GPS`
    : `${p.displayName} (${pan ? "PAN confirmado" : "Contacto"})`;
  return `
    <div style="position:relative; display:flex; align-items:center; justify-content:center; cursor:pointer;" title="${escaparHtml(titulo)}">
      <div style="width:30px; height:30px; border-radius:50%; background:${pan ? "#2563eb" : "#ffffff"}; color:${pan ? "#ffffff" : color}; border:2.5px ${aprox ? "dashed" : "solid"} ${pan ? "#ffffff" : color}; display:flex; align-items:center; justify-content:center; box-shadow:${aprox ? "none" : "0 4px 14px rgba(0,0,0,0.25)"}; opacity:${aprox ? "0.75" : "1"}; font-size:12px; font-weight:900;">
        ${pan ? `<span style="color:#fff; font-size:0.85em; font-weight:900; line-height:1;">M</span>` : SVGS.User}
      </div>
    </div>`;
}

export function globoContacto(c: ContactoDelMapa): string {
  const p = c.properties;
  const id = idSeguro(p.id);
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif; min-width:220px; padding:6px;">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:4px;">
        <strong style="font-size:14px; font-weight:800; color:#0f172a;">${escaparHtml(p.displayName)}</strong>
        ${p.isPanConfirmed ? `<span style="background:#2563eb; color:white; font-size:9px; font-weight:800; padding:2px 6px; border-radius:999px;">PAN confirmado</span>` : ""}
      </div>
      <p style="margin:0 0 2px; font-size:11px; color:#475569;">${escaparHtml(p.colony || "Colonia por definir")}, ${escaparHtml(p.municipality || "municipio sin registrar")}</p>
      ${p.isApproximate ? `<p style="margin:0 0 2px; font-size:11px; color:#b45309;">Ubicación aproximada: centro de su sección, sin GPS.</p>` : ""}
      <p style="margin:0 0 8px; font-size:11px; color:#64748b;">Red: <strong style="color:#0f172a;">${escaparHtml(p.creatorName || "Equipo")}</strong></p>
      ${id ? `<a href="/crm/contacts/${id}" style="display:block; text-align:center; padding:7px 12px; background:#2563eb; color:white; border-radius:8px; font-size:11px; font-weight:800; text-decoration:none;">Ver ficha</a>` : ""}
    </div>`;
}

export function iconoGrupoContactos(g: GrupoDeContactos): string {
  // A este zoom casi todo lo que se ve son grupos: si el grupo entero es de ubicaciones
  // aproximadas, se dice aquí, que es donde se mira antes de decidir a dónde ir.
  return `
    <div title="${cifra(g.total)} contactos${g.aprox ? " — ubicación aproximada por sección, sin GPS" : ""}" style="position:relative; width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color:white; display:flex; flex-direction:column; align-items:center; justify-content:center; border:2.5px ${g.aprox ? "dashed" : "solid"} #ffffff; box-shadow:0 6px 20px rgba(37,99,235,${g.aprox ? "0.25" : "0.45"}); cursor:pointer; font-family:system-ui,-apple-system,sans-serif;">
      <div style="font-size:13px; font-weight:900; line-height:1;">${cifra(g.total)}</div>
      ${cifra(g.pan) > 0
        ? `<div style="font-size:9px; font-weight:800; color:#93c5fd; margin-top:2px; display:flex; align-items:center; gap:2px;">${PAN_BADGE_HTML} ${cifra(g.pan)}</div>`
        : `<div style="font-size:8px; font-weight:700; color:#bfdbfe; text-transform:uppercase; margin-top:1px;">${g.aprox ? "Aprox" : "Red"}</div>`}
    </div>`;
}

// ---------------------------------------------------------------------------------------------
// Secciones y municipios

export function tooltipSeccion(p: SectionProperties, electoral: boolean): string {
  const mun = p.municipality || "Sin municipio";
  let resumen = "";
  if (electoral && p.atlas) {
    const r = calcularResultado(p.atlas);
    const b = BLOQUES[r.ganador];
    const pct = r.total > 0 ? Math.round((r.votosGanador / r.total) * 100) : 0;
    const veredicto = r.empate ? "Empate técnico" : `Gana ${b.corto} · ${pct}% · +${r.margen.toFixed(1)} pts`;
    resumen = `
      <div style="margin-top:5px; padding-top:5px; border-top:1px solid #e2e8f0; display:flex; align-items:center; gap:5px;">
        <span style="width:9px; height:9px; border-radius:50%; background:${b.color}; flex-shrink:0;"></span>
        <span style="font-size:10px; font-weight:800; color:#0f172a;">${escaparHtml(veredicto)}</span>
      </div>
      <div style="font-size:9px; color:#64748b; margin-top:2px;">Prioridad ${escaparHtml(p.atlas.priority)} · ${r.total.toLocaleString("es-MX")} votos</div>`;
  }
  return `
    <div style="font-family:system-ui,sans-serif; padding:4px;">
      <div style="font-size:12px; font-weight:800; color:#0f172a;">Sección ${escaparHtml(p.section_num)} <span style="font-weight:600; color:#6366f1;">(${escaparHtml(mun)})</span></div>
      <div style="font-size:10px; color:#475569; margin-top:2px;">${escaparHtml(p.atlas?.mainColony || p.colonies.slice(0, 3).join(", ") || mun)}</div>
      <div style="display:flex; gap:8px; margin-top:4px; font-size:10px; font-weight:700; color:#1e293b;">
        <span>${cifra(p.contactsCount)} simpatizantes</span>
        <span>${cifra(p.visitsCompleted)} visitas</span>
      </div>
      ${resumen}
    </div>`;
}

export function etiquetaSeccion(numero: number): string {
  return `<div style="background:rgba(15,23,42,0.85); color:#ffffff; font-size:10px; font-weight:800; padding:1.5px 5px; border-radius:5px; border:1px solid rgba(255,255,255,0.4); text-align:center; white-space:nowrap; pointer-events:none;">${escaparHtml(numero)}</div>`;
}

/** Un municipio en la vista de todo Jalisco: nombre y número de secciones; al tocarlo, se abre. */
export function iconoMunicipio(nombre: string, secciones: number): string {
  return `
    <div style="transform:translate(-50%, -50%); display:inline-flex; flex-direction:column; align-items:center; gap:1px; padding:3px 7px; border-radius:9px; background:rgba(255,255,255,0.94); border:1px solid #c7d2fe; box-shadow:0 2px 8px rgba(15,23,42,0.18); cursor:pointer; white-space:nowrap; font-family:system-ui,-apple-system,sans-serif;">
      <span style="font-size:11px; font-weight:800; color:#1e1b4b;">${escaparHtml(nombre)}</span>
      <span style="font-size:9px; font-weight:700; color:#6366f1;">${secciones.toLocaleString("es-MX")} secc.</span>
    </div>`;
}

/** Un municipio cuyo rótulo no cabe a este zoom: un punto, con zona de toque de 28 px. */
export function puntoMunicipio(): string {
  return `
    <div style="transform:translate(-50%, -50%); width:28px; height:28px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
      <div style="width:12px; height:12px; border-radius:50%; background:#6366f1; border:2px solid #ffffff; box-shadow:0 1px 4px rgba(15,23,42,0.35);"></div>
    </div>`;
}

// ---------------------------------------------------------------------------------------------
// Ubicación propia

export const ICONO_GPS = `
  <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
    <div style="position:absolute; width:30px; height:30px; border-radius:50%; background:rgba(37,99,235,0.35); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
    <div style="width:16px; height:16px; border-radius:50%; background:#2563eb; border:3px solid white; box-shadow:0 3px 8px rgba(0,0,0,0.35);"></div>
  </div>`;

export function globoGps(precision: number): string {
  return `
    <div style="font-family:sans-serif; min-width:180px;">
      <strong style="font-size:13px; color:#0f172a; display:flex; align-items:center; gap:5px;"><span style="color:#2563eb; display:inline-flex;">${SVGS.MapPin}</span> Estás aquí</strong>
      <p style="margin:4px 0 0 0; font-size:11px; color:#2563eb; font-weight:700;">Precisión: ±${Math.round(precision)} m</p>
    </div>`;
}
