/**
 * Importar ciudadanos desde un Excel: lo que no toca la base. Lo usan la pantalla (`/crm/importar`, que lee
 * el archivo en el navegador) y el servidor (`importar-ciudadanos-servicio.ts`, que vuelve a validar todo).
 *
 * Decisiones del dueño (2026-11-21): importa solo administración; cada renglón trae nombre, teléfono y
 * domicilio; los repetidos y los renglones con error se reportan y no se guardan; quien no trae sección ni
 * ubicación se busca después por su domicilio.
 */

/** Más renglones que esto se piden en dos archivos: la revisión los compara todos contra el padrón. */
export const TOPE_DE_RENGLONES = 2000;
/** El tamaño del archivo, antes de abrirlo. */
export const TOPE_DE_BYTES = 5 * 1024 * 1024;
/** Cuántos se guardan por envío: un corte de señal a media importación pierde a lo más una tanda. */
export const RENGLONES_POR_TANDA = 100;
/** Cuántos se buscan por domicilio en cada envío (uno cada `ESPERA_ENTRE_BUSQUEDAS_MS`). */
export const UBICACIONES_POR_ENVIO = 5;
/**
 * OpenStreetMap acepta como mucho una consulta por segundo, y el buscador de domicilios de las brigadas sale
 * por la misma dirección del servidor: la importación va más despacio para dejarles lugar.
 */
export const ESPERA_ENTRE_BUSQUEDAS_MS = 1500;
/** Cuántos domicilios puede buscar una misma persona por hora. */
export const UBICACIONES_POR_HORA = 300;

export type CampoImportable =
  | "nombreCompleto"
  | "nombre"
  | "apellidoPaterno"
  | "apellidoMaterno"
  | "telefono"
  | "correo"
  | "calle"
  | "numero"
  | "colonia"
  | "municipio"
  | "seccion"
  | "latitud"
  | "longitud"
  | "coordenadas"
  | "nacimiento"
  | "nota";

type Columna = { campo: CampoImportable; etiqueta: string; encabezados: readonly string[] };

/**
 * Las columnas que se reconocen y cómo se pueden llamar en el Excel. Se comparan sin acentos, sin mayúsculas y
 * sin signos («Teléfono», «TELEFONO» y «teléfono:» son lo mismo). El orden de la lista es el de la plantilla.
 */
export const COLUMNAS: readonly Columna[] = [
  { campo: "nombre", etiqueta: "Nombre", encabezados: ["nombre", "nombres", "nombre s"] },
  { campo: "apellidoPaterno", etiqueta: "Apellido paterno", encabezados: ["apellido paterno", "primer apellido", "paterno", "apellido"] },
  { campo: "apellidoMaterno", etiqueta: "Apellido materno", encabezados: ["apellido materno", "segundo apellido", "materno"] },
  { campo: "nombreCompleto", etiqueta: "Nombre completo", encabezados: ["nombre completo", "nombre y apellidos", "nombre del ciudadano", "ciudadano"] },
  { campo: "telefono", etiqueta: "Teléfono", encabezados: ["telefono", "celular", "whatsapp", "tel", "cel", "movil", "telefono celular", "numero de telefono", "numero de celular"] },
  { campo: "correo", etiqueta: "Correo", encabezados: ["correo", "correo electronico", "email", "e mail", "mail"] },
  { campo: "calle", etiqueta: "Calle", encabezados: ["calle", "domicilio", "direccion", "calle y numero"] },
  // Sin «No.» ni «Núm.» a secas: en muchas listas es el número consecutivo (1, 2, 3…), no el de la casa.
  { campo: "numero", etiqueta: "Número", encabezados: ["numero", "numero exterior", "num ext", "no ext", "no exterior", "exterior", "numero de casa"] },
  { campo: "colonia", etiqueta: "Colonia", encabezados: ["colonia", "col", "fraccionamiento", "barrio"] },
  { campo: "municipio", etiqueta: "Municipio", encabezados: ["municipio", "mpio"] },
  { campo: "seccion", etiqueta: "Sección", encabezados: ["seccion", "seccion electoral", "secc", "sec"] },
  { campo: "latitud", etiqueta: "Latitud", encabezados: ["latitud", "lat"] },
  { campo: "longitud", etiqueta: "Longitud", encabezados: ["longitud", "lng", "lon", "long"] },
  { campo: "coordenadas", etiqueta: "Coordenadas", encabezados: ["coordenadas", "ubicacion gps", "gps"] },
  { campo: "nacimiento", etiqueta: "Fecha de nacimiento", encabezados: ["fecha de nacimiento", "nacimiento", "fecha nacimiento", "cumpleanos"] },
  { campo: "nota", etiqueta: "Nota", encabezados: ["nota", "notas", "observaciones", "comentarios"] }
];

export const ETIQUETA_DE_CAMPO: Record<CampoImportable, string> = Object.fromEntries(COLUMNAS.map((c) => [c.campo, c.etiqueta])) as Record<
  CampoImportable,
  string
>;

/** Los títulos de la plantilla para descargar, en el orden en que se piden. */
export const TITULOS_DE_LA_PLANTILLA = [
  "Nombre",
  "Apellido paterno",
  "Apellido materno",
  "Teléfono",
  "Calle",
  "Número",
  "Colonia",
  "Municipio",
  "Sección",
  "Correo",
  "Fecha de nacimiento",
  "Latitud",
  "Longitud",
  "Nota"
] as const;

/** Lo que trae un renglón: siempre texto, ya recortado. Lo que no vino no está. */
export type DatosDelRenglon = { [Campo in CampoImportable]?: string | undefined };

export type RenglonDelArchivo = {
  /** El número de renglón como lo ve quien abre el Excel (el de los títulos es el 1, o el que sea). */
  renglon: number;
  datos: DatosDelRenglon;
};

export type LecturaDelArchivo =
  | { ok: true; renglones: RenglonDelArchivo[]; reconocidas: CampoImportable[]; ignoradas: string[] }
  | { ok: false; error: string };

const MAXIMO_POR_CAMPO = 300;

export function normalizarEncabezado(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const CAMPO_POR_ENCABEZADO = new Map<string, CampoImportable>(COLUMNAS.flatMap((c) => c.encabezados.map((e) => [e, c.campo] as const)));

/** Una celda como texto. Las fechas, como AAAA-MM-DD (el día que dice la celda, sin zona horaria). */
export function textoDeCelda(valor: unknown): string {
  if (valor === null || valor === undefined || typeof valor === "boolean") return "";
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return "";
    const dos = (n: number) => String(n).padStart(2, "0");
    return `${valor.getUTCFullYear()}-${dos(valor.getUTCMonth() + 1)}-${dos(valor.getUTCDate())}`;
  }
  if (typeof valor === "number") return Number.isFinite(valor) ? String(valor) : "";
  return typeof valor === "string" ? valor.replace(/\s+/g, " ").trim() : "";
}

/** Las columnas de un renglón de títulos: a qué campo va cada una, y las que no se usan. */
export function emparejarEncabezados(titulos: readonly unknown[]): { columnas: Map<number, CampoImportable>; ignoradas: string[] } {
  const columnas = new Map<number, CampoImportable>();
  const usados = new Set<CampoImportable>();
  const ignoradas: string[] = [];
  titulos.forEach((titulo, indice) => {
    const texto = textoDeCelda(titulo);
    if (!texto) return;
    const campo = CAMPO_POR_ENCABEZADO.get(normalizarEncabezado(texto));
    // Dos columnas para lo mismo («Teléfono» y «Celular»): manda la primera; la otra se dice como no usada.
    if (!campo || usados.has(campo)) {
      ignoradas.push(texto);
      return;
    }
    usados.add(campo);
    columnas.set(indice, campo);
  });
  return { columnas, ignoradas };
}

/**
 * Los renglones de la hoja, ya con su campo. Los títulos son el renglón (de los primeros diez) que más columnas
 * conocidas tiene: hay listas que arriba llevan el nombre del evento o la fecha.
 */
export function leerRenglones(hoja: readonly (readonly unknown[])[]): LecturaDelArchivo {
  let mejor = { fila: -1, conocidas: 0 };
  hoja.slice(0, 10).forEach((fila, i) => {
    const conocidas = emparejarEncabezados(fila).columnas.size;
    if (conocidas > mejor.conocidas) mejor = { fila: i, conocidas };
  });
  if (mejor.fila < 0) {
    return { ok: false, error: "No encontramos los títulos de las columnas. La primera fila debe decir Nombre, Teléfono, Calle…" };
  }

  const { columnas, ignoradas } = emparejarEncabezados(hoja[mejor.fila] ?? []);
  const campos = new Set(columnas.values());
  const faltan: string[] = [];
  if (!campos.has("nombre") && !campos.has("nombreCompleto")) faltan.push("Nombre");
  if (!campos.has("telefono")) faltan.push("Teléfono");
  if (!campos.has("calle")) faltan.push("Calle");
  if (faltan.length > 0) {
    const lista = faltan.map((f) => `«${f}»`).join(", ");
    return { ok: false, error: `Al archivo le falta${faltan.length > 1 ? "n las columnas" : " la columna"} ${lista}. Revisa los títulos de la primera fila.` };
  }

  const renglones: RenglonDelArchivo[] = [];
  for (let i = mejor.fila + 1; i < hoja.length; i++) {
    const fila = hoja[i] ?? [];
    const datos: DatosDelRenglon = {};
    for (const [indice, campo] of columnas) {
      const texto = textoDeCelda(fila[indice]).slice(0, MAXIMO_POR_CAMPO);
      if (texto) datos[campo] = texto;
    }
    // Un renglón vacío (o con solo espacios) no es una persona: se salta sin contarlo como error.
    if (Object.keys(datos).length === 0) continue;
    renglones.push({ renglon: i + 1, datos });
  }

  if (renglones.length === 0) return { ok: false, error: "El archivo tiene los títulos, pero ninguna persona debajo." };
  if (renglones.length > TOPE_DE_RENGLONES) {
    return {
      ok: false,
      error: `El archivo tiene ${renglones.length.toLocaleString("es-MX")} personas y se pueden importar hasta ${TOPE_DE_RENGLONES.toLocaleString("es-MX")} a la vez. Divídelo en varios archivos.`
    };
  }
  return { ok: true, renglones, reconocidas: [...campos], ignoradas };
}

/**
 * El teléfono en sus diez dígitos, o `null` si no lo es. «+52 33 1234 5678», «52 1 33…» y «(33) 1234-5678» dan
 * lo mismo: así la huella de repetidos encuentra a la misma persona escriba como escriba el número.
 */
export function telefonoDeDiezDigitos(texto: string | null | undefined): string | null {
  let d = (texto ?? "").replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("521")) d = d.slice(3);
  else if (d.length === 12 && d.startsWith("52")) d = d.slice(2);
  return d.length === 10 ? d : null;
}

/** El nombre completo como se guarda (y se busca) en el Directorio. */
export function nombreDelRenglon(d: DatosDelRenglon): { firstName: string; lastName: string; maternalLastName: string; displayName: string } {
  const firstName = d.nombre?.trim() ?? "";
  const lastName = d.apellidoPaterno?.trim() ?? "";
  const maternalLastName = d.apellidoMaterno?.trim() ?? "";
  const partes = [firstName, lastName, maternalLastName].filter(Boolean).join(" ");
  return { firstName, lastName, maternalLastName, displayName: partes || (d.nombreCompleto?.trim() ?? "") };
}

/** Un número del Excel, con punto o con coma decimal. */
export function numeroDelExcel(texto: string | undefined): number | null {
  if (!texto) return null;
  const limpio = texto.trim().replace(/\s/g, "");
  const conPunto = limpio.includes(".") ? limpio.replace(/,/g, "") : limpio.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(conPunto)) return null;
  const n = Number(conPunto);
  return Number.isFinite(n) ? n : null;
}

/**
 * Latitud y longitud de un renglón: de sus dos columnas o de una sola («20.62, -103.24»). `null` si no trae;
 * `"invalida"` si trae algo que no se entiende.
 */
export function coordenadasDelRenglon(d: DatosDelRenglon): { lat: number; lng: number } | null | "invalida" {
  let lat: number | null;
  let lng: number | null;
  if (d.latitud || d.longitud) {
    lat = numeroDelExcel(d.latitud);
    lng = numeroDelExcel(d.longitud);
  } else if (d.coordenadas) {
    const partes = d.coordenadas.split(/[,;]\s*|\s+/).filter(Boolean);
    if (partes.length !== 2) return "invalida";
    lat = numeroDelExcel(partes[0]);
    lng = numeroDelExcel(partes[1]);
  } else {
    return null;
  }
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return "invalida";
  return { lat, lng };
}

/** El número de sección, si es un entero positivo. */
export function seccionDelRenglon(texto: string | undefined): number | null | "invalida" {
  if (!texto) return null;
  const n = numeroDelExcel(texto.replace(/^secci[oó]n\s*/i, ""));
  return n !== null && Number.isInteger(n) && n > 0 ? n : "invalida";
}

/**
 * La fecha de nacimiento: AAAA-MM-DD (una celda con formato de fecha llega así), día/mes/año con «/», «-» o
 * «.», o el número de serie de Excel (una fecha sin formato). Año de dos cifras: el siglo que la hace pasada.
 * Un año solo no alcanza: el alta pide día y mes.
 */
export function fechaDelRenglon(texto: string | undefined, hoy = new Date()): { dia: number; mes: number; anio: number } | null | "invalida" {
  if (!texto) return null;
  const t = texto.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return validarFecha(Number(m[3]), Number(m[2]), Number(m[1]), hoy);
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(t);
  if (m) {
    let anio = Number(m[3]);
    if (m[3]!.length === 2) anio += anio > hoy.getFullYear() % 100 ? 1900 : 2000;
    return validarFecha(Number(m[1]), Number(m[2]), anio, hoy);
  }
  // Cinco cifras, del 18 de mayo de 1927 en adelante. Cuatro cifras sueltas («1985») son un año, no una fecha.
  if (/^\d{5}$/.test(t)) {
    // Días desde el 30 de diciembre de 1899 (así cuenta Excel).
    const fecha = new Date(Date.UTC(1899, 11, 30) + Number(t) * 86_400_000);
    return validarFecha(fecha.getUTCDate(), fecha.getUTCMonth() + 1, fecha.getUTCFullYear(), hoy);
  }
  return "invalida";
}

function validarFecha(dia: number, mes: number, anio: number, hoy: Date): { dia: number; mes: number; anio: number } | "invalida" {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const existe = fecha.getUTCDate() === dia && fecha.getUTCMonth() === mes - 1 && fecha.getUTCFullYear() === anio;
  return existe && anio >= 1900 && fecha.getTime() <= hoy.getTime() ? { dia, mes, anio } : "invalida";
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const esCorreo = (texto: string): boolean => texto.length <= 160 && CORREO.test(texto);

/**
 * El mismo teléfono dos veces en el archivo: del segundo en adelante, el renglón donde apareció primero. Se
 * usa en la pantalla y en el servidor, para que digan lo mismo.
 */
export function repetidosEnElArchivo(renglones: readonly RenglonDelArchivo[]): Map<number, number> {
  const primero = new Map<string, number>();
  const repetidos = new Map<number, number>();
  for (const r of renglones) {
    const tel = telefonoDeDiezDigitos(r.datos.telefono);
    if (!tel) continue;
    const antes = primero.get(tel);
    if (antes === undefined) primero.set(tel, r.renglon);
    else repetidos.set(r.renglon, antes);
  }
  return repetidos;
}
