import { eq } from "drizzle-orm";

import { schema } from "@tonala/shared/database";

import { requirePageAccess } from "@/lib/authorization";
import { veCiudadano } from "@/lib/contact-visibility";
import { getDatabaseClient } from "@/lib/db-client";
import { leerFiltrosDePeticiones } from "@/lib/escucha-social";
import { listarPeticiones, obtenerPeticion } from "@/lib/escucha-social-servicio";
import { esUuid } from "@/lib/ids";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";
import { getServerSession } from "@/lib/session-server";

import EscuchaSocialClient from "./EscuchaSocialClient";

export const dynamic = "force-dynamic";

/**
 * Escucha Social (plan de auditoría de menús, fase 3): lo que pide o propone un vecino, ligado a él.
 *
 * - `?nueva=1` abre el formulario (el «+»); con `&contacto=<id>` llega con el vecino elegido (la ficha).
 * - `?peticion=<id>` abre esa petición (el globo del mapa, la ficha).
 * - Quien coordina abre en «Pendientes» (lo que hay que atender); el resto, en «Las que anoté» (F3.6).
 */
export default async function EscuchaSocialPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // La guarda común, como el resto del panel (M9).
  await requirePageAccess("/escucha-social");
  const session = await getServerSession();
  const alcance = await resolveUserNetworkScope(session.userId);
  const sp = await searchParams;
  const uno = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);

  const coordina = alcance.isAdmin || alcance.isLeader;
  const hayFiltrosEnLaDireccion = ["vista", "estado", "mias", "page", "pagina"].some((k) => uno(k) !== undefined);
  const porOmision = hayFiltrosEnLaDireccion ? {} : coordina ? { estado: "pendiente" as const } : { mias: true };
  const filtros = { ...leerFiltrosDePeticiones(sp), q: "", ...porOmision };

  // El vecino que llega elegido desde su ficha: solo si quien entra lo puede ver.
  const contactoId = uno("contacto");
  let vecino: { id: string; nombre: string } | null = null;
  if (contactoId && esUuid(contactoId) && (await veCiudadano(alcance, contactoId))) {
    const [c] = await getDatabaseClient().select({ nombre: schema.contacts.displayName }).from(schema.contacts).where(eq(schema.contacts.id, contactoId)).limit(1);
    if (c) vecino = { id: contactoId, nombre: c.nombre };
  }
  const peticionId = uno("peticion");
  const peticion = peticionId ? await obtenerPeticion(alcance, peticionId) : null;

  return (
    <EscuchaSocialClient
      inicial={await listarPeticiones(alcance, filtros)}
      filtrosIniciales={filtros}
      abrirNueva={uno("nueva") === "1"}
      vecinoInicial={vecino}
      peticionInicial={peticion}
      peticionNoEncontrada={Boolean(peticionId) && !peticion}
      esAdministracion={alcance.isAdmin}
      coordina={coordina}
      usuarioId={session.userId}
    />
  );
}
