import { and, asc, count, eq, ne, or, sql, type SQL } from "drizzle-orm";

import { patronDeBusqueda, schema, sinAcentosSql } from "@tonala/shared/database";

import { condicionDeCuentasGobernadas } from "./alcance-municipal";
import { getDatabaseClient } from "./db-client";
import { buscarMunicipio } from "./municipios-jalisco";
import type { UserNetworkScope } from "./network-hierarchy";
import { POR_PAGINA_USUARIOS, type FiltrosDeUsuarios } from "./usuarios-filtros";

/**
 * La lista de «Usuarios y permisos»: una página de las cuentas que esta administración ve, con sus filtros. La
 * usan la pantalla (la primera página, los conteos y las solicitudes) y `POST /api/admin/usuarios/consulta` (el
 * buscador, los filtros y las páginas siguientes). Antes vivía en la pantalla y el buscador viajaba en la
 * dirección web (observación O2 del plan de auditoría de menús).
 */

export type FilaDeUsuario = {
  userId: string;
  displayName: string;
  email: string;
  municipio: string;
  municipioTipo: string;
  status: string;
  roleId: string;
  roleKey: string;
  roleName: string;
  esMaestro: boolean;
  /** Si esta sesión la gobierna (`gobierno-de-cuentas.ts`): solo entonces salen sus acciones. */
  gobernable: boolean;
};

export type PaginaDeUsuarios = { filas: FilaDeUsuario[]; total: number; totalPaginas: number; pagina: number };

/**
 * Qué cuentas se ven: el maestro, todas (con filtro de municipio si lo pide); un administrador municipal, las de
 * su municipio; uno que sigue sin municipio, ninguna. `filtroMunicipio` es el municipio que de verdad se aplicó
 * (uno inventado se ignora).
 */
export function cuentasVisibles(alcance: UserNetworkScope, municipioPedido: string): { visibles: SQL; filtroMunicipio: string } {
  const { userProfiles } = schema;
  const filtroMunicipio = alcance.isMaster ? (municipioPedido === "general" ? "general" : (buscarMunicipio(municipioPedido)?.name ?? "")) : "";
  const municipioPropio = alcance.isMaster ? null : alcance.adminMunicipalityId;
  const visibles: SQL = alcance.isMaster
    ? filtroMunicipio === "general"
      ? sql`${userProfiles.municipalityId} = (SELECT id FROM municipalities WHERE kind = 'general')`
      : filtroMunicipio
        ? sql`${userProfiles.municipalityId} = (SELECT id FROM municipalities WHERE name = ${filtroMunicipio} AND kind = 'municipio')`
        : sql`true`
    : municipioPropio
      ? eq(userProfiles.municipalityId, municipioPropio)
      : sql`false`;
  return { visibles, filtroMunicipio };
}

export async function consultarUsuarios(alcance: UserNetworkScope, f: FiltrosDeUsuarios): Promise<PaginaDeUsuarios> {
  const db = getDatabaseClient();
  const { userProfiles, roles } = schema;
  const { visibles } = cuentasVisibles(alcance, f.municipio);
  // La misma regla con la que actúan las acciones, para enseñar los botones solo donde valen.
  const gobernable = sql<boolean>`(${condicionDeCuentasGobernadas(alcance)})`;

  // Las solicitudes pendientes van aparte (y completas), fuera de la lista paginada.
  const filtros: SQL[] = [ne(userProfiles.status, "pending"), visibles];
  if (f.estado !== "todos") filtros.push(eq(userProfiles.status, f.estado));
  // Un rol que no existe se ignora, como antes.
  if (f.rol) {
    const [existe] = await db.select({ key: roles.key }).from(roles).where(eq(roles.key, f.rol)).limit(1);
    if (existe) filtros.push(eq(roles.key, f.rol));
  }
  if (f.q) {
    const patron = patronDeBusqueda(f.q);
    filtros.push(or(sql`${sinAcentosSql(userProfiles.displayName)} LIKE ${patron}`, sql`lower(${userProfiles.email}) LIKE ${patron}`)!);
  }
  const filtro = and(...filtros);

  const [encontrados] = await db.select({ total: count() }).from(userProfiles).innerJoin(roles, eq(roles.id, userProfiles.roleId)).where(filtro);
  const total = Number(encontrados?.total ?? 0);
  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA_USUARIOS));
  const pagina = Math.min(f.pagina, totalPaginas);

  const filas = await db
    .select({
      userId: userProfiles.id,
      displayName: userProfiles.displayName,
      email: userProfiles.email,
      municipio: schema.municipalities.name,
      municipioTipo: schema.municipalities.kind,
      status: userProfiles.status,
      roleId: userProfiles.roleId,
      roleKey: roles.key,
      roleName: roles.name,
      esMaestro: userProfiles.isMasterAdmin,
      gobernable
    })
    .from(userProfiles)
    .innerJoin(roles, eq(roles.id, userProfiles.roleId))
    .innerJoin(schema.municipalities, eq(schema.municipalities.id, userProfiles.municipalityId))
    .where(filtro)
    .orderBy(asc(userProfiles.displayName), asc(userProfiles.id))
    .limit(POR_PAGINA_USUARIOS)
    .offset((pagina - 1) * POR_PAGINA_USUARIOS);

  return {
    filas: filas.map((u) => ({ ...u, esMaestro: Boolean(u.esMaestro), gobernable: Boolean(u.gobernable) })),
    total,
    totalPaginas,
    pagina
  };
}
