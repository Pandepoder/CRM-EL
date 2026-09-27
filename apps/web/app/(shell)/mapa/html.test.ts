import { describe, expect, it } from "vitest";

import {
  escaparHtml,
  globoContacto,
  globoIncidencia,
  iconoContacto,
  iconoGrupoContactos,
  iconoMunicipio,
  tooltipSeccion
} from "./html";
import type { ContactoDelMapa, ReportFeature, SectionProperties } from "./tipos";

/**
 * Leaflet pone tal cual en la página el HTML que recibe. Los textos de estas fichas los escribe gente
 * —algunos desde el registro público, sin sesión— y antes se pegaban sin escapar (A18). Aquí basta con
 * comprobar que los caracteres especiales de HTML nunca llegan crudos.
 */
const MARCADO = `<b>Ñandú</b> & "comillas" 'simples'`;
const ESCAPADO = "&lt;b&gt;Ñandú&lt;/b&gt; &amp; &quot;comillas&quot; &#39;simples&#39;";
const UUID = "0b8f5a8e-3c1d-4e2f-9a6b-7c8d9e0f1a2b";

function incidencia(extra: Partial<ReportFeature["properties"]> = {}): ReportFeature {
  return {
    properties: {
      id: UUID,
      title: MARCADO,
      description: MARCADO,
      category: "servicios",
      status: "active",
      createdAt: "2026-09-01T12:00:00.000Z",
      municipality: MARCADO,
      ...extra
    },
    geometry: { type: "Point", coordinates: [-103.3, 20.6] }
  };
}

function contacto(extra: Partial<ContactoDelMapa["properties"]> = {}): ContactoDelMapa {
  return {
    properties: {
      id: UUID,
      displayName: MARCADO,
      colony: MARCADO,
      municipality: MARCADO,
      isPanConfirmed: false,
      creatorName: MARCADO,
      networkColor: "#059669",
      isApproximate: false,
      sectionNum: 1234,
      ...extra
    },
    geometry: { type: "Point", coordinates: [-103.3, 20.6] }
  };
}

describe("escaparHtml", () => {
  it("escapa los cinco caracteres especiales de HTML", () => {
    expect(escaparHtml(MARCADO)).toBe(ESCAPADO);
  });

  it("nulo o indefinido quedan vacíos; los números pasan como texto", () => {
    expect(escaparHtml(null)).toBe("");
    expect(escaparHtml(undefined)).toBe("");
    expect(escaparHtml(2668)).toBe("2668");
  });
});

describe("globoIncidencia", () => {
  it("escapa título, descripción y municipio", () => {
    const html = globoIncidencia(incidencia(), 0, 1);
    expect(html).not.toContain("<b>");
    expect(html.split(ESCAPADO).length - 1).toBe(3);
  });

  it("ofrece cerrar y borrar solo si la API lo va a aceptar", () => {
    const sinPermiso = globoIncidencia(incidencia(), 0, 1);
    expect(sinPermiso).not.toContain("__toggleReportStatus");
    expect(sinPermiso).not.toContain("__deleteReport");

    const conPermiso = globoIncidencia(incidencia({ puedeActualizar: true, puedeBorrar: true }), 0, 1);
    expect(conPermiso).toContain(`window.__toggleReportStatus('${UUID}', 'resolved')`);
    expect(conPermiso).toContain(`window.__deleteReport('${UUID}')`);
  });

  it("una cerrada se reabre en vez de cerrarse", () => {
    const html = globoIncidencia(incidencia({ status: "resolved", puedeActualizar: true }), 0, 1);
    expect(html).toContain(`window.__toggleReportStatus('${UUID}', 'active')`);
    expect(html).not.toContain("'resolved')");
  });

  it("sin un identificador válido no hay botones, aunque haya permiso", () => {
    const html = globoIncidencia(incidencia({ id: "no-es-un-uuid", puedeActualizar: true, puedeBorrar: true }), 0, 1);
    expect(html).not.toContain("__toggleReportStatus");
    expect(html).not.toContain("__deleteReport");
    expect(html).not.toContain("no-es-un-uuid");
  });

  it("una actividad de la bitácora lleva a la Agenda, no se cierra ni se borra aquí", () => {
    const html = globoIncidencia(incidencia({ esActividad: true, puedeActualizar: true, puedeBorrar: true }), 0, 1);
    expect(html).toContain(`href="/equipo"`);
    expect(html).not.toContain("__toggleReportStatus");
    expect(html).not.toContain("__deleteReport");
  });
});

describe("contactos", () => {
  it("el globo escapa nombre, colonia, municipio y red", () => {
    const html = globoContacto(contacto());
    expect(html).not.toContain("<b>");
    expect(html.split(ESCAPADO).length - 1).toBe(4);
    expect(html).toContain(`href="/crm/contacts/${UUID}"`);
  });

  it("sin un identificador válido no enlaza a ninguna ficha", () => {
    const html = globoContacto(contacto({ id: "otra-cosa" }));
    expect(html).not.toContain("/crm/contacts/");
  });

  it("el icono escapa el nombre del título y solo acepta un color #rrggbb", () => {
    const html = iconoContacto(contacto({ networkColor: "red; background:url(x)" }));
    expect(html).not.toContain("<b>");
    expect(html).not.toContain("url(x)");
    expect(html).toContain("#2563eb");
  });

  it("un grupo solo pinta cifras", () => {
    const html = iconoGrupoContactos({ lat: 20.6, lng: -103.3, total: "<b>" as unknown as number, pan: 0, aprox: false });
    expect(html).not.toContain("<b>");
    expect(iconoGrupoContactos({ lat: 20.6, lng: -103.3, total: 12, pan: 3, aprox: false })).toContain(">12<");
  });
});

describe("secciones y municipios", () => {
  it("el tooltip de una sección escapa las colonias y solo pinta cifras", () => {
    const seccion: SectionProperties = {
      id: UUID,
      section_num: 2668,
      municipality: MARCADO,
      colonies: [MARCADO],
      contactsCount: "<b>" as unknown as number,
      visitsCompleted: 4,
      atlas: null
    };
    const html = tooltipSeccion(seccion, false);
    expect(html).not.toContain("<b>");
    expect(html).toContain(ESCAPADO);
    expect(html).toContain("0 simpatizantes");
    expect(html).toContain("4 visitas");
  });

  it("el rótulo de un municipio escapa el nombre", () => {
    expect(iconoMunicipio(MARCADO, 12)).not.toContain("<b>");
    expect(iconoMunicipio(MARCADO, 12)).toContain(ESCAPADO);
  });
});
