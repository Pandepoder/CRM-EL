/**
 * Los pasos de «Primeros pasos» por rol (L1 del plan de experiencia sencilla). Sin React, para poder probar
 * que cada rol solo lea de pantallas y botones que tiene (`tests/unit/atajos-por-rol.test.ts`).
 */

export type Paso = { texto: string; enlace?: { href: string; etiqueta: string } };

const BARRA = "La barra de abajo te lleva a lo que más usas; «Más» abre el menú completo.";

export const PASOS: Readonly<Record<string, readonly Paso[]>> = {
  visit_responsible: [
    { texto: "En la Agenda llega lo que tu líder te asigna. Toca una tarjeta para ver qué hacer y, al terminar, registra cómo te fue. La barra de abajo te lleva a lo que más usas; «Más» abre el menú completo." },
    { texto: "En el Directorio están tus ciudadanos asignados, con botones para llamar, mandar WhatsApp o ver cómo llegar.", enlace: { href: "/crm/contacts?asignados=mios", etiqueta: "Ver mis asignados" } },
    { texto: "Comparte tu QR (en el Directorio, «Mi Enlace y QR») y los vecinos se registran solos a tu nombre." },
    { texto: "¿Ves un bache, una fuga o una luminaria apagada? Toca el botón + de abajo a la derecha para avisar de una incidencia: le llega a tu líder. Ahí mismo anotas lo que te pide un vecino.", enlace: { href: "/avisar-incidencia", etiqueta: "Avisar de una incidencia" } }
  ],
  capturist: [
    { texto: "Para registrar a alguien toca «Registrar» en la barra de abajo (solo lo marcado con * es obligatorio). Con el botón + de abajo a la derecha también puedes avisar de una incidencia en la calle (le llega a tu líder) o anotar lo que te pide un vecino.", enlace: { href: "/avisar-incidencia", etiqueta: "Avisar de una incidencia" } },
    { texto: "En el Directorio buscas por nombre, teléfono, colonia o número de sección." },
    { texto: "¿Sin señal? No pasa nada: el registro se guarda en tu teléfono y se envía solo cuando vuelve la conexión." },
    { texto: "«Mi día» te dice cuánto llevas hoy y qué insignia está cerca. Tócala para verlas todas." }
  ],
  territorial_coordinator: [
    { texto: "El Resumen te dice cómo va tu equipo hoy: registros, visitas e incidencias." },
    { texto: "En la Agenda, «Nueva actividad» organiza visitas, reuniones y brigadas, y las asigna a tu gente.", enlace: { href: "/equipo", etiqueta: "Ir a la Agenda" } },
    { texto: "El botón + de abajo a la derecha registra a un ciudadano, levanta una incidencia, crea un evento o anota lo que te pide un vecino, desde cualquier pantalla." },
    { texto: "En Equipos aceptas a quien se suma con tu QR de brigada.", enlace: { href: "/admin-equipos", etiqueta: "Ir a Equipos" } }
  ],
  direction: [
    { texto: "El Resumen te dice cómo van tus equipos hoy; el Análisis, quiénes son y dónde están tus ciudadanos." },
    { texto: "En Equipos ves tus brigadas y a sus integrantes, y puedes reacomodarlos.", enlace: { href: "/admin-equipos", etiqueta: "Ir a Equipos" } },
    { texto: "El botón + de abajo a la derecha registra a un ciudadano, levanta una incidencia, crea un evento o anota lo que te pide un vecino, desde cualquier pantalla." },
    { texto: BARRA }
  ],
  admin: [
    { texto: "El Resumen te da el pulso del día; el Análisis, el padrón en números." },
    { texto: "En Usuarios y permisos das de alta cuentas, cambias roles y apruebas solicitudes.", enlace: { href: "/admin-usuarios", etiqueta: "Ir a Usuarios" } },
    { texto: "En Equipos armas las brigadas: arrastra a las personas en la vista de tablero.", enlace: { href: "/admin-equipos?vista=tablero", etiqueta: "Abrir el tablero" } },
    { texto: "El botón + de abajo a la derecha registra a un ciudadano, levanta una incidencia, crea un evento o anota lo que te pide un vecino, desde cualquier pantalla." }
  ]
};

/**
 * Al pie de los pasos, para todos los roles: que sepan desde el primer día que pueden avisar si algo falla
 * (§9 del plan). Va aparte de los cuatro pasos para no alargar la lista.
 */
export const PIE_PARA_REPORTAR: Paso = {
  texto: "¿Algo falla o no se entiende? Toca «Reportar este problema» en el aviso, o búscalo en el menú (en el teléfono, en «Más»).",
  enlace: { href: "/reportar-problema", etiqueta: "Reportar un problema" }
};

/** Los pasos de un rol, o null si no tiene (no se enseña la tarjeta). */
export function pasosDe(rol: string): readonly Paso[] | null {
  return PASOS[rol] ?? null;
}
