import { requirePageAccess } from "@/lib/authorization";
import { leerFiltrosDeCobertura } from "@/lib/estructura-electoral";
import { coberturaPorSeccion, municipioDeCobertura } from "@/lib/estructura-electoral-servicio";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { getServerSession } from "@/lib/session-server";

import EstructuraClient from "./EstructuraClient";

export const dynamic = "force-dynamic";

/**
 * Estructura Electoral (plan de auditoría de menús, fase 4): qué secciones del municipio tienen coordinación,
 * representante general y representantes de casilla, y quién. Antes era una tabla de nombramientos sin
 * cobertura, que mandaba las 3,791 secciones al navegador y no dejaba quitar ni cambiar a nadie.
 *
 * - El maestro elige municipio (`?municipio=`); los demás ven el suyo.
 * - `?filtro=` (sin_coordinador, sin_rg, sin_rc, completas) y `?page=`. El buscador no va en la dirección.
 * - Dirección y líder cuentan solo su estructura (D11).
 */
export default async function EstructuraPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePageAccess("/estructura-electoral");
  const session = await getServerSession();
  const alcance = await resolveUserNetworkScope(session.userId);
  const sp = await searchParams;
  const pedido = Array.isArray(sp.municipio) ? sp.municipio[0] : sp.municipio;
  const municipio = await municipioDeCobertura(alcance, alcance.isMaster ? pedido : null);
  const filtros = { ...leerFiltrosDeCobertura(sp), q: "" };

  return (
    <EstructuraClient
      inicial={await coberturaPorSeccion(alcance, municipio, filtros)}
      filtrosIniciales={filtros}
      esMaestro={alcance.isMaster}
    />
  );
}
