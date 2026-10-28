/**
 * Logística sin base (plan de auditoría de menús, fase 5): lo que viaja a la pantalla, los tipos de movimiento,
 * «Por agotarse» (D7) y el buscador del inventario. Las consultas y los cambios viven en `logistica.ts`.
 */

export type TipoDeMovimiento = "in" | "out" | "devolucion";

export const TIPOS_DE_MOVIMIENTO: ReadonlyArray<{ clave: TipoDeMovimiento; nombre: string }> = [
  { clave: "in", nombre: "Resurtido" },
  { clave: "out", nombre: "Entrega" },
  { clave: "devolucion", nombre: "Devolución" }
];

export function esTipoDeMovimiento(valor: unknown): valor is TipoDeMovimiento {
  return typeof valor === "string" && TIPOS_DE_MOVIMIENTO.some((t) => t.clave === valor);
}

export function nombreDeMovimiento(clave: string): string {
  return TIPOS_DE_MOVIMIENTO.find((t) => t.clave === clave)?.nombre ?? clave;
}

/** Lo que no se ve de otra estructura se dice así, sumado y sin nombres (P1). */
export const OTRAS_ESTRUCTURAS = "Otras estructuras";

/** Por agotarse (D7): con un mínimo puesto, las existencias llegaron a él o bajaron de él. */
export function estaPorAgotarse(articulo: { existencias: number; minimo: number | null }): boolean {
  return articulo.minimo !== null && articulo.existencias <= articulo.minimo;
}

export type ArticuloDeLogistica = {
  id: string;
  nombre: string;
  clave: string;
  categoria: string;
  descripcion: string | null;
  imagen: string | null;
  existencias: number;
  minimo: number | null;
  archivado: boolean;
  almacenId: string;
  almacen: string;
};

/** Lo que tiene una persona de un artículo: entregas menos devoluciones. `personaId` nulo = «Otras estructuras». */
export type EnManos = { articuloId: string; articulo: string; clave: string; personaId: string | null; persona: string; cantidad: number };

export type MovimientoDeLogistica = {
  id: string;
  fecha: string;
  tipo: string;
  cantidad: number;
  articulo: string;
  /** Quién recibe o regresa; recortado al alcance (P1). */
  responsable: string | null;
  /** Quién lo registró; recortado igual. */
  registro: string | null;
  notas: string | null;
};

export type ResumenDeLogistica = { piezas: number; tipos: number; porAgotarse: number; entregadas30: number };

export const MOVIMIENTOS_POR_PAGINA = 20;

/** Sin acentos y en minúsculas, para buscar «camion» y encontrar «Camión». */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export type FiltroDeInventario = { texto: string; almacen: string | null; categoria: string | null; porAgotarse: boolean; archivados: boolean };

/** El buscador del inventario: nombre, clave o categoría, sin acentos; más los chips. */
export function filtrarArticulos(articulos: ArticuloDeLogistica[], f: FiltroDeInventario): ArticuloDeLogistica[] {
  const texto = normalizar(f.texto);
  return articulos.filter(
    (a) =>
      a.archivado === f.archivados &&
      (!f.almacen || a.almacenId === f.almacen) &&
      (!f.categoria || a.categoria === f.categoria) &&
      (!f.porAgotarse || estaPorAgotarse(a)) &&
      (!texto || [a.nombre, a.clave, a.categoria].some((campo) => normalizar(campo).includes(texto)))
  );
}
