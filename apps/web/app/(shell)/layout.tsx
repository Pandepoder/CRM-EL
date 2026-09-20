import { redirect } from "next/navigation";

import { eq } from "drizzle-orm";
import { cache } from "react";

import { schema } from "@tonala/shared/database";

import { ShellWrapper } from "@/components/ShellWrapper";
import { getDatabaseClient } from "@/lib/db-client";
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
  const etiquetaDelRol = (await nombreDelRol(rolVigente)) || session.roleName;

  return (
    <ShellWrapper
      userDisplayName={session.displayName}
      userRoleLabel={etiquetaDelRol}
      userRoleKey={rolVigente}
      municipality={municipio}
      appName={NOMBRE_POR_OMISION}
    >
      {children}
    </ShellWrapper>
  );
}
