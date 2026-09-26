import { and, desc, eq, gte, inArray, sql, type SQL } from "drizzle-orm";

import { type ActorContext } from "@tonala/shared/auth";
import { schema } from "@tonala/shared/database";

import { getDatabaseClient } from "@/lib/db-client";
import { buscarMunicipio } from "@/lib/municipios-jalisco";
import { type UserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Logística e inventarios (etapa 6).
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
 *   historial, con el responsable elegido entre personas del alcance.
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
  const articulos = ids.length
    ? await db
        .select()
        .from(schema.inventoryItems)
        .where(inArray(schema.inventoryItems.warehouseId, ids))
        .orderBy(desc(schema.inventoryItems.createdAt))
    : [];
  const movimientos = articulos.length
    ? await db
        .select({
          id: schema.inventoryTransactions.id,
          itemId: schema.inventoryTransactions.itemId,
          articulo: schema.inventoryItems.name,
          transactionType: schema.inventoryTransactions.transactionType,
          quantity: schema.inventoryTransactions.quantity,
          responsable: schema.userProfiles.displayName,
          createdAt: schema.inventoryTransactions.createdAt
        })
        .from(schema.inventoryTransactions)
        .innerJoin(schema.inventoryItems, eq(schema.inventoryItems.id, schema.inventoryTransactions.itemId))
        .leftJoin(schema.userProfiles, eq(schema.userProfiles.id, schema.inventoryTransactions.assignedToUserId))
        .where(inArray(schema.inventoryTransactions.itemId, articulos.map((a) => a.id)))
        .orderBy(desc(schema.inventoryTransactions.createdAt))
        .limit(50)
    : [];
  // A quién se le puede entregar material: personas activas del alcance (el maestro, cualquiera).
  const personas = await db
    .select({ id: schema.userProfiles.id, nombre: schema.userProfiles.displayName })
    .from(schema.userProfiles)
    .where(and(
      eq(schema.userProfiles.status, "active"),
      alcance.isMaster ? undefined : inArray(schema.userProfiles.id, alcance.allowedUserIds?.length ? alcance.allowedUserIds : [alcance.userId])
    ))
    .orderBy(schema.userProfiles.displayName);
  return { almacenes, articulos, movimientos, personas };
}

async function almacenVisible(alcance: UserNetworkScope, warehouseId: string): Promise<boolean> {
  const [fila] = await getDatabaseClient()
    .select({ id: schema.warehouses.id })
    .from(schema.warehouses)
    .where(and(eq(schema.warehouses.id, warehouseId), eq(schema.warehouses.status, "active"), almacenesVisibles(alcance)))
    .limit(1);
  return Boolean(fila);
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
  datos: { warehouseId: string; nombre: string; sku: string; categoria: string; descripcion: string; imagen: string }
): Promise<Resultado> {
  const nombre = datos.nombre.trim();
  const sku = datos.sku.trim();
  const categoria = datos.categoria.trim();
  if (!nombre || !sku || !categoria) return { ok: false, error: "Nombre, SKU y categoría son obligatorios." };
  if (!(await almacenVisible(alcance, datos.warehouseId))) return { ok: false, error: "Elige uno de tus almacenes." };
  await getDatabaseClient().insert(schema.inventoryItems).values({
    warehouseId: datos.warehouseId,
    sku,
    name: nombre,
    category: categoria,
    description: datos.descripcion.trim() || null,
    imageUrl: datos.imagen.trim() || null,
    quantity: 0
  });
  return { ok: true, mensaje: "Artículo añadido al almacén." };
}

export async function registrarMovimiento(
  actor: ActorContext,
  alcance: UserNetworkScope,
  datos: { itemId: string; cantidad: number; tipo: "in" | "out"; responsableId: string | null; notas: string }
): Promise<Resultado> {
  if (!Number.isInteger(datos.cantidad) || datos.cantidad < 1 || datos.cantidad > 1_000_000) {
    return { ok: false, error: "La cantidad debe ser un número entero mayor que cero." };
  }
  const db = getDatabaseClient();
  const [articulo] = await db
    .select({ id: schema.inventoryItems.id, almacen: schema.inventoryItems.warehouseId })
    .from(schema.inventoryItems)
    .where(eq(schema.inventoryItems.id, datos.itemId))
    .limit(1);
  if (!articulo || !(await almacenVisible(alcance, articulo.almacen))) return { ok: false, error: "Ese artículo no está en tus almacenes." };

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
    // La resta se hace en la misma sentencia que comprueba las existencias: dos salidas a la vez no
    // dejan el inventario en negativo.
    const actualizados = await tx
      .update(schema.inventoryItems)
      .set({
        quantity: datos.tipo === "in"
          ? sql`${schema.inventoryItems.quantity} + ${datos.cantidad}`
          : sql`${schema.inventoryItems.quantity} - ${datos.cantidad}`
      })
      .where(and(eq(schema.inventoryItems.id, articulo.id), datos.tipo === "out" ? gte(schema.inventoryItems.quantity, datos.cantidad) : undefined))
      .returning({ quantity: schema.inventoryItems.quantity });
    if (actualizados.length === 0) return { ok: false as const, error: "No hay existencias suficientes para esa salida." };
    await tx.insert(schema.inventoryTransactions).values({
      itemId: articulo.id,
      transactionType: datos.tipo,
      quantity: datos.cantidad,
      assignedToUserId: datos.responsableId,
      performedByUserId: actor.actorId,
      notes: datos.notas.trim().slice(0, 500) || null
    });
    return { ok: true as const, mensaje: `Movimiento registrado: quedan ${actualizados[0]!.quantity}.` };
  });
}
