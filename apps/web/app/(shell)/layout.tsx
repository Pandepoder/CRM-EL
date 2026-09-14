import { redirect } from "next/navigation";

import { ShellWrapper } from "@/components/ShellWrapper";
import { getServerSession } from "@/lib/session-server";
import { municipioDelUsuario } from "@/lib/municipio-usuario";

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

  return (
    <ShellWrapper
      userDisplayName={session.displayName}
      userRoleLabel={session.roleName}
      userRoleKey={session.roleKey}
      municipality={municipio}
      appName={NOMBRE_POR_OMISION}
    >
      {children}
    </ShellWrapper>
  );
}
