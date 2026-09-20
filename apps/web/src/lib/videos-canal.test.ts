import { describe, expect, it } from "vitest";

import { mezclarPestanas } from "./videos-canal";

/**
 * Lo que se prueba aquí es la lectura de las pestañas del canal de YouTube, que es de donde
 * salen los videos de la página pública desde que se vio que ese canal no tiene feed RSS.
 *
 * Los trozos de abajo son la forma real que tiene esa página, recortada a lo que se usa: si
 * YouTube la cambia, esto seguirá pasando y lo que fallará es la página. Por eso lo que se
 * prueba no es "YouTube sigue igual" —eso no se puede— sino lo que sí decidimos nosotros: qué
 * se considera reciente, en qué orden quedan los videos largos y los Shorts, y que un título
 * llegue limpio.
 */

const largo = (id: string, titulo: string, antiguedad: string) =>
  `"lockupViewModel":{"contentImage":{"thumbnailViewModel":{}},"metadata":{"lockupMetadataViewModel":` +
  `{"title":{"content":"${titulo}"},"metadata":{"contentMetadataViewModel":{"metadataRows":[{"metadataParts":` +
  `[{"text":{"content":"6 vistas"}},{"text":{"content":"${antiguedad}"}}]}]}}}},` +
  `"contentId":"${id}","contentType":"LOCKUP_CONTENT_TYPE_VIDEO"}`;

const corto = (id: string, textoAccesible: string) =>
  `"shortsLockupViewModel":{"entityId":"shorts-shelf-item-${id}",` +
  `"accessibilityText":"${textoAccesible}","onTap":{"innertubeCommand":{}}}`;

describe("mezclarPestanas", () => {
  it("lee los videos largos con su título y su antigüedad", () => {
    const videos = mezclarPestanas(largo("XXRMuPPUEec", "Entre Mentes con Edgar López", "hace 2 semanas"), "");

    expect(videos).toEqual([
      {
        id: "XXRMuPPUEec",
        titulo: "Entre Mentes con Edgar López",
        formato: "horizontal",
        antiguedad: "hace 2 semanas"
      }
    ]);
  });

  it("lee los Shorts y les quita el conteo de vistas que YouTube pega al título", () => {
    const videos = mezclarPestanas(
      "",
      corto("i8S0y49utMo", "TONALÁ SE VIVE CON SU GENTE, 212 vistas - reproducir Short") +
        corto("WOI0Wi9nO_s", "AYUDEMOS al comedor comunitario, 1.1 mil vistas - reproducir Short")
    );

    expect(videos).toEqual([
      { id: "i8S0y49utMo", titulo: "TONALÁ SE VIVE CON SU GENTE", formato: "corto" },
      { id: "WOI0Wi9nO_s", titulo: "AYUDEMOS al comedor comunitario", formato: "corto" }
    ]);
  });

  it("no recorta un título que hable de vistas si no es la cola de un Short", () => {
    const videos = mezclarPestanas("", corto("aaaaaaaaaaa", "Récord de visitas, 500 vistas en un día"));

    expect(videos[0]?.titulo).toBe("Récord de visitas, 500 vistas en un día");
  });

  it("recorta el conteo con cualquiera de las formas en que YouTube lo escribe", () => {
    // La de millones lleva un "de" en medio que la versión anterior no contemplaba, así que
    // el título de un video que se hiciera viral habría salido con la cola pegada.
    const formas = ["212 vistas", "1.1 mil vistas", "mil vistas", "3 millones de vistas", "500 views"];
    const html = formas.map((f, i) => corto(`id000000${i}00`, `Mi título, ${f} - reproducir Short`)).join("");

    const videos = mezclarPestanas("", html);

    expect(videos.map((v) => v.titulo)).toEqual(formas.map(() => "Mi título"));
  });

  it("no se atranca con un título lleno de comas", () => {
    // La expresión regular anterior mezclaba cuantificadores que se solapaban y ante esto se
    // disparaba el retroceso: 1,600 comas tardaban 3.1 segundos, con el servidor parado
    // mientras tanto, porque Node corre en un solo hilo.
    const html = corto("bbbbbbbbbbb", `T${",".repeat(2000)}${" ".repeat(2000)}x, 10 vistas - reproducir Short`);

    const inicio = Date.now();
    const videos = mezclarPestanas("", html);

    expect(Date.now() - inicio).toBeLessThan(200);
    expect(videos).toHaveLength(1);
  });

  it("pone delante el video largo reciente y deja los viejos detrás de los Shorts", () => {
    const videos = mezclarPestanas(
      largo("reciente001", "Lo de esta semana", "hace 3 días") + largo("viejo000001", "Lo de hace años", "hace 2 años"),
      corto("corto000001", "Un Short, 10 vistas - reproducir Short")
    );

    expect(videos.map((v) => v.id)).toEqual(["reciente001", "corto000001", "viejo000001"]);
  });

  it("entiende todas las formas en que YouTube escribe la antigüedad", () => {
    // Un largo "reciente" (45 días o menos) va delante del Short; uno viejo, detrás. Eso hace
    // de sonda para comprobar que cada unidad se interpreta con la que le toca y no con otra:
    // "semanas" no debe leerse como días, ni "meses" como semanas.
    const recientes = ["hace 30 segundos", "hace 5 minutos", "hace 3 horas", "hace 1 día", "hace 6 días", "hace 2 semanas", "hace 1 mes", "2 weeks ago", "1 day ago"];
    const viejos = ["hace 2 meses", "hace 11 meses", "hace 1 año", "hace 10 años", "3 months ago", "1 year ago"];

    for (const cuando of recientes) {
      const v = mezclarPestanas(largo("largo000001", "Largo", cuando), corto("corto000001", "S, 1 vistas - reproducir Short"));
      expect(v.map((x) => x.id), `"${cuando}" debería contar como reciente`).toEqual(["largo000001", "corto000001"]);
    }
    for (const cuando of viejos) {
      const v = mezclarPestanas(largo("largo000001", "Largo", cuando), corto("corto000001", "S, 1 vistas - reproducir Short"));
      expect(v.map((x) => x.id), `"${cuando}" debería contar como viejo`).toEqual(["corto000001", "largo000001"]);
    }
  });

  it("trata como viejo el video al que no se le entiende la antigüedad", () => {
    const videos = mezclarPestanas(
      largo("sinfecha001", "Sin fecha legible", "hace un ratito"),
      corto("corto000001", "Un Short, 10 vistas - reproducir Short")
    );

    expect(videos.map((v) => v.id)).toEqual(["corto000001", "sinfecha001"]);
  });

  it("resuelve los escapes del título", () => {
    const videos = mezclarPestanas(largo("escapes0001", 'Agua \\u0026 drenaje: \\"ya basta\\"', "hace 1 día"), "");

    expect(videos[0]?.titulo).toBe('Agua & drenaje: "ya basta"');
  });

  it("devuelve la lista vacía si la página no trae nada reconocible, para caer al respaldo", () => {
    expect(mezclarPestanas("<html>YouTube cambió de formato</html>", "")).toEqual([]);
    expect(mezclarPestanas("", "")).toEqual([]);
  });
});
