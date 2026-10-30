/**
 * El catálogo de secciones (id, número y municipio) para el selector de «Registrar ciudadano». Antes el
 * formulario bajaba cada vez que se abría las 3,791 secciones con sus colonias y su conteo de ciudadanos, y en la
 * calle, con mala señal, eso tardaba (observación O3 del plan de auditoría de menús). Ahora se pide la versión
 * ligera (`GET /api/electoral/sections?ligera=1`) una sola vez por visita: registrar a diez vecinos seguidos ya
 * no la baja diez veces. Si falla, se vuelve a intentar la próxima vez que se pida.
 */

export type SeccionDelCatalogo = { id: string; sectionNum: number; municipality: string | null };

let pendiente: Promise<SeccionDelCatalogo[]> | null = null;

export function seccionesDelCatalogo(): Promise<SeccionDelCatalogo[]> {
  pendiente ??= fetch("/api/electoral/sections?ligera=1")
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const datos: unknown = await res.json();
      const lista = (datos as { sections?: unknown })?.sections;
      return Array.isArray(lista) ? (lista as SeccionDelCatalogo[]) : [];
    })
    .catch(() => {
      pendiente = null;
      return [];
    });
  return pendiente;
}

/** Solo para las pruebas: olvidar lo ya pedido. */
export function olvidarSeccionesDelCatalogo(): void {
  pendiente = null;
}
