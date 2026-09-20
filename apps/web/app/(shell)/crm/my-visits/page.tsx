import { permanentRedirect } from "next/navigation";

/**
 * Esta pantalla duplicaba /equipo/mis-visitas: la misma API y la misma lista, pero
 * colgando del layout de /crm y por tanto con otras reglas de entrada. Dos pantallas
 * para lo mismo acaban divergiendo, así que queda la de la Agenda Operativa, que es
 * donde el brigadista trabaja, y aquí solo se redirige a quien llegue por un enlace
 * o un marcador viejo.
 */
export default function MisVisitasRedirect(): never {
  permanentRedirect("/equipo/mis-visitas");
}
