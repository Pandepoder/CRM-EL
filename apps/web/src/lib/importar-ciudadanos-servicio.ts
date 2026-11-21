import { and, eq, inArray, isNotNull, isNull, not, sql } from "drizzle-orm";

import { displayNameMaxLength } from "@tonala/modules/contacts/domain";
import type { ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import { registrarCiudadano } from "@/lib/alta-ciudadano";
import { veCiudadano } from "@/lib/contact-visibility";
import { getDatabaseClient } from "@/lib/db-client";
import { esUuid } from "@/lib/ids";
import {
  ESPERA_ENTRE_BUSQUEDAS_MS,
  RENGLONES_POR_TANDA,
  UBICACIONES_POR_HORA,
  coordenadasDelRenglon,
  esCorreo,
  fechaDelRenglon,
  nombreDelRenglon,
  repetidosEnElArchivo,
  seccionDelRenglon,
  telefonoDeDiezDigitos,
  type CampoImportable,
  type RenglonDelArchivo
} from "@/lib/importar-ciudadanos";
import { buscarMunicipio, resolverMunicipio } from "@/lib/municipios-jalisco";
import type { UserNetworkScope } from "@/lib/network-hierarchy";
import { buscarDireccion } from "@/lib/osm-search";
import { checkRateLimit } from "@/lib/rate-limit";
import { registrarError } from "@/lib/registro";
import { ubicarEnSeccion } from "@/lib/sections-geo-cache";
import { ciudadanosConLosTelefonos } from "@/lib/telefono-repetido";

/**
 * Importar ciudadanos desde un Excel (`/crm/importar`). La pantalla lee el archivo y manda los renglones; aquí
 * se revisan (sin guardar nada), se guardan en tandas y, a quien solo trae domicilio, se le busca en el mapa.
 *
 * - **Quién:** solo administración. El maestro importa a cualquier municipio; un administrador municipal, solo
 *   al suyo (un renglón de otro municipio es un error del renglón). Decisión del dueño, 2026-11-21.
 * - **Cada renglón** trae nombre, teléfono (diez dígitos) y calle. Se guarda con el alta de siempre
 *   (`registrarCiudadano`): mismo cifrado, misma huella de teléfono, misma auditoría por persona.
 * - **Repetidos:** el teléfono que ya está en el padrón o dos veces en el archivo no se guarda. Solo se dice de
 *   quién es la ficha si quien importa puede abrirla, como en el alta.
 * - **Ubicación:** con latitud y longitud, en su punto (y la sección sale del punto); con sección, en el centro
 *   de su sección; a todo el que no trae su punto se le busca después el domicilio en OpenStreetMap, despacio
 *   (`ubicarPorDomicilio`).
 * - **Auditoría:** cada revisión y cada tanda guardada, solo con números (nunca nombres ni teléfonos).
 */

export type ContextoDeImportacion = {
  alcance: UserNetworkScope;
  /** El municipio que administra; `null` para el maestro, que importa a cualquiera. */
  municipioPropio: string | null;
};

export type Rechazo = { ok: false; status: number; message: string };

/** ¿Quién importa y a dónde? Un `Rechazo` para quien no es administración. */
export async function contextoDeImportacion(alcance: UserNetworkScope): Promise<{ ok: true; contexto: ContextoDeImportacion } | Rechazo> {
  if (!alcance.isAdmin) return { ok: false, status: 403, message: "Solo administración puede importar ciudadanos." };
  if (alcance.isMaster) return { ok: true, contexto: { alcance, municipioPropio: null } };
  const [municipio] = alcance.adminMunicipalityId
    ? await getDatabaseClient()
        .select({ name: schema.municipalities.name, kind: schema.municipalities.kind })
        .from(schema.municipalities)
        .where(eq(schema.municipalities.id, alcance.adminMunicipalityId))
        .limit(1)
    : [];
  if (!municipio || municipio.kind !== "municipio") {
    return { ok: false, status: 403, message: "Tu cuenta de administración no tiene municipio. Pide al administrador maestro que te asigne uno." };
  }
  return { ok: true, contexto: { alcance, municipioPropio: municipio.name } };
}

export type OpcionesDeImportacion = {
  /** Para los renglones que no dicen su municipio ni su sección. El administrador municipal, siempre el suyo. */
  municipio?: string | null | undefined;
  /** «¿Quién los atiende?»: una persona de su gente. Sin dato, quien importa. */
  responsableId?: string | null | undefined;
};

type OpcionesResueltas = { municipioPorOmision: string | null; responsableId: string | null };

async function resolverOpciones(ctx: ContextoDeImportacion, o: OpcionesDeImportacion): Promise<{ ok: true; opciones: OpcionesResueltas } | Rechazo> {
  let municipioPorOmision = ctx.municipioPropio;
  if (!municipioPorOmision && o.municipio) {
    const m = buscarMunicipio(o.municipio);
    if (!m) return { ok: false, status: 400, message: `«${o.municipio}» no es un municipio de Jalisco.` };
    municipioPorOmision = m.name;
  }

  const responsableId = o.responsableId?.trim() || null;
  if (responsableId) {
    // La misma regla que el alta: el maestro, a cualquiera activo; un administrador municipal, a su gente.
    const deSuGente = ctx.alcance.isMaster || ctx.alcance.teammateUserIds.includes(responsableId);
    const [persona] =
      esUuid(responsableId) && deSuGente
        ? await getDatabaseClient()
            .select({ status: schema.userProfiles.status })
            .from(schema.userProfiles)
            .where(eq(schema.userProfiles.id, responsableId))
            .limit(1)
        : [];
    if (persona?.status !== "active") return { ok: false, status: 400, message: "La persona que los atiende debe ser alguien activo de tu gente." };
  }
  return { ok: true, opciones: { municipioPorOmision, responsableId } };
}

type SeccionConocida = { id: string; num: number; municipio: string | null };

/** Las secciones que nombra un lote de renglones, en una sola consulta. */
async function seccionesDe(renglones: readonly RenglonDelArchivo[]): Promise<Map<number, SeccionConocida>> {
  const numeros = [...new Set(renglones.map((r) => seccionDelRenglon(r.datos.seccion)).filter((n): n is number => typeof n === "number"))];
  if (numeros.length === 0) return new Map();
  const s = schema.electoralSections;
  const filas = await getDatabaseClient()
    .select({ id: s.id, num: s.sectionNum, municipio: s.municipality })
    .from(s)
    .where(inArray(s.sectionNum, numeros));
  return new Map(filas.map((f) => [f.num, f]));
}

export type Ubicacion = "punto" | "seccion" | "domicilio";

type Preparado = {
  renglon: number;
  firstName: string;
  lastName: string;
  maternalLastName: string;
  displayName: string;
  telefono: string;
  correo: string | undefined;
  calle: string;
  numero: string | undefined;
  colonia: string | undefined;
  municipio: string;
  seccionId: string | null;
  seccionNum: number | null;
  lat: number | null;
  lng: number | null;
  nacimiento: { dia: number; mes: number; anio: number } | null;
  nota: string | undefined;
  ubicacion: Ubicacion;
};

type Falla = { ok: false; motivo: string; campo: CampoImportable };
const falla = (campo: CampoImportable, motivo: string): Falla => ({ ok: false, motivo, campo });

/** Nombre y teléfono: lo primero que se revisa, porque con el teléfono se buscan los repetidos. */
function nombreYTelefono(r: RenglonDelArchivo): { ok: true; nombre: ReturnType<typeof nombreDelRenglon>; telefono: string } | Falla {
  const nombre = nombreDelRenglon(r.datos);
  if (!nombre.displayName) return falla("nombre", "Falta el nombre.");
  // El mismo tope que el alta (`displayNameMaxLength`): si no, la vista previa diría «listo» y el guardado fallaría.
  if (nombre.displayName.replace(/\s+/g, " ").length > displayNameMaxLength) {
    return falla("nombre", `El nombre completo es muy largo: hasta ${displayNameMaxLength} letras.`);
  }
  if (!r.datos.telefono) return falla("telefono", "Falta el teléfono.");
  const telefono = telefonoDeDiezDigitos(r.datos.telefono);
  if (!telefono) return falla("telefono", "El teléfono debe tener 10 dígitos.");
  return { ok: true, nombre, telefono };
}

/** Todo lo demás de un renglón, con el territorio ya resuelto. */
async function prepararRenglon(
  r: RenglonDelArchivo,
  base: { nombre: ReturnType<typeof nombreDelRenglon>; telefono: string },
  ctx: ContextoDeImportacion,
  opciones: OpcionesResueltas,
  secciones: Map<number, SeccionConocida>
): Promise<{ ok: true; p: Preparado } | Falla> {
  const d = r.datos;
  if (!d.calle) return falla("calle", "Falta la calle del domicilio.");
  // Los topes del alta (`POST /api/crm/contacts`).
  if (d.numero && d.numero.length > 40) return falla("numero", "El número de la casa es muy largo: hasta 40 letras.");
  if (d.colonia && d.colonia.length > 150) return falla("colonia", "La colonia es muy larga: hasta 150 letras.");
  if (d.correo && !esCorreo(d.correo)) return falla("correo", "El correo no es válido.");
  const nacimiento = fechaDelRenglon(d.nacimiento);
  if (nacimiento === "invalida") return falla("nacimiento", "La fecha de nacimiento no es válida. Escríbela como día/mes/año.");

  // «Tlaquepaque» es «San Pedro Tlaquepaque» para el INE; ante la duda («Ixtlahuacán»), no se adivina.
  const municipioEscrito = d.municipio ? buscarMunicipio(d.municipio)?.name ?? resolverMunicipio(d.municipio) : null;
  if (d.municipio && !municipioEscrito) return falla("municipio", `«${d.municipio}» no es un municipio de Jalisco.`);

  const num = seccionDelRenglon(d.seccion);
  if (num === "invalida") return falla("seccion", "La sección debe ser un número.");
  const porNumero = num !== null ? secciones.get(num) : undefined;
  if (num !== null && !porNumero) return falla("seccion", `La sección ${num} no existe en la cartografía electoral de Jalisco.`);

  const punto = coordenadasDelRenglon(d);
  if (punto === "invalida") return falla("latitud", "La latitud y la longitud no son válidas.");
  let seccion: SeccionConocida | null = porNumero ?? null;
  if (punto) {
    const enPunto = await ubicarEnSeccion(punto.lat, punto.lng);
    if (!enPunto) return falla("latitud", "La ubicación está fuera de Jalisco.");
    if (porNumero && enPunto.seccion.id !== porNumero.id) {
      return falla("seccion", `La ubicación cae en la sección ${enPunto.seccion.sectionNum}, no en la ${porNumero.num}. Corrige una de las dos.`);
    }
    seccion = { id: enPunto.seccion.id, num: enPunto.seccion.sectionNum, municipio: enPunto.seccion.municipality };
  }

  // La sección decide el municipio, como en el alta.
  if (seccion?.municipio && municipioEscrito && seccion.municipio !== municipioEscrito) {
    return punto
      ? falla("municipio", `La ubicación está en ${seccion.municipio}, no en ${municipioEscrito}.`)
      : falla("seccion", `La sección ${seccion.num} es de ${seccion.municipio}, no de ${municipioEscrito}. Corrige el municipio o la sección.`);
  }
  const municipio = seccion?.municipio ?? municipioEscrito ?? opciones.municipioPorOmision;
  if (!municipio) return falla("municipio", "Falta el municipio: escríbelo en el renglón o elige uno arriba.");
  if (ctx.municipioPropio && municipio !== ctx.municipioPropio) {
    return falla("municipio", `Esta persona es de ${municipio} y tú administras ${ctx.municipioPropio}.`);
  }

  return {
    ok: true,
    p: {
      renglon: r.renglon,
      ...base.nombre,
      telefono: base.telefono,
      correo: d.correo,
      calle: d.calle,
      numero: d.numero,
      colonia: d.colonia,
      municipio,
      seccionId: seccion?.id ?? null,
      seccionNum: seccion?.num ?? null,
      lat: punto ? punto.lat : null,
      lng: punto ? punto.lng : null,
      nacimiento,
      nota: d.nota,
      ubicacion: punto ? "punto" : seccion ? "seccion" : "domicilio"
    }
  };
}

export type RenglonRevisado =
  | { renglon: number; estado: "listo"; ubicacion: Ubicacion; municipio: string; seccion: number | null }
  | { renglon: number; estado: "repetido"; motivo: string; contactoExistenteId?: string | undefined }
  | { renglon: number; estado: "error"; motivo: string; campo: CampoImportable };

export type Resumen = { renglones: number; listos: number; repetidos: number; errores: number; porUbicar: number };

const YA_REGISTRADO = "Ya está registrado en el CRM con ese teléfono.";

/**
 * La vista previa: qué pasaría con cada renglón, sin guardar nada. Lo que responde no trae nada de las fichas
 * que ya existen —ni su nombre ni su teléfono—, y su id solo si quien importa puede abrirla.
 */
export async function revisarImportacion(
  actor: ActorContext,
  ctx: ContextoDeImportacion,
  o: OpcionesDeImportacion,
  renglones: readonly RenglonDelArchivo[]
): Promise<{ ok: true; renglones: RenglonRevisado[]; resumen: Resumen } | Rechazo> {
  const resueltas = await resolverOpciones(ctx, o);
  if (!resueltas.ok) return resueltas;

  const enElArchivo = repetidosEnElArchivo(renglones);
  const bases = renglones.map((r) => nombreYTelefono(r));
  const enElPadron = await ciudadanosConLosTelefonos(bases.flatMap((b) => (b.ok ? [b.telefono] : [])));
  const secciones = await seccionesDe(renglones);
  const visibles = new Map<string, boolean>();

  const revisados: RenglonRevisado[] = [];
  for (const [i, r] of renglones.entries()) {
    const base = bases[i]!;
    if (!base.ok) {
      revisados.push({ renglon: r.renglon, estado: "error", motivo: base.motivo, campo: base.campo });
      continue;
    }
    // Un repetido no se guarda: se dice antes que cualquier otro error, para no pedir que se corrija.
    const primero = enElArchivo.get(r.renglon);
    if (primero !== undefined) {
      revisados.push({ renglon: r.renglon, estado: "repetido", motivo: `El mismo teléfono está en el renglón ${primero}.` });
      continue;
    }
    const existente = enElPadron.get(base.telefono);
    if (existente) {
      if (!visibles.has(existente)) visibles.set(existente, await veCiudadano(ctx.alcance, existente));
      revisados.push({ renglon: r.renglon, estado: "repetido", motivo: YA_REGISTRADO, contactoExistenteId: visibles.get(existente) ? existente : undefined });
      continue;
    }
    const preparado = await prepararRenglon(r, base, ctx, resueltas.opciones, secciones);
    revisados.push(
      preparado.ok
        ? { renglon: r.renglon, estado: "listo", ubicacion: preparado.p.ubicacion, municipio: preparado.p.municipio, seccion: preparado.p.seccionNum }
        : { renglon: r.renglon, estado: "error", motivo: preparado.motivo, campo: preparado.campo }
    );
  }

  const resumen = resumir(revisados);
  await getDatabaseClient().insert(schema.auditLogs).values({
    actorUserId: actor.actorId,
    action: "contacts.import_review",
    entityType: "user_profile",
    entityId: actor.actorId,
    correlationId: actor.correlationId,
    beforeData: null,
    afterData: { ...resumen, municipio: resueltas.opciones.municipioPorOmision }
  });
  return { ok: true, renglones: revisados, resumen };
}

function resumir(renglones: readonly { estado: string; ubicacion?: Ubicacion | undefined; porUbicar?: boolean | undefined }[]): Resumen {
  const cuenta = (e: string) => renglones.filter((r) => r.estado === e).length;
  return {
    renglones: renglones.length,
    listos: cuenta("listo") + cuenta("guardado"),
    repetidos: cuenta("repetido"),
    errores: cuenta("error"),
    // Se busca el domicilio de todo el que no trae su punto: con solo domicilio y con sección.
    porUbicar: renglones.filter((r) => r.ubicacion === "domicilio" || r.ubicacion === "seccion" || r.porUbicar).length
  };
}

export type RenglonGuardado =
  | { renglon: number; estado: "guardado"; contactId: string; porUbicar: boolean }
  | { renglon: number; estado: "repetido"; motivo: string; contactoExistenteId?: string | undefined }
  | { renglon: number; estado: "error"; motivo: string; campo?: CampoImportable | undefined };

/**
 * Guarda una tanda (hasta `RENGLONES_POR_TANDA`). Todo se vuelve a revisar: la vista previa la hizo el
 * navegador y no se le cree. Cada renglón trae su clave (`clientRequestId`): reenviar la tanda tras un corte
 * devuelve los mismos ciudadanos en vez de crear otros.
 */
export async function guardarTanda(
  actor: ActorContext,
  ctx: ContextoDeImportacion,
  o: OpcionesDeImportacion & { importacionId: string },
  renglones: readonly (RenglonDelArchivo & { clientRequestId: string })[]
): Promise<{ ok: true; renglones: RenglonGuardado[]; resumen: Resumen } | Rechazo> {
  if (renglones.length > RENGLONES_POR_TANDA) return { ok: false, status: 400, message: `Se guardan hasta ${RENGLONES_POR_TANDA} renglones por envío.` };
  const resueltas = await resolverOpciones(ctx, o);
  if (!resueltas.ok) return resueltas;

  const db = getDatabaseClient();
  // Lo que ya se guardó con estas claves (un reenvío): se contesta igual, sin volver a revisar.
  const claves = renglones.map((r) => r.clientRequestId);
  const previas = new Map(
    (
      await db
        .select({ id: schema.contacts.id, clave: schema.contacts.clientRequestId, autor: schema.contacts.createdByUserId, seccion: schema.contacts.sectionId, lat: schema.contacts.exactLatitude })
        .from(schema.contacts)
        .where(inArray(schema.contacts.clientRequestId, claves))
    ).map((f) => [f.clave, f])
  );

  const bases = renglones.map((r) => nombreYTelefono(r));
  const nuevos = bases.flatMap((b, i) => (b.ok && !previas.has(renglones[i]!.clientRequestId) ? [b.telefono] : []));
  const enElPadron = await ciudadanosConLosTelefonos(nuevos);
  const secciones = await seccionesDe(renglones);
  const enElArchivo = repetidosEnElArchivo(renglones);

  const resultado: RenglonGuardado[] = [];
  for (const [i, r] of renglones.entries()) {
    const previa = previas.get(r.clientRequestId);
    if (previa) {
      resultado.push(
        previa.autor === actor.actorId
          ? { renglon: r.renglon, estado: "guardado", contactId: previa.id, porUbicar: previa.lat === null }
          : { renglon: r.renglon, estado: "error", motivo: "Esta solicitud ya se usó." }
      );
      continue;
    }
    const base = bases[i]!;
    if (!base.ok) {
      resultado.push({ renglon: r.renglon, estado: "error", motivo: base.motivo, campo: base.campo });
      continue;
    }
    const primero = enElArchivo.get(r.renglon);
    if (primero !== undefined) {
      resultado.push({ renglon: r.renglon, estado: "repetido", motivo: `El mismo teléfono está en el renglón ${primero}.` });
      continue;
    }
    const existente = enElPadron.get(base.telefono);
    if (existente) {
      const loVe = await veCiudadano(ctx.alcance, existente);
      resultado.push({ renglon: r.renglon, estado: "repetido", motivo: YA_REGISTRADO, contactoExistenteId: loVe ? existente : undefined });
      continue;
    }
    const preparado = await prepararRenglon(r, base, ctx, resueltas.opciones, secciones);
    if (!preparado.ok) {
      resultado.push({ renglon: r.renglon, estado: "error", motivo: preparado.motivo, campo: preparado.campo });
      continue;
    }
    const p = preparado.p;
    try {
      const alta = await registrarCiudadano(actor, {
        firstName: p.firstName || undefined,
        lastName: p.lastName || undefined,
        maternalLastName: p.maternalLastName || undefined,
        displayName: p.displayName,
        phone: p.telefono,
        email: p.correo,
        birthDay: p.nacimiento?.dia,
        birthMonth: p.nacimiento?.mes,
        birthYear: p.nacimiento?.anio,
        address: p.calle,
        addressNumber: p.numero,
        colony: p.colonia,
        municipality: p.municipio,
        sectionId: p.seccionId ?? undefined,
        exactLatitude: p.lat ?? undefined,
        exactLongitude: p.lng ?? undefined,
        initialNote: p.nota,
        origin: "importacion",
        actualContactUserId: resueltas.opciones.responsableId ?? undefined,
        clientRequestId: r.clientRequestId
      });
      if (alta.ok) {
        resultado.push({ renglon: r.renglon, estado: "guardado", contactId: alta.contactId, porUbicar: p.ubicacion !== "punto" });
      } else if (alta.code === "telefono_repetido") {
        // Otro renglón de esta misma tanda acaba de guardar ese teléfono, o alguien lo registró entre la
        // revisión y el guardado.
        resultado.push({ renglon: r.renglon, estado: "repetido", motivo: YA_REGISTRADO, contactoExistenteId: alta.contactoExistenteId });
      } else {
        resultado.push({ renglon: r.renglon, estado: "error", motivo: alta.message });
      }
    } catch (error) {
      registrarError("Importar ciudadanos: un renglón no se guardó", error);
      resultado.push({ renglon: r.renglon, estado: "error", motivo: "No se pudo guardar este renglón. Intenta de nuevo." });
    }
  }

  const resumen = resumir(resultado);
  await db.insert(schema.auditLogs).values({
    actorUserId: actor.actorId,
    action: "contacts.import",
    entityType: "contact_import",
    entityId: o.importacionId,
    correlationId: actor.correlationId,
    beforeData: null,
    afterData: {
      renglones: resumen.renglones,
      guardados: resumen.listos,
      repetidos: resumen.repetidos,
      errores: resumen.errores,
      municipio: resueltas.opciones.municipioPorOmision,
      responsable: resueltas.opciones.responsableId
    }
  });
  return { ok: true, renglones: resultado, resumen };
}

/**
 * Ya se buscó su domicilio y OpenStreetMap contestó (lo haya encontrado o no): cada búsqueda deja su
 * `contacts.locate`. No se vuelve a buscar sola; quien no se encontró se corrige en su ficha.
 */
// Con los nombres completos a mano: en el `select` de una sola tabla, drizzle escribe `"id"` sin la tabla y
// dentro de la subconsulta se leería como `audit_logs.id` (nunca se encontraba nada).
const yaSeBuscoSuDomicilio = sql<boolean>`EXISTS (SELECT 1 FROM audit_logs busqueda WHERE busqueda.entity_id = "contacts"."id" AND busqueda.action = 'contacts.locate')`;

/**
 * Lo importado por esta persona que todavía no tiene su punto en el mapa y cuyo domicilio no se ha buscado.
 * Primero quien no sale en el mapa (sin sección); después quien se ve en el centro de su sección.
 */
export async function pendientesDeUbicar(actorId: string, tope = UBICACIONES_POR_HORA): Promise<string[]> {
  const c = schema.contacts;
  const filas = await getDatabaseClient()
    .select({ id: c.id })
    .from(c)
    .where(
      and(
        eq(c.createdByUserId, actorId),
        eq(c.origin, "importacion"),
        eq(c.status, "active"),
        isNull(c.exactLatitude),
        isNotNull(c.address),
        not(yaSeBuscoSuDomicilio)
      )
    )
    .orderBy(sql`${c.sectionId} IS NOT NULL`, c.createdAt, c.id)
    .limit(tope);
  return filas.map((f) => f.id);
}

/**
 * - `punto`: quedó en su domicilio (con número de casa).
 * - `seccion`: no traía sección; se encontró la calle, no la casa: queda en su sección.
 * - `sin_punto`: traía sección y no se encontró su casa dentro de ella: sigue en el centro de su sección.
 * - `no_encontrado`: no traía sección y no se encontró: sigue en «Sin ubicación».
 * - `no_aplica`: no es de quien busca, ya tiene su punto o ya se buscó.
 */
export type ResultadoDeUbicacion = "punto" | "seccion" | "sin_punto" | "no_encontrado" | "no_aplica";

declare global {
  var __importacionUbicando: { quien: string; hasta: number } | undefined;
  var __importacionUltimaBusqueda: number | undefined;
}

const esperar = (ms: number) => new Promise((listo) => setTimeout(listo, ms));

/**
 * Busca en OpenStreetMap el domicilio de ciudadanos importados que no tienen su punto en el mapa: los que solo
 * traían domicilio y los que traían sección (se ven en el centro de su sección).
 *
 * Con cuidado, porque OpenStreetMap admite una consulta por segundo y bloquea a quien abusa, y las búsquedas
 * de domicilio de las brigadas salen por la misma dirección del servidor:
 * - un solo envío ubica a la vez en todo el servidor (otro, aunque sea de la misma persona en otra pestaña,
 *   recibe `ocupado`);
 * - una búsqueda cada `ESPERA_ENTRE_BUSQUEDAS_MS`;
 * - `UBICACIONES_POR_HORA` por persona;
 * - si OpenStreetMap no contesta o dice que hay demasiadas, se detiene (`saturado`).
 *
 * Solo se acepta un resultado dentro del municipio del ciudadano. Con número de casa queda en ese punto; sin él
 * (OpenStreetMap da la calle entera, no la casa), solo en su sección: una calle no se hace pasar por domicilio.
 * Quien ya trae sección solo gana su punto con número de casa y dentro de esa misma sección: la sección del
 * Excel manda, como al importar (un punto en otra sección es un error del renglón).
 * Solo trabaja sobre lo que importó la misma persona, sigue sin punto y no se ha buscado; con cualquier otro id,
 * `no_aplica`. Cada búsqueda que OpenStreetMap contesta queda en la auditoría (`contacts.locate`), solo con la
 * sección: así no se repite.
 */
export async function ubicarPorDomicilio(
  actor: ActorContext,
  ids: readonly string[]
): Promise<{ resultados: { id: string; resultado: ResultadoDeUbicacion }[]; detenido: "ocupado" | "saturado" | "limite" | null }> {
  const ahora = Date.now();
  const candado = globalThis.__importacionUbicando;
  // El candado vence solo: si el servidor se cae a media búsqueda, no se queda tomado.
  if (candado && candado.hasta > ahora) return { resultados: [], detenido: "ocupado" };
  globalThis.__importacionUbicando = { quien: actor.actorId, hasta: ahora + 60_000 };

  const db = getDatabaseClient();
  const c = schema.contacts;
  const resultados: { id: string; resultado: ResultadoDeUbicacion }[] = [];
  let detenido: "saturado" | "limite" | null = null;
  try {
    for (const id of ids) {
      const [f] = esUuid(id)
        ? await db
            .select({
              autor: c.createdByUserId,
              origen: c.origin,
              estado: c.status,
              seccion: c.sectionId,
              lat: c.exactLatitude,
              calle: c.address,
              numero: c.addressNumber,
              colonia: c.colony,
              municipio: c.municipality,
              buscado: yaSeBuscoSuDomicilio
            })
            .from(c)
            .where(eq(c.id, id))
            .limit(1)
        : [];
      if (!f || f.autor !== actor.actorId || f.origen !== "importacion" || f.estado !== "active" || f.lat !== null || !f.calle || !f.municipio || f.buscado) {
        resultados.push({ id, resultado: "no_aplica" });
        continue;
      }
      const seccionDelExcel = f.seccion;
      if (!checkRateLimit(`importar-ubicar:${actor.actorId}`, UBICACIONES_POR_HORA, 60 * 60 * 1000).allowed) {
        detenido = "limite";
        break;
      }

      const ultima = globalThis.__importacionUltimaBusqueda ?? 0;
      const falta = ultima + ESPERA_ENTRE_BUSQUEDAS_MS - Date.now();
      if (falta > 0) await esperar(falta);
      globalThis.__importacionUltimaBusqueda = Date.now();
      globalThis.__importacionUbicando = { quien: actor.actorId, hasta: Date.now() + 60_000 };

      const colonia = f.colonia && f.colonia !== "Por identificar" ? f.colonia : null;
      const texto = [[f.calle, f.numero].filter(Boolean).join(" "), colonia].filter(Boolean).join(", ");
      const { filas, saturado } = await buscarDireccion(texto, f.municipio, { limite: 5, msEspera: 4000 });
      if (saturado) {
        detenido = "saturado";
        break;
      }

      let elegido: { seccionId: string; seccionNum: number; lat: number; lng: number; conNumero: boolean } | null = null;
      for (const item of filas) {
        const lat = Number.parseFloat(item?.lat);
        const lng = Number.parseFloat(item?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const enSeccion = await ubicarEnSeccion(lat, lng);
        if (enSeccion?.precision !== "exacta" || enSeccion.seccion.municipality !== f.municipio) continue;
        const conNumero = Boolean(item?.address?.house_number);
        if (seccionDelExcel !== null && (!conNumero || enSeccion.seccion.id !== seccionDelExcel)) continue;
        elegido = { seccionId: enSeccion.seccion.id, seccionNum: enSeccion.seccion.sectionNum, lat, lng, conNumero };
        break;
      }

      const antes = { ubicacion: seccionDelExcel !== null ? "centro de su sección" : "sin ubicación" };
      const anotar = (ejecutor: Pick<typeof db, "insert">, despues: Record<string, unknown>) =>
        ejecutor.insert(schema.auditLogs).values({
          actorUserId: actor.actorId,
          action: "contacts.locate",
          entityType: "contact",
          entityId: id,
          correlationId: actor.correlationId,
          beforeData: antes,
          afterData: despues
        });
      if (!elegido) {
        // También se anota: así no se vuelve a buscar sola en cada visita a la pantalla.
        await anotar(db, { ubicacion: seccionDelExcel !== null ? "sigue en el centro de su sección" : "no se encontró su domicilio" });
        resultados.push({ id, resultado: seccionDelExcel !== null ? "sin_punto" : "no_encontrado" });
        continue;
      }

      const lugar = elegido;
      await db.transaction(async (tx) => {
        await tx
          .update(c)
          .set(lugar.conNumero ? { sectionId: lugar.seccionId, exactLatitude: lugar.lat, exactLongitude: lugar.lng } : { sectionId: lugar.seccionId })
          // Por si alguien la ubicó a mano mientras se buscaba: no se pisa.
          .where(and(eq(c.id, id), seccionDelExcel !== null ? eq(c.sectionId, seccionDelExcel) : isNull(c.sectionId), isNull(c.exactLatitude)));
        await anotar(tx, { ubicacion: lugar.conNumero ? "punto del domicilio" : "sección del domicilio", seccion: lugar.seccionNum });
      });
      resultados.push({ id, resultado: lugar.conNumero ? "punto" : "seccion" });
    }
  } finally {
    // Se suelta enseguida: el siguiente envío de la misma importación lo vuelve a tomar, y otra no espera de más.
    globalThis.__importacionUbicando = undefined;
  }
  return { resultados, detenido };
}
