/**
 * Qué ofrece el botón «+» de cada pantalla del panel. Sin React ni íconos, para poder probarlo
 * (`tests/unit/atajos-por-rol.test.ts`): cada opción lleva a una pantalla que quien la ve puede abrir.
 */

export type OpcionDelBotonMas = Readonly<{
  href: string;
  etiqueta: string;
  ayuda: string;
  /** El ícono lo pone el botón (`QuickCreateFab`); aquí solo cuál. */
  icono: "ciudadano" | "incidencia" | "evento" | "aviso" | "peticion";
  color: string;
}>;

/**
 * Registrar ciudadanos es lo que más se hace y no estaba en el botón (F2): quien lidera no lo tenía ni en
 * la barra de abajo. Lo ve quien puede abrir el alta (`/crm/nuevo` en `capacidades.ts`), la misma lista con
 * la que la pantalla deja entrar.
 */
const CIUDADANO: OpcionDelBotonMas = {
  href: "/crm/nuevo",
  etiqueta: "Ciudadano",
  ayuda: "Registrar a una persona en el directorio",
  icono: "ciudadano",
  color: "#059669"
};

/**
 * Las dos opciones las puede usar la misma gente: quien coordina (administración o quien lidera
 * un equipo). Es la condición con que la API acepta una incidencia y con que la Agenda deja crear
 * una actividad, y la calcula el servidor. Antes cada opción llevaba su lista de roles: «Evento o
 * actividad» se ofrecía también a capturista y brigadista, que llegaban a la Agenda y no se abría
 * nada, sin ningún mensaje (C7). Y una lista de roles se equivoca con quien lidera un equipo sin
 * tener rol de mando.
 */
const OPCIONES: readonly OpcionDelBotonMas[] = [
  {
    href: "/mapa?crear=incidencia",
    etiqueta: "Incidencia",
    ayuda: "Bache, fuga, alumbrado, emergencia…",
    icono: "incidencia",
    color: "#dc2626"
  },
  {
    href: "/equipo?crear=evento",
    etiqueta: "Evento o actividad",
    ayuda: "Mitin, plática, brigada, visita…",
    icono: "evento",
    color: "#2563eb"
  }
];

/**
 * Quien no coordina (capturista, brigadista) no levanta incidencias completas, pero sí avisa de un bache o
 * una fuga: el aviso le llega a su líder para que lo acepte (plan de auditoría de menús, D9 y D12). Antes el
 * brigadista no tenía botón y la pantalla de Escucha Social le decía «es una incidencia» sin darle cómo.
 */
const AVISO: OpcionDelBotonMas = {
  href: "/avisar-incidencia",
  etiqueta: "Avisar de una incidencia",
  ayuda: "Bache, fuga, luminaria… le llega a tu líder",
  icono: "aviso",
  color: "#d97706"
};

/**
 * Lo que pide o propone un vecino (plan de auditoría de menús, F3.6 y D12): lo anotan los cinco perfiles,
 * también el brigadista en la calle sin la ficha a la mano. Abre el formulario de Escucha Social, que empieza
 * por «¿Quién lo pide?» para que quede en la ficha del vecino.
 */
const PETICION: OpcionDelBotonMas = {
  href: "/escucha-social?nueva=1",
  etiqueta: "Petición de un vecino",
  ayuda: "Lo que te pide o propone un vecino",
  icono: "peticion",
  color: "#7c3aed"
};

/**
 * Ciudadano primero (lo que más se hace); con una sola opción, el botón lleva directo a ella.
 * `puedeAvisar`: abre `/avisar-incidencia`; solo se ofrece a quien no coordina (quien coordina tiene la
 * incidencia completa). `puedeAnotarPeticion`: abre `/escucha-social` (hoy, los cinco perfiles).
 */
export function opcionesDelBotonMas(puedeCoordinar: boolean, puedeRegistrar: boolean, puedeAvisar = false, puedeAnotarPeticion = false): OpcionDelBotonMas[] {
  return [
    ...(puedeRegistrar ? [CIUDADANO] : []),
    ...(puedeCoordinar ? OPCIONES : puedeAvisar ? [AVISO] : []),
    ...(puedeAnotarPeticion ? [PETICION] : [])
  ];
}
