/**
 * Las pestañas del perfil y cuál se abre con `?pestana=` (plan de auditoría de menús, fase 7). Ajustes se retiró
 * y `/settings` lleva a `/perfil?pestana=seguridad`: el nombre y la contraseña viven ahí. «Seguridad» solo existe
 * en el perfil propio; en el de otra persona, o con una pestaña que no hay, se abre la primera.
 */
export const PESTANAS_DEL_PERFIL = ["contactos", "agenda", "territorio", "seguridad"] as const;

export type PestanaDelPerfil = (typeof PESTANAS_DEL_PERFIL)[number];

const esPestana = (v: unknown): v is PestanaDelPerfil => (PESTANAS_DEL_PERFIL as readonly unknown[]).includes(v);

export function pestanaInicial(pedida: string | string[] | undefined, esPropio: boolean): PestanaDelPerfil {
  const p = Array.isArray(pedida) ? pedida[0] : pedida;
  if (!esPestana(p)) return "contactos";
  if (p === "seguridad" && !esPropio) return "contactos";
  return p;
}
