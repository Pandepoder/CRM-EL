"use client";

/**
 * Avisos dentro de la página en vez de `alert()` (L12). La ventana gris del navegador tapaba todo, no se
 * podía leer con calma y en el teléfono parecía un error del sistema. Ahora el mensaje sale abajo, con
 * color (rojo si algo falló, verde si salió bien) y se puede cerrar.
 *
 * Los muestra la capa del panel (`CapaDeAvisos`, montada en `ShellWrapper`). Donde no está montada —páginas públicas, o una
 * pantalla que se abre fuera del panel— se usa el `alert()` de siempre: un aviso nunca se pierde.
 */
export type TipoDeAviso = "error" | "exito" | "info";
export type Aviso = {
  texto: string;
  tipo: TipoDeAviso;
  /** Un botón en el aviso que lleva a otra pantalla («Ver respuesta»). */
  accion?: { etiqueta: string; href: string } | undefined;
  /** Milisegundos en pantalla, o `null` para que se quede hasta que lo cierren. Sin dato, según el tipo. */
  duracion?: number | null | undefined;
};

export const EVENTO_AVISO = "panel:aviso";

let capasEscuchando = 0;

/** La capa se anota al montarse; devuelve con qué desanotarse. */
export function anotarCapaDeAvisos(): () => void {
  capasEscuchando++;
  return () => {
    capasEscuchando = Math.max(0, capasEscuchando - 1);
  };
}

export function avisar(texto: string, tipo: TipoDeAviso = "error", opciones: Pick<Aviso, "accion" | "duracion"> = {}): void {
  if (typeof window === "undefined") return;
  if (capasEscuchando === 0) {
    window.alert(texto);
    return;
  }
  window.dispatchEvent(new CustomEvent<Aviso>(EVENTO_AVISO, { detail: { texto, tipo, ...opciones } }));
}
