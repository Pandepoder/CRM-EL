import { permanentRedirect } from "next/navigation";

/**
 * Pantalla retirada (M14). Listaba los ciudadanos asignados a quien la abría, pero no estaba en el
 * menú —solo se llegaba desde /equipo/mis-visitas y viceversa— y usaba tres clases CSS que no
 * existen, así que se veía sin estilos. Lo mismo está ahora en el Directorio, con el filtro
 * «Asignados a mí». Aquí solo se redirige a quien llegue por un enlace o un marcador viejo.
 */
export default function MisContactosRetirada(): never {
  permanentRedirect("/crm/contacts?asignados=mios");
}
