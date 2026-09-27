"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

import { ESTADOS_INCIDENCIA } from "@/lib/estados-incidencia";
import { CENTRO_JALISCO, RECUADRO_JALISCO, TODO_JALISCO, buscarMunicipio, guardarMunicipioPreferido, leerMunicipioPreferido, resolverMunicipio } from "@/lib/municipios-jalisco";
import { useMunicipioUsuario } from "@/lib/municipio-contexto";
import { useUsuarioActual } from "@/lib/usuario-contexto";

import { useCapaContactos, useCapaIncidencias, useCapaMunicipios, useCapaSecciones } from "./capas";
import { CentroDeMando } from "./CentroDeMando";
import { BLOQUES, SIN_ATLAS, TILE_STYLES, type EstiloDeMapa } from "./constantes";
import { ControlesDelMapa } from "./ControlesDelMapa";
import { globoGps, ICONO_GPS } from "./html";
import { ModalArchivarResueltas, ModalEditarIncidencia, ModalNuevaIncidencia, type PuntoDeReporte } from "./ModalesDeIncidencia";
import { PanelDelMapa, type Panel } from "./PanelDelMapa";
import type { BloqueElectoral, Coloreado, CoberturaContactos, ContactoDelMapa, GrupoDeContactos, ReportFeature, SectionProperties, UserOption } from "./tipos";

declare global {
  interface Window {
    __toggleReportStatus?: (id: string, newStatus: string) => void;
    __deleteReport?: (id: string) => void;
  }
}

/** Una ubicación GPS vale para «Reportar aquí» durante este tiempo; después se usa el centro del mapa. */
const GPS_VIGENTE_MS = 2 * 60 * 1000;
const SECCIONES_FRESCAS_MS = 60_000;

const abierta = (r: ReportFeature) => !(ESTADOS_INCIDENCIA[r.properties.status]?.cerrada ?? false);

/**
 * Mapa en vivo.
 *
 * Era un único componente de 3 200 líneas (R17). Ahora las capas viven en `capas.ts`, el HTML que va
 * a Leaflet —siempre escapado— en `html.ts`, el menú en `ControlesDelMapa.tsx`, los paneles en
 * `PanelDelMapa.tsx`, la lista en `CentroDeMando.tsx` y los formularios en `ModalesDeIncidencia.tsx`.
 * Aquí queda el estado, la carga de datos y el cableado.
 */
export default function MapaPage() {
  const usuario = useUsuarioActual();
  const municipioUsuario = useMunicipioUsuario();
  const puedeReportar = Boolean(usuario?.puedeCoordinar);
  const esAdmin = usuario?.rol === "admin";

  const [L, setL] = useState<any>(null);
  const [mapa, setMapa] = useState<any>(null);
  const [capas, setCapas] = useState<{ incidencias: any; contactos: any; etiquetas: any; base: any } | null>(null);
  const marcadorGps = useRef<any>(null);
  const [zoom, setZoom] = useState(8);

  const [esMovil, setEsMovil] = useState(false);
  const [vista, setVista] = useState<"mapa" | "lista">("mapa");
  const [panel, setPanel] = useState<Panel>("none");

  // Qué veo y cómo lo veo.
  const [municipio, setMunicipio] = useState("");
  const [estilo, setEstilo] = useState<EstiloDeMapa>("osm");
  const [verIncidencias, setVerIncidencias] = useState(true);
  const [verContactos, setVerContactos] = useState(false);
  const [verSecciones, setVerSecciones] = useState(true);
  const [coloreado, setColoreado] = useState<Coloreado>("municipio");

  // Datos.
  const [reportes, setReportes] = useState<ReportFeature[]>([]);
  const [diasDeResueltas, setDiasDeResueltas] = useState(30);
  const [reportesTruncados, setReportesTruncados] = useState(false);
  const [contactos, setContactos] = useState<{ features: ContactoDelMapa[]; grupos: GrupoDeContactos[] }>({ features: [], grupos: [] });
  const [cobertura, setCobertura] = useState<CoberturaContactos | null>(null);
  const [secciones, setSecciones] = useState<any>(null);
  const [usuarios, setUsuarios] = useState<UserOption[] | null>(null);

  // Selección y acciones.
  const [seccion, setSeccion] = useState<SectionProperties | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [ubicando, setUbicando] = useState(false);
  const ultimaUbicacion = useRef<{ lat: number; lng: number; precision: number; en: number } | null>(null);
  const [puntoDeReporte, setPuntoDeReporte] = useState<PuntoDeReporte | null>(null);
  const [editando, setEditando] = useState<ReportFeature | null>(null);
  const [archivar, setArchivar] = useState(false);
  const [archivando, setArchivando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const avisar = useCallback((texto: string) => {
    setAviso(texto);
    setTimeout(() => setAviso((actual) => (actual === texto ? null : actual)), 3500);
  }, []);

  // ---------------------------------------------------------------------------------------------
  // Tamaño. El mapa ocupa lo que queda de pantalla debajo de la cabecera y, en el teléfono, encima de
  // la barra inferior (`.alto-mapa` en globals.css). Aquí se mide lo que tiene encima. Antes restaba
  // 64 px fijos empezando debajo de una cabecera de ~130: su franja inferior, con la barra de
  // estadísticas, quedaba bajo la barra de navegación (C13).
  const contenedor = useRef<HTMLDivElement>(null);
  const [arriba, setArriba] = useState<number | null>(null);
  useEffect(() => {
    const medir = () => {
      const el = contenedor.current;
      if (el) setArriba(Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY)));
    };
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [esMovil]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const aplicar = () => setEsMovil(mq.matches);
    aplicar();
    mq.addEventListener("change", aplicar);
    return () => mq.removeEventListener("change", aplicar);
  }, []);

  // ---------------------------------------------------------------------------------------------
  // Leaflet, una sola vez.
  const pedirContactosRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    let cancelado = false;
    void import("leaflet").then((modulo) => {
      const Lf: any = modulo.default || modulo;
      const nodo = document.getElementById("leaflet-map-container");
      if (cancelado || !nodo || (nodo as any)._leaflet_id) return;
      const m = Lf.map(nodo, { center: [CENTRO_JALISCO[0], CENTRO_JALISCO[1]], zoom: 8, zoomControl: false });
      // Arriba a la derecha: abajo la tapan el menú del teléfono y el botón flotante.
      Lf.control.zoom({ position: "topright" }).addTo(m);
      const base = Lf.tileLayer(TILE_STYLES.osm.url, { attribution: TILE_STYLES.osm.attribution, maxZoom: 19 }).addTo(m);
      // Panes separados fijan el orden por z-index en vez de por orden de alta: las incidencias,
      // siempre encima de los contactos. Todo queda dentro del contenedor del mapa (`isolation`).
      m.createPane("contactsPane").style.zIndex = "580";
      m.createPane("incidentsPane").style.zIndex = "640";
      setCapas({ incidencias: Lf.layerGroup().addTo(m), contactos: Lf.layerGroup().addTo(m), etiquetas: Lf.layerGroup().addTo(m), base });
      (window as any).__leafletMap = m;
      if (typeof ResizeObserver !== "undefined") new ResizeObserver(() => m.invalidateSize()).observe(nodo);
      m.on("zoomend", () => setZoom(m.getZoom()));
      let pendiente: ReturnType<typeof setTimeout> | null = null;
      m.on("moveend", () => {
        if (pendiente) clearTimeout(pendiente);
        pendiente = setTimeout(() => pedirContactosRef.current(), 400);
      });
      // El doble clic que abre el alta de incidencia está más abajo (depende de quién puede reportar).
      setL(Lf);
      setMapa(m);
      setZoom(m.getZoom());
    });
    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    const s = TILE_STYLES[estilo];
    if (!capas?.base) return;
    capas.base.setUrl(s.url);
    capas.base.options.attribution = s.attribution;
  }, [capas, estilo]);

  // ---------------------------------------------------------------------------------------------
  // Municipio inicial: el de la dirección (?municipio=), el de la persona, el último que eligió en
  // este navegador y, si nada de eso existe, todo Jalisco.
  useEffect(() => {
    const desdeUrl = new URLSearchParams(window.location.search).get("municipio");
    setMunicipio(
      desdeUrl === TODO_JALISCO
        ? TODO_JALISCO
        : resolverMunicipio(desdeUrl) ?? resolverMunicipio(municipioUsuario) ?? leerMunicipioPreferido() ?? TODO_JALISCO
    );
    // Solo al montar: después manda lo que elija la persona.
  }, []);

  const cambiarMunicipio = useCallback((m: string) => {
    setMunicipio(m);
    setSeccion(null);
    guardarMunicipioPreferido(m);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("municipio", m);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // Sin acceso a la dirección solo se pierde poder compartir el enlace filtrado.
    }
  }, []);

  // Encuadre con el recuadro del catálogo: no hay que esperar a los polígonos para mover el mapa.
  useEffect(() => {
    if (!mapa || !municipio) return;
    const bbox = municipio === TODO_JALISCO ? RECUADRO_JALISCO : buscarMunicipio(municipio)?.bbox;
    if (!bbox) return;
    // En un mapa estrecho (teléfono) 40 px por lado le quitaban un nivel de zoom a todo Jalisco.
    const encuadrar = () => {
      const margen = mapa.getSize().x < 500 ? 8 : 40;
      mapa.fitBounds([[bbox[1], bbox[0]], [bbox[3], bbox[2]]], { padding: [margen, margen], maxZoom: 14 });
    };
    const { x, y } = mapa.getSize();
    if (x > 0 && y > 0) {
      encuadrar();
      return;
    }
    mapa.once("resize", encuadrar);
    return () => {
      mapa.off("resize", encuadrar);
    };
  }, [mapa, municipio]);

  // ---------------------------------------------------------------------------------------------
  // Datos.
  const pedirReportes = useCallback(async () => {
    try {
      const res = await fetch("/api/map/reports", { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      setReportes(d.features || []);
      if (typeof d.diasDeResueltas === "number") setDiasDeResueltas(d.diasDeResueltas);
      setReportesTruncados(Boolean(d.truncado));
    } catch {
      // Sin red se queda lo que había; el siguiente cambio vuelve a pedir.
    }
  }, []);
  useEffect(() => {
    void pedirReportes();
  }, [pedirReportes]);

  // Secciones del municipio elegido, recordadas por municipio: volver a uno ya visto es instantáneo.
  // En «todo Jalisco» no se piden: se dibujan los 125 municipios del catálogo (4.5).
  const seccionesCache = useRef<Record<string, { en: number; data: any }>>({});
  useEffect(() => {
    if (!municipio || municipio === TODO_JALISCO) {
      setSecciones(null);
      return;
    }
    const clave = municipio.toLowerCase();
    const guardado = seccionesCache.current[clave];
    if (guardado) {
      setSecciones(guardado.data);
      if (Date.now() - guardado.en < SECCIONES_FRESCAS_MS) return;
    }
    let vigente = true;
    void (async () => {
      try {
        const res = await fetch(`/api/map/sections/geojson?municipality=${encodeURIComponent(municipio)}`, { cache: "no-store" });
        if (!res.ok || !vigente) return;
        const data = await res.json();
        seccionesCache.current[clave] = { en: Date.now(), data };
        setSecciones(data);
      } catch {
        // Se queda lo cargado, si había.
      }
    })();
    return () => {
      vigente = false;
    };
  }, [municipio]);

  // Contactos. Con la capa apagada solo se piden los números para el rótulo; encendida, el recuadro
  // visible ya agrupado por el servidor (C10, R6). Una respuesta vieja que llega tarde no pisa a una
  // más nueva.
  const verContactosRef = useRef(verContactos);
  verContactosRef.current = verContactos;
  // Por referencia: si dependiera de `mapa`, al terminar de cargar Leaflet se repetía la petición.
  const mapaRef = useRef<any>(null);
  mapaRef.current = mapa;
  const ultimaPeticion = useRef(0);
  const pedirContactos = useCallback(async () => {
    const ver = verContactosRef.current;
    const m = mapaRef.current;
    let url = "/api/map/contacts?solo=conteo";
    if (ver) {
      if (!m) return;
      const b = m.getBounds();
      if (b.getEast() - b.getWest() < 0.0001 || b.getNorth() - b.getSouth() < 0.0001) return;
      url = `/api/map/contacts?bbox=${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}&zoom=${Math.round(m.getZoom())}`;
    }
    const n = ++ultimaPeticion.current;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const d = await res.json();
      if (n !== ultimaPeticion.current) return;
      setCobertura(d.cobertura ?? null);
      setContactos(ver ? { features: d.features || [], grupos: d.grupos || [] } : { features: [], grupos: [] });
    } catch {
      // Sin red se queda lo que había.
    }
  }, []);
  pedirContactosRef.current = () => {
    if (verContactosRef.current) void pedirContactos();
  };
  useEffect(() => {
    void pedirContactos();
  }, [pedirContactos, verContactos]);

  // La lista de personas para asignar solo se descarga al abrir un formulario que la usa.
  const pedirUsuarios = useCallback(async () => {
    if (usuarios) return;
    try {
      const res = await fetch("/api/map/users", { cache: "no-store" });
      if (res.ok) setUsuarios((await res.json()).users || []);
    } catch {
      // El formulario funciona sin la lista: la asignación queda vacía.
    }
  }, [usuarios]);

  // ---------------------------------------------------------------------------------------------
  // Capas.
  const alElegirSeccion = useCallback((p: SectionProperties, limites: any) => {
    setSeccion(p);
    setPanel("section");
    if (mapa && limites) mapa.fitBounds(limites, { padding: [50, 50], maxZoom: 15 });
  }, [mapa]);
  const capaSecciones = useCapaSecciones({
    L,
    mapa,
    capaEtiquetas: capas?.etiquetas,
    datos: municipio && municipio !== TODO_JALISCO ? secciones : null,
    visible: verSecciones,
    etiquetas: true,
    coloreado,
    seleccion: seccion?.section_num ?? null,
    alElegir: alElegirSeccion,
    // Doble clic sobre una sección: el alta en el punto exacto del clic, como en el resto del mapa. La
    // dirección y la sección las detecta el formulario desde ese punto; el polígono no decide nada.
    alDobleClic: puedeReportar ? (punto) => reportar({}, punto) : null
  });
  useCapaMunicipios({ L, mapa, visible: verSecciones && municipio === TODO_JALISCO, alElegir: cambiarMunicipio });
  useCapaIncidencias({ L, mapa, capa: capas?.incidencias, reportes, agrupar: true, compacto: verSecciones && coloreado === "electoral", zoom, visible: verIncidencias });
  useCapaContactos({ L, mapa, capa: capas?.contactos, contactos: contactos.features, grupos: contactos.grupos, visible: verContactos });

  // ---------------------------------------------------------------------------------------------
  // Acciones.
  const cambiarEstado = useCallback(async (id: string, estado: string) => {
    try {
      const res = await fetch(`/api/map/reports/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: estado }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        avisar(d.error || "No se pudo cambiar el estado.");
        return;
      }
      avisar(ESTADOS_INCIDENCIA[estado]?.cerrada ? "Incidencia marcada como atendida." : "Incidencia reabierta.");
      mapa?.closePopup();
      // Solo las incidencias: antes también se volvía a descargar toda la cartografía (0,5 a 3,3 MB).
      await pedirReportes();
    } catch {
      avisar("Sin conexión: no se cambió el estado.");
    }
  }, [avisar, mapa, pedirReportes]);

  const borrar = useCallback(async (id: string) => {
    if (!window.confirm("¿Eliminar esta incidencia? No se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/map/reports/${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        avisar(d.error || "No se pudo eliminar.");
        return;
      }
      avisar("Incidencia eliminada.");
      mapa?.closePopup();
      await pedirReportes();
    } catch {
      avisar("Sin conexión: no se eliminó.");
    }
  }, [avisar, mapa, pedirReportes]);

  useEffect(() => {
    window.__toggleReportStatus = (id, estado) => void cambiarEstado(id, estado);
    window.__deleteReport = (id) => void borrar(id);
    return () => {
      delete window.__toggleReportStatus;
      delete window.__deleteReport;
    };
  }, [cambiarEstado, borrar]);

  /** «Mi ubicación» centra el mapa y marca el punto. Antes también abría el alta de incidencia. */
  const ubicarme = () => {
    if (!navigator.geolocation) {
      avisar("Este teléfono o navegador no da la ubicación GPS.");
      return;
    }
    setUbicando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicando(false);
        const { latitude, longitude, accuracy } = pos.coords;
        ultimaUbicacion.current = { lat: latitude, lng: longitude, precision: accuracy, en: Date.now() };
        if (mapa && L) {
          mapa.flyTo([latitude, longitude], 16, { duration: 1.2 });
          marcadorGps.current?.remove();
          const icono = L.divIcon({ html: ICONO_GPS, className: "gps-user-marker", iconSize: [30, 30], iconAnchor: [15, 15] });
          marcadorGps.current = L.marker([latitude, longitude], { icon: icono }).bindPopup(globoGps(accuracy)).addTo(mapa);
        }
        avisar(`Ubicación fijada (±${Math.round(accuracy)} m)${puedeReportar ? ". «Reportar» usará este punto." : "."}`);
      },
      () => {
        setUbicando(false);
        avisar("No se pudo obtener la ubicación GPS.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  /** Reportar en la última ubicación GPS si es reciente; si no, en el centro del mapa. */
  const reportar = useCallback((extra: Partial<PuntoDeReporte> = {}, lugar?: { lat: number; lng: number }) => {
    void pedirUsuarios();
    const gps = ultimaUbicacion.current && Date.now() - ultimaUbicacion.current.en < GPS_VIGENTE_MS ? ultimaUbicacion.current : null;
    const centro = mapa ? mapa.getCenter() : { lat: CENTRO_JALISCO[0], lng: CENTRO_JALISCO[1] };
    const punto = lugar ?? (gps ? { lat: gps.lat, lng: gps.lng } : { lat: centro.lat, lng: centro.lng });
    const origen = lugar ? "clic" : gps ? "gps" : "centro";
    setPuntoDeReporte({ ...punto, origen, ...(gps && !lugar ? { precisionGps: gps.precision } : {}), ...extra });
  }, [mapa, pedirUsuarios]);

  // Doble clic (o doble toque) en el mapa: levantar una incidencia en ese punto (pedido del dueño,
  // 2026-09-25). En la etapa 4 se había quitado (M25) porque el doble toque es también el gesto de
  // acercar, y cada acercamiento abría el formulario. Ahora, a quien puede reportar, el doble clic ya
  // no acerca —se acerca con la rueda, pellizcando o con los botones—: solo abre el alta. A quien no
  // puede reportar le sigue acercando. Los controles del mapa van fuera del contenedor de Leaflet, así
  // que un doble clic sobre ellos no llega aquí.
  useEffect(() => {
    if (!mapa || !puedeReportar) return;
    mapa.doubleClickZoom.disable();
    const alDobleClic = (e: { latlng: { lat: number; lng: number } }) => reportar({}, { lat: e.latlng.lat, lng: e.latlng.lng });
    mapa.on("dblclick", alDobleClic);
    return () => {
      mapa.off("dblclick", alDobleClic);
      mapa.doubleClickZoom.enable();
    };
  }, [mapa, puedeReportar, reportar]);

  // Llegar con ?crear=incidencia (el botón flotante del panel): GPS del dispositivo y, si no hay
  // permiso o tarda, el centro del mapa. El parámetro se retira de la dirección en cuanto se usa.
  useEffect(() => {
    if (!mapa) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("crear") !== "incidencia") return;
    params.delete("crear");
    const resto = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (resto ? `?${resto}` : ""));
    if (!puedeReportar) {
      avisar("Levantar incidencias es del líder de la brigada o de la coordinación.");
      return;
    }
    if (!navigator.geolocation) {
      reportar();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        ultimaUbicacion.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy, en: Date.now() };
        mapa.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { duration: 1.2 });
        reportar();
      },
      () => reportar(),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [mapa, puedeReportar, reportar, avisar]);

  const centrarEn = (r: ReportFeature) => {
    const [lng, lat] = r.geometry.coordinates;
    setVista("mapa");
    setPanel("none");
    setTimeout(() => mapa?.flyTo([lat, lng], 16, { duration: 1.0 }), 150);
  };

  const archivarResueltas = async () => {
    setArchivando(true);
    try {
      const res = await fetch("/api/map/reports/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "purge_resolved", municipality: "all" }) });
      const d = await res.json().catch(() => ({}));
      avisar(res.ok ? d.message : d.error || "No se pudieron archivar.");
      if (res.ok) {
        setArchivar(false);
        await pedirReportes();
      }
    } catch {
      avisar("Sin conexión: no se archivó nada.");
    } finally {
      setArchivando(false);
    }
  };

  const exportar = (lista: ReportFeature[]) => {
    if (lista.length === 0) {
      avisar("No hay nada que exportar con esos filtros.");
      return;
    }
    // Una celda que empieza con = + - @ la ejecuta la hoja de cálculo como fórmula: se antepone un apóstrofo.
    const celda = (v: string | number) => {
      const texto = String(v);
      return `"${(/^[=+\-@\t\r]/.test(texto) ? `'${texto}` : texto).replace(/"/g, '""')}"`;
    };
    const filas = lista.map((r) => [r.properties.id, r.properties.title, r.properties.esActividad ? "actividad" : r.properties.category, ESTADOS_INCIDENCIA[r.properties.status]?.label ?? r.properties.status, r.properties.municipality || "", r.properties.sectionNum || "", new Date(r.properties.createdAt).toISOString()].map(celda).join(","));
    // Con la marca BOM, Excel lee los acentos como UTF-8 (sin ella, «TÃ­tulo»). Igual que la exportación de contactos.
    const blob = new Blob(["﻿" + ["ID,Título,Categoría,Estado,Municipio,Sección,Fecha", ...filas].join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `incidencias_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------------------------------------------
  const incidenciasAbiertas = useMemo(() => reportes.filter((r) => abierta(r) && !r.properties.esActividad).length, [reportes]);
  const incidenciasDeLaSeccion = seccion ? reportes.filter((r) => r.properties.sectionId === seccion.id && abierta(r) && !r.properties.esActividad).length : 0;
  const listaDeSecciones = useMemo(() => {
    const todas: SectionProperties[] = (secciones?.features ?? []).map((f: any) => f.properties);
    const q = busqueda.toLowerCase().trim();
    if (!q) return todas;
    return todas.filter((s) => String(s.section_num).includes(q) || s.colonies?.some((c) => c.toLowerCase().includes(q)) || (s.municipality || "").toLowerCase().includes(q));
  }, [secciones, busqueda]);

  const elegirSeccionDeLaLista = (s: SectionProperties) => {
    let limites: any = null;
    capaSecciones?.eachLayer((item: any) => {
      if (item.feature?.properties?.section_num === s.section_num) limites = item.getBounds();
    });
    alElegirSeccion(s, limites);
  };

  const reportarEnSeccion = (s: SectionProperties) => {
    let lugar: { lat: number; lng: number } | undefined;
    capaSecciones?.eachLayer((item: any) => {
      if (item.feature?.properties?.section_num === s.section_num) {
        const c = item.getBounds().getCenter();
        lugar = { lat: c.lat, lng: c.lng };
      }
    });
    // El centro de la sección no es el lugar de nada: el alta lo trata como aproximado y deja ubicarlo
    // por su dirección.
    reportar({ municipio: s.municipality, seccionId: s.id, origen: "centro" }, lugar);
  };

  // Leyenda del coloreado por resultado: un color sin leyenda obliga a adivinar. El atlas no cubre todos
  // los municipios (hoy, solo Zapopan): sin decirlo, el modo pintaba todo de gris sin explicación.
  const seccionesConFicha = useMemo(() => (secciones?.features ?? []).filter((f: any) => f.properties?.atlas).length, [secciones]);
  const totalDeSecciones: number = secciones?.features?.length ?? 0;
  const leyenda =
    verSecciones && coloreado === "electoral" && municipio !== TODO_JALISCO && secciones ? (
      <div className="px-3 py-2 rounded-xl bg-white/95 border border-slate-300 shadow-lg">
        <div className="text-[9px] font-extrabold text-slate-600 uppercase tracking-wide mb-1.5">Quién ganó la última elección</div>
        {seccionesConFicha === 0 ? (
          <div className="text-[11px] font-semibold text-slate-600">Todavía no hay resultados cargados para {municipio}.</div>
        ) : (
          <div className="flex items-center gap-2.5 flex-wrap">
            {(Object.keys(BLOQUES) as BloqueElectoral[]).map((clave) => (
              <span key={clave} className="flex items-center gap-1 text-[11px] font-bold text-slate-900">
                <span className="w-[11px] h-[11px] rounded-sm inline-block" style={{ background: BLOQUES[clave].color, border: `1px solid ${BLOQUES[clave].borde}` }} />
                {BLOQUES[clave].etiqueta}
              </span>
            ))}
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <span className="w-[11px] h-[11px] rounded-sm inline-block opacity-50" style={{ background: SIN_ATLAS.color, border: `1px solid ${SIN_ATLAS.borde}` }} /> Sin ficha
              {seccionesConFicha < totalDeSecciones && ` (${(totalDeSecciones - seccionesConFicha).toLocaleString("es-MX")})`}
            </span>
          </div>
        )}
      </div>
    ) : null;

  // Lo que no cabe se dice: antes el mapa recortaba en silencio.
  const avisosDeTope =
    reportesTruncados || (verContactos && cobertura?.truncado) ? (
      <div role="status" className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold shadow space-y-0.5">
        {reportesTruncados && <div>Solo se muestran las 2 000 incidencias más recientes; el resto está en la lista de Incidencias.</div>}
        {verContactos && cobertura?.truncado && <div>Hay más contactos de los que caben en esta vista: acércate para verlos todos.</div>}
      </div>
    ) : null;

  // Escritorio: al pie de la columna del menú, que así nunca los tapa.
  const pie = (
    <div className="space-y-1.5">
      {avisosDeTope}
      {leyenda}
      <div className="grid grid-cols-3 gap-1 px-3 py-2 rounded-2xl bg-slate-900/90 border border-white/15 shadow-xl text-white">
        {(
          [
            [incidenciasAbiertas.toLocaleString("es-MX"), "abiertas", "text-red-300"],
            [(cobertura?.ubicables ?? 0).toLocaleString("es-MX"), "contactos en el mapa", "text-blue-300"],
            municipio === TODO_JALISCO ? ["125", "municipios", "text-green-300"] : [secciones?.features?.length?.toLocaleString("es-MX") ?? "…", "secciones", "text-green-300"]
          ] as const
        ).map(([cifra, texto, color]) => (
          <div key={texto} className="text-center leading-tight">
            <div className={`text-[14px] font-black ${color}`}>{cifra}</div>
            <div className="text-[9.5px] font-bold text-slate-400">{texto}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div
      ref={contenedor}
      className="alto-mapa"
      style={{
        position: "relative",
        width: "100%",
        background: "#0f172a",
        overflow: "hidden",
        ...(arriba !== null ? ({ "--arriba-del-mapa": `${arriba}px` } as React.CSSProperties) : {})
      }}
    >
      {/* `isolation`: los z-index propios de Leaflet (panes de 400 a 700, controles en 1000) quedan
          dentro del mapa y no compiten con la interfaz (C12). */}
      <div id="leaflet-map-container" style={{ position: "absolute", inset: 0, isolation: "isolate", zIndex: 0, visibility: vista === "mapa" ? "visible" : "hidden" }} />

      {vista === "mapa" && !(esMovil && panel !== "none") && (
        <ControlesDelMapa
          // Se abre plegado en el teléfono y desplegado en escritorio: al saber cuál es, arranca de nuevo.
          key={esMovil ? "movil" : "escritorio"}
          esMovil={esMovil}
          municipio={municipio || TODO_JALISCO}
          onMunicipio={(m) => {
            cambiarMunicipio(m);
            avisar(m === TODO_JALISCO ? "Todo Jalisco" : `Municipio: ${m}`);
          }}
          estilo={estilo}
          onEstilo={setEstilo}
          verIncidencias={verIncidencias}
          onVerIncidencias={setVerIncidencias}
          incidenciasAbiertas={incidenciasAbiertas}
          verContactos={verContactos}
          onVerContactos={setVerContactos}
          cobertura={cobertura}
          verSecciones={verSecciones}
          onVerSecciones={setVerSecciones}
          coloreado={coloreado}
          onColoreado={setColoreado}
          ubicando={ubicando}
          onUbicarme={ubicarme}
          onBuscar={() => setPanel("search")}
          puedeReportar={puedeReportar}
          onReportar={() => reportar()}
          onLista={() => {
            setPanel("none");
            setVista("lista");
          }}
          pie={pie}
        />
      )}

      {vista === "mapa" && (
        <PanelDelMapa
          esMovil={esMovil}
          panel={panel}
          onCerrar={() => setPanel("none")}
          municipio={municipio || TODO_JALISCO}
          busqueda={busqueda}
          onBusqueda={setBusqueda}
          onElegirResultado={(item) => {
            setBusqueda(item.title);
            if (item.sectionNum) {
              const f = secciones?.features?.find((x: any) => x.properties?.section_num === item.sectionNum);
              if (f) {
                elegirSeccionDeLaLista(f.properties);
                return;
              }
            }
            if (item.lat && item.lng && mapa) {
              mapa.flyTo([item.lat, item.lng], 16, { duration: 1.0 });
              if (esMovil) setPanel("none");
            }
          }}
          secciones={listaDeSecciones}
          onElegirSeccion={elegirSeccionDeLaLista}
          seccion={seccion}
          incidenciasDeLaSeccion={incidenciasDeLaSeccion}
          puedeReportar={puedeReportar}
          onReportarEnSeccion={reportarEnSeccion}
          reportes={reportes}
          onCentrar={centrarEn}
        />
      )}

      {/* Teléfono: la leyenda y los avisos de tope arriba; el resumen lo dice la barra del menú. */}
      {vista === "mapa" && esMovil && panel === "none" && (leyenda || avisosDeTope) && (
        <div className="absolute top-3 left-3 right-14 z-30 space-y-1.5">
          {leyenda}
          {avisosDeTope}
        </div>
      )}

      {aviso && (
        <div role="status" className="absolute top-16 left-1/2 -translate-x-1/2 z-[1200] bg-slate-900/95 text-white px-4 py-2 rounded-full shadow-xl text-[12px] font-bold border border-white/20 w-max max-w-[90%] text-center">
          {aviso}
        </div>
      )}

      {vista === "lista" && (
        <CentroDeMando
          reportes={reportes}
          diasDeResueltas={diasDeResueltas}
          esAdmin={esAdmin}
          onVolver={() => {
            setVista("mapa");
            setTimeout(() => mapa?.invalidateSize(), 100);
          }}
          onCentrar={centrarEn}
          onEditar={(r) => {
            void pedirUsuarios();
            setEditando(r);
          }}
          onCambiarEstado={(id, estado) => void cambiarEstado(id, estado)}
          onArchivarResueltas={() => setArchivar(true)}
          onExportar={exportar}
        />
      )}

      <ModalNuevaIncidencia
        punto={puntoDeReporte}
        secciones={secciones}
        usuarios={usuarios ?? []}
        usuarioActualId={usuario?.id ?? null}
        onCerrar={() => setPuntoDeReporte(null)}
        onGuardada={(texto) => {
          avisar(texto);
          void pedirReportes();
        }}
        onMoverMapa={(lat, lng) => mapa?.flyTo([lat, lng], 16, { duration: 1.0 })}
      />
      <ModalEditarIncidencia
        reporte={editando}
        usuarios={usuarios ?? []}
        onCerrar={() => setEditando(null)}
        onGuardada={() => {
          setEditando(null);
          avisar("Incidencia actualizada.");
          void pedirReportes();
        }}
      />
      <ModalArchivarResueltas abierto={archivar} ocupado={archivando} onCerrar={() => setArchivar(false)} onConfirmar={() => void archivarResueltas()} />
    </div>
  );
}
