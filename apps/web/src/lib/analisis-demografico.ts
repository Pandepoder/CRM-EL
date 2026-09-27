import { and, count, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { esValorCifrado, schema } from "@tonala/shared/database";

import { inicioDeDia, ZONA_HORARIA } from "@/lib/actividades";
import { condicionDeEquipos } from "@/lib/alcance-municipal";
import { contactIdRestriction, contactosVisibles } from "@/lib/contact-visibility";
import { getDatabaseClient } from "@/lib/db-client";
import type { UserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Análisis demográfico: todo sobre el padrón que quien consulta puede ver (el mismo alcance que el
 * directorio), solo ciudadanos activos. Lo que no está cifrado se cuenta en la base; lo cifrado
 * (disponibilidad, perfil, área, profesión, colonia) llega descifrado por su tipo de columna y se agrupa
 * aquí. Un valor que no se pudo descifrar no se cuenta: saldría como texto cifrado en la gráfica.
 *
 * Los días y las horas son los de Jalisco (`ZONA_HORARIA`), no los del servidor.
 */

export type Conteo = { clave: string; etiqueta: string; total: number };

export type EquipoEnAnalisis = {
  id: string;
  nombre: string;
  municipio: string;
  integrantes: number;
  ciudadanos: number;
  nuevos30: number;
};

export type AnalisisDemografico = {
  /** Instante del cálculo, ISO. */
  generadoEn: string;
  totales: {
    ciudadanos: number;
    /** Registrados en los últimos 30 días (hoy incluido) y en los 30 anteriores. */
    nuevos30: number;
    nuevosPrevios30: number;
    coloniasCubiertas: number;
    seccionesConPresencia: number;
    municipios: number;
    confirmados: number;
    voluntarios: number;
    conEdad: number;
    edadPromedio: number | null;
    encuestas: number;
    calificacionPromedio: number | null;
    /** La escala de la calificación de servicios: el formulario pide de 1 a 5; datos más viejos, de 1 a 10. */
    escalaCalificacion: 5 | 10;
  };
  /** Un punto por día de Jalisco, del primero con registros (a lo más dos años atrás) a hoy, con ceros. */
  crecimiento: { dia: string; nuevos: number }[];
  /** Registrados antes del primer día de `crecimiento`: el punto de partida del acumulado. */
  previosAlCrecimiento: number;
  edades: Conteo[];
  origen: Conteo[];
  militancia: Conteo[];
  canal: Conteo[];
  horario: Conteo[];
  disponibilidad: Conteo[];
  perfiles: Conteo[];
  areas: Conteo[];
  profesiones: Conteo[];
  colonias: Conteo[];
  municipios: Conteo[];
  necesidades: Conteo[];
  expectativas: Conteo[];
  participacion: Conteo[];
  calificaciones: { valor: number; total: number }[];
  /** [día de la semana: 0 = lunes … 6 = domingo][hora 0-23], en hora de Jalisco. */
  calor: number[][];
  equipos: EquipoEnAnalisis[];
};

export const ETIQUETAS_ORIGEN: Record<string, string> = {
  toca_toca: "Toca a toca",
  enlace_personal: "Enlace personal (QR)",
  recomendacion: "Recomendación",
  evento: "Evento",
  visita: "Visita",
  otro: "Otro"
};

export const ETIQUETAS_MILITANCIA: Record<string, string> = {
  no_registrada: "No registrada",
  simpatizante: "Simpatizante",
  declarada: "Declarada",
  pendiente: "Por validar",
  confirmada: "Confirmada"
};
/** De menos a más compromiso: el orden del embudo. */
export const ORDEN_MILITANCIA = ["no_registrada", "simpatizante", "declarada", "pendiente", "confirmada"];

export const ETIQUETAS_CANAL: Record<string, string> = {
  whatsapp: "WhatsApp",
  llamada: "Llamada",
  visita: "Visita",
  otro: "Otro"
};

export const ETIQUETAS_HORARIO: Record<string, string> = {
  indiferente: "Cualquier hora",
  manana: "Mañana",
  // Registros más viejos lo guardaron con ñ.
  "mañana": "Mañana",
  tarde: "Tarde",
  noche: "Noche"
};
export const ORDEN_HORARIO = ["manana", "mañana", "tarde", "noche", "indiferente"];

export const RANGOS_DE_EDAD = [
  // Etiquetas cortas: siete columnas caben en un teléfono de 375 px sin encimarse.
  { clave: "menos-18", etiqueta: "<18", desde: 0, hasta: 17 },
  { clave: "18-24", etiqueta: "18–24", desde: 18, hasta: 24 },
  { clave: "25-34", etiqueta: "25–34", desde: 25, hasta: 34 },
  { clave: "35-44", etiqueta: "35–44", desde: 35, hasta: 44 },
  { clave: "45-54", etiqueta: "45–54", desde: 45, hasta: 54 },
  { clave: "55-64", etiqueta: "55–64", desde: 55, hasta: 64 },
  { clave: "65+", etiqueta: "65+", desde: 65, hasta: 120 }
] as const;

/** Lo que se descifró o se escribió a mano: mismo texto sin importar mayúsculas, acentos ni espacios. */
function claveDeTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Agrupa textos libres (cada uno con su peso: 1, o el conteo que ya trae de la base); la etiqueta es la
 * forma más usada de cada uno.
 */
function agrupar(textos: Iterable<string | null | undefined | readonly [string | null, number]>, tope?: number): Conteo[] {
  const grupos = new Map<string, { total: number; formas: Map<string, number> }>();
  for (const elemento of textos) {
    const [bruto, peso] = Array.isArray(elemento) ? elemento : [elemento as string | null | undefined, 1];
    const texto = (bruto ?? "").replace(/\s+/g, " ").trim();
    if (!texto || peso <= 0) continue;
    const clave = claveDeTexto(texto);
    const g = grupos.get(clave) ?? { total: 0, formas: new Map<string, number>() };
    g.total += peso;
    g.formas.set(texto, (g.formas.get(texto) ?? 0) + peso);
    grupos.set(clave, g);
  }
  const lista = [...grupos.entries()]
    .map(([clave, g]) => ({ clave, etiqueta: [...g.formas.entries()].sort((a, b) => b[1] - a[1])[0]![0], total: g.total }))
    .sort((a, b) => b.total - a.total || a.etiqueta.localeCompare(b.etiqueta, "es"));
  return tope ? lista.slice(0, tope) : lista;
}

/** Conteos de un campo de opciones, con su etiqueta; dos claves con la misma etiqueta suman en una. */
function conEtiquetas(filas: { clave: string | null; total: number }[], etiquetas: Record<string, string>, orden?: string[]): Conteo[] {
  const porEtiqueta = new Map<string, Conteo>();
  for (const f of filas) {
    if (!f.clave) continue;
    const etiqueta = etiquetas[f.clave] ?? f.clave;
    const previo = porEtiqueta.get(etiqueta);
    if (previo) previo.total += Number(f.total);
    else porEtiqueta.set(etiqueta, { clave: f.clave, etiqueta, total: Number(f.total) });
  }
  const lista = [...porEtiqueta.values()];
  if (orden) return lista.sort((a, b) => (orden.indexOf(a.clave) + 1 || 99) - (orden.indexOf(b.clave) + 1 || 99));
  return lista.sort((a, b) => b.total - a.total);
}

/** El texto descifrado, o nada si sigue cifrado (otra llave) o viene vacío. */
const legible = (valor: string | null) => (valor && !esValorCifrado(valor) ? valor : null);

/** Días de Jalisco como texto AAAA-MM-DD, del instante dado. */
function diaDeJalisco(instante: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA, year: "numeric", month: "2-digit", day: "2-digit" }).format(instante);
}

const DIAS_MAXIMOS_DE_CRECIMIENTO = 730;

export async function analisisDemografico(scope: UserNetworkScope, opciones: { ahora?: Date } = {}): Promise<AnalisisDemografico> {
  const db = getDatabaseClient();
  const ahora = opciones.ahora ?? new Date();
  const c = schema.contacts;
  const base = and(eq(c.status, "active"), contactIdRestriction(await contactosVisibles(scope))) as SQL;
  const inicio30 = inicioDeDia(ahora, -29);
  const inicio60 = inicioDeDia(ahora, -59);
  const diaLocal = sql`((${c.createdAt} AT TIME ZONE ${ZONA_HORARIA})::date)`;
  const agrupado = (columna: AnyPgColumn) =>
    db.select({ clave: sql<string | null>`${columna}`, total: count() }).from(c).where(base).groupBy(columna);

  const [
    [totales],
    porDia,
    edades,
    origen,
    militancia,
    canal,
    horario,
    calor,
    porMunicipio,
    cifrados
  ] = await Promise.all([
    db
      .select({
        ciudadanos: count(),
        nuevos30: sql<number>`count(*) filter (where ${c.createdAt} >= ${inicio30})`.mapWith(Number),
        nuevosPrevios30: sql<number>`count(*) filter (where ${c.createdAt} >= ${inicio60} and ${c.createdAt} < ${inicio30})`.mapWith(Number),
        secciones: sql<number>`count(distinct ${c.sectionId})`.mapWith(Number),
        municipios: sql<number>`count(distinct ${c.municipalityId})`.mapWith(Number),
        confirmados: sql<number>`count(*) filter (where ${c.panMilitancy} = 'confirmada')`.mapWith(Number)
      })
      .from(c)
      .where(base),
    db
      .select({ dia: sql<string>`to_char(${diaLocal}, 'YYYY-MM-DD')`, total: count() })
      .from(c)
      .where(base)
      // Por posición: la misma expresión con sus parámetros repetidos no la reconoce Postgres como el grupo.
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    // Edad cumplida hoy en Jalisco. El nacimiento se guarda a medianoche UTC; sin el año capturado
    // (birth_year_known = false) no hay edad.
    (() => {
      const edad = sql`date_part('year', age((${ahora.toISOString()}::timestamptz AT TIME ZONE ${ZONA_HORARIA})::date, (${c.birthDate} AT TIME ZONE 'UTC')::date))::int`;
      return db
        .select({ edad: sql<number>`${edad}`.mapWith(Number), total: count() })
        .from(c)
        .where(and(base, eq(c.birthYearKnown, true), sql`${c.birthDate} IS NOT NULL`))
        .groupBy(sql`1`);
    })(),
    agrupado(c.origin),
    agrupado(c.panMilitancy),
    agrupado(c.preferredContactMethod),
    agrupado(c.preferredContactTime),
    (() => {
      const dia = sql`(extract(isodow from ${c.createdAt} AT TIME ZONE ${ZONA_HORARIA})::int - 1)`;
      const hora = sql`extract(hour from ${c.createdAt} AT TIME ZONE ${ZONA_HORARIA})::int`;
      return db
        .select({ dia: sql<number>`${dia}`.mapWith(Number), hora: sql<number>`${hora}`.mapWith(Number), total: count() })
        .from(c)
        .where(base)
        .groupBy(sql`1`, sql`2`);
    })(),
    db
      .select({ clave: schema.municipalities.name, total: count() })
      .from(c)
      .innerJoin(schema.municipalities, eq(schema.municipalities.id, c.municipalityId))
      .where(base)
      .groupBy(schema.municipalities.name),
    db
      .select({
        disponibilidad: c.availability,
        perfil: c.skill,
        area: c.interests,
        profesion: c.profession,
        colonia: c.colony,
        municipio: schema.municipalities.name
      })
      .from(c)
      .innerJoin(schema.municipalities, eq(schema.municipalities.id, c.municipalityId))
      .where(base)
  ]);

  const s = schema.socialSurveys;
  const deEncuesta = (columna: AnyPgColumn) =>
    db
      .select({ clave: sql<string | null>`${columna}`, total: count() })
      .from(s)
      .innerJoin(c, eq(c.id, s.contactId))
      .where(base)
      .groupBy(columna);
  const [necesidades, expectativas, participacion, calificaciones] = await Promise.all([
    deEncuesta(s.colonyPriorityNeed),
    deEncuesta(s.projectExpectations),
    deEncuesta(s.participationForm),
    db
      .select({ valor: s.servicesRating, total: count() })
      .from(s)
      .innerJoin(c, eq(c.id, s.contactId))
      .where(and(base, sql`${s.servicesRating} IS NOT NULL`))
      .groupBy(s.servicesRating)
      .orderBy(s.servicesRating)
  ]);

  // Lo cifrado se agrupa aquí. La colonia va con su municipio: «Centro» hay en decenas.
  const descifrados = cifrados.map((f) => ({
    disponibilidad: legible(f.disponibilidad),
    perfil: legible(f.perfil),
    area: legible(f.area),
    profesion: legible(f.profesion),
    colonia: legible(f.colonia),
    municipio: f.municipio
  }));
  const colonias = agrupar(descifrados.map((d) => (d.colonia ? `${d.colonia.trim()} · ${d.municipio}` : null)));
  const disponibilidad = agrupar(descifrados.map((d) => d.disponibilidad));

  // Edades: rangos, promedio y quienes quedaron fuera por una fecha imposible.
  const edadesValidas = edades.filter((e) => e.edad >= 0 && e.edad <= 120);
  const conEdad = edadesValidas.reduce((n, e) => n + e.total, 0);
  const sumaDeEdades = edadesValidas.reduce((n, e) => n + e.edad * e.total, 0);
  const rangos = RANGOS_DE_EDAD.map((r) => ({
    clave: r.clave,
    etiqueta: r.etiqueta,
    total: edadesValidas.filter((e) => e.edad >= r.desde && e.edad <= r.hasta).reduce((n, e) => n + e.total, 0)
  })).filter((r) => r.clave !== "menos-18" || r.total > 0);

  // Crecimiento: días de Jalisco con ceros, a lo más dos años.
  const hoy = diaDeJalisco(ahora);
  const porDiaMapa = new Map(porDia.map((d) => [d.dia, Number(d.total)]));
  const primerDia = porDia[0]?.dia ?? hoy;
  const limite = diaDeJalisco(inicioDeDia(ahora, -(DIAS_MAXIMOS_DE_CRECIMIENTO - 1)));
  const desde = primerDia > limite ? primerDia : limite;
  const crecimiento: { dia: string; nuevos: number }[] = [];
  for (let d = new Date(`${desde}T12:00:00Z`); diaDeJalisco(d) <= hoy; d = new Date(d.getTime() + 86_400_000)) {
    const dia = d.toISOString().slice(0, 10);
    crecimiento.push({ dia, nuevos: porDiaMapa.get(dia) ?? 0 });
    if (dia === hoy) break;
  }
  const previosAlCrecimiento = porDia.filter((d) => d.dia < desde).reduce((n, d) => n + Number(d.total), 0);

  const matriz = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const x of calor) if (x.dia >= 0 && x.dia < 7 && x.hora >= 0 && x.hora < 24) matriz[x.dia]![x.hora] = Number(x.total);

  const totalCalificaciones = calificaciones.reduce((n, x) => n + Number(x.total), 0);
  const sumaCalificaciones = calificaciones.reduce((n, x) => n + Number(x.valor) * Number(x.total), 0);
  const escala: 5 | 10 = calificaciones.some((x) => Number(x.valor) > 5) ? 10 : 5;

  const t = totales!;
  return {
    generadoEn: ahora.toISOString(),
    totales: {
      ciudadanos: Number(t.ciudadanos),
      nuevos30: t.nuevos30,
      nuevosPrevios30: t.nuevosPrevios30,
      coloniasCubiertas: colonias.length,
      seccionesConPresencia: t.secciones,
      municipios: t.municipios,
      confirmados: t.confirmados,
      voluntarios: disponibilidad.filter((d) => /voluntari/i.test(d.clave)).reduce((n, d) => n + d.total, 0),
      conEdad,
      edadPromedio: conEdad ? Math.round((sumaDeEdades / conEdad) * 10) / 10 : null,
      encuestas: necesidades.reduce((n, x) => n + Number(x.total), 0),
      calificacionPromedio: totalCalificaciones ? Math.round((sumaCalificaciones / totalCalificaciones) * 10) / 10 : null,
      escalaCalificacion: escala
    },
    crecimiento,
    previosAlCrecimiento,
    edades: rangos,
    origen: conEtiquetas(origen, ETIQUETAS_ORIGEN),
    militancia: conEtiquetas(militancia, ETIQUETAS_MILITANCIA, ORDEN_MILITANCIA),
    canal: conEtiquetas(canal, ETIQUETAS_CANAL),
    horario: conEtiquetas(horario, ETIQUETAS_HORARIO, ORDEN_HORARIO),
    disponibilidad,
    perfiles: agrupar(descifrados.map((d) => d.perfil), 10),
    areas: agrupar(descifrados.map((d) => d.area), 10),
    profesiones: agrupar(descifrados.map((d) => d.profesion), 10),
    colonias: colonias.slice(0, 10),
    municipios: porMunicipio
      .map((m) => ({ clave: m.clave, etiqueta: m.clave, total: Number(m.total) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    necesidades: agrupar(necesidades.map((x) => [x.clave, Number(x.total)] as const), 10),
    expectativas: agrupar(expectativas.map((x) => [x.clave, Number(x.total)] as const), 8),
    participacion: agrupar(participacion.map((x) => [x.clave, Number(x.total)] as const), 8),
    calificaciones: calificaciones.map((x) => ({ valor: Number(x.valor), total: Number(x.total) })),
    calor: matriz,
    equipos: await equiposEnAnalisis(scope, base, inicio30)
  };
}

/**
 * Ciudadanos registrados por la gente de cada equipo (líder e integrantes), dentro del mismo alcance.
 * Una persona que está en dos equipos suma en los dos.
 */
async function equiposEnAnalisis(scope: UserNetworkScope, base: SQL, inicio30: Date): Promise<EquipoEnAnalisis[]> {
  const db = getDatabaseClient();
  const equipos = await db
    .select({ id: schema.teams.id, nombre: schema.teams.name, lider: schema.teams.leaderId, municipio: schema.municipalities.name })
    .from(schema.teams)
    .innerJoin(schema.municipalities, eq(schema.municipalities.id, schema.teams.municipalityId))
    .where(condicionDeEquipos(scope));
  if (equipos.length === 0) return [];
  const [integrantes, porAutor] = await Promise.all([
    db
      .select({ equipo: schema.teamMembers.teamId, persona: schema.teamMembers.userId })
      .from(schema.teamMembers)
      .where(inArray(schema.teamMembers.teamId, equipos.map((e) => e.id))),
    db
      .select({
        autor: schema.contacts.createdByUserId,
        total: count(),
        nuevos30: sql<number>`count(*) filter (where ${schema.contacts.createdAt} >= ${inicio30})`.mapWith(Number)
      })
      .from(schema.contacts)
      .where(base)
      .groupBy(schema.contacts.createdByUserId)
  ]);
  const deAutor = new Map(porAutor.map((a) => [a.autor, a]));
  return equipos
    .map((e) => {
      const gente = new Set([e.lider, ...integrantes.filter((i) => i.equipo === e.id).map((i) => i.persona)]);
      let ciudadanos = 0;
      let nuevos30 = 0;
      for (const p of gente) {
        ciudadanos += Number(deAutor.get(p)?.total ?? 0);
        nuevos30 += deAutor.get(p)?.nuevos30 ?? 0;
      }
      return { id: e.id, nombre: e.nombre, municipio: e.municipio, integrantes: gente.size, ciudadanos, nuevos30 };
    })
    .sort((a, b) => b.ciudadanos - a.ciudadanos || a.nombre.localeCompare(b.nombre, "es"));
}
