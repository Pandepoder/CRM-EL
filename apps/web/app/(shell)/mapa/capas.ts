"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MUNICIPIOS_JALISCO } from "@/lib/municipios-jalisco";

import { BLOQUES, MUNICIPALITY_COLORS, SIN_ATLAS, calcularResultado, opacidadPorMargen } from "./constantes";
import {
  etiquetaSeccion,
  globoContacto,
  globoIncidencia,
  iconoContacto,
  iconoGrupoContactos,
  iconoGrupoIncidencias,
  iconoIncidencia,
  iconoMunicipio,
  puntoMunicipio,
  tooltipSeccion
} from "./html";
import type { Coloreado, ContactoDelMapa, GrupoDeContactos, ReportFeature, SectionProperties } from "./tipos";

/**
 * Las capas del mapa, cada una en su gancho. Antes vivían como efectos dentro de un único componente
 * de 3 200 líneas (R17).
 */

const MAX_ETIQUETAS = 60;

/**
 * Secciones electorales. Tres efectos independientes, y la separación es lo que hay que respetar
 * (PR #21): construir la capa solo cuando llegan datos nuevos o se muestra/oculta; estilarla al
 * cambiar de coloreado o de selección, sin tocar la geometría; y rotular aparte, con zoom mínimo y un
 * tope de etiquetas visibles. Mezclar "estilar" con "reconstruir" costaba cerca de un segundo por
 * cambio. La capa se dibuja en un solo canvas en vez de una ruta SVG por sección.
 */
/** Cuánto espera el clic sencillo sobre una sección por si es un doble clic (ver `useCapaSecciones`). */
const ESPERA_DE_DOBLE_CLIC_MS = 300;

export function useCapaSecciones(opciones: {
  L: any;
  mapa: any;
  capaEtiquetas: any;
  datos: any;
  visible: boolean;
  etiquetas: boolean;
  coloreado: Coloreado;
  seleccion: number | null;
  alElegir: (p: SectionProperties, limites: any) => void;
  /**
   * Doble clic sobre una sección: levantar una incidencia en el punto exacto del clic —no en la sección—
   * (solo a quien puede reportar; `null` para los demás, a quienes el doble clic les sigue acercando).
   */
  alDobleClic: ((punto: { lat: number; lng: number }) => void) | null;
}) {
  const { L, mapa, capaEtiquetas, datos, visible, etiquetas, coloreado, seleccion, alElegir, alDobleClic } = opciones;
  const [capa, setCapa] = useState<any>(null);
  const coloreadoRef = useRef(coloreado);
  const seleccionRef = useRef(seleccion);
  const alElegirRef = useRef(alElegir);
  const alDobleClicRef = useRef(alDobleClic);
  coloreadoRef.current = coloreado;
  seleccionRef.current = seleccion;
  alElegirRef.current = alElegir;
  alDobleClicRef.current = alDobleClic;

  const estilo = useCallback((feature: any) => {
    const electoral = coloreadoRef.current === "electoral";
    const mun = feature?.properties?.municipality || "Sin municipio";
    const tema = MUNICIPALITY_COLORS[mun] || { stroke: "#4f46e5", fill: "#6366f1" };
    const elegida = seleccionRef.current === feature?.properties?.section_num;
    // "Resultado electoral": el color deja de decir a qué municipio pertenece la sección y pasa a
    // decir quién ganó ahí, que es la pregunta que se hace en campaña.
    const atlas = feature?.properties?.atlas ?? null;
    if (electoral && atlas) {
      const r = calcularResultado(atlas);
      const bloque = BLOQUES[r.ganador];
      return {
        color: elegida ? "#0f172a" : bloque.borde,
        weight: elegida ? 3.5 : 1.4,
        opacity: elegida ? 1 : 0.9,
        fillColor: bloque.color,
        fillOpacity: elegida ? 0.75 : opacidadPorMargen(r.margen),
        lineJoin: "round",
        lineCap: "round"
      };
    }
    // Sin ficha en el atlas: gris explícito, para que se vea que ahí no hay dato electoral.
    if (electoral) {
      return {
        color: elegida ? "#0f172a" : SIN_ATLAS.borde,
        weight: elegida ? 3.5 : 1,
        opacity: elegida ? 1 : 0.55,
        fillColor: SIN_ATLAS.color,
        fillOpacity: elegida ? 0.5 : 0.12,
        lineJoin: "round",
        lineCap: "round"
      };
    }
    return {
      color: elegida ? "#1e1b4b" : tema.stroke,
      weight: elegida ? 3.5 : 1.2,
      opacity: elegida ? 1.0 : 0.6,
      fillColor: elegida ? "#312e81" : tema.fill,
      fillOpacity: elegida ? 0.4 : 0.08,
      lineJoin: "round",
      lineCap: "round"
    };
  }, []);

  // a) Construcción
  useEffect(() => {
    if (!L || !mapa) return;
    if (!visible || !datos) {
      setCapa(null);
      return;
    }
    // Las secciones cubren casi todo el municipio, así que el doble clic para reportar cae casi siempre
    // sobre una. El clic sencillo abre su panel y encuadra la sección: hecho al instante, el primer clic
    // de un doble clic ya abría el panel, el segundo caía sobre él y el doble clic nunca llegaba al mapa
    // (visto al probarlo). A quien puede reportar, el clic sencillo espera un momento por si llega el
    // segundo; a los demás les responde en el acto.
    let clicPendiente: ReturnType<typeof setTimeout> | null = null;
    const nueva = L.geoJSON(datos, {
      renderer: L.canvas({ padding: 0.3 }),
      style: estilo,
      onEachFeature: (feature: any, item: any) => {
        const p = feature.properties as SectionProperties;
        // El tooltip se arma al pasar el cursor, no al dibujar: con miles de secciones, armar el HTML
        // de todas de antemano era la mayor parte del coste de construir la capa.
        item.bindTooltip(() => tooltipSeccion(p, coloreadoRef.current === "electoral"), { sticky: true, className: "section-map-tooltip" });
        item.on({
          mouseover: (e: any) => e.target.setStyle({ weight: 3.2, fillOpacity: 0.35, opacity: 1.0 }),
          mouseout: (e: any) => nueva.resetStyle(e.target),
          click: (e: any) => {
            L.DomEvent.stopPropagation(e);
            const limites = e.target.getBounds();
            if (!alDobleClicRef.current) {
              alElegirRef.current(p, limites);
              return;
            }
            if (clicPendiente) clearTimeout(clicPendiente);
            clicPendiente = setTimeout(() => {
              clicPendiente = null;
              alElegirRef.current(p, limites);
            }, ESPERA_DE_DOBLE_CLIC_MS);
          },
          dblclick: (e: any) => {
            // Sin doble clic para reportar, sigue hasta el mapa, que acerca.
            if (!alDobleClicRef.current) return;
            L.DomEvent.stop(e);
            if (clicPendiente) {
              clearTimeout(clicPendiente);
              clicPendiente = null;
            }
            alDobleClicRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
          }
        });
      }
    }).addTo(mapa);
    nueva.bringToBack();
    setCapa(nueva);
    return () => {
      if (clicPendiente) clearTimeout(clicPendiente);
      nueva.remove();
    };
  }, [L, mapa, datos, visible, estilo]);

  // b) Estilo: cambiar de coloreado o de selección solo repinta.
  useEffect(() => {
    if (capa) capa.setStyle(estilo);
  }, [capa, coloreado, seleccion, estilo]);

  // c) Etiquetas: solo con zoom suficiente y, como máximo, un puñado de las visibles.
  const [vista, setVista] = useState(0);
  useEffect(() => {
    if (!mapa) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const alMover = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => setVista((v) => v + 1), 150);
    };
    mapa.on("moveend", alMover);
    return () => {
      mapa.off("moveend", alMover);
      if (t) clearTimeout(t);
    };
  }, [mapa]);

  useEffect(() => {
    if (!L || !mapa || !capaEtiquetas) return;
    capaEtiquetas.clearLayers();
    if (!capa || !etiquetas) return;
    if (mapa.getZoom() < (coloreado === "electoral" ? 14 : 13)) return;
    const visibleAhora = mapa.getBounds();
    let puestas = 0;
    capa.eachLayer((item: any) => {
      if (puestas >= MAX_ETIQUETAS) return;
      const limites = item.getBounds();
      if (!visibleAhora.intersects(limites)) return;
      const icono = L.divIcon({ html: etiquetaSeccion(item.feature.properties.section_num), className: "section-centroid-label", iconSize: [28, 16], iconAnchor: [14, 8] });
      L.marker(limites.getCenter(), { icon: icono, interactive: false }).addTo(capaEtiquetas);
      puestas += 1;
    });
  }, [L, mapa, capaEtiquetas, capa, etiquetas, coloreado, vista]);

  return capa;
}

/**
 * Los 125 municipios como puntos, en la vista de todo Jalisco (4.5). Antes esa vista dibujaba las
 * 3 787 secciones del estado —3,3 MB—, que a esa escala ocupan unos pocos píxeles cada una. Tocar un
 * municipio lo abre con sus secciones. Sale del catálogo: no pide nada al servidor.
 *
 * A zoom de estado no caben 125 rótulos: se reparten de mayor a menor número de secciones y el que
 * chocaría con uno ya puesto queda como punto (con su nombre al pasar el cursor). Al acercarse hay
 * sitio para más y se vuelven a repartir.
 */
export function useCapaMunicipios(opciones: { L: any; mapa: any; visible: boolean; alElegir: (municipio: string) => void }) {
  const { L, mapa, visible, alElegir } = opciones;
  const alElegirRef = useRef(alElegir);
  alElegirRef.current = alElegir;
  const [zoom, setZoom] = useState<number | null>(null);
  useEffect(() => {
    if (!mapa) return;
    const alCambiar = () => setZoom(mapa.getZoom());
    alCambiar();
    mapa.on("zoomend", alCambiar);
    return () => {
      mapa.off("zoomend", alCambiar);
    };
  }, [mapa]);

  useEffect(() => {
    if (!L || !mapa || !visible || zoom === null) return;
    const capa = L.layerGroup();
    const puestos: Array<readonly [number, number, number, number]> = [];
    const porTamano = [...MUNICIPIOS_JALISCO].sort((a, b) => b.count - a.count);
    for (const m of porTamano) {
      const p = mapa.latLngToLayerPoint([m.center[0], m.center[1]]);
      // Medida del rótulo de `iconoMunicipio` (11 px en negrita, dos líneas), con holgura.
      const ancho = Math.max(56, m.name.length * 7 + 18) + 6;
      const alto = 36;
      const caja = [p.x - ancho / 2, p.y - alto / 2, p.x + ancho / 2, p.y + alto / 2] as const;
      const choca = puestos.some((c) => caja[0] < c[2] && caja[2] > c[0] && caja[1] < c[3] && caja[3] > c[1]);
      if (!choca) puestos.push(caja);
      const icono = L.divIcon({ html: choca ? puntoMunicipio() : iconoMunicipio(m.name, m.count), className: "municipio-marcador", iconSize: null });
      const marcador = L.marker([m.center[0], m.center[1]], { icon: icono, keyboard: true, title: m.name, zIndexOffset: choca ? 0 : 1000 }).on("click", () => alElegirRef.current(m.name));
      if (choca) marcador.bindTooltip(m.name, { direction: "top", offset: [0, -8] });
      marcador.addTo(capa);
    }
    capa.addTo(mapa);
    return () => {
      capa.remove();
    };
  }, [L, mapa, visible, zoom]);
}

/** Incidencias (y actividades de la bitácora): agrupadas por rejilla hasta el zoom 14, dispersas después. */
export function useCapaIncidencias(opciones: { L: any; mapa: any; capa: any; reportes: ReportFeature[]; agrupar: boolean; compacto: boolean; zoom: number; visible: boolean }) {
  const { L, mapa, capa, reportes, agrupar, compacto, zoom, visible } = opciones;
  useEffect(() => {
    if (!L || !capa || !mapa) return;
    capa.clearLayers();
    if (!visible) return;
    const lado = compacto ? 28 : 38;

    const unico = (report: ReportFeature, lat: number, lng: number, indice: number, total: number) => {
      const icono = L.divIcon({ html: iconoIncidencia(report, compacto, indice, total), className: "custom-incident-marker", iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20] });
      // El globo se arma al abrirse: con cientos de incidencias, armarlos todos era coste puro.
      L.marker([lat, lng], { icon: icono, pane: "incidentsPane" })
        .bindPopup(() => globoIncidencia(report, indice, total), { closeButton: true, maxWidth: 320, offset: [0, -5] })
        .addTo(capa);
    };

    if (agrupar && zoom <= 14) {
      // En "Resultado electoral" el color de las secciones es lo que hay que leer: burbujas más
      // chicas sobre una rejilla el doble de gruesa. Por debajo del zoom 11 la celda crece al alejarse,
      // igual que la de los contactos (`ladoDeRejilla`): con el lado fijo, en todo Jalisco las
      // burbujas quedaban a 2 px unas de otras, en una sola pila.
      const base = zoom <= 11 ? 0.05 * 2 ** (11 - Math.max(Math.round(zoom), 0)) : zoom <= 13 ? 0.02 : 0.008;
      const rejilla = base * (compacto ? 2 : 1);
      const celdas: Record<string, { reportes: ReportFeature[]; lat: number; lng: number }> = {};
      for (const r of reportes) {
        const [lng, lat] = r.geometry.coordinates;
        const clave = `${Math.floor(lat / rejilla)}_${Math.floor(lng / rejilla)}`;
        const c = (celdas[clave] ??= { reportes: [], lat: 0, lng: 0 });
        c.reportes.push(r);
        c.lat += lat;
        c.lng += lng;
      }
      for (const c of Object.values(celdas)) {
        const total = c.reportes.length;
        const lat = c.lat / total;
        const lng = c.lng / total;
        if (total === 1) {
          unico(c.reportes[0]!, lat, lng, 0, 1);
          continue;
        }
        const emergencia = c.reportes.some((r) => r.properties.category === "emergencia" && r.properties.status === "active");
        const icono = L.divIcon({ html: iconoGrupoIncidencias(total, emergencia, compacto), className: "incident-cluster-marker", iconSize: [lado, lado], iconAnchor: [lado / 2, lado / 2] });
        L.marker([lat, lng], { icon: icono, pane: "incidentsPane", title: `${total} incidencias` })
          .on("click", () => mapa.flyTo([lat, lng], Math.min(mapa.getZoom() + 2, 16), { duration: 0.8 }))
          .addTo(capa);
      }
    } else {
      // Las que coinciden en el mismo punto (~15 m) se abren en abanico para que ninguna tape a otra.
      const grupos: Array<{ lat: number; lng: number; reportes: ReportFeature[] }> = [];
      for (const r of reportes) {
        const [lng, lat] = r.geometry.coordinates;
        let g = grupos.find((x) => Math.hypot(x.lat - lat, x.lng - lng) < 0.00018);
        if (!g) {
          g = { lat, lng, reportes: [] };
          grupos.push(g);
        }
        g.reportes.push(r);
      }
      for (const g of grupos) {
        const total = g.reportes.length;
        if (total === 1) {
          unico(g.reportes[0]!, g.lat, g.lng, 0, 1);
          continue;
        }
        const metrosPorPixel = (156543.03392 * Math.cos((g.lat * Math.PI) / 180)) / Math.pow(2, zoom);
        const radio = Math.min(48, Math.max(34, 28 + total * 3)) * metrosPorPixel;
        const radioLat = radio / 111139;
        const radioLng = radio / (111139 * Math.cos((g.lat * Math.PI) / 180));
        g.reportes.forEach((r, i) => {
          const angulo = (2 * Math.PI * i) / total;
          const lat = g.lat + radioLat * Math.cos(angulo);
          const lng = g.lng + radioLng * Math.sin(angulo);
          L.polyline([[g.lat, g.lng], [lat, lng]], { color: "#94a3b8", weight: 2, dashArray: "3, 3", opacity: 0.85 }).addTo(capa);
          unico(r, lat, lng, i, total);
        });
      }
    }
  }, [L, capa, mapa, reportes, agrupar, compacto, zoom, visible]);
}

/** Contactos: los grupos ya vienen armados del servidor; solo los sueltos traen su ficha. */
export function useCapaContactos(opciones: { L: any; mapa: any; capa: any; contactos: ContactoDelMapa[]; grupos: GrupoDeContactos[]; visible: boolean }) {
  const { L, mapa, capa, contactos, grupos, visible } = opciones;
  useEffect(() => {
    if (!L || !capa || !mapa) return;
    capa.clearLayers();
    if (!visible) return;
    for (const g of grupos) {
      const icono = L.divIcon({ html: iconoGrupoContactos(g), className: "contact-cluster-marker", iconSize: [44, 44], iconAnchor: [22, 22] });
      L.marker([g.lat, g.lng], { icon: icono, pane: "contactsPane", title: `${g.total} contactos` })
        // Zoom vivo, no el de la construcción: el efecto no se rehace en cada paso.
        .on("click", () => mapa.flyTo([g.lat, g.lng], Math.min(mapa.getZoom() + 2, 16), { duration: 0.8 }))
        .addTo(capa);
    }
    for (const c of contactos) {
      const [lng, lat] = c.geometry.coordinates;
      const icono = L.divIcon({ html: iconoContacto(c), className: "contact-map-marker", iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16] });
      L.marker([lat, lng], { icon: icono, pane: "contactsPane" })
        .bindPopup(() => globoContacto(c))
        .addTo(capa);
    }
  }, [L, capa, mapa, contactos, grupos, visible]);
}
