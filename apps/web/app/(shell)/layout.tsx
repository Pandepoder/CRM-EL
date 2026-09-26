import { redirect } from "next/navigation";

import { eq } from "drizzle-orm";
import { cache } from "react";

import { schema } from "@tonala/shared/database";

import { ShellWrapper } from "@/components/ShellWrapper";
import { getDatabaseClient } from "@/lib/db-client";
import { actorFromSession } from "@/lib/api-helpers";
import { RUTA_SESION_INACTIVA } from "@/lib/authorization";
import { getServerSession } from "@/lib/session-server";
import { municipioDelUsuario } from "@/lib/municipio-usuario";
import { resolveUserNetworkScope } from "@/lib/network-hierarchy";

/**
 * Nombre visible del rol. La barra lateral lo tomaba de la cookie, así que a quien le cambiaban
 * el rol le seguía diciendo el anterior aunque el menú ya fuera el nuevo.
 */
const nombreDelRol = cache(async (roleKey: string): Promise<string> => {
  if (!roleKey) return "";
  const [rol] = await getDatabaseClient()
    .select({ name: schema.roles.name })
    .from(schema.roles)
    .where(eq(schema.roles.key, roleKey))
    .limit(1);
  return rol?.name || "";
});

/** Foto de perfil (3.6): la barra lateral la enseña en lugar de las iniciales. */
const fotoDelUsuario = cache(async (userId: string): Promise<string | null> => {
  const [u] = await getDatabaseClient()
    .select({ foto: schema.userProfiles.photoUrl })
    .from(schema.userProfiles)
    .where(eq(schema.userProfiles.id, userId))
    .limit(1);
  return u?.foto ?? null;
});

/** Nombre del despliegue para quien todavía no tiene municipio asignado. */
const NOMBRE_POR_OMISION = process.env.NEXT_PUBLIC_APP_NAME || "Jalisco OS";

/**
 * La pestaña del navegador dice el municipio de quien entró, igual que la barra lateral.
 * municipioDelUsuario está envuelto en cache(), así que esto no cuesta una consulta extra.
 */
export async function generateMetadata() {
  const session = await getServerSession();
  const municipio = session.isLoggedIn && session.userId ? await municipioDelUsuario(session.userId) : null;
  return { title: municipio ? `${municipio} OS` : NOMBRE_POR_OMISION };
}

export default async function ShellLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession();
  if (!session.isLoggedIn) {
    redirect("/login");
  }
  // Una cuenta dada de baja con la sesión abierta no entra a ninguna pantalla del panel, tenga o no
  // su propia guarda: Escucha Social no la tenía y se abría. `actorFromSession` está memoizada por
  // petición, así que las guardas de cada pantalla no repiten la consulta.
  if (!(await actorFromSession())) {
    redirect(RUTA_SESION_INACTIVA);
  }

  // El municipio se lee de la base y no de la cookie de sesión: si administración corrige el
  // municipio de alguien, se ve en su siguiente vista y no hasta que vuelva a iniciar sesión.
  const municipio = session.userId ? await municipioDelUsuario(session.userId) : null;

  // El rol, por el mismo motivo. La cookie conserva el rol que tenía al entrar, mientras que las
  // guardas de cada pantalla lo resuelven contra la base: a quien le cambian el rol le quedaba un
  // menú que ya no le corresponde, con entradas que al pulsarlas la rebotaban a su inicio (o sin
  // las que sí puede abrir). resolveUserNetworkScope está memoizada con cache(), así que en las
  // pantallas que de todas formas la piden esto no cuesta una consulta extra.
  const alcance = session.userId ? await resolveUserNetworkScope(session.userId) : null;
  const rolVigente = alcance?.roleKey || session.roleKey;
  // El maestro es una cuenta de administración con su marca (0023): se dice lo que es.
  const etiquetaDelRol = alcance?.isMaster ? "Administrador maestro" : (await nombreDelRol(rolVigente)) || session.roleName;
  // La misma condición con la que la API deja levantar incidencias y registrar actividades
  // (`requireLiderParaIncidencias`, `/equipo`): incluye a quien lidera un equipo aunque su rol
  // no sea de mando. El botón de crear se decidía por una lista de roles y ofrecía «Evento o
  // actividad» a quien no podía crearla (C7).
  const puedeCoordinar = Boolean(alcance && (alcance.isAdmin || alcance.isLeader));
  const foto = session.userId ? await fotoDelUsuario(session.userId) : null;

  return (
    <ShellWrapper
      userId={session.userId}
      userDisplayName={session.displayName}
      userPhotoUrl={foto}
      userRoleLabel={etiquetaDelRol}
      userRoleKey={rolVigente}
      esMaestro={Boolean(alcance?.isMaster)}
      puedeCoordinar={puedeCoordinar}
      municipality={municipio}
      appName={NOMBRE_POR_OMISION}
    >
      {alcance?.isAdmin && !alcance.isMaster && !alcance.adminMunicipalityId ? (
        // Etapa 6: un administrador que la 0022 dejó en General no ve nada del padrón. Se dice en
        // todas las pantallas, no solo en las que quedan vacías.
        <p role="status" className="mx-4 mt-4 md:mx-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-950">
          Tu cuenta de administración todavía no tiene municipio: hasta que el administrador maestro te lo asigne, solo ves lo
          tuyo.
        </p>
      ) : null}
      {children}
    </ShellWrapper>
  );
}
