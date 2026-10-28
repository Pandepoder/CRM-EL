import { sinAcentos, TODO_JALISCO } from "@/lib/municipios-jalisco";

/**
 * Las secciones del municipio elegido en el alta (plan de experiencia sencilla, F8). La lista traía las de
 * todo Jalisco, era fácil elegir una de otro municipio y el servidor la rechazaba al guardar.
 *
 * Sin acentos ni mayúsculas: el catálogo dice «Tonalá» y algún dato viejo «TONALA». Sin municipio elegido
 * (o con «todo Jalisco») no se filtra, y una sección que no dice su municipio se deja pasar: esconderla
 * sería perder una opción válida.
 */

type ConMunicipio = { municipality?: string | null };
type Seccion = ConMunicipio & { sectionNum: number | string };

export function esDelMunicipio(seccion: ConMunicipio, municipio: string | null | undefined): boolean {
  if (!municipio || municipio === TODO_JALISCO || !seccion.municipality) return true;
  return sinAcentos(String(seccion.municipality)) === sinAcentos(municipio);
}

/** La lista que se ofrece: las del municipio que contienen lo escrito. */
export function seccionesParaElegir<T extends Seccion>(secciones: readonly T[], municipio: string | null | undefined, escrito: string): T[] {
  const numero = escrito.trim();
  return secciones.filter((s) => esDelMunicipio(s, municipio) && (!numero || String(s.sectionNum).includes(numero)));
}

/**
 * Si el número escrito es una sección que existe, pero solo en otro municipio, de cuál es («es de Tonalá,
 * no de Zapopan»). `null` si es del municipio elegido, si no existe o si no hay municipio elegido.
 */
export function municipioDeOtraSeccion(secciones: readonly Seccion[], municipio: string | null | undefined, escrito: string): string | null {
  const numero = escrito.trim();
  if (!numero || !municipio || municipio === TODO_JALISCO) return null;
  const conEseNumero = secciones.filter((s) => String(s.sectionNum) === numero);
  if (conEseNumero.length === 0 || conEseNumero.some((s) => esDelMunicipio(s, municipio))) return null;
  return conEseNumero[0]?.municipality ?? "otro municipio";
}
