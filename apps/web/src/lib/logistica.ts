import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { type ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import { getDatabaseClient } from "@/lib/db-client";
import {
  estaPorAgotarse,
  MOVIMIENTOS_POR_PAGINA,
  OTRAS_ESTRUCTURAS,
  type ArticuloDeLogistica,
  type EnManos,
  type MovimientoDeLogistica,
  type ResumenDeLogistica,
  type TipoDeMovimiento
} from "@/lib/logistica-tipos";
import { buscarMunicipio } from "@/lib/municipios-jalisco";
import { type UserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Logística e inventarios (etapa 6; plan de auditoría de menús, fase 5).
 *
 * No tenía alcance ninguno: la guarda solo miraba el rol, así que administración y dirección de
 * cualquier municipio veían y movían todos los almacenes del sistema (A4). Tampoco había alta de
 * almacenes: el primer artículo inventaba en silencio un «Almacén Principal» sin municipio ni autor
 * (M32). Y «Registrar movimiento» no guardaba nada: decía «Movimiento registrado» y ofrecía tres
 * responsables inventados (M33).
 *
 * Ahora:
 * - el administrador maestro ve todos los almacenes; un administrador municipal, los de su municipio;
 *   dirección, los de su propio municipio. Sin municipio, ninguno;
 * - los almacenes se dan de alta con municipio y autor, y los artículos, en un almacén que se ve;
 * - un movimiento suma o resta existencias de verdad —nunca por debajo de cero— y queda en el
 *   historial, con el responsable elegido entre personas del alcance;
 * - (fase 5) los nombres de personas de otra estructura no salen en el historial ni en «Entregado a
 *   personas»: se suman como «Otras estructuras» (P1). Dirección ve los almacenes de su municipio, que
 *   pueden tener entregas de otra dirección;
 * - (fase 5) se editan artículos, se archivan sin borrarse (solo administración), se registran
 *   devoluciones y se avisa lo que se está acabando (D7).
 */

export type Resultado = { ok: true; mensaje?: string } | { ok: false; error: string };

/** El municipio de los almacenes de este alcance; `null` = todos (el maestro); `undefined` = ninguno. */
function municipioDeLogistica(alcance: UserNetworkScope): string | null | undefined {
  if (alcance.isMaster) return null;
  if (alcance.isAdmin) return alcance.adminMunicipalityId ?? undefined;
  if (alcance.roleKey === "direction") return alcance.userMunicipalityId ?? undefined;
  return undefined;
}

/** Condición sobre `warehouses` de los almacenes que ve este alcance. */
export function almacenesVisibles(alcance: UserNetworkScope): SQL | undefined {
  const municipio = municipioDeLogistica(alcance);
  if (municipio === null) return undefined;
  if (municipio === undefined) return sql`false`;
  return eq(schema.warehouses.municipalityId, municipio);
}

/** ¿Tiene este alcance almacenes que ver? Para decirlo en pantalla en vez de enseñarla vacía. */
export function tieneLogistica(alcance: UserNetworkScope): boolean {
  return municipioDeLogistica(alcance) !== undefined;
}

/** Archivar y devolver a la lista: solo administración (§4.5). */
export function puedeArchivar(alcance: UserNetworkScope): boolean {
  return alcance.isAdmin;
}

/** ¿Se puede decir el nombre de esta persona a quien mira? (P1) */
function seVe(alcance: UserNetworkScope, personaId: string | null): boolean {
  if (!personaId) return false;
  return alcance.isMaster || personaId === alcance.userId || (alcance.allowedUserIds ?? []).includes(personaId);
}

/** Lo que cuenta como «en manos» de alguien: lo entregado, menos lo que regresó. */
const ENTREGADO = sql`CASE WHEN t.transaction_type = 'out' THEN t.quantity WHEN t.transaction_type = 'devolucion' THEN -t.quantity ELSE 0 END`;

/** Los movimientos de una página del historial, con los nombres recortados al alcance (P1). */
export async function historial(alcance: UserNetworkScope, articulos: string[], pagina: number): Promise<{ filas: MovimientoDeLogistica[]; hayMas: boolean }> {
  if (articulos.length === 0) return { filas: [], hayMas: false };
  const p = Math.max(1, Math.min(1000, Math.floor(pagina) || 1));
  const filas = (
    await getDatabaseClient().execute<{
      id: string;
      fecha: Date;
      tipo: string;
      cantidad: number;
      articulo: string;
      responsable_id: string | null;
      responsable: string | null;
      registro_id: string;
      registro: string | null;
      notas: string | null;
    }>(sql`
      SELECT t.id::text, t.created_at AS fecha, t.transaction_type AS tipo, t.quantity AS cantidad, i.name AS articulo,
        t.assigned_to_user_id::text AS responsable_id, r.display_name AS responsable,
        t.performed_by_user_id::text AS registro_id, h.display_name AS registro, t.notes AS notas
      FROM inventory_transactions t
      JOIN inventory_items i ON i.id = t.item_id
      LEFT JOIN user_profiles r ON r.id = t.assigned_to_user_id
      LEFT JOIN user_profiles h ON h.id = t.performed_by_user_id
      WHERE t.item_id IN (${sql.join(articulos.map((a) => sql`${a}::uuid`), sql`, `)})
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ${MOVIMIENTOS_POR_PAGINA + 1} OFFSET ${(p - 1) * MOVIMIENTOS_POR_PAGINA}`)
  ).rows;
  return {
    hayMas: filas.length > MOVIMIENTOS_POR_PAGINA,
    filas: filas.slice(0, MOVIMIENTOS_POR_PAGINA).map((f) => ({
      id: f.id,
      fecha: new Date(f.fecha).toISOString(),
      tipo: f.tipo,
      cantidad: f.cantidad,
      articulo: f.articulo,
      responsable: !f.responsable_id ? null : seVe(alcance, f.responsable_id) ? f.responsable : OTRAS_ESTRUCTURAS,
      registro: seVe(alcance, f.registro_id) ? f.registro : OTRAS_ESTRUCTURAS,
      // Las notas las escribe quien registra: de otra estructura no se enseñan.
      notas: seVe(alcance, f.registro_id) ? f.notas : null
    }))
  };
}

/** Quién tiene qué (entregas menos devoluciones), con lo de otras estructuras sumado y sin nombres (P1). */
export async function enManos(alcance: UserNetworkScope, articulos: Array<{ id: string; nombre: string; clave: string }>): Promise<EnManos[]> {
  if (articulos.length === 0) return [];
  const filas = (
    await getDatabaseClient().execute<{ item_id: string; persona: string; nombre: string | null; cantidad: number }>(sql`
      SELECT t.item_id::text, t.assigned_to_user_id::text AS persona, up.display_name AS nombre, sum(${ENTREGADO})::int AS cantidad
      FROM inventory_transactions t
      LEFT JOIN user_profiles up ON up.id = t.assigned_to_user_id
      WHERE t.item_id IN (${sql.join(articulos.map((a) => sql`${a.id}::uuid`), sql`, `)}) AND t.assigned_to_user_id IS NOT NULL
      GROUP BY t.item_id, t.assigned_to_user_id, up.display_name
      HAVING sum(${ENTREGADO}) > 0`)
  ).rows;
  const deArticulo = new Map(articulos.map((a) => [a.id, a]));
  const propias: EnManos[] = [];
  const otras = new Map<string, number>();
  for (const f of filas) {
    const a = deArticulo.get(f.item_id);
    if (!a) continue;
    if (seVe(alcance, f.persona)) propias.push({ articuloId: a.id, articulo: a.nombre, clave: a.clave, personaId: f.persona, persona: f.nombre ?? "Sin nombre", cantidad: f.cantidad });
    else otras.set(a.id, (otras.get(a.id) ?? 0) + f.cantidad);
  }
  const sumadas: EnManos[] = [...otras].map(([id, cantidad]) => {
    const a = deArticulo.get(id)!;
    return { articuloId: id, articulo: a.nombre, clave: a.clave, personaId: null, persona: OTRAS_ESTRUCTURAS, cantidad };
  });
  return [...propias.sort((x, y) => x.persona.localeCompare(y.persona, "es") || x.articulo.localeCompare(y.articulo, "es")), ...sumadas];
}

export async function datosDeLogistica(alcance: UserNetworkScope) {
  const db = getDatabaseClient();
  const almacenes = await db
    .select({
      id: schema.warehouses.id,
      nombre: schema.warehouses.name,
      ubicacion: schema.warehouses.location,
      municipio: schema.municipalities.name,
      municipioTipo: schema.municipalities.kind
    })
    .from(schema.warehouses)
    .innerJoin(schema.municipalities, eq(schema.municipalities.id, schema.warehouses.municipalityId))
    .where(and(eq(schema.warehouses.status, "active"), almacenesVisibles(alcance)))
    .orderBy(schema.warehouses.name);
  const ids = almacenes.map((a) => a.id);
  const nombreDeAlmacen = new Map(almacenes.map((a) => [a.id, a.nombre]));
  const filas = ids.length
    ? await db
        .select()
        .from(schema.inventoryItems)
        .where(inArray(schema.inventoryItems.warehouseId, ids))
        .orderBy(schema.inventoryItems.name, desc(schema.inventoryItems.createdAt))
    : [];
  const articulos: ArticuloDeLogistica[] = filas.map((i) => ({
    id: i.id,
    nombre: i.name,
    clave: i.sku,
    categoria: i.category,
    descripcion: i.description,
    imagen: i.imageUrl,
    existencias: i.quantity,
    minimo: i.minQuantity,
    archivado: i.archivedAt !== null,
    almacenId: i.warehouseId,
    almacen: nombreDeAlmacen.get(i.warehouseId) ?? ""
  }));
  const activos = articulos.filter((a) => !a.archivado);
  const todos = articulos.map((a) => a.id);

  // «Entregas en los últimos 30 días»: por fecha. Antes contaba las salidas entre los últimos 50 movimientos.
  const [entregadas] = todos.length
    ? (
        await db.execute<{ piezas: number }>(sql`
          SELECT coalesce(sum(t.quantity), 0)::int AS piezas FROM inventory_transactions t
          WHERE t.transaction_type = 'out' AND t.created_at >= now() - interval '30 days'
            AND t.item_id IN (${sql.join(todos.map((a) => sql`${a}::uuid`), sql`, `)})`)
      ).rows
    : [{ piezas: 0 }];
  const resumen: ResumenDeLogistica = {
    piezas: activos.reduce((suma, a) => suma + a.existencias, 0),
    tipos: activos.length,
    porAgotarse: activos.filter(estaPorAgotarse).length,
    entregadas30: entregadas?.piezas ?? 0
  };

  // A quién se le puede entregar material: personas activas del alcance (el maestro, cualquiera).
  const personas = await db
    .select({ id: schema.userProfiles.id, nombre: schema.userProfiles.displayName })
    .from(schema.userProfiles)
    .where(and(
      eq(schema.userProfiles.status, "active"),
      alcance.isMaster ? undefined : inArray(schema.userProfiles.id, alcance.allowedUserIds?.length ? alcance.allowedUserIds : [alcance.userId])
    ))
    .orderBy(schema.userProfiles.displayName);

  return {
    almacenes,
    articulos,
    resumen,
    enManos: await enManos(alcance, articulos),
    movimientos: await historial(alcance, todos, 1),
    personas
  };
}

async function almacenVisible(alcance: UserNetworkScope, warehouseId: string): Promise<boolean> {
  const [fila] = await getDatabaseClient()
    .select({ id: schema.warehouses.id })
    .from(schema.warehouses)
    .where(and(eq(schema.warehouses.id, warehouseId), eq(schema.warehouses.status, "active"), almacenesVisibles(alcance)))
    .limit(1);
  return Boolean(fila);
}

/** El artículo, si está en un almacén que se ve. */
async function articuloVisible(alcance: UserNetworkScope, itemId: string) {
  const [articulo] = await getDatabaseClient()
    .select({ id: schema.inventoryItems.id, almacen: schema.inventoryItems.warehouseId, nombre: schema.inventoryItems.name, archivado: schema.inventoryItems.archivedAt })
    .from(schema.inventoryItems)
    .where(eq(schema.inventoryItems.id, itemId))
    .limit(1);
  if (!articulo || !(await almacenVisible(alcance, articulo.almacen))) return null;
  return articulo;
}

/** El mínimo escrito en el formulario: vacío es «sin mínimo». */
function leerMinimo(valor: string | undefined): { ok: true; minimo: number | null } | { ok: false } {
  const limpio = (valor ?? "").trim();
  if (!limpio) return { ok: true, minimo: null };
  const n = Number(limpio);
  return Number.isInteger(n) && n >= 0 && n <= 1_000_000 ? { ok: true, minimo: n } : { ok: false };
}

export async function crearAlmacen(
  actor: ActorContext,
  alcance: UserNetworkScope,
  datos: { nombre: string; ubicacion: string; municipio: string }
): Promise<Resultado> {
  const nombre = datos.nombre.trim();
  if (nombre.length < 2 || nombre.length > 80) return { ok: false, error: "El nombre del almacén debe tener entre 2 y 80 caracteres." };
  const propio = municipioDeLogistica(alcance);
  if (propio === undefined) return { ok: false, error: "Tu cuenta no tiene municipio: no puede dar de alta almacenes." };
  // El maestro elige el municipio; los demás, el suyo.
  let municipio: string | null = propio;
  if (propio === null) {
    const elegido = buscarMunicipio(datos.municipio)?.name;
    if (!elegido) return { ok: false, error: "Elige el municipio del almacén." };
    const [fila] = await getDatabaseClient()
      .select({ id: schema.municipalities.id })
      .from(schema.municipalities)
      .where(and(eq(schema.municipalities.name, elegido), eq(schema.municipalities.kind, "municipio")))
      .limit(1);
    municipio = fila?.id ?? null;
    if (!municipio) return { ok: false, error: "Ese municipio no está en el catálogo." };
  }
  if (!municipio) return { ok: false, error: "Elige el municipio del almacén." };
  await getDatabaseClient().insert(schema.warehouses).values({
    name: nombre,
    location: datos.ubicacion.trim().slice(0, 200) || null,
    municipalityId: municipio,
    createdByUserId: actor.actorId
  });
  return { ok: true, mensaje: `Almacén «${nombre}» dado de alta.` };
}

export async function crearArticulo(
  alcance: UserNetworkScope,
  datos: { warehouseId: string; nombre: string; sku: string; categoria: string; descripcion: string; imagen: string; minimo?: string }
): Promise<Resultado> {
  const nombre = datos.nombre.trim();
  const sku = datos.sku.trim();
  const categoria = datos.categoria.trim();
  if (!nombre || !sku || !categoria) return { ok: false, error: "Nombre, clave y categoría son obligatorios." };
  const minimo = leerMinimo(datos.minimo);
  if (!minimo.ok) return { ok: false, error: "El mínimo es un número entero, cero o más." };
  if (!(await almacenVisible(alcance, datos.warehouseId))) return { ok: false, error: "Elige uno de tus almacenes." };
  await getDatabaseClient().insert(schema.inventoryItems).values({
    warehouseId: datos.warehouseId,
    sku,
    name: nombre,
    category: categoria,
    description: datos.descripcion.trim() || null,
    imageUrl: datos.imagen.trim() || null,
    quantity: 0,
    minQuantity: minimo.minimo
  });
  return { ok: true, mensaje: "Artículo añadido al almacén." };
}

type ConInsert = Pick<ReturnType<typeof getDatabaseClient>, "insert">;

async function auditar(tx: ConInsert, actor: ActorContext, accion: string, id: string, antes: unknown, despues: unknown) {
  await tx.insert(schema.auditLogs).values({
    actorUserId: actor.actorId,
    action: accion,
    entityType: "inventory_item",
    entityId: id,
    correlationId: actor.correlationId,
    beforeData: antes ?? null,
    afterData: despues ?? null
  });
}

/** Editar un artículo: administración y dirección, en sus almacenes (F5.2). */
export async function editarArticulo(
  actor: ActorContext,
  alcance: UserNetworkScope,
  itemId: string,
  datos: { nombre: string; sku: string; categoria: string; descripcion: string; imagen: string; minimo: string }
): Promise<Resultado> {
  const nombre = datos.nombre.trim();
  const sku = datos.sku.trim();
  const categoria = datos.categoria.trim();
  if (!nombre || !sku || !categoria) return { ok: false, error: "Nombre, clave y categoría son obligatorios." };
  const minimo = leerMinimo(datos.minimo);
  if (!minimo.ok) return { ok: false, error: "El mínimo es un número entero, cero o más." };
  const articulo = await articuloVisible(alcance, itemId);
  if (!articulo) return { ok: false, error: "Ese artículo no está en tus almacenes." };
  await getDatabaseClient().transaction(async (tx) => {
    const [antes] = await tx.select().from(schema.inventoryItems).where(eq(schema.inventoryItems.id, itemId));
    await tx
      .update(schema.inventoryItems)
      .set({ name: nombre, sku, category: categoria, description: datos.descripcion.trim() || null, imageUrl: datos.imagen.trim() || null, minQuantity: minimo.minimo, updatedAt: new Date() })
      .where(eq(schema.inventoryItems.id, itemId));
    await auditar(
      tx,
      actor,
      "inventory.edit",
      itemId,
      { nombre: antes?.name, clave: antes?.sku, categoria: antes?.category, minimo: antes?.minQuantity },
      { nombre, clave: sku, categoria, minimo: minimo.minimo }
    );
  });
  return { ok: true, mensaje: "Artículo guardado." };
}

/** Archivar (o devolver a la lista) un artículo: solo administración. Nunca se borra (F5.2). */
export async function archivarArticulo(actor: ActorContext, alcance: UserNetworkScope, itemId: string, archivar: boolean): Promise<Resultado> {
  if (!puedeArchivar(alcance)) return { ok: false, error: "Archivar artículos es de administración." };
  const articulo = await articuloVisible(alcance, itemId);
  if (!articulo) return { ok: false, error: "Ese artículo no está en tus almacenes." };
  await getDatabaseClient().transaction(async (tx) => {
    await tx.update(schema.inventoryItems).set({ archivedAt: archivar ? new Date() : null, updatedAt: new Date() }).where(eq(schema.inventoryItems.id, itemId));
    await auditar(tx, actor, archivar ? "inventory.archive" : "inventory.restore", itemId, { archivado: articulo.archivado !== null }, { archivado: archivar });
  });
  return { ok: true, mensaje: archivar ? `«${articulo.nombre}» archivado: ya no sale en la lista.` : `«${articulo.nombre}» volvió a la lista.` };
}

export async function registrarMovimiento(
  actor: ActorContext,
  alcance: UserNetworkScope,
  datos: { itemId: string; cantidad: number; tipo: TipoDeMovimiento; responsableId: string | null; notas: string }
): Promise<Resultado> {
  if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1 || datos.cantidad > 1_000_000) {
    return { ok: false, error: "La cantidad debe ser un número entero mayor que cero." };
  }
  if (datos.tipo === "devolucion" && !datos.responsableId) return { ok: false, error: "Elige a la persona que regresa el material." };
  const articulo = await articuloVisible(alcance, datos.itemId);
  if (!articulo) return { ok: false, error: "Ese artículo no está en tus almacenes." };

  const db = getDatabaseClient();
  if (datos.responsableId) {
    const [persona] = await db
      .select({ id: schema.userProfiles.id })
      .from(schema.userProfiles)
      .where(and(eq(schema.userProfiles.id, datos.responsableId), eq(schema.userProfiles.status, "active")))
      .limit(1);
    const enAlcance = alcance.isMaster || (alcance.allowedUserIds ?? []).includes(datos.responsableId);
    if (!persona || !enAlcance) return { ok: false, error: "Solo puedes entregar material a personas activas de tu estructura." };
  }

  return db.transaction(async (tx) => {
    // La fila del artículo se bloquea: dos salidas o dos devoluciones a la vez no se pasan de lo que hay.
    const [fila] = (
      await tx.execute<{ quantity: number; archived_at: Date | null }>(sql`
        SELECT quantity, archived_at FROM inventory_items WHERE id = ${articulo.id} FOR UPDATE`)
    ).rows;
    if (!fila) return { ok: false as const, error: "Ese artículo no está en tus almacenes." };
    if (fila.archived_at) return { ok: false as const, error: "Este artículo está archivado: devuélvelo a la lista para moverlo." };
    if (datos.tipo === "out" && fila.quantity < datos.cantidad) return { ok: false as const, error: "No hay existencias suficientes para esa salida." };
    if (datos.tipo === "devolucion") {
      const [tiene] = (
        await tx.execute<{ cantidad: number }>(sql`
          SELECT coalesce(sum(${ENTREGADO}), 0)::int AS cantidad FROM inventory_transactions t
          WHERE t.item_id = ${articulo.id} AND t.assigned_to_user_id = ${datos.responsableId}`)
      ).rows;
      const enSusManos = tiene?.cantidad ?? 0;
      if (enSusManos < datos.cantidad) {
        return { ok: false as const, error: enSusManos > 0 ? `Esa persona tiene ${enSusManos}: no puede regresar más.` : "Esa persona no tiene este artículo." };
      }
    }
    const [actualizado] = await tx
      .update(schema.inventoryItems)
      .set({
        quantity: datos.tipo === "out" ? sql`${schema.inventoryItems.quantity} - ${datos.cantidad}` : sql`${schema.inventoryItems.quantity} + ${datos.cantidad}`
      })
      .where(eq(schema.inventoryItems.id, articulo.id))
      .returning({ quantity: schema.inventoryItems.quantity });
    await tx.insert(schema.inventoryTransactions).values({
      itemId: articulo.id,
      transactionType: datos.tipo,
      quantity: datos.cantidad,
      assignedToUserId: datos.responsableId,
      performedByUserId: actor.actorId,
      notes: datos.notas.trim().slice(0, 500) || null
    });
    return { ok: true as const, mensaje: `Movimiento registrado: quedan ${actualizado!.quantity}.` };
  });
}

/** Una página del historial para quien la pide (la pantalla la pide al tocar «Anteriores»). */
export async function paginaDeHistorial(alcance: UserNetworkScope, pagina: number) {
  const db = getDatabaseClient();
  const almacenes = await db
    .select({ id: schema.warehouses.id })
    .from(schema.warehouses)
    .where(and(eq(schema.warehouses.status, "active"), almacenesVisibles(alcance)));
  const articulos = almacenes.length
    ? (await db.select({ id: schema.inventoryItems.id }).from(schema.inventoryItems).where(inArray(schema.inventoryItems.warehouseId, almacenes.map((a) => a.id)))).map((a) => a.id)
    : [];
  return historial(alcance, articulos, pagina);
}
