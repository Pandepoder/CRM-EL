import { requirePageAccess } from "@/lib/authorization";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Dirección entra al directorio porque es donde ve a los contactos de los
  // equipos que le asignaron; el listado ya viene acotado a su alcance, así que
  // aquí no ve nada que no le corresponda. Antes quedaba fuera y el menú lateral
  // le ofrecía "Directorio Ciudadano" para después rebotarla a /resumen.
  //
  // El brigadista consulta el padrón —permissions.ts le da ContactsRead a
  // propósito— pero no da de alta ciudadanos: el alta se cierra en
  // crm/nuevo/page.tsx, no aquí, para que las pantallas de lectura le queden
  // abiertas.
  //
  // Todo lo que cuelga de /crm es el Directorio (la lista, la ficha y las redirecciones viejas):
  // entra quien puede abrir el Directorio, según ACCESO_A_PANTALLAS.
  await requirePageAccess("/crm/contacts");
  return <>{children}</>;
}
