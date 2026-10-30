# Plan: que cada menú sirva para lo que dice

> Fecha: 2026-10-15 · Rama: `claude/crm-intuitive-improvements-e7fe1b` · **Estado: aprobado el 2026-10-15 (D1 a D12, todas
> con la opción recomendada); implementado completo (fases 0 a 8) el 2026-10-18, sin commit ni PR.**
> **Verificado dos veces el 2026-10-15** contra el código, los datos de la copia del simulacro y las pruebas; lo
> que la segunda revisión corrigió está en el §19. Lo hecho en cada fase, en el §18; lo que cambió al hacerlo, en
> el §20; lo que queda, en el §21.
> Antes de empezar hacen falta las decisiones del dueño (§3). Quién ve y quién hace qué: §4. Privacidad: §5.
> Casos de uso de cada menú: §6. Qué tiene que cumplir para no ser difícil: §7. Cómo se prueba: §8. Fases: §9.
> Cómo se ve: §10. Documentación para trabajar con IA: §17.

---

## 0. En palabras sencillas

Hoy el trabajo de diario (Directorio, Registrar, Agenda, Mapa, Resumen, Equipos, Usuarios) funciona. Lo que
falla son cinco menús que se ven terminados pero no hacen lo que prometen, algunos datos que se muestran mal y
un hueco de privacidad en Logística. Este plan:

1. **Corrige lo que muestra información equivocada** (fase 1).
2. **Junta las incidencias en una sola pantalla con buscador y filtros** (fase 2), y le da a capturistas y
   brigadistas una forma de avisar de un bache o una fuga, que hoy no tienen (si se aprueba D9).
3. **Completa Escucha Social** (fase 3): cada petición ligada al vecino, en su ficha, en el mapa y sin señal.
4. **Rehace Estructura Electoral alrededor de la cobertura** (fase 4).
5. **Hace usable Logística y cierra su hueco de privacidad** (fase 5).
6. **Aligera el perfil** (fase 6).
7. **Quita lo que es de adorno y limpia** (fase 7).
8. **Deja documentación para que cualquier IA o persona arregle sin romper** (fase 8, y en cada fase).

Tres cosas atraviesan todo el plan y tienen su propia sección:

- **Cada rol ve solo lo suyo y solo los botones que puede usar** (§4). Lo que una persona no puede hacer no
  le aparece; lo que ve pero no le toca dice por qué, en una línea.
- **Privacidad** (§5): ningún nombre, teléfono ni domicilio aparece a quien no puede ver a esa persona; el
  recorte se hace en el servidor, no solo en la pantalla; lo delicado queda en la auditoría.
- **Fácil** (§6 y §7): cada menú se diseña a partir de lo que la gente hace con él, con un número máximo de
  toques por tarea que se mide en el teléfono.

Nada se borra de la base de datos. Las migraciones solo agregan.

---

## 1. De dónde sale: la auditoría del 2026-10-15

Se leyó el código de cada pantalla y se abrieron las 24 pantallas del panel con los cinco roles en la copia
del simulacro (`tonala_os_simulacro`, en `:3300`). Cada rol abre lo que debe; ninguna pantalla rebota sin
razón (las que tienen `loading.tsx` responden 200 y redirigen dentro de la página: se comprobó con la
dirección en «Usuarios y permisos», que la lleva al Resumen).

| # | Hallazgo | Evidencia | Fase |
|---|---|---|---|
| A1 | «Todos los reportes» lista actividades de la Agenda como incidencias | `admin-inbox/page.tsx` filtra solo con `incidentScopeCondition`, sin `isNull(activityTypeId)`. En pantalla: «[Brigada de Campo] Brigada de prueba… Actividad de agenda» (69 actividades en la copia). Incidencias e Historial sí las excluyen | 1 y 2 |
| A2 | «Áreas de participación» (Análisis) muestra claves y combinaciones | Los dos formularios guardan una clave corta (`Vecinal`, `Deporte`…) y Análisis y el Directorio la enseñan tal cual; los datos importados o de prueba traen listas con comas que cuentan como un área aparte | 1 |
| A3 | El perfil de quien no lidera inventa un equipo | `perfil/[id]/page.tsx` arma `{ id: <id de la persona>, name: "Equipo de <nombre>" }`. Comprobado: el capturista de prueba ve «Equipo de Raúl», y «Ver su Equipo» lleva a `/admin-equipos/<su propio id>`, que no existe y lo rebota al Directorio | 1 |
| A4 | Escucha Social rotula mal categorías y le falta una pestaña | La API acepta cualquier categoría (en la copia hay una «queja», que se pinta como «Idea / Propuesta»); «Gestión de Servicio Público» no tiene pestaña | 1 |
| A5 | Escucha Social calla los errores y no deja borrar notas | `handleUpdateStatus` no avisa si falla; manda `resolutionNotes \|\| <las de antes>`, así que vaciar las notas no las borra | 1 |
| A6 | **Capturista y brigadista no tienen por dónde avisar de un bache o una fuga** | Escucha Social les dice «si es un problema en la calle, es una incidencia», pero `POST /api/map/reports` (`requireLiderParaIncidencias`: administración o quien lidera) les responde «Repórtasela a tu líder». El brigadista ni siquiera tiene botón «+» (`QuickCreateFab` no se pinta sin opciones) | 1 y 2 |
| B1 | Ajustes es de adorno | `SettingsClient.tsx`: nada se guarda; promete correo, 2FA y sesiones que no existen | 7 |
| B2 | Estructura Electoral no sirve para organizar la estructura | Sin cobertura por sección; no se quita ni se cambia a nadie (solo existe `POST`); solo cuentas, no ciudadanos; «Nueva Sección» no crea secciones (las 3,791 del INE ya existen); carga las 3,791 secciones (496 KB); la tabla se corta en el teléfono; la API no valida rol ni sección | 4 |
| B2b | Los roles de la estructura se guardan con dos vocabularios | En la copia: `Representante General (RG)` (35) y `Representante de Casilla (RC)` (75), de `scripts/db/generate-metropolitan-sections.ts`; la pantalla guarda `coordinador`, `representante_general`, `representante_casilla` | 4 |
| B3 | «Todos los reportes» repite Incidencias e Historial sin dejar actuar | Solo lectura, sin estado, responsable ni filtros | 2 |
| B4 | Logística a medias | Buscador sin efecto; sin almacén por artículo; sin editar, archivar, devoluciones ni «quién tiene qué»; historial de 8; «Salidas recientes» no se mide por fecha; la página mide 403 px en un teléfono de 375 | 5 |
| C1 | Escucha Social no queda ligada al vecino | Ni se elige ni se muestra (141 de 223 ya lo tienen en la base); no sale en la ficha ni en el mapa; no guarda sin señal; «gestión formal» no lleva a nada; carga todo de golpe | 3 |
| C2 | Incidencias sin filtros ni responsable | Sin buscador; no dice quién reportó, a quién se asignó ni cuántos días lleva; no se reasigna desde la lista | 2 |
| C3 | Dos formularios para levantar una incidencia | `/reportes` asigna equipo y persona; el del mapa, solo persona | 2 |
| C4 | Historial de incidencias no cabe en el teléfono | Tabla con desplazamiento lateral (el botón de reabrir queda fuera); «Cancelada» siempre en 0 | 2 |
| C5 | El perfil carga todo de golpe | Líder con 286 ciudadanos: 1,306 KB; actividades clasificadas adivinando por el título | 6 |
| C6 | **«Levantar incidencia» y el asignador de sección cargan o buscan secciones a mano** | `/reportes` manda las 3,791 secciones al navegador (341 KB). Ella y el asignador de sección de Incidencias tienen «registrar nueva sección», que en realidad busca una sección del catálogo que no estaba en la lista (`POST /api/electoral/sections` solo actualiza una que ya existe) | 2 |
| P1 | **Logística enseña nombres de otra dirección** | **Comprobado en la copia:** en Zapopan hay dos direcciones y un almacén. La de Zapopan Norte ve en el historial 5 nombres de personas que no son de su estructura; la del Distrito 10, 0. La causa: dirección ve todos los almacenes de su municipio y el historial pinta el nombre de cualquier responsable. Rompe «nunca lo de otra dirección» | 5 |
| D1 | Bandeja de mensajes sin pantalla | `AdminInboxClient.tsx`, `admin-inbox/actions.ts` e `inbox-deps.ts` no los importa nadie; 240 mensajes de prueba en `inbox_messages` | 7 |
| D2 | Textos legales viejos | Términos y Privacidad dicen «Tonalá OS» | 7 |
| D3 | Restos de código | `@ts-ignore` en imports de íconos (Estructura y Ajustes); `try/catch` de «la tabla aún no existe»; `/api/admin/sections` (GET y POST) sin nadie que lo llame | 4 y 7 |

**Observaciones que el plan no cambia** (se documentan para que el dueño las conozca):

- **O1.** Lo que entra «Por aceptar» lo puede aceptar cualquiera que pueda trabajarlo, incluido el líder que lo
  levantó (`puedeSobreIncidencia` deja actualizar al autor). Solo administración y dirección dan de alta
  directo como aceptadas. Si se quiere que el líder no se acepte a sí mismo, es otra decisión.
- **O2.** El Directorio y «Usuarios y permisos» ponen el texto del buscador en la dirección web (`?q=`): un
  nombre puede quedar en el historial del navegador y en los registros del servidor. Las pantallas nuevas de
  este plan no lo hacen (§5.3); cambiar esas dos queda para después.
- **O3.** El selector de colonia de «Registrar ciudadano» (`ColonySelector`) descarga las 3,791 secciones con
  su conteo de ciudadanos cada vez que se abre el formulario. Funciona; es lento con mala señal. Queda para
  después.
- **O4.** Borrar una incidencia (`DELETE /api/map/reports/[id]`, autor o administración) la borra de verdad.
  Este plan no lo usa para nada nuevo: un aviso que se retira queda como «rechazado» (F2.6).

**Dos correcciones a lo que dije en la auditoría:**

- *A2*: los formularios guardan **una** área; las combinaciones vienen de datos importados o de prueba. El
  arreglo sigue haciendo falta, pero es menos grave.
- *El proceso que corre siempre*: la proyección `walking_skeleton` es una decisión de arquitectura escrita
  (`docs/adr/ADR-010` y `ADR-011`) con pruebas de integración. **No se quita**; se documenta (§17).

---

## 2. Reglas que no se rompen

Valen para cada tarea. Si una tarea choca con una regla, gana la regla y se avisa al dueño.

1. **Sin commit ni PR hasta que el dueño lo diga.** Nunca `git add -A`. `scripts/local/` nunca va a GitHub.
2. **No se quita información.** Una pantalla que se retira redirige a donde quedó lo que enseñaba. Nada nuevo
   borra filas: retirar, archivar o quitar dejan rastro.
3. **Migraciones solo aditivas**, escritas a mano, en `_journal.json`, **aplicadas solo a la copia
   `tonala_os_simulacro`**. Cada una se corre dos veces seguidas (idempotente) y se prueba la versión anterior
   de la app contra el esquema nuevo.
4. **Quién entra lo decide `ACCESO_A_PANTALLAS`** (`packages/ui/capacidades.ts`) y cada pantalla llama a
   `requirePageAccess`. **Lo que se ve lo decide el alcance** (`resolveUserNetworkScope` y sus condiciones).
   **Lo que se puede cambiar lo decide «ver no es trabajar»** (`commandUserIds`,
   `condicionParaTrabajarPorAutor`, `incidenciasQuePuedeTrabajar`, `puedeSobreIncidencia`). Nunca se filtra a
   mano por id, y un alcance vacío filtra a «nada», nunca a «sin filtro».
5. **Lo que no se ve no existe**: id fuera del alcance → 404; UUID mal formado → 404.
6. **El servidor decide, la pantalla obedece.** Esconder un botón es comodidad; el permiso real lo vuelve a
   comprobar la API en cada petición. Toda regla del §4 tiene una prueba contra la API, no contra la pantalla.
7. **Privacidad (§5)**: listas sin teléfono, correo ni domicilio; nombres solo dentro del alcance y recortados
   en el servidor; nada personal en la dirección web; lo delicado, en la auditoría.
8. **Formularios de campo**: sin señal (`enviarOEncolar`), sin duplicados (`clientRequestId`) y siempre
   avisan qué pasó (`avisar`).
9. **Teléfono primero**: 375×812 y 375×667 sin desborde; 44 px para tocar; ventanas `z-[110]`.
10. **Fácil (§7)**: lo que no puedes hacer no aparece; cada tarea frecuente dentro de su límite de toques;
    español de todos los días.
11. **Contraseñas** nunca en el navegador; sesiones de prueba por la API desde `scripts/local/`.
12. **Los pendientes de operación pospuestos no se tocan ni se insiste en ellos.**

---

## 3. Decisiones del dueño

**Todas tomadas el 2026-10-15: el dueño eligió la opción recomendada en las doce.**

| # | Pregunta | Recomiendo | Otra opción | Fase |
|---|---|---|---|---|
| D1 | ¿Qué pasa con **Ajustes**? | **Retirarlo del menú**; `/settings` lleva a «Mi perfil → Seguridad» (nombre y contraseña, lo único real) | Construir ajustes reales, diseñados aparte | 7 |
| D2 | ¿Qué pasa con **«Todos los reportes»** e **«Historial»**? | **Juntarlos en «Incidencias»** con vistas *Por atender*, *Cerradas* y *Todas*; las direcciones viejas redirigen | Dejar «Todos los reportes» como búsqueda aparte | 2 |
| D3 | ¿Qué pasa con la **bandeja de mensajes**? | **Borrar solo el código de pantalla muerto**; tabla, datos y módulo se quedan | Construirla (requiere WhatsApp Business; fuera de este plan) | 7 |
| D4 | ¿Se puede nombrar **representante a un ciudadano del padrón**? | **Sí**, a una cuenta o a un ciudadano; primero se sugieren quienes dijeron en la encuesta que quieren ser RC | Solo cuentas, como hoy | 4 |
| D5 | ¿Se guarda **la casilla** del RC? | **Sí, opcional** | No | 4 |
| D6 | ¿Qué pide **«gestión formal»**? | **Dependencia** (obligatoria, con sugerencias), **folio** (opcional) y fecha | Solo la marca, como hoy | 3 |
| D7 | ¿Avisa Logística cuando algo **se está acabando**? | **Sí**, con un mínimo por artículo | No | 5 |
| D8 | ¿Cómo avanzo? | **Fase tras fase sin pausa**, con reporte y capturas al terminar cada una; me detengo si algo falla o cambia el plan | Detenerme al final de cada fase hasta tu visto bueno | todas |
| D9 | ¿Pueden **capturista y brigadista avisar de un problema en la calle**? | **Sí, con «Avisar de una incidencia»**: foto opcional, ubicación y tipo; entra «Por aceptar» a su brigada y lo acepta o rechaza quien la coordina. No pueden asignarlo, aceptarlo ni borrarlo; solo retirarlo mientras nadie lo acepta | **B:** que lo anoten en Escucha Social como «Problema en la calle» y el líder lo convierta con un toque. **C:** dejarlo como está y cambiar el texto a «avísale a tu líder» | 1 y 2 |
| D10 | En la **ficha del ciudadano**, ¿se ven **todas sus peticiones**, aunque las haya anotado otra persona? | **Sí: título, tipo, estado, fecha y turno**, igual que hoy la ficha enseña todas las notas del ciudadano a quien lo puede ver. Las notas de seguimiento siguen la regla de Escucha Social. Así el brigadista le contesta a la vecina «¿en qué va lo mío?» | Solo las que esa persona ya ve en Escucha Social (el brigadista, solo las suyas) | 3 |
| D11 | En Estructura, ¿la dirección y el líder **ven que una sección ya la cubre otra estructura**? | **No.** Ven y cuentan solo su estructura, como ya decide el código (`/api/admin/sections` acota los conteos «para no delatar el trabajo de las demás direcciones»). La administración municipal ve el municipio entero y es quien evita duplicados | Sí, como «Cubierta por otra estructura», sin nombre | 4 |
| D12 | ¿Cambia el **botón «+» de capturista y brigadista**? | **Sí**, si se aprueba D9. Al capturista le abre un menú de tres opciones (Ciudadano, Avisar de una incidencia, Petición de un vecino); registrar sigue a un toque en «Registrar» de la barra de abajo. El brigadista gana un «+» con dos opciones. La prueba `atajos-por-rol.test.ts` exige hoy lo contrario («el capturista tiene el alta a un toque; el brigadista, ningún botón»), así que se cambia a propósito | Dejar el «+» como está y llegar a las dos opciones nuevas desde Escucha Social | 2 y 3 |

---

## 4. Quién ve y quién hace qué

Los seis perfiles con que se diseña. **Todo lo que dice «hoy» se comprobó en el código y, donde se marca, en
la copia con las cuentas de prueba.**

| Perfil | Quién es en el sistema | Qué alcance tiene hoy |
|---|---|---|
| **Maestro** | La única cuenta con `is_master_admin` (lo exige el índice `user_profiles_un_solo_maestro_idx`) | Todo, los 125 municipios; lo que consulta de una persona o un ciudadano queda en la auditoría (`master.view`) |
| **Adm. municipal** | `admin` con municipio | Lo que tiene la llave de su municipio y lo que hizo su gente; gobierna a su gente, nunca a otro administrador |
| **Dirección** | `direction` (cuenta siempre como quien coordina: `isLeader`) | Su cascada: su coordinación, sus líderes y las brigadas de ellos; nunca otra dirección. Logística: los almacenes de su municipio |
| **Líder** | `territorial_coordinator` o quien lidera un equipo | Su brigada y lo asignado a sus equipos |
| **Capturista** | `capturist` | Lo suyo y lo de sus compañeros de brigada; lo de ellos lo ve, no lo cambia (comprobado: ve 17 peticiones, puede trabajar 4, las suyas) |
| **Brigadista** | `visit_responsible` | Solo lo suyo y lo que le asignan, a él o a su brigada (comprobado: ve 1 petición, la suya; no abre el perfil de un compañero) |

Leyenda: **✓** puede · **👁** lo ve pero no lo cambia (la pantalla dice «Solo consulta» y por qué) · **—** no
le aparece · **(D#)** depende de una decisión.

### 4.1 Pantallas: quién entra

| Pantalla | Maestro | Adm. mun. | Dirección | Líder | Capturista | Brigadista |
|---|---|---|---|---|---|---|
| Incidencias (con *Cerradas* y *Todas*) | ✓ | ✓ | ✓ | ✓ | — | — |
| Levantar incidencia completa (`/reportes`, «+») | ✓ | ✓ | ✓ | ✓ | Solo si lidera un equipo | — |
| **Avisar de una incidencia** (`/avisar-incidencia`, «+») (D9) | — | — | — | — | ✓ | ✓ |
| Escucha Social | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Estructura Electoral | ✓ | ✓ | ✓ | ✓ | — | — |
| Logística | ✓ | ✓ | ✓ | — | — | — |
| Mi perfil | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ajustes | se retira (D1) | — | — | — | — | — |

Lo que no está en la tabla no cambia de acceso. «Avisar de una incidencia» es una pantalla nueva en
`ACCESO_A_PANTALLAS` para `capturist` y `visit_responsible`; el «+» la ofrece solo a quien **no** coordina
(quien coordina ya tiene la incidencia completa).

### 4.2 Incidencias

| Acción | Maestro | Adm. mun. | Dirección | Líder | Capturista | Brigadista |
|---|---|---|---|---|---|---|
| Ver la lista de Incidencias | Todas | Su municipio y lo de su gente | Su cascada | Su brigada y lo asignado a sus equipos | — | — |
| Ver en el mapa (hoy) | Todas | igual que la lista | igual | igual | Las que levantó o le asignan, a él o a su brigada | igual (comprobado: 29) |
| Trabajar una que le asignaron, a él o a su equipo (hoy, desde el mapa) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Aceptar, cambiar estado o sección | ✓ | ✓ en su alcance | ✓ las de su mando | ✓ las de su brigada | Solo las asignadas | Solo las asignadas |
| Asignar a equipo o persona | ✓ | ✓ gente y equipos de su municipio | ✓ su cascada | ✓ su brigada | — | — |
| Ver «Reportó» y «Atiende» | Nombre | Nombre si la persona es de su alcance; si no, «Otra estructura» | igual | igual | — | — |
| Avisar de una incidencia (D9) | — | — | — | — | ✓ entra «Por aceptar» en su brigada | ✓ igual |
| **Aceptar o rechazar un aviso** (D9) | ✓ | ✓ en su alcance | ✓ los de su cascada | ✓ los de su brigada | — | — |
| Ver sus propios avisos y en qué van (D9) | — | — | — | — | ✓ solo los suyos | ✓ solo los suyos |
| Retirar su aviso mientras nadie lo acepta (D9) | — | — | — | — | ✓ queda «Rechazado: lo retiró quien avisó» | ✓ igual |

Si alguna incidencia se ve pero no se puede trabajar, sale como «Solo consulta» (la regla ya existe; en la
copia, el líder de prueba y la dirección de Tonalá no tienen ninguna así: 29 y 114 abiertas, todas
trabajables). El filtro «Responsable» lista solo personas del alcance, y la lista para asignar, solo equipos
del alcance; el servidor lo revisa otra vez al guardar (`motivoAsignacionFueraDeAlcance`).

### 4.3 Escucha Social

| Acción | Maestro | Adm. mun. | Dirección | Líder | Capturista | Brigadista |
|---|---|---|---|---|---|---|
| Ver peticiones en Escucha Social | Todas | Su municipio y su gente | Su cascada | Su brigada | Las suyas y 👁 las de sus compañeros | Solo las suyas |
| Anotar una | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ligar a un vecino | Solo vecinos que puede ver | igual | igual | igual | igual | igual |
| Ver el nombre del vecino | Si puede ver su ficha; si no, «un vecino» | igual | igual | igual | igual | igual |
| Cambiar estado y notas | ✓ | ✓ en su alcance | ✓ las de su mando | ✓ las de su brigada | Solo las suyas | Solo las suyas |
| **Turnar a una dependencia** | ✓ | ✓ en su alcance | — | — | — | — |
| Capa «Peticiones» del mapa | Las que ve en la lista | igual | igual | igual | igual | igual |
| «Lo que ha pedido» en la ficha (D10) | Todas las de ese vecino, sin notas ajenas | igual | igual | igual | igual | igual |

### 4.4 Estructura Electoral

| Acción | Maestro | Adm. mun. | Dirección | Líder | Capturista | Brigadista |
|---|---|---|---|---|---|---|
| Ver cobertura | Elige municipio; todo | Su municipio entero | Su municipio, **contando solo su cascada** (D11) | Su municipio, **contando solo su brigada** (D11) | — | — |
| Ver nombres de quien cubre | Todos | Su gente | Su cascada | Su brigada | — | — |
| Nombrar a una cuenta | ✓ | Gente de su municipio | Su mando (`commandUserIds`) | Su brigada | — | — |
| Nombrar a un ciudadano (D4) | ✓ | Ciudadanos que ve | Ciudadanos que ve | Ciudadanos que ve | — | — |
| Cambiar rol o casilla, quitar | ✓ | ✓ en su municipio | Si la persona nombrada está bajo su mando, o lo nombró alguien de su mando | igual, en su brigada | — | — |
| Agregar una colonia a una sección | ✓ | ✓ | ✓ | ✓ | — | — |

«Agregar una colonia» **conserva los permisos de hoy** (`POST /api/electoral/sections`: administración,
dirección y líder). La primera versión de este plan lo reducía a administración, pero eso rompía «Levantar
incidencia» y el asignador de sección de Incidencias, que usan la misma ruta (§19).

### 4.5 Logística

| Acción | Maestro | Adm. mun. | Dirección | Líder | Capturista | Brigadista |
|---|---|---|---|---|---|---|
| Ver inventario | Todos los almacenes | Los de su municipio | Los de su municipio | — | — | — |
| Dar de alta almacén | ✓ elige municipio | ✓ su municipio | ✓ su municipio | — | — | — |
| Alta y edición de artículos | ✓ | ✓ | ✓ | — | — | — |
| Archivar o devolver a la lista un artículo (nuevo) | ✓ | ✓ | — | — | — | — |
| Entregar y recibir devoluciones | ✓ | ✓ a gente de su municipio | ✓ a su cascada | — | — | — |
| Ver nombres en «Entregado a personas» y en el historial | Todos | Su gente | **Su cascada; lo demás sumado como «Otras estructuras»** (corrige P1) | — | — | — |

«Otras estructuras» muestra solo cuántas piezas, sin nombres: las existencias del almacén ya lo reflejan, y así
los números cuadran.

### 4.6 Perfil y Directorio

| Acción | Maestro | Adm. mun. | Dirección | Líder | Capturista | Brigadista |
|---|---|---|---|---|---|---|
| Abrir el perfil de otra persona | Cualquiera (queda en la auditoría) | Su gente | Su cascada | Su brigada | Sus compañeros (comprobado) | — (comprobado: 404) |
| Ver en ese perfil sus ciudadanos | Los que esa persona registró **y** quien mira puede ver | igual | igual | igual | igual | — |
| Ver el domicilio de esa persona | ✓ | Si la gobierna | — | — | — | — |
| «Ver su equipo» | Si puede abrir Equipos | igual | igual | igual | — | — |
| Directorio «Registrados por…» | Solo ids de su alcance; uno ajeno se ignora sin decir si existe | igual | igual | igual | igual | igual |

Cada quien ve siempre su propio perfil y su propio domicilio.

### 4.7 Cómo se ve en pantalla lo que no le toca a alguien

- **No puede hacerlo nunca** (por su rol): el botón no existe. Ejemplo: el brigadista no ve «Turnar».
- **Lo ve pero le toca a otro** (ver no es trabajar): la tarjeta se ve completa, sin botones de cambio, con
  una línea gris: «Solo consulta: la atiende la brigada de Juan».
- **No lo puede ver**: no aparece, y si llega por un enlace, «No encontramos esto o no es de tu equipo».

---

## 5. Privacidad

### 5.1 Lo que ya protege el sistema y este plan respeta

- De cada ciudadano van **cifrados** en la base: nombres y apellidos por separado, teléfono, correo, calle,
  número, colonia, municipio escrito, profesión, trabajo, habilidades, disponibilidad e intereses. El
  **nombre completo para mostrar (`display_name`) va en claro**, porque con él se busca y se ordena; por eso
  importa tanto quién lo recibe.
- Cada lista pasa por el alcance; un alcance vacío no ve nada.
- Ver no es trabajar: lo de un compañero se consulta, no se cambia.
- Lo que no se ve no existe (404).
- El domicilio de una persona del equipo solo lo ven ella y la administración que la gobierna.
- Las exportaciones respetan el alcance, tienen tope y quedan en la auditoría; las consultas del maestro
  también.

### 5.2 Datos personales que toca este plan

| Dato | Dónde aparece | Quién lo ve | Cuidado que se agrega |
|---|---|---|---|
| Vecino ligado a una petición | Tarjeta, detalle, ficha, mapa | Quien puede ver su ficha | Los demás leen «un vecino»; el servidor no manda el nombre. En el mapa, el marcador no lleva nombre ni teléfono, solo tipo y estado |
| Texto de la petición | Detalle | Quien ve la petición | No va cifrado. El formulario dice «No escribas teléfonos ni domicilios: liga al vecino», y si detecta un número de 10 dígitos pregunta antes de guardar |
| Ubicación de la petición (puede ser una casa) | Mapa | Quien ve la petición | Sin nombre ni dirección en el marcador; se abre el detalle para verlos |
| Peticiones en la ficha (D10) | Ficha del ciudadano | Quien ve al ciudadano | Título, tipo, estado, fecha y turno; las notas de seguimiento, solo si también ve la petición en Escucha Social |
| Ciudadano nombrado representante | Cobertura, nombrar | Quien puede ver su ficha | Los demás leen «Ciudadano del padrón». Nunca su teléfono en la lista |
| Interés en ser RC (encuesta) | Sugerencias al nombrar | Quien ve a ese ciudadano | Solo ciudadanos visibles |
| Cobertura de la estructura (D11) | Estructura | Su estructura | Dirección y líder no reciben conteos ni nombres de otras estructuras |
| Quién reportó o atiende una incidencia | Tarjeta de incidencia | Nombre si la persona está en el alcance | Si no, «Otra estructura» |
| Material entregado a una persona | Logística | Su alcance | Lo de otras estructuras va sumado, sin nombres (corrige P1) |
| Ciudadanos de una persona | Perfil | Lo que esa persona registró y quien mira puede ver | 20 a la vista; el resto en el Directorio, con el mismo recorte |
| «Registrados por» en el Directorio | Filtro | Solo personas del alcance | Un id ajeno se ignora, sin confirmar que existe |
| Avisos de capturistas y brigadistas (D9) | Incidencias «Por aceptar» | Su líder y su cadena de mando | Quien avisa ve solo los suyos |

### 5.3 Reglas nuevas que valen para todo el plan

1. **Ningún dato personal en la dirección web.** Los filtros que van en la URL son claves e ids (estado,
   categoría, sección, responsable). El texto del buscador se queda en la pantalla. (El Directorio y Usuarios
   ya lo ponen en la URL hoy: observación O2, fuera de este plan.)
2. **Listas mínimas.** Tarjetas y tablas llevan nombre y colonia como mucho; teléfono, correo y domicilio solo
   en la ficha, que ya tiene sus reglas.
3. **Nada nuevo se exporta.** Si algún día se agrega una descarga, pasa por el tope y la auditoría de la
   exportación del Directorio.
4. **Fotos**: las reglas de `lib/archivos.ts`. Solo se adjunta lo que subió quien guarda; la foto la ve quien
   ve el registro.
5. **Auditoría** de lo que cambia algo delicado:

   | Acción nueva en `audit_logs` | Etiqueta legible (en `auditoria-acciones.ts`) |
   |---|---|
   | `social.status_change` | Cambio de estado de una petición |
   | `social.turn` / `social.unturn` | Petición turnada a dependencia / turno quitado |
   | `electoral.assign` / `electoral.change` / `electoral.remove` | Nombramiento, cambio y baja en la estructura |
   | `inventory.archive` / `inventory.restore` | Artículo archivado / devuelto a la lista |
   | `incident.assign` | Incidencia asignada desde la lista (si no lo registra ya el `PATCH`) |

   `audit_logs.action` es texto libre (no tiene restricción), así que no hace falta migración.

### 5.4 Pruebas de privacidad (se suman a cada fase)

Cada regla del §4 y del §5 tiene una prueba **contra la respuesta de la API o del servicio**, no contra la
pantalla:

| Prueba | Fase |
|---|---|
| Una incidencia reportada por alguien fuera del alcance dice «Otra estructura» y la respuesta no trae su nombre | 2 |
| Quien avisa solo ve sus avisos; otro brigadista de la misma brigada no los ve | 2 |
| Los enlaces de paginación y filtros no llevan el texto del buscador | 2 |
| El nombre del vecino no viaja en la respuesta a quien no puede ver su ficha | 3 |
| La capa del mapa no trae nombre ni teléfono en ninguna respuesta | 3 |
| Ligar a un vecino que no se ve → 404 | 3 |
| «Lo que ha pedido» no trae notas de peticiones que quien mira no ve en Escucha Social | 3 |
| La cobertura de una dirección no cuenta ni nombra representantes fuera de su cascada | 4 |
| Las sugerencias de RC solo traen ciudadanos visibles | 4 |
| **P1**: la dirección de Zapopan Norte no recibe nombres de la del Distrito 10 en historial ni en «Entregado» (las dos ya existen en la copia y se replican en la base de prueba) | 5 |
| El perfil de un compañero solo trae los ciudadanos que quien mira puede ver | 6 |
| `?registro=<id ajeno>` devuelve lo mismo que sin filtro, sin error que confirme el id | 6 |

Y una **mutación de privacidad por fase**: se quita a propósito el recorte de nombres; la prueba tiene que
ponerse en rojo.

---

## 6. Casos de uso de cada menú

Así se usa cada menú en la vida real. El diseño de cada fase parte de aquí, y al cerrar la fase **se recorre
cada caso en el navegador con la cuenta del rol y se cuentan los toques**.

**Cómo se cuentan:** en el teléfono (es lo más difícil), desde la pantalla de inicio del rol, salvo que el caso
diga otro punto de partida. Escribir no cuenta; abrir la cámara y tomar la foto cuentan 2. Cada rol tiene hoy
en la barra de abajo: administración, Mapa · Agenda · Directorio · Resumen; dirección, Mapa · Agenda · Resumen ·
Directorio; líder, Mapa · Agenda · Directorio · Incidencias; capturista, Mapa · Agenda · Directorio · Registrar;
brigadista, Mapa · Agenda · Directorio · Escucha. Lo demás está en «Más».

### 6.1 Incidencias

| # | Quién | Situación | Pasos (teléfono) | Toques |
|---|---|---|---|---|
| I1 | Líder, en la mañana | «¿Qué hay que atender?» | Incidencias (barra; abre en *Por atender*, con lo «Por aceptar» primero) | 1 |
| I2 | Dirección | «¿Qué lleva más de una semana?» | Más → Incidencias → chip «Más de 7 días» | 3 |
| I3 | Adm. municipal | Una fuga quedó sin responsable | Más → Incidencias → chip «Sin asignar» → «Asignar» → equipo → Guardar | 6 |
| I4 | Líder | Un vecino llama: «¿qué pasó con el bache de la calle Hidalgo?» | Incidencias → *Todas* → escribe «Hidalgo» | 2 |
| I5 | Brigadista (D9) | Ve una luminaria apagada | «+» → «Avisar de una incidencia» → tipo → Enviar (ubicación del teléfono; sin señal se encola) | 4 (6 con foto) |
| I6 | Líder (D9) | Le llegó el aviso | Incidencias (con su número) → «Aceptar» en la tarjeta | 2 |
| I7 | Brigadista (D9) | «¿Ya atendieron lo que avisé?» | «+» → «Avisar de una incidencia» (abajo, «Mis avisos» con su estado) | 2 |
| I8 | Líder | Reabrir una resuelta que volvió a fallar | Incidencias → *Cerradas* → «Reabrir» en la tarjeta | 3 |

### 6.2 Escucha Social

| # | Quién | Situación | Pasos (teléfono) | Toques |
|---|---|---|---|---|
| E1 | Brigadista en la puerta, con la ficha abierta | La vecina pide un taller para jóvenes | «Anotar una petición» (vecina ya elegida) → tipo → Guardar | 3 desde la ficha |
| E2 | Brigadista en la calle, sin ficha a la mano | Un señor pide poda | «+» → «Petición de un vecino» → buscar vecino → elegirlo (o «Es del barrio») → tipo → Guardar | 6 |
| E3 | Capturista antes de visitar | «¿Esta persona ya nos pidió algo?» | «Lo que ha pedido» en la ficha (D10) | 0–1 desde la ficha |
| E4 | Líder | Revisar lo pendiente de su brigada | Más → Escucha → chip «Pendientes» → tarjeta → «En seguimiento» | 5 |
| E5 | Adm. municipal | Turnar a SIAPA | Más → Escucha → «Gestiones» → tarjeta → «Turnar» → SIAPA → Turnar | 7 |
| E6 | Brigadista, en la puerta | La vecina pregunta «¿en qué va lo mío?» | «Lo que ha pedido» en su ficha: estado, fecha y turno (D10) | 0–1 desde la ficha |
| E7 | Dirección | «¿Qué piden en El Rosario?» | Mapa → capas → «Peticiones» (o Escucha → buscar «El Rosario») | 3 |

### 6.3 Estructura Electoral

| # | Quién | Situación | Pasos (teléfono) | Toques |
|---|---|---|---|---|
| S1 | Dirección | «¿Qué secciones no tienen coordinador de mi estructura?» | Más → Estructura → chip «Sin coordinador» | 3 |
| S2 | Líder | Nombrar RC a una vecina que quiere participar | Más → Estructura → «Nombrar» en la tarjeta → «Representante de casilla» → la elige de las sugeridas → Nombrar | 6 |
| S3 | Líder | Un RC ya no puede | Más → Estructura → su nombre → «Quitar» → Confirmar | 5 |
| S4 | Adm. municipal | Avance una semana antes de la elección | Más → Estructura (las tres barras arriba) | 2 |
| S5 | Adm. municipal | «¿Quién cubre la 2695?» | Más → Estructura → escribe «2695» | 2 |

### 6.4 Logística

| # | Quién | Situación | Pasos (teléfono) | Toques |
|---|---|---|---|---|
| L1 | Dirección | Entregar 50 playeras a un líder | Más → Logística → «Entregar» en la tarjeta del artículo → persona → elegirla → Guardar (escribe 50) | 6 |
| L2 | Dirección, después del evento | Le regresan 12 lonas | Más → Logística → «Entregado a personas» → la persona → «Registrar devolución» → Guardar (escribe 12) | 6 |
| L3 | Adm. municipal | «¿Qué se está acabando?» | Más → Logística → chip «Por agotarse» | 3 |
| L4 | Dirección | «¿Quién tiene las lonas?» | Más → Logística → «Entregado a personas» → escribe «lona» | 3 |

### 6.5 Perfil y Directorio

| # | Quién | Situación | Pasos (teléfono) | Toques |
|---|---|---|---|---|
| P1 | Líder | Revisar lo que registró un integrante | Desde el Resumen: su nombre → «Ver los 286 en el Directorio» | 2 |
| P2 | Brigadista | «¿En qué equipo estoy?» | Más → Mi perfil | 2 |
| P3 | Maestro | Cambiar su contraseña | Más → Mi perfil → Seguridad (Ajustes ya no existe, D1) | 3 |

### 6.6 Cuando algo sale mal (en todos los casos)

| Situación | Qué ve la persona |
|---|---|
| Sin señal al guardar | «Se guardó en tu teléfono y se enviará cuando tengas señal» (la cola que ya existe) |
| Le falta un dato obligatorio | El campo en rojo con qué falta, y el foco en él |
| No tiene permiso (abrió un enlace) | «Esto lo hace quien coordina tu brigada»; nunca un error técnico |
| Ya no existe o no es de su equipo | «No encontramos esto o no es de tu equipo» y un botón para volver |
| Falla el servidor | Aviso rojo que se queda, con «Reportar este problema» (ya existe) |

---

## 7. Que no sea difícil

### 7.1 Reglas de facilidad

1. **Lo que no puedes hacer, no lo ves.** Nada de botones grises sin explicación.
2. **Cada pantalla abre en la vista que esa persona necesita**: Incidencias, en *Por atender* con lo «Por
   aceptar» primero; Escucha, en «Pendientes» para quien coordina y en «Mías» para el brigadista.
3. **Una pantalla, un trabajo**: el nombre del menú es el del título y el del botón principal.
4. **La acción, donde está la cosa**: «Asignar» en la tarjeta de la incidencia, «Nombrar» en la de la sección,
   «Entregar» en la del artículo. Así no hay que volver a elegir lo que ya se está viendo.
5. **Primero lo frecuente; lo raro, en «Más»** (filtros avanzados, rechazar, estado detallado).
6. **Nunca un callejón sin salida**: listas vacías con su acción, errores con qué hacer.
7. **Confirmar solo lo que cuesta deshacer** (quitar a un representante, archivar). Lo demás se hace al
   tocar, y el aviso trae «Deshacer» cuando se puede.
8. **Lo nuevo se explica una vez**: glosario `QueEsEsto` («Cobertura», «RG y RC», «Turnar», «Devolución»,
   «Aviso por aceptar») y «Primeros pasos» por rol (también para capturista y brigadista, si D12).
9. **Palabras de la calle**: «Por agotarse», no «stock mínimo»; «Turnar a una dependencia», no «gestión
   formal aprobada»; «Clave», no «SKU».
10. **Nombres que no se confunden**: «Avisar de una incidencia» (algo en la calle) no se parece a «Reportar un
    problema» (algo que falla en el sistema).

### 7.2 Límites que se miden

| Tarea | Límite de toques en el teléfono |
|---|---|
| Consultar algo frecuente (qué hay, qué falta, en qué va) | 3 |
| Registrar algo frecuente (petición, aviso, entrega) | 6 |
| Una tarea de coordinación (asignar, nombrar, turnar) | 7 |

Todos los casos del §6 caben con el diseño de este plan. Al cerrar cada fase se cuentan en el navegador; si un
caso pasa su límite, se rediseña antes de dar la fase por hecha.

### 7.3 Prueba con gente (recomendada, la hace el dueño)

Al terminar las fases 2, 3 y 4: una persona real de cada rol, sin explicarle nada, hace tres casos de su rol
del §6. Se anota si lo logró, cuánto tardó y dónde dudó. Lo que dude más de una persona se corrige. Preparo
una hoja de una página por rol con los tres casos y dónde anotar.

---

## 8. Cómo se prueba todo

### 8.1 Línea base (confirmada el 2026-10-15)

- `node scripts/local/como-ci.mjs` en una base vacía: **717 pruebas en 80 archivos**, todas en verde; lint con
  **15 avisos viejos y 0 errores**. (Confirmado hoy; los errores que aparecen en el registro de esa corrida son
  los que las pruebas provocan a propósito.)
- `pnpm web:build` en verde (última corrida, 2026-10-07; se repite en la fase 0).
- Recorrido de las 24 pantallas por los 5 roles, y peso y desborde de cada una.
- Las 26 mutaciones de `mutaciones.py`, todas atrapadas.

Al cerrar cada fase se repite y se compara: **ninguna prueba vieja en rojo, ninguna pantalla más pesada ni
desbordada**, salvo justificación escrita. Las pruebas que se cambian a propósito (por ejemplo
`atajos-por-rol.test.ts` si se aprueba D12) se listan con su motivo.

### 8.2 Los siete niveles de prueba

| Nivel | Qué prueba | Dónde vive |
|---|---|---|
| 1. Unidad | Catálogos, filtros, cálculos (días abierta, cobertura, quién tiene qué), validaciones | `apps/web/src/lib/*.test.ts`, `tests/unit/` |
| 2. Integración con base desechable | Rutas y servicios de punta a punta con sesión por rol (`crearBaseDesechable`, `vi.mock("@/lib/api-helpers")`): permisos, alcance, 400/403/404/409, idempotencia, auditoría | `apps/web/tests/*.test.ts` |
| 3. **Matriz de permisos** | Cada renglón del §4 como caso de prueba con las seis cuentas: lo que debe poder (200/201) y lo que no (403/404) | `apps/web/tests/matriz-<pantalla>.test.ts`, una por fase |
| 4. **Privacidad** | §5.4 | dentro de la integración de cada fase |
| 5. Esquema | `esquema-vs-migraciones.test.ts` compara **tablas y columnas**; no revisa `NOT NULL` ni restricciones. Por eso cada migración que quite un `NOT NULL` o agregue una restricción lleva su propia prueba (§9, fases 4 y 5) | ya existe |
| 6. Mutaciones | Una falla a propósito por regla importante; la prueba tiene que ponerse en rojo | `scripts/local/mutaciones.py` |
| 7. Recorrido y navegador | 24 pantallas × 6 perfiles por HTTP; casos del §6 en el navegador (375×812, 375×667, 1366×768), con toques contados, sin errores en la consola, capturas | `scripts/local/` |

**Cuentas de prueba.** Solo puede haber un maestro (`user_profiles_un_solo_maestro_idx`):

- En las bases desechables de las pruebas, el maestro ya existe al prepararlas y las pruebas lo leen, como
  `metas-y-equipo` e `incidencias-brigadas` (`administracion-municipal` arma el suyo).
- En la copia del simulacro se usa el maestro que ya está ahí, con una clave de prueba que pone
  `scripts/local/clave-maestro-copia.mts` desde la variable `MOM_CLAVE` (se niega a tocar otra base). Se entra
  por la API, nunca escribiendo la clave en el navegador, y nunca con la clave real de producción.
- La segunda dirección del mismo municipio ya existe en la copia (Zapopan Norte y Distrito 10) y se replica en
  las pruebas.

**El recorrido HTTP** se corre contra `next start`, no `next dev`: en desarrollo, la primera visita a una
página la compila y puede responder 404 (pasó en esta verificación con `/perfil/[id]`). Y como las pantallas
con `loading.tsx` responden 200 y redirigen dentro del cuerpo, el recorrido busca `NEXT_REDIRECT` en la
respuesta además del código.

### 8.3 Guardia contra pantallas de adorno (fase 0)

`tests/unit/sin-adorno.test.ts` lee los `.tsx` de `apps/web/app/(shell)` **con el analizador de TypeScript**
(`typescript` ya está instalado), no con expresiones regulares: una prueba hecha con expresiones regulares dio
falsos positivos en esta revisión, porque los atributos traen `=>` y `>=` que cortan la etiqueta. Falla si:

- un `<button>` no tiene `onClick`, `onMouseDown`, `onPointerDown`, `type="submit"`, `formAction` ni
  propiedades que vengan de fuera (`{...props}`);
- un `<input>`, `<select>` o `<textarea>` no tiene `onChange`, `name`, `defaultValue`, `ref`, ni `value` con
  `readOnly`.

Nace con dos excepciones (`SettingsClient.tsx` y el buscador de Logística), cada una con la fase que la quita.

### 8.4 Cuándo una tarea está terminada

- [ ] Hace lo que dice, comprobado en el navegador con cada rol que la usa.
- [ ] Cada renglón suyo de la matriz (§4) tiene su prueba, también lo que **no** se debe poder.
- [ ] Sus pruebas de privacidad (§5.4) en verde y su mutación atrapada.
- [ ] Los casos de uso que toca (§6) dentro de su límite de toques (§7.2).
- [ ] `como-ci.mjs` en verde, sin avisos de lint nuevos; `pnpm web:build` en verde.
- [ ] Sin desborde en el teléfono; todo lo que se toca mide 44 px o más.
- [ ] Textos en español de todos los días, iguales al menú.
- [ ] Documentación escrita (§17).

---

## 9. Fases

| Fase | Qué | Tamaño | Migración | Decisiones |
|---|---|---|---|---|
| 0 | Línea base, herramientas y guardia | S | — | — |
| 1 | Corregir información equivocada | S | — | D9 (solo el texto de Escucha) |
| 2 | Incidencias en una sola pantalla (y avisos de campo) | L | — | D2, D9, D12 |
| 3 | Escucha Social completa | L | `0028` | D6, D10, D12 |
| 4 | Estructura Electoral por cobertura | L | `0029` | D4, D5, D11 |
| 5 | Logística usable y sin el hueco P1 | M | `0030` | D7 |
| 6 | Perfil liviano | M | — | — |
| 7 | Ajustes y limpieza | S | — | D1, D3 |
| 8 | Documentación para trabajar con IA | M | — | — |

Cada fase es independiente: si se detiene a la mitad, lo terminado sirve solo y lo que no se empezó no deja
nada roto. Si el dueño quiere cerrar primero el hueco de privacidad, la tarea F5.3 (recorte de nombres) se
puede adelantar sola, sin migración.

---

### Fase 0 · Línea base, herramientas y guardia (S)

| Tarea | Detalle |
|---|---|
| F0.1 Herramientas en `scripts/local/` | `recorrido-pantallas.mjs` (con `next start` y detección de `NEXT_REDIRECT`), `desborde-movil.js`, `sesion-de-prueba.mjs`, `mutaciones.py` (las 26 actuales), `contar-toques.md` (§6) |
| F0.2 Línea base | §8.1, más `pnpm web:build` |
| F0.3 Guardia `sin-adorno.test.ts` | §8.3 |
| F0.4 Cuentas | Clave de prueba del maestro de la copia (`clave-maestro-copia.mts`); en la base de prueba, las seis cuentas y las dos direcciones de Zapopan |
| F0.5 Esqueleto de la documentación | `CLAUDE.md`, `AGENTS.md` y `docs/MAPA_DE_PANTALLAS.md` (§17) |

**Riesgo:** ninguno para la app; no toca pantallas.

---

### Fase 1 · Corregir información equivocada (S)

#### F1.1 Una sola regla para «qué es una incidencia» (A1)

- `condicionDeIncidencias(alcance, { estados })` en `apps/web/src/lib/incidencias-consulta.ts` junta el
  alcance, `isNull(activityTypeId)` y los estados. La usan Incidencias, Historial y «Todos los reportes».
- **Pruebas:** con una incidencia abierta, una cerrada y una actividad: cada vista trae lo suyo y la actividad
  nunca. Alcance por rol.
- **Mutación:** quitar `isNull(activityTypeId)`.

#### F1.2 Áreas de participación con nombre legible (A2)

- Catálogo `apps/web/src/lib/areas-de-participacion.ts` (clave → nombre; `areasDe(texto)` separa lo
  importado con comas). Lo usan los dos formularios (`NuevoContactoForm.tsx`, `PublicRegistrationClient.tsx`),
  el Directorio y `analisis-demografico.ts`. Lo desconocido se enseña como se capturó. Lo guardado no cambia.
- **Pruebas:** unidad del catálogo y del separador; integración en `analisis-demografico.test.ts`.
- **Mutación:** dejar de separar por comas.

#### F1.3 El equipo real en el perfil (A3)

- `equiposDePersona(personaId)` en `apps/web/src/lib/equipos-de-persona.ts`: equipos que dirige y de los que
  es integrante (`team_members`). Sin equipo: «Sin equipo todavía». «Ver su equipo» solo si quien mira puede
  abrir Equipos (`puedeAbrir`) y el equipo existe y está en su alcance.
- **Pruebas:** capturista integrante → nombre real y sin enlace; líder → enlace; persona sin equipo; nunca un
  enlace a algo que no sea un equipo.
- **Mutación:** volver al equipo inventado.

#### F1.4 Categorías de Escucha Social (A4)

- `CATEGORIAS_ESCUCHA` en `apps/web/src/lib/escucha-social.ts`; la API rechaza lo desconocido con 400; lo
  viejo desconocido se enseña como «Otra: queja»; pestaña «Gestiones» para esa categoría; la de aprobadas pasa
  a «Turnadas a dependencia».

#### F1.5 Escucha Social avisa y deja borrar notas (A5)

- Aviso rojo con el mensaje del servidor si falla; vaciar las notas las borra; contador de 4,000 caracteres.

#### F1.6 El texto de Escucha Social dice la verdad (A6)

- Hasta que exista «Avisar de una incidencia» (fase 2): «Si es un problema en la calle (bache, fuga,
  luminaria), avísale a tu líder». Con D9 aprobado y la fase 2 hecha: «…usa “Avisar de una incidencia” en el
  +». A quien coordina: «…es una incidencia».
- **Prueba:** la frase solo nombra opciones que ese rol tiene (unidad, con `opcionesDelBotonMas`).

---

### Fase 2 · Incidencias en una sola pantalla (L) — necesita D2, D9 y D12

#### F2.1 Vistas y filtros

| Parámetro (en la URL) | Valores | Qué hace |
|---|---|---|
| `vista` | `atender` (por omisión), `cerradas`, `todas` | Estados abiertos, cerrados o todos |
| `categoria` | clave | `CATEGORIAS_INCIDENCIA` |
| `seccion` | número | Sección electoral |
| `responsable` | `mias`, `sin`, uuid del alcance | Asignadas a mí, sin asignar, una persona (un uuid ajeno se ignora) |
| `antiguedad` | `7`, `30` | Abiertas hace más de N días |
| `page` | número | Página de 30 |

- *Por atender* ordena lo «Por aceptar» primero y después por antigüedad.
- El **buscador** (título, descripción, dirección) no va en la URL (§5.3).
- `consultarIncidencias(alcance, filtros)` en `incidencias-consulta.ts`, sobre `condicionDeIncidencias`.
- Los indicadores de arriba («Por aceptar 3», «Sin asignar 2», «Más de 7 días 1», «Sin sección 4») son
  botones que aplican su filtro.
- **D2:** `/admin-inbox` → `?vista=todas`; `/historial-incidencias` → `?vista=cerradas`. «Todos los
  reportes» sale del menú, de las ayudas del menú y de `capacidades.ts`; se ajustan `menu-claro.test.ts`,
  `capacidades.test.ts` y `redirecciones-retiradas.mjs`.

#### F2.2 Cada incidencia dice lo importante

- Título, categoría, **días abierta** (verde, ámbar, rojo, siempre con texto), colonia y sección,
  **«Reportó: …»** y **«Atiende: …»** o **«Sin asignar»**, con nombres solo dentro del alcance (§4.2),
  resueltos en el servidor.
- Botón del siguiente paso, «Asignar» (hoja inferior; equipos y personas solo del alcance), «Ver en el mapa» y
  «Más». Si es «Solo consulta», sin botones y con la línea que dice de quién es.
- Teléfono: tarjetas. Escritorio: tabla con la columna de acciones fija.

#### F2.3 «Ver en el mapa»

- `/mapa?incidencia=<id>` centra y abre la ficha; fuera del alcance: «No encontramos esa incidencia».

#### F2.4 Un solo formulario y secciones que se buscan (C3, C6)

- `FormularioIncidencia` en `apps/web/src/components/FormularioIncidencia.tsx`, con equipo y persona. Lo usan
  el mapa (ventana) y `/reportes` (página).
- La sección se elige con el buscador por páginas que ya existe (`/api/equipo/buscar/secciones`), con «Buscar
  en todo Jalisco» cuando no está en el municipio. Así `/reportes` deja de mandar las 3,791 secciones.
- El sub-formulario «registrar nueva sección» se quita del formulario y del asignador de sección de Incidencias
  (`IncidentSectionAssigner.tsx`): lo que hacía (encontrar una sección que no estaba en la lista) lo hace el
  buscador. `POST /api/electoral/sections` **se queda igual, con sus permisos**: sigue sirviendo para ligar
  colonias (fase 4).
- **Pruebas:** las del `POST /api/map/reports` que ya existen, más una de navegador por cada entrada (mapa,
  «+», «Levantar incidencia») y la del asignador de sección con una sección de otro municipio.

#### F2.5 Historial en el teléfono (C4)

- Resuelto con la vista *Cerradas* en tarjetas; «Cancelada» no se enseña en incidencias.

#### F2.6 «Avisar de una incidencia» (D9 y D12)

**Para quien avisa (capturista y brigadista que no coordinan):**

- Pantalla nueva `/avisar-incidencia` (en `ACCESO_A_PANTALLAS` para `capturist` y `visit_responsible`), a la
  que se llega desde el «+». Formulario corto: qué es (bache, fuga, luminaria, basura, otro), foto opcional,
  ubicación del teléfono (se puede mover) y una frase. Se guarda sin señal (tipo `incidencia` de la cola, que
  ya existe) y con `clientRequestId`.
- Debajo del formulario, **«Mis avisos»** con el estado de cada uno y la nota de quien lo atendió: el mismo
  acomodo que ya conocen de «Reportar un problema».
- Si pertenece a varios equipos, se le pregunta a cuál; si a ninguno, el aviso le llega a la administración de
  su municipio (la llave de municipio la pone la base, como hoy).
- «Retirar mi aviso» mientras nadie lo acepta: queda **rechazado** con el motivo «Lo retiró quien avisó». No
  se borra (observación O4).

**En el servidor:**

- `POST /api/map/reports` acepta a quien no coordina **solo** por la vía del aviso (`puedeLevantarComoAviso`):
  estado `pendiente`, asignado al equipo de quien avisa, sin responsable. Cualquier estado, responsable o
  equipo que mande se ignora.
- **Regla nueva en `PATCH /api/map/reports/[id]`:** mientras una incidencia esté `pendiente`, quien no
  coordina (ni administración ni `isLeader`) no le cambia el estado, salvo retirar su propio aviso (pasar a
  `rechazada` con ese motivo). Hoy el autor puede cambiarle el estado a lo que levantó (`puedeSobreIncidencia`),
  así que sin esta regla un brigadista se aceptaría a sí mismo. Lo que ya hacen hoy capturistas y brigadistas
  con lo que les asignan (trabajarlo y cerrarlo desde el mapa) no cambia.
- Quien coordina lo acepta como cualquier otra incidencia (`incidenciasQuePuedeTrabajar` ya incluye lo asignado
  a sus equipos y lo de su mando).
- El número junto a «Incidencias» en el menú cuenta lo «Por aceptar» que esa persona puede aceptar (como la
  insignia de la Agenda).

**El «+» (D12):** `opcionesDelBotonMas` gana «Avisar de una incidencia» para quien no coordina. Se actualizan
«Primeros pasos» de capturista y brigadista y la prueba `atajos-por-rol.test.ts` (hoy exige «el capturista
tiene el alta a un toque; el brigadista, ningún botón»).

**Opción B de D9** (si se elige): categoría «Problema en la calle» en Escucha Social y botón «Convertir en
incidencia» para quien coordina. **Opción C:** nada de esta tarea.

**Pruebas de la fase 2** (`incidencias-consulta.test.ts`, `matriz-incidencias.test.ts`,
`avisos-de-campo.test.ts`):

1. Cada filtro solo y combinado; paginación; página fuera de rango → la última.
2. La matriz del §4.2 completa con las seis cuentas.
3. Actividades de la Agenda nunca aparecen.
4. `diasAbierta` con cambio de día en hora de Jalisco.
5. Asignar fuera del alcance → 403.
6. Avisos: el brigadista crea → `pendiente`, en su equipo, sin responsable aunque lo mande; no puede pasarlo a
   `active` (403) pero sí retirarlo; no lo puede borrar; otro brigadista no lo ve; su líder lo ve y lo acepta;
   el líder de otra brigada no lo ve (404); lo que tenía asignado lo sigue pudiendo cerrar.
7. Privacidad (§5.4).
8. Redirecciones viejas, con sesión y sin ella.

**Mutaciones:** quitar el alcance del buscador; contar días en UTC; dejar que un aviso guarde un responsable;
dejar que quien avisa acepte su aviso; enseñar el nombre de quien reportó fuera del alcance.

---

### Fase 3 · Escucha Social completa (L) — necesita D6, D10 y D12 · migración `0028`

#### Migración `0028_escucha_social_completa.sql`

```sql
ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "client_request_id" uuid;
CREATE UNIQUE INDEX IF NOT EXISTS "social_listening_client_request_idx"
  ON "social_listening" ("client_request_id") WHERE "client_request_id" IS NOT NULL;
ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now();
ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "status_changed_at" timestamptz;
ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "status_changed_by_user_id" uuid REFERENCES "user_profiles" ("id");
-- D6: a qué dependencia se turnó.
ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "gestion_dependencia" text;
ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "gestion_folio" text;
ALTER TABLE "social_listening" ADD COLUMN IF NOT EXISTS "gestion_turnada_at" timestamptz;
CREATE INDEX IF NOT EXISTS "social_listening_contact_idx"
  ON "social_listening" ("contact_id") WHERE "contact_id" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "social_listening_ubicacion_idx"
  ON "social_listening" ("latitude", "longitude") WHERE "latitude" IS NOT NULL;
```

Solo columnas e índices nuevos: la versión anterior los ignora. Se agregan a `schema.ts`.

#### F3.1 Cada petición, de un vecino

- Primer paso: **«¿Quién lo pide?»** (`SelectorBuscable` + `buscarContactos`, que ya respetan el alcance) o
  **«Es una petición del barrio»**. Desde la ficha, el vecino ya viene elegido.
- Aviso de privacidad del texto y detector de teléfonos (§5.2).
- **API:** `contactId` con UUID válido y `exigirAccesoAContacto`. La respuesta trae el nombre del vecino
  **solo** si quien pide puede ver su ficha, calculado en el servidor con la misma condición del Directorio
  (`contactIdRestriction(await contactosVisibles(alcance))`).

#### F3.2 En la ficha del ciudadano: «Lo que ha pedido» (D10)

- Con D10 aprobado: todas sus peticiones (título, tipo, estado, fecha, turno), igual que la ficha ya enseña
  todas sus notas; las notas de seguimiento, solo de las que quien mira ve en Escucha Social. Sin D10: solo las
  que ya ve en Escucha Social.
- Botón «Anotar una petición». Vacío: «Todavía no ha pedido nada. Si te comenta algo, anótalo aquí».
- `GET /api/escucha-social?contacto=<id>`, que exige poder ver al ciudadano.

#### F3.3 En el mapa: capa «Peticiones»

- Marcadores morados agrupados (`capas.ts`); la ficha del marcador solo dice tipo, estado y «Ver».
- `GET /api/map/escucha?bbox=…` con `condicionPorAutor`; respuesta sin nombres ni teléfonos.

#### F3.4 Sin señal y sin duplicados

- Tipo `escucha` en `cola-de-envios.ts`; `clientRequestId`; mismo autor → el mismo registro (200), otro autor
  → 409; el índice único atrapa envíos simultáneos.

#### F3.5 Seguimiento y «Turnar a una dependencia» (D6)

- Cambiar estado guarda quién y cuándo y deja `social.status_change` en la auditoría.
- **Turnar** (solo administración, §4.3): hoja inferior con dependencia, folio y fecha; «Quitar turno» limpia.
  Las dos cosas en la auditoría.

#### F3.6 Lista por páginas y botón «+»

- 30 por página; filtros en la base; abre en «Pendientes» para quien coordina y en «Mías» para el brigadista.
- El «+» suma **«Petición de un vecino»** para los cinco roles (D12).

**Pruebas** (`escucha-social.test.ts`, `matriz-escucha.test.ts`): la matriz del §4.3 completa; crear con
vecino visible y no visible; idempotencia; categoría, título y largo; cambiar estado (autor, líder,
compañero 👁 → 403, fuera → 404); turnar solo administración y con dependencia; «Lo que ha pedido» con su
regla; mapa con alcance y sin datos personales; el nombre del vecino ausente de la respuesta a quien no lo ve.

**Mutaciones:** quitar `exigirAccesoAContacto`; aceptar cualquier categoría; turnar sin ser administración;
mandar el nombre del vecino sin comprobar si se le ve.

---

### Fase 4 · Estructura Electoral por cobertura (L) — necesita D4, D5 y D11 · migración `0029`

#### Migración `0029_estructura_electoral.sql`

```sql
ALTER TABLE "electoral_representatives" ADD COLUMN IF NOT EXISTS "contact_id" uuid REFERENCES "contacts" ("id");  -- D4
ALTER TABLE "electoral_representatives" ALTER COLUMN "user_id" DROP NOT NULL;                                     -- D4
ALTER TABLE "electoral_representatives" ADD COLUMN IF NOT EXISTS "casilla" text;                                  -- D5
ALTER TABLE "electoral_representatives" ADD COLUMN IF NOT EXISTS "assigned_by_user_id" uuid REFERENCES "user_profiles" ("id");
-- Un solo vocabulario de roles (B2b). Idempotente: correrlo dos veces no cambia nada.
UPDATE "electoral_representatives" SET "role" = 'representante_general' WHERE "role" = 'Representante General (RG)';
UPDATE "electoral_representatives" SET "role" = 'representante_casilla' WHERE "role" = 'Representante de Casilla (RC)';
UPDATE "electoral_representatives" SET "role" = 'coordinador' WHERE "role" ILIKE 'coordinador%' AND "role" <> 'coordinador';
-- Reglas para lo nuevo, NOT VALID y dentro de un bloque DO que mira pg_constraint (idempotente):
--   electoral_reps_persona_check: user_id IS NOT NULL OR contact_id IS NOT NULL
--   electoral_reps_role_check:    role IN ('coordinador', 'representante_general', 'representante_casilla')
CREATE UNIQUE INDEX IF NOT EXISTS "electoral_reps_section_contact_idx"
  ON "electoral_representatives" ("section_id", "contact_id") WHERE "contact_id" IS NOT NULL;
```

- `NOT VALID` es nuevo en este repo (ninguna migración lo usaba): se documenta en la habilidad de migraciones
  (§17.3).
- La pantalla vieja une con `user_profiles`: durante el despliegue no le aparece un nombramiento de ciudadano,
  sin error. Los `UPDATE` cambian solo la etiqueta del rol, que la pantalla vieja también enseña.
- Antes de desplegar (cuando el dueño lo decida): consulta de solo lectura de roles distintos a los tres
  conocidos; si aparece otro, se agrega al mapeo.
- `scripts/db/generate-metropolitan-sections.ts` pasa a escribir las claves nuevas.
- **Prueba propia de la migración** (la de esquema no ve `NOT NULL` ni restricciones): aplicada dos veces sin
  error; `user_id` acepta nulo; una fila sin persona se rechaza; un rol inventado se rechaza; los dos roles
  viejos quedan con la clave nueva.

#### F4.1 «Cobertura» (vista principal)

- Arriba, tres barras de avance (por ejemplo «Coordinador: 48 de 131 secciones»; los números son
  ilustrativos; si D5, las casillas se estiman en 2 por sección mientras no haya catálogo, y se dice).
- Chips «Sin coordinador», «Sin RC», «Completas»; buscador por sección o colonia.
- Tarjeta por sección con los tres roles: verde con nombre o gris «Falta», y «Nombrar».
- `coberturaPorSeccion(alcance, municipioId, filtros)` en `apps/web/src/lib/estructura-electoral.ts`:
  secciones del municipio; conteo por rol **solo de lo que el alcance ve** (D11: para dirección y líder, su
  estructura; para administración municipal, todo su municipio), con `sqlRestriccionPersonas` y
  `contactosVisibles`, como ya hace `/api/admin/sections`.

#### F4.2 Nombrar, cambiar y quitar

- «Nombrar» en la tarjeta de la sección abre una hoja inferior: **qué hará** (tres botones con una línea de
  explicación) y **quién**, en una sola lista: arriba, si es RC, los vecinos visibles que dijeron que quieren
  ser representante de casilla (`social_surveys.participation_form`); después, su gente; y un buscador para
  cualquiera de los dos. **Casilla** opcional si es RC. Sin pestañas que tocar.
- Cambiar rol o casilla; quitar con confirmación.
- **API:** `PATCH` y `DELETE /api/electoral/representatives/[id]` nuevos. El `DELETE` borra la fila, pero deja
  en la auditoría (`electoral.remove`) a quién se quitó, de qué sección, con qué rol y quién lo hizo. `POST`
  endurecido: UUIDs, rol del catálogo, sección del municipio de quien nombra (salvo el maestro), persona de su
  mando o ciudadano visible, duplicado → 409. Todo en la auditoría.
- Quién cambia o quita (§4.4): administración en su municipio; quien coordina, si la persona nombrada está
  bajo su mando o la nombró alguien de su mando (`assigned_by_user_id`; las filas viejas, sin ese dato, se
  deciden por la persona nombrada).

#### F4.3 Lo que se va

- «Nueva Sección» desaparece. «Agregar una colonia a esta sección» queda en el detalle de la sección, con los
  permisos de hoy (administración, dirección y líder).
- Las 3,791 secciones dejan de viajar: el buscador usa `/api/equipo/buscar/secciones`.
- Fuera el `try/catch` de «la tabla aún no existe» y el `@ts-ignore`.

#### F4.4 Opcional: capa de cobertura en el mapa

- Secciones coloreadas por cobertura del alcance; sin nombres en el mapa.

**Pruebas** (`estructura-electoral.test.ts`, `matriz-estructura.test.ts`): la matriz del §4.4 con las seis
cuentas y las dos direcciones de Zapopan; conteos y filtros; D11 (la dirección no cuenta ni nombra fuera de su
cascada); sugerencias solo visibles; 400/403/404/409; auditoría; la prueba de la migración.

**Mutaciones:** quitar la comprobación de municipio; aceptar rol libre; contar representantes fuera del
alcance; sugerir ciudadanos no visibles.

---

### Fase 5 · Logística usable y sin el hueco P1 (M) — necesita D7 · migración `0030`

#### Migración `0030_logistica.sql`

```sql
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "min_quantity" integer;   -- D7; CHECK >= 0, NOT VALID
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS "inventory_transactions_created_at_idx" ON "inventory_transactions" ("created_at");
-- `devolucion`: la columna no tiene restricción; se agrega una NOT VALID con 'in', 'out' y 'devolucion'.
```

Con su prueba propia, como la `0029`.

#### F5.1 Inventario que se busca y se entiende

- `InventarioClient.tsx`: buscador que sí busca (nombre, clave, categoría, sin acentos), chips de almacén y
  categoría, almacén en cada artículo.
- Palabras: «Piezas en almacén», «Tipos de artículo», «Entregas en los últimos 30 días» (por fecha), «Clave».
- «Por agotarse» (D7).
- Cada tarjeta de artículo trae **«Entregar»** (el artículo ya va elegido).
- Teléfono: tarjetas con las existencias en grande; botones que se acomodan; sin desborde.

#### F5.2 Editar y archivar

- Editar: administración y dirección. Archivar y devolver a la lista: solo administración (§4.5). Archivar
  nunca borra; un artículo archivado no acepta movimientos.

#### F5.3 Quién tiene qué, devoluciones y el recorte de nombres (P1)

- El historial y la lista de entregas enseñan el nombre del responsable **solo si está en el alcance** de quien
  mira (`allowedUserIds`; el maestro, todos); lo demás, «Otras estructuras», sumado. Se resuelve en el
  servidor. Esta tarea se puede adelantar sola, sin migración.
- «Entregado a personas»: entregas menos devoluciones por persona; «Registrar devolución» con el máximo que esa
  persona tiene.
- Historial completo por páginas, con el mismo recorte.

**Pruebas** (`logistica.test.ts`, `matriz-logistica.test.ts`): la matriz del §4.5; almacenes de otro
municipio; salida sin existencias; devolución de más; archivar y restaurar; entregas por fecha; **P1** con las
dos direcciones de Zapopan.

**Mutaciones:** devolver de más; contar sin fecha; movimiento sobre archivado; nombres sin recorte.

---

### Fase 6 · Perfil liviano (M)

- 20 ciudadanos y el total; «Ver los N en el Directorio» con `?registro=<persona>` (solo ids del alcance; uno
  ajeno se ignora sin decir si existe).
- 30 actividades con el tipo real de la Agenda; «Ver todas en la Agenda» (`/equipo?responsable=<id>`, que ya
  existe).
- Colonias y secciones calculadas en la base (sección por `section_id`; colonia por `contact_territory`).
- Equipo real (de F1.3).
- Meta: menos de 250 KB para el líder de prueba (hoy 1,306 KB).

**Pruebas:** 20 y el total; el recorte de quien mira; `registro` con id propio, del alcance y ajeno; peso bajo
la meta. **Mutación:** quitar el límite; aceptar un `registro` ajeno.

---

### Fase 7 · Ajustes y limpieza (S) — necesita D1 y D3

| Tarea | Detalle | Prueba |
|---|---|---|
| F7.1 Ajustes (D1) | `/settings` → `/perfil?pestana=seguridad`; sale del menú y de `capacidades.ts`; el perfil abre la pestaña que diga `?pestana=` (Seguridad solo existe en el perfil propio) | `capacidades.test.ts` y `menu-claro.test.ts` ajustadas; redirección con y sin sesión; `sin-adorno` sin excepciones |
| F7.2 Código muerto (D3) | Se borran `AdminInboxClient.tsx`, `admin-inbox/actions.ts`, `inbox-deps.ts`, `packages/ui/styles.css` y `/api/admin/sections` (comprobado: nada los importa ni los llama). Tablas, datos y módulos se quedan | Sin referencias; `check:boundaries`, typecheck y build |
| F7.3 Textos legales | «Tonalá OS» → «Jalisco OS» con la constante del nombre. **El dueño revisa la redacción legal** | Las dos páginas públicas |
| F7.4 Restos | Fuera `@ts-ignore`; `/inbox` (que redirige al inicio) se conserva y se documenta | Lint sin avisos nuevos |
| F7.5 Documentos viejos | `docs/cliente/TONALA_OS_V1_QUE_FALTA.*` se marca como histórico en el mapa de documentos | — |

---

### Fase 8 · Documentación para trabajar con IA (M)

Ver §17. Se prueba pidiéndole a una IA, en una sesión nueva y solo con la documentación, que encuentre dónde
se arregla un error inventado («el chip “Sin asignar” de Incidencias trae las de otra brigada») y qué prueba lo
cubre, sin leer todo el código.

---

## 10. Cómo se ve: reglas de interfaz

| Pieza | Regla |
|---|---|
| Encabezado | Un título (el del menú), una frase de para qué sirve y la acción principal. En el teléfono, el título grande se oculta porque la barra de arriba ya lo dice |
| Tarjeta | Lo importante arriba en negritas; lo secundario en gris; estado como chip con **color + texto + ícono** |
| Solo consulta | Tarjeta completa sin botones de cambio y una línea gris: «Solo consulta: la atiende la brigada de Juan» |
| Filtros | Chips en una fila que se desliza, buscador y «Más filtros» en hoja inferior; filtros activos con «✕»; «Quitar filtros» |
| Indicadores | Números grandes que se tocan y filtran |
| Barras de avance | «48 de 131» con barra y porcentaje en texto |
| Hojas inferiores | Para acciones en el teléfono; `z-[110]`; cierre de 44 px; acción principal fija abajo |
| Vacíos | Ícono, frase y botón para empezar |
| Cargando | Esqueletos con la forma de la tarjeta |
| Avisos | `avisar`: verde al guardar, rojo que se queda al fallar, con «Reportar este problema»; «Deshacer» cuando se puede |
| Celebración | `CapaDeCelebracion` al completar la cobertura de una sección o cerrar una petición |
| Colores | Azul acciones, verde hecho, ámbar pendiente, rojo urgente, gris neutro |
| Tamaños | 14 px o más en lo que se lee; 12 px solo en etiquetas; 44 px en lo que se toca |
| Fechas y números | «hace 3 días» con la fecha completa al tocar; separador de miles (`es-MX`) |

### 10.1 Bocetos (teléfono, 375 px)

**Incidencias (líder)**

```
┌───────────────────────────────────┐
│ Incidencias                 (3) TC│
├───────────────────────────────────┤
│ [Por atender●] [Cerradas] [Todas] │
│ 🔍 Buscar bache, calle, colonia…  │
│ (Por aceptar 3)(Sin asignar 2)    │
│ (Más de 7 días 1)(Mías) ⇢         │
├───────────────────────────────────┤
│ Luminaria apagada en Juárez       │
│ [Alumbrado] 🟡 Por aceptar · hoy  │
│ Aviso de: Pedro (tu brigada) 📷   │
│ [ Aceptar ]  [Rechazar]  [🗺]  ⋯  │
├───────────────────────────────────┤
│ Bache profundo en Av. Río Nilo    │
│ [Bacheo]  🔴 hace 9 días          │
│ Santa Paula · Sección 2684        │
│ Reportó: Ana López                │
│ Atiende: ⚠ Sin asignar            │
│ [ Empezar ]  [Asignar] [🗺]    ⋯  │
└───────────────────────────────────┘
```

**Avisar de una incidencia (brigadista, D9)**

```
┌───────────────────────────────────┐
│ Avisar de una incidencia          │
│ ¿Qué es?                          │
│ [🕳 Bache][💧 Fuga][💡 Luminaria] │
│ [🗑 Basura][… Otro]               │
│ 📍 Aquí (Av. Juárez 120)  Mover   │
│ 📷 Agregar foto (opcional)        │
│ Una frase (opcional)              │
│ [ Está apagada desde ayer       ] │
│ Le llega a tu líder para que lo   │
│ acepte.                           │
│ ┌───────────────────────────────┐ │
│ │            Enviar             │ │
│ └───────────────────────────────┘ │
│ Mis avisos                        │
│ 💡 Luminaria Juárez · Por aceptar │
│    [Retirar]                      │
│ 🕳 Bache Morelos · Aceptado ✓     │
└───────────────────────────────────┘
```

**Estructura Electoral · Cobertura (dirección)**

```
┌───────────────────────────────────┐
│ Estructura Electoral           TC │
├───────────────────────────────────┤
│ Tonalá · tu estructura            │
│ Coordinador  ████████░░  48 / 131 │
│ RG           ███░░░░░░░  35 / 131 │
│ RC           ████░░░░░░  60 / 262 │
│ (Sin coordinador 83)(Sin RC)(Todas)│
│ 🔍 Sección o colonia…             │
├───────────────────────────────────┤
│ Sección 2695 · Centro             │
│ ✅ Coord: Juan P.  ✅ RG: Ana L.  │
│ ⬜ RC: falta          [ Nombrar ] │
├───────────────────────────────────┤
│ Sección 2696 · La Ladrillera      │
│ ⬜ Coord  ⬜ RG  ⬜ RC [ Nombrar ] │
└───────────────────────────────────┘
```

**Nombrar (hoja inferior)**

```
┌───────────────────────────────────┐
│ Nombrar en la sección 2696     ✕  │
│ ¿Qué hará?                        │
│ [ Coordinador de sección       ]  │
│ [ Representante general        ]  │
│ [ Representante de casilla  ●  ]  │
│   Cuida una casilla todo el día   │
│ ¿Quién?  🔍 Nombre…               │
│ ⭐ Quieren ser representantes:    │
│   ○ Rosa Díaz · La Ladrillera     │
│   ○ Pedro Gil · La Ladrillera     │
│ Tu gente:                         │
│   ○ Luis Mora (brigadista)        │
│ Casilla (opcional): [ B ▾ ]       │
│ ┌───────────────────────────────┐ │
│ │            Nombrar            │ │
│ └───────────────────────────────┘ │
└───────────────────────────────────┘
```

**Escucha Social: anotar**

```
┌───────────────────────────────────┐
│ Anotar una petición            ✕  │
│ 1. ¿Quién lo pide?                │
│ 🔍 María Pérez · Centro        ✓  │
│ ☐ Es del barrio, no de una persona│
│ 2. ¿Qué es?                       │
│ [💡 Idea][⚠ Problema][🤝 Compro.] │
│ [🔁 Seguimiento][🏛 Gestión]      │
│ 3. Cuéntalo en una frase          │
│ [ Piden taller de oficios…      ] │
│ 🔒 No escribas teléfonos ni       │
│    domicilios: ya ligaste al vecino│
│ 4. ¿Dónde? (opcional)  [📍 Mapa]  │
│ 📷 Agregar foto (opcional)        │
│ ┌───────────────────────────────┐ │
│ │       Guardar petición        │ │
│ └───────────────────────────────┘ │
└───────────────────────────────────┘
```

**Ficha del ciudadano: «Lo que ha pedido» (D10)**

```
┌───────────────────────────────────┐
│ Lo que ha pedido              (2) │
│ 🏛 Poda frente a la escuela       │
│    Turnada a Parques · folio 88   │
│    · hace 5 días                  │
│ 💡 Taller de oficios para jóvenes │
│    En seguimiento                 │
│ [ + Anotar una petición ]         │
└───────────────────────────────────┘
```

**Logística (dirección)**

```
┌───────────────────────────────────┐
│ Logística e Inventarios        TC │
├───────────────────────────────────┤
│ [ Nuevo… ▾ ]                      │
│ 20,275 piezas · 6 tipos           │
│ ⚠ 2 por agotarse                  │
│ [Inventario●][Entregado a personas]│
│ 🔍 Buscar artículo…               │
│ (Todos)(Bodega Centro)(Ropa)(Publ.)│
├───────────────────────────────────┤
│ Playera blanca con logotipo   480 │
│ CAM-TONALA · Ropa · Bodega Centro │
│                       [Entregar]  │
├───────────────────────────────────┤
│ Lona 3×2 m  ⚠ Por agotarse     12 │
│ LON-TONALA · Publicidad · Bodega C│
│                       [Entregar]  │
└───────────────────────────────────┘
```

---

## 11. Qué cambia para cada rol

| Rol | Lo que nota |
|---|---|
| Maestro | Todo lo de administración en los 125 municipios; Ajustes ya no está (D1), su contraseña en Mi perfil |
| Adm. municipal | Incidencias con filtros; turnar peticiones; cobertura de todo su municipio; Logística completa |
| Dirección | Incidencias con filtros; cobertura de su estructura; entregas y devoluciones de su gente; ya no ve nombres de otra dirección en Logística |
| Líder | Avisos de su brigada por aceptar, con su número en el menú; cobertura de su brigada; nombra a su gente o a vecinos de su padrón |
| Capturista | «+» con tres opciones (D12; registrar sigue a un toque en la barra); avisa de problemas en la calle; peticiones ligadas al vecino; «Lo que ha pedido» en la ficha; su equipo real en el perfil |
| Brigadista | Por primera vez un «+»: avisa de incidencias y anota peticiones, también sin señal; «Mis avisos»; su equipo real |

---

## 12. Riesgos y cómo se evitan

| Riesgo | Dónde | Cómo se evita |
|---|---|---|
| Un filtro nuevo deja ver de más | 2, 3, 4, 5 | Todo filtro se arma sobre la condición de alcance; matriz por rol; mutaciones que quitan el alcance |
| Un nombre se cuela en una respuesta aunque la pantalla lo esconda | 2 a 6 | El recorte se hace en el servidor; pruebas contra la respuesta (§5.4) |
| Abrir el aviso a brigadistas (D9) les deja hacer de más | 2 | Una función con nombre para el aviso; el servidor ignora estado y asignación; regla nueva para que no se acepten solos; pruebas de que no pueden aceptar, asignar ni borrar |
| Restringir una ruta que usan otras pantallas | 2, 4 | Antes de cambiar el permiso de una ruta se buscan todas sus llamadas (así se encontró que `POST /api/electoral/sections` la usan tres pantallas, §19) |
| Una migración falla por datos raros | `0029` | `NOT VALID`; mapeo idempotente; consulta previa de solo lectura |
| La prueba de esquema no ve un `NOT NULL` o una restricción | 4, 5 | Prueba propia de cada migración |
| La versión vieja choca con el esquema nuevo | 3, 4, 5 | Solo columnas nuevas o `DROP NOT NULL`; prueba de convivencia |
| Romper el alta de incidencias al unificar formularios | F2.4 | Pruebas del `POST` existentes y de navegador por cada entrada |
| Cambiar una decisión vieja sin darse cuenta | 2, 3 | Las pruebas que la protegen (como «el brigadista, ningún botón») solo se cambian con una decisión del dueño (D12) |
| Perder un enlace guardado | 2, 7 | Redirecciones probadas |
| Pantallas más pesadas | todas | Presupuesto de peso contra la línea base |
| Que se cuele un botón de adorno | todas | `sin-adorno.test.ts` |
| Que algo nuevo sea difícil | todas | Límites de toques medidos (§7.2) y prueba con gente (§7.3) |

**Volver atrás:** cada fase toca su grupo de archivos y sus migraciones solo agregan; deshacer una fase en el
código no obliga a deshacer nada en la base.

---

## 13. Lo que no hace este plan

- No construye la bandeja de WhatsApp, el envío de correos ni la verificación en dos pasos.
- No toca el despliegue, los respaldos fuera del VPS, la llave de cifrado ni el root.
- No cambia Directorio, Registrar, Agenda, Resumen, Equipos, Usuarios ni «Reportar un problema», salvo lo que
  se dice (el filtro «Registrados por», «Lo que ha pedido» en la ficha, el «+»).
- No cambia las observaciones O1 a O4 (§1).
- **Permisos:** no le da a nadie más alcance del que ya tiene. Lo único que amplía es D9 (crear avisos «Por
  aceptar») y, si se aprueba, D10 (ver en la ficha las peticiones del ciudadano que ya se ve, como ya se ven sus
  notas). **No reduce ningún permiso de hoy**; lo que sí cierra es el hueco P1 de Logística. Archivar artículos
  es nuevo y queda solo para administración.
- No aplica nada en `tonala_os` ni en producción.

---

## 14. Archivos que se tocarían

| Fase | Nuevos | Cambian | Se borran o redirigen |
|---|---|---|---|
| 0 | `tests/unit/sin-adorno.test.ts`, `CLAUDE.md`, `AGENTS.md`, `docs/MAPA_DE_PANTALLAS.md`, herramientas en `scripts/local/` | — | — |
| 1 | `lib/incidencias-consulta.ts`, `lib/areas-de-participacion.ts`, `lib/equipos-de-persona.ts`, `lib/escucha-social.ts` y sus pruebas | `admin-incidencias/page.tsx`, `historial-incidencias/page.tsx`, `admin-inbox/page.tsx`, `analisis-demografico.ts`, `NuevoContactoForm.tsx`, `PublicRegistrationClient.tsx`, `DirectorioClient.tsx`, `perfil/[id]/page.tsx`, `LeaderProfileClient.tsx`, `EscuchaSocialClient.tsx`, `api/escucha-social/*` | — |
| 2 | `components/FormularioIncidencia.tsx`, `(shell)/avisar-incidencia/page.tsx` y su cliente, `admin-incidencias/FiltrosIncidencias.tsx`, `TarjetaIncidencia.tsx`, `AsignarIncidencia.tsx`, pruebas `incidencias-consulta`, `matriz-incidencias`, `avisos-de-campo` | `admin-incidencias/page.tsx`, `IncidentSectionAssigner.tsx`, `mapa/page.tsx`, `ModalesDeIncidencia.tsx`, `reportes/page.tsx`, `ReportesClient.tsx`, `api/map/reports/route.ts`, `api/map/reports/[id]/route.ts`, `permisos-incidencias.ts`, `boton-mas.ts`, `primeros-pasos.ts`, `ShellWrapper.tsx` y `(shell)/layout.tsx` (insignia), `role-home.ts`, `capacidades.ts`, `menu-claro.test.ts`, `capacidades.test.ts`, `atajos-por-rol.test.ts` | `admin-inbox/page.tsx` y `historial-incidencias/page.tsx` pasan a redirección |
| 3 | `0028`, `api/map/escucha/route.ts`, pruebas `escucha-social`, `matriz-escucha` | `schema.ts`, `_journal.json`, `EscuchaSocialClient.tsx` (se parte en piezas), `escucha-social/page.tsx`, `api/escucha-social/*`, `crm/contacts/[id]/page.tsx`, `mapa/capas.ts`, `ControlesDelMapa.tsx`, `cola-de-envios.ts`, `boton-mas.ts`, `auditoria-acciones.ts`, `QueEsEsto.tsx` | — |
| 4 | `0029`, `lib/estructura-electoral.ts`, `api/electoral/representatives/[id]/route.ts`, `Cobertura.tsx`, `Nombrar.tsx`, pruebas `estructura-electoral`, `matriz-estructura`, `migracion-0029` | `schema.ts`, `_journal.json`, `estructura-electoral/page.tsx`, `EstructuraClient.tsx`, `api/electoral/representatives/route.ts`, `generate-metropolitan-sections.ts`, `auditoria-acciones.ts` | — |
| 5 | `0030`, `InventarioClient.tsx`, `EnManos.tsx`, `EditarArticulo.tsx`, pruebas `logistica`, `matriz-logistica`, `migracion-0030` | `schema.ts`, `_journal.json`, `logistica/page.tsx`, `logistica/actions.ts`, `lib/logistica.ts`, `AssignModal.tsx` | — |
| 6 | prueba de perfil | `perfil/[id]/page.tsx`, `LeaderProfileClient.tsx`, `crm/contacts/page.tsx`, `DirectorioClient.tsx` | — |
| 7 | — | `settings/page.tsx`, `role-home.ts`, `capacidades.ts`, `terminos/page.tsx`, `privacidad/page.tsx`, `perfil/page.tsx` | `SettingsClient.tsx`, `settings/layout.tsx`, `AdminInboxClient.tsx`, `admin-inbox/actions.ts`, `inbox-deps.ts`, `packages/ui/styles.css`, `api/admin/sections/route.ts` |
| 8 | — | `CLAUDE.md`, `docs/MAPA_DE_PANTALLAS.md`, `README.md`, este plan, `PLAN_EXPERIENCIA_SENCILLA.md` §8 | — |

---

## 15. Al terminar cada fase, el dueño recibe

1. Qué se hizo, en palabras sencillas, y qué cambia para cada rol.
2. Capturas del teléfono y de la computadora, por rol.
3. La matriz de permisos de esa fase con cada renglón probado.
4. Los casos de uso con los toques medidos.
5. Pruebas: cuántas había, cuántas hay, todas en verde; mutaciones atrapadas; pruebas cambiadas a propósito y
   por qué.
6. Peso y desborde contra la línea base.
7. Lo que se encontró en el camino y no estaba en el plan, con propuesta, sin hacerlo por mi cuenta.

---

## 16. Orden de trabajo dentro de cada tarea

1. Leer el código actual, **buscar todas las llamadas de lo que se va a cambiar**, y escribir la prueba que hoy
   falla.
2. Escribir los renglones de la matriz (§4) como pruebas, también lo que no se debe poder.
3. Hacer el cambio más chico que las ponga en verde, con el recorte de privacidad en el servidor.
4. Interfaz con el §10, recorriendo los casos del §6 y contando toques.
5. Mutaciones.
6. `como-ci.mjs`, lint, build.
7. Documentación (§17).

---

## 17. Documentación para trabajar con IA

El objetivo: que quien llega nuevo, persona o IA, encuentre en minutos **dónde** se arregla algo, **qué
reglas** no puede romper (permisos y privacidad incluidos) y **cómo** comprobar que funcionó.

### 17.1 `CLAUDE.md` en la raíz (nuevo, versionado)

Menos de 200 renglones, con enlaces a lo largo:

- **Qué es:** Jalisco OS, CRM territorial, teléfono primero.
- **Roles y alcance:** los seis perfiles del §4 en una tabla, «ver no es trabajar», y dónde vive cada
  condición (`network-hierarchy.ts`, `contact-visibility.ts`, `incident-visibility.ts`,
  `alcance-municipal.ts`, `permisos-contacto.ts`, `permisos-incidencias.ts`, `capacidades.ts`). Que se usa
  `requirePageAccess` (no `requirePageRole`, que sigue existiendo pero `capacidades.test.ts` lo rechaza en las
  pantallas).
- **Privacidad:** qué va cifrado y qué no (`display_name` en claro), listas mínimas, recorte de nombres en el
  servidor, nada personal en la URL, auditoría.
- **Comandos:** `pnpm validate`, `pnpm web:build`, `node scripts/local/como-ci.mjs`, migraciones solo en la
  copia, cómo levantar el simulacro (sin cuentas ni contraseñas: viven en `scripts/local/`, que no se
  versiona). Que el recorrido se hace con `next start`.
- **Reglas de oro:** las del §2.
- **Recetas** con su prueba: pantalla y entrada al menú; ruta de API; migración (con su prueba propia si quita
  un `NOT NULL` o agrega una restricción); tipo a la cola sin señal; capa del mapa; término al glosario; un
  renglón nuevo de la matriz de permisos; **antes de cambiar el permiso de una ruta, buscar todas sus
  llamadas**.
- **Cómo se prueba:** los siete niveles del §8.2 y la guardia `sin-adorno`.
- **Lo que parece sobrar y no sobra:** `walking_skeleton` (ADR-010 y ADR-011), módulos sin pantalla,
  redirecciones de pantallas retiradas, el único maestro.
- **Cómo pedir un arreglo:** la plantilla del §17.4.

`AGENTS.md` de una línea apunta a `CLAUDE.md` para otras herramientas.

### 17.2 `docs/MAPA_DE_PANTALLAS.md` (nuevo)

Una ficha por pantalla, siempre igual:

```
## Incidencias · /admin-incidencias
- Para qué: aceptar, asignar y seguir los reportes de campo.
- Casos de uso: I1–I8 (PLAN_AUDITORIA_MENUS.md §6.1).
- Quién entra: admin, direction, territorial_coordinator (capacidades.ts).
- Quién ve qué y quién hace qué: tabla §4.2; «solo consulta» = fuera de incidenciasQuePuedeTrabajar.
- Privacidad: «Reportó/Atiende» con nombre solo dentro del alcance; buscador fuera de la URL.
- Archivos: admin-incidencias/page.tsx, FiltrosIncidencias.tsx, TarjetaIncidencia.tsx…
- Datos: lib/incidencias-consulta.ts → event_reports (sin activity_type_id).
- APIs: PATCH /api/map/reports/[id] (con la regla de avisos «por aceptar»); POST /api/map/reports.
- Pruebas: incidencias-consulta, matriz-incidencias, avisos-de-campo, incidencias-brigadas.
- Direcciones viejas que llegan aquí: /admin-inbox, /historial-incidencias.
- Decisiones: D2, D9, D12 (2026-10).
```

Además: una tabla de pantallas retiradas y a dónde redirigen, y una de documentos históricos.

### 17.3 Lo que se actualiza en cada fase

- Este plan: la fase marcada como hecha, con fecha, lo probado y las mutaciones nuevas.
- `docs/MAPA_DE_PANTALLAS.md`: la ficha de cada pantalla tocada, con su matriz y su privacidad.
- `PLAN_EXPERIENCIA_SENCILLA.md` §8: las pruebas nuevas en «Archivo por archivo» y «Quién ve qué».
- `README.md`: la sección del módulo, en palabras sencillas.
- Comentarios en el código: solo el porqué que no se ve, al estilo del repo.
- Habilidades locales de IA (`~/.claude/skills/*-crm-el`, en esta computadora, fuera del repo):
  - `ui-shell-crm-el`: todavía dice que las secciones del menú son `dashboard | estructura | territorio |
    configuracion` y que se protege con `requirePageRole`; hoy son `campo | territorio | seguimiento |
    configuracion` y `requirePageAccess`. Se suman las piezas nuevas.
  - `permisos-usuarios-crm-el`: todavía habla de `isGlobal` y de que «solo admin es global»; hoy son `isAdmin`,
    `isMaster` y la administración por municipio. Se suman «ver no es trabajar», el recorte de nombres en el
    servidor, las matrices por pantalla y la regla de los avisos «por aceptar».
  - `migraciones-crm-el`: el patrón de restricciones `NOT VALID` idempotentes y la prueba propia de cada
    migración que la prueba de esquema no cubre.
- Memoria de la sesión: el estado de cada fase.

### 17.4 Plantilla para pedir un arreglo a una IA

```
Lee CLAUDE.md y la ficha de <pantalla> en docs/MAPA_DE_PANTALLAS.md.
Problema: <qué pasa>, con el rol <rol>, en <teléfono/computadora>.
Esperado: <qué debería pasar>.
Respeta la matriz de quién ve y quién hace qué, y la privacidad de la ficha.
Antes de cambiar una ruta o un permiso, busca todas sus llamadas.
Primero escribe una prueba que lo demuestre (incluida la de quien NO debe poder),
después arréglalo y confirma con como-ci, web:build y el navegador a 375 px.
No hagas commit.
```

---

## 18. Estado

| Fase | Estado |
|---|---|
| 0 | **Hecha el 2026-10-15.** Herramientas en `scripts/local/` (recorrido con `next start` y `NEXT_REDIRECT`, sesión de prueba, desborde, mutaciones recreadas, cómo contar toques). Línea base: 717 pruebas en verde, lint 0 errores y 15 avisos, `web:build` en verde, recorrido guardado en `scripts/local/linea-base-2026-10.json`. Guardia `tests/unit/sin-adorno.test.ts` (analizador de TypeScript) con sus dos excepciones. Estructura de prueba compartida `apps/web/tests/estructura-de-prueba.ts` (seis perfiles y dos direcciones en Tonalá). `CLAUDE.md`, `AGENTS.md` y `docs/MAPA_DE_PANTALLAS.md` empezados |
| 1 | **Hecha el 2026-10-15.** F1.1 `lib/incidencias-consulta.ts` (`condicionDeIncidencias`) en Incidencias, Historial y «Todos los reportes»; «Cancelada» fuera del historial. F1.2 `lib/areas-de-participacion.ts` en Análisis, Directorio y los dos formularios. F1.3 `lib/equipos-de-persona.ts`: el perfil enseña los equipos reales y solo enlaza los que quien mira abre. F1.4 y F1.5 `lib/escucha-social.ts`: categorías y estados del catálogo en pantalla y API (lo desconocido, «Otra: …»; pestañas «Gestiones» y «Turnadas a dependencia»), aviso cuando algo falla, vaciar notas las borra, contador de 4,000. F1.6 el texto del problema en la calle según el rol. Pruebas nuevas: `incidencias-consulta` (4), `areas-de-participacion` (3), `analisis-demografico` (+1), `perfil-equipo` (5), `escucha-social` (8 + 4 de unidad), `sin-adorno` (3). Mutaciones 26 a 31, atrapadas. Recorrido sin cambios contra la línea base. En el navegador: «Todos los reportes» sin actividades; Escucha con «Otra: queja»; Análisis por área; perfil del capturista con su brigada real y sin enlace roto |
| 2 | **Hecha el 2026-10-16.** Incidencias es una sola pantalla (`admin-incidencias/IncidenciasClient.tsx`, `TarjetaIncidencia.tsx`, `HojasDeIncidencia.tsx`) con vistas *Por atender*, *Cerradas* y *Todas*; buscador sin acentos que viaja en el cuerpo de `POST /api/incidencias/consulta` y nunca en la dirección; chips que filtran (por aceptar, sin asignar, más de 7 días, sin sección, asignadas a mí); días abierta en hora de Jalisco; «Reportó» y «Atiende» recortados en el servidor («Otra estructura»); «Asignar» y «Más» (sección y estado) en hojas inferiores (`components/HojaInferior.tsx`). `/admin-inbox` y `/historial-incidencias` redirigen. «Ver en el mapa» centra y abre el globo (`/mapa?incidencia=`). «Levantar incidencia» y el mapa piden lo mismo (equipo y persona) y buscan la sección por número (`components/SeccionBuscable.tsx`; ya no viajan las 3,791). «Avisar de una incidencia» (D9, `/avisar-incidencia`) para capturista y brigadista, con «Mis avisos» y «Retirar»; el «+» lo ofrece (D12) y «Primeros pasos» lo dice. Regla del servidor `esAvisoDeQuienNoCoordina` / `motivoSiAvisoPorAceptar` en el mapa y la Agenda. Número junto a «Incidencias» = filtro «Por aceptar». Pruebas nuevas: `incidencias-consulta` (13), `incidencias-filtros` (4), `matriz-incidencias` (8), `avisos-de-campo` (12); cambiadas a propósito: `atajos-por-rol` (D12), `menu-claro` y `capacidades` (D2), `incidencias-brigadas` (D9). Mutaciones 32 a 39, atrapadas. Pesos: Incidencias 425 → 202 KB, «Levantar incidencia» 312 → 53 KB. Ver «Cambios durante la implementación» (§20) |
| 3 | **Hecha el 2026-10-17.** Migración `0028` (clave sin señal, quién y cuándo cambió el estado, dependencia, folio y fecha del turno, índices para la ficha y el mapa), aplicada solo a la copia del simulacro. `lib/escucha-social-servicio.ts` con la lista por páginas (`POST /api/escucha-social/consulta`), el alta ligada a un vecino que se ve (404 si no), el nombre del vecino recortado en el servidor, el estado con auditoría y «Turnar a una dependencia» solo para administración (D6). Pantalla en piezas: `EscuchaSocialClient.tsx`, `FormularioPeticion.tsx` (sin señal, tipo `escucha`; la frase es opcional y se toma del texto), `DetallePeticion.tsx`. «Lo que ha pedido» en la ficha (D10, `components/LoQueHaPedido.tsx`), capa «Peticiones» del mapa (`GET /api/map/escucha`, sin nombres), «Petición de un vecino» en el «+» de los cinco perfiles (D12) y «Primeros pasos» que lo dicen. Glosario: «Turnar a una dependencia» y «Aviso por aceptar». Pruebas: `escucha-social` (29 de integración, con la migración), `matriz-escucha` (5: 14 autores por 7 perfiles), `escucha-social` de unidad (11), `atajos-por-rol` (9). Mutaciones 40 a 55, atrapadas. Peso: Escucha 132 → 121 kB de carga inicial; su HTML, 257 → 112 KB para administración y 73 → 37 KB para el capturista. Toques (`scripts/local/toques-fase3.txt`): desde la ficha 3, en la calle 5, turnar 5. Ver §20 |
| 4 | **Hecha el 2026-10-17.** Migración `0029` (ciudadano o cuenta, casilla, quién nombró; un solo vocabulario de roles con reglas `NOT VALID` dentro de un bloque `DO`), aplicada solo a la copia del simulacro: sus 75 RC y 35 RG quedaron con la clave nueva. «Cobertura»: tres barras (coordinación, RG, RC contra 2 casillas estimadas por sección), chips «Sin coordinación», «Sin RG», «Sin RC», «Completas», buscador por sección, colonia o nombre que viaja en el cuerpo de `POST /api/electoral/cobertura`, 30 secciones por página. Dirección y líder cuentan solo su estructura (D11); la administración, todo su municipio; el maestro elige municipio. «Nombrar» en una hoja: qué hará (ya viene elegido lo que falta), quién (sugeridos que quieren ser RC, su gente, búsqueda) y casilla (D5). «Cambiar» y «Quitar» en el detalle de la sección, con «Agregar una colonia». `PATCH` y `DELETE /api/electoral/representatives/[id]` nuevos; `POST` endurecido. Fuera «Nueva Sección», el `@ts-ignore`, el `try/catch` de la tabla y las 3,791 secciones. Glosario: «Cobertura» y «RG y RC». Pruebas: `estructura-electoral` (23 de integración, con la migración), `matriz-estructura` (6), `estructura-electoral` de unidad (7). Mutaciones 57 a 67, atrapadas. Peso del HTML: 471 → 93 KB para administración, 423 → 87 KB para el líder. Toques (`scripts/local/toques-fase4.txt`): S1 3, S2 6, S3 5, S4 2, S5 3. Ver §20 |
| 5 | **Hecha el 2026-10-17.** P1 corregido: el historial y «Entregado a personas» enseñan el nombre solo de quien está en el alcance; lo demás, «Otras estructuras», sumado (comprobado en la copia: Zapopan Norte ve sus 20 últimos movimientos como de otra estructura, antes 5 nombres ajenos). Migración `0030` (mínimo, archivado, `updated_at`, tipo `devolucion`, reglas `NOT VALID`, índice por fecha), aplicada solo a la copia. Pantalla nueva: resumen («Piezas en almacén», «Tipos de artículo», «Por agotarse», «Entregadas en 30 días» por fecha), pestañas Inventario / Entregado a personas / Historial; buscador que sí busca (nombre, clave, categoría, sin acentos), chips de almacén, categoría, «Por agotarse» y «Archivados»; «Entregar», «Resurtir» y «Editar» en cada artículo; devoluciones con tope; editar (administración y dirección) y archivar (solo administración, auditado); historial completo por páginas. Ya no se desborda en el teléfono (medía 403 px en uno de 375). Fuera `AssignModal.tsx` y la excepción de la guardia «sin adorno». Glosario: «Por agotarse» y «Devolución». Pruebas: `logistica` (12), `matriz-logistica` (7), `logistica-tipos` (5). Mutaciones 68 a 77, atrapadas. Toques (`scripts/local/toques-fase5.txt`): L1 6, L2 5, L3 3, L4 3. Ver §20 |
| 6 | **Hecha el 2026-10-17.** Perfil liviano (`lib/perfil.ts`): 20 ciudadanos y el total con «Ver los N en el Directorio» (`?registro=`, solo personas cuyo perfil se puede abrir; uno ajeno se ignora), 30 actividades con el tipo real de la Agenda («Visita» e «Incidencia» incluidas) y «ver todas en la Agenda», colonias por territorio y secciones contadas en la base, totales y cumplimiento sobre todas sus actividades. Una sola regla para abrir un perfil y para filtrar el Directorio (`puedeVerPerfil`). Peso del perfil propio: líder 1.3 MB → 129 KB (meta, menos de 250), capturista 238 → 107, brigadista 147 → 114. Pruebas: `perfil-liviano` (7). Mutaciones 78 a 83, atrapadas. Ver §20 |
| 7 | **Hecha el 2026-10-17.** Ajustes retirado (D1): `/settings` lleva a `/perfil?pestana=seguridad` (con y sin sesión comprobado), fuera del menú y de `capacidades.ts`; el perfil abre la pestaña que diga `?pestana=` y la pone a la vista (Seguridad, solo en el propio); `sin-adorno` ya no tiene excepciones. Código muerto fuera (D3): `AdminInboxClient.tsx`, `admin-inbox/actions.ts`, `inbox-deps.ts` y `/api/admin/sections`; tabla, datos y módulo de la bandeja se quedan. Términos y Privacidad dicen el nombre del sistema (`MARCA.sistema`, «Jalisco OS»); **la redacción legal la revisa el dueño**. Fuera los tres `@ts-ignore` que quedaban y los cinco avisos de lint que seguían (lint: 0 errores y 0 avisos; la línea base tenía 15 avisos). Pruebas: `perfil-pestanas` (4, con la redirección), `capacidades`, `menu-claro`, `role-home` y `sin-adorno` ajustadas. Mutaciones 84 a 86, atrapadas; la 26 (la guardia de adorno) ahora quita la acción de un botón real. `como-ci`: 884 pruebas en 98 archivos, en verde; `web:build` en verde. Recorrido: solo cambia `/settings` (→ `/perfil?pestana=seguridad`, todos los roles). Toques (`scripts/local/toques-fase7.txt`): P3 = 3. Ver §20 |
| 8 | **Hecha el 2026-10-18.** `CLAUDE.md` (153 renglones) con recetas y su prueba (pantalla y menú, ruta de API, migración con reglas `NOT VALID`, formulario sin señal, capa del mapa, glosario, acción auditada, renglón de la matriz). `docs/MAPA_DE_PANTALLAS.md` con una ficha por cada una de las 20 pantallas del panel (las no rediseñadas, «ficha de referencia»), las pantallas retiradas y los documentos históricos. `PLAN_EXPERIENCIA_SENCILLA.md` §8 con las pruebas de este plan. `README.md` al día (Incidencias, Directorio, Estructura, Escucha, Logística, perfiles). Habilidades locales `ui-shell-crm-el`, `permisos-usuarios-crm-el` y `migraciones-crm-el` reescritas. **Prueba con una IA** en una sesión nueva, solo con la documentación, con el error inventado del chip «Sin asignar»: llegó a `consultarIncidencias` e `incidentScopeCondition` y a la prueba `incidencias-consulta` abriendo 6 archivos (los 2 documentos y 4 de código); lo que echó en falta se agregó (ver §20). `como-ci`: 884 pruebas en 98 archivos, en verde; lint 0 avisos; `web:build` en verde |

---

## 19. Verificación del plan (2026-10-15)

El dueño pidió estar absolutamente seguro de esta guía. Se revisó afirmación por afirmación contra el código,
la copia del simulacro y las pruebas. Nada del código se modificó.

### 19.1 Lo que se comprobó

| Qué | Cómo | Resultado |
|---|---|---|
| Línea base | `como-ci.mjs` en una base vacía | 717 pruebas en 80 archivos en verde; lint 0 errores, 15 avisos |
| P1, Logística | Las dos direcciones de Zapopan, por HTTP, contra las personas de su alcance | Zapopan Norte ve 5 nombres fuera de su alcance; Distrito 10, 0. **Confirmado** |
| Escucha Social por rol | `GET /api/escucha-social` con brigadista, capturista y líder | Brigadista ve 1 (la suya) y trabaja 1; capturista ve 17 y trabaja 4 (las suyas); líder ve 17 y trabaja 17 |
| Perfil ajeno | Brigadista, capturista, líder y administración sobre un compañero | Brigadista 404; los demás lo abren |
| Incidencias del líder y la dirección | La pantalla con sus cuentas | 29 y 114 abiertas; ninguna «solo consulta» en la copia |
| Mapa del brigadista | `GET /api/map/reports` | 29 incidencias (las suyas y las de su brigada) |
| Quién acepta y quién reasigna | `api/map/reports/route.ts`, `[id]/route.ts`, `permisos-incidencias.ts` | Alta directa como aceptada: administración y dirección. Reasignar: administración o `isLeader` (dirección siempre cuenta). El autor y el asignado pueden cambiar el estado |
| Quién levanta incidencias | `requireLiderParaIncidencias` | Administración o `isLeader` |
| El «+» | `boton-mas.ts`, `QuickCreateFab.tsx`, `atajos-por-rol.test.ts` | Brigadista sin botón; capturista directo al alta; una prueba lo exige |
| Llamadas a `POST /api/electoral/sections` | Búsqueda en todo `apps/web` | Tres pantallas: Estructura, «Levantar incidencia» y el asignador de sección |
| Código muerto | Búsqueda de importaciones y llamadas | `AdminInboxClient`, `admin-inbox/actions`, `inbox-deps`, `packages/ui/styles.css` y `/api/admin/sections`: nadie los usa |
| Cifrado | `schema.ts` | `display_name` del ciudadano va en claro; el resto de sus datos personales, cifrados |
| Maestro | `schema.ts` | Índice que permite un solo maestro |
| Prueba de esquema | `esquema-vs-migraciones.test.ts` | Compara tablas y columnas; no nulos ni restricciones |
| Migraciones | Repo | Ninguna usa `NOT VALID` todavía; `audit_logs.action` no tiene restricción |
| Borrar incidencias | `DELETE /api/map/reports/[id]` | Borra de verdad |
| Redirecciones dentro de la página | Respuesta de «Usuarios y permisos» para dirección | 200 con `NEXT_REDIRECT` al Resumen |

### 19.2 Lo que se corrigió en el plan

1. **«Agregar una colonia» ya no se reduce a administración.** Lo usan «Levantar incidencia» y el asignador de
   sección; reducirlo los rompía para dirección y líder.
2. **Estructura: la dirección y el líder no ven la cobertura de otras estructuras** (D11). La primera versión
   proponía «Cubierta por otra estructura», que contradice una decisión de privacidad ya escrita en el código.
3. **Avisos de campo (D9):** sin una regla nueva, quien avisa podría aceptarse a sí mismo (hoy el autor cambia
   el estado). Se agregó la regla, el «Retirar» sin borrar y qué pasa si quien avisa no tiene equipo o tiene
   varios. Se renombró a «Avisar de una incidencia» para no confundirlo con «Reportar un problema».
4. **El «+» de capturista y brigadista es una decisión vieja protegida por una prueba**: ahora es D12.
5. **«Lo que ha pedido» en la ficha** necesitaba una regla: es D10.
6. **Privacidad:** el nombre del ciudadano para mostrar no va cifrado; se corrigió el §5.1.
7. **Matriz de incidencias:** faltaba que capturistas y brigadistas ya trabajan desde el mapa lo que les
   asignan.
8. **Toques:** se recontaron en el teléfono con la barra de abajo real de cada rol. Tres casos se pasaban del
   límite y se rediseñaron: nombrar sin pestañas y entregar desde la tarjeta del artículo.
9. **Se quitó el filtro «Me tocan» por omisión**: en la copia, todo lo que ven el líder y la dirección ya lo
   pueden trabajar, así que no ayudaba. Quedan *Por atender* con lo «Por aceptar» primero y el chip «Mías».
10. **Cuentas de prueba:** solo puede haber un maestro; se usa el de la copia con su clave de prueba, y las dos
    direcciones de Zapopan ya existen.
11. **Guardia `sin-adorno`:** con analizador de TypeScript; las expresiones regulares dieron falsos positivos.
12. **Recorrido HTTP:** con `next start` y detectando `NEXT_REDIRECT`.
13. **Migraciones `0029` y `0030`:** prueba propia, porque la prueba de esquema no ve nulos ni restricciones.
14. **`/reportes`** también manda las 3,791 secciones (C6); se arregla en F2.4.
15. Se agregaron las observaciones O1 a O4, que el plan no cambia.

### 19.3 Lo que solo se puede confirmar al implementar

- Los pesos y tiempos finales de cada pantalla (se miden contra la línea base).
- Los toques reales de cada caso, con la interfaz terminada.
- `pnpm web:build` con los cambios (la última corrida en verde fue el 2026-10-07; se repite en la fase 0).

---

## 20. Cambios durante la implementación

Lo que al implementar resultó distinto de lo escrito arriba, y por qué. Nada de esto cambia lo que se decidió
en el §3.

| Fase | Plan | Lo que se hizo | Por qué |
|---|---|---|---|
| 1 | «Primeros pasos» del capturista y del brigadista | Se conservaron sus cuatro consejos: el aviso se sumó al de registrar (capturista) y la barra de abajo al de la Agenda (brigadista) | Para no quitar ninguna ayuda que ya tenían |
| 2 | El aviso entra «asignado al equipo de quien avisa» | Entra **sin equipo ni responsable** | Asignado a la brigada, un compañero brigadista podía aceptarlo (lo trabaja quien tiene asignado su equipo). Sin asignar, lo ven y lo aceptan solo quienes mandan sobre quien avisó, porque está en su mando; tampoco hay que preguntar a cuál brigada si está en varias |
| 2 | La regla del aviso: «mientras esté por aceptar, quien no coordina no le cambia el estado» | **Solo para quien avisó**, y también después: no lo reabre una vez retirado o rechazado. Si su líder se lo asigna ya aceptado, lo trabaja como cualquier asignado | Aplicada a todos, le quitaba a un brigadista asignado a una incidencia ajena algo que hoy puede hacer. Y al probarla se vio que, solo con «por aceptar», quien avisó podía retirarlo y luego reabrirlo como aceptado |
| 2 | Borrar | Quien no coordina no borra incidencias | Borrar es de verdad (O4). Antes de los avisos, quien no coordina no era autor de ninguna incidencia: no se le quita nada que pudiera hacer |
| 2 | «Un solo formulario» para levantar incidencias | Se comparten las piezas (equipo y persona, la sección por número); la ventana del mapa y la página siguen siendo dos envolturas | La ventana nace de un punto marcado y detecta la sección por polígono; la página, de una dirección. Juntarlas arriesgaba romper la detección del punto. Lo que se veía distinto (C3) ya no lo es |
| 2 | El asignador de sección de Incidencias se cambiaba | Se reemplazó por la hoja «Más» (sección detectada en el punto o buscada por número) y se borró `IncidentSectionAssigner.tsx` | Era su único uso; dejarlo sería código muerto |
| 2 | — | La ventana «Editar incidencia» del mapa ya no manda el responsable a quien no coordina | Encontrado al implementar: el servidor rechazaba el cambio entero, así que un brigadista no podía guardar ni una corrección de texto de lo que le asignaron |
| 2 | — | El número junto a «Incidencias» cuenta lo mismo que el filtro «Por aceptar» | En el navegador el menú decía 5 y el filtro 11 (el menú no contaba lo que levantó la propia persona) |
| 2 | — | La barra de arriba del teléfono dice el nombre de las pantallas que no están en el menú («Avisar de una incidencia») | Decía «Tonalá OS» y no se sabía dónde se estaba |
| 3 | La capa del mapa pide `GET /api/map/escucha?bbox=…` | Sin `bbox`: trae de una vez lo que se ve con ubicación (tope de 2,000) y se agrupa en el teléfono como las incidencias | Son pocas (221 con lugar en la copia del simulacro) y la capa se pide solo al encenderla. Con `bbox` habría que volver a pedir a cada movimiento del mapa |
| 3 | Escucha abre «en "Mías" para el brigadista» | Abre en «Las que anoté» para **quien no coordina** (capturista y brigadista) | El capturista ve 👁 lo de sus compañeros, pero solo trabaja lo suyo: lo primero que necesita es lo que anotó. Con un toque ve lo demás |
| 3 | «Aviso por aceptar» en el glosario (fase 2) | Se sumó en esta fase, junto con «Turnar a una dependencia» | Se quedó fuera de la fase 2; está junto al texto de Incidencias |
| 3 | — | Una petición antigua ligada a un vecino que quien mira ya no ve dice «un vecino de tu municipio», y su nombre no viaja | Puede pasar con datos de antes de la regla o con quien cambió de brigada; la prueba lo cubre |
| 3 | — | `GET /api/escucha-social` responde `{ filas, total, pagina, totalPaginas, pendientes }` en vez de `{ items, total }` | La lista va por páginas (F3.6). Ninguna pantalla leía `items` (la anterior recibía la lista del servidor); se ajustaron sus dos lectores: `datos-del-ciudadano.test.ts` y `scripts/test-live-suite.py` (este acepta las dos formas) |
| 3 | Formulario: «En una frase» y la descripción, las dos obligatorias | La frase es **opcional** (sin ella, la primera oración del texto) y cada paso deja el cursor en el siguiente | Contado en el navegador, el caso E2 salía en 8 toques (límite 6). Ahora son 5; desde la ficha, 3. El campo sigue ahí |
| 3 | — | «Las que anoté» va primero en la fila de filtros | Quien no coordina abre con ese filtro puesto y quedaba fuera de la pantalla: no se entendía por qué había tan pocas |
| 3 | — | El buscador de personas (`SelectorBuscable`, el mismo de la Agenda) dice «Buscando…» mientras espera, no «Sin resultados.» | Encontrado en el navegador: durante la espera entre teclas decía que no había nadie |
| 3 | — | La fecha del turno se guarda como el día de Jalisco | Encontrado en el navegador: se elegía el 17 y la petición decía «16 oct» (se guardaba la medianoche UTC). La fecha que se propone también es la de hoy en Jalisco, no en UTC |
| 3 | — | Las gestiones que la versión anterior marcó «formales» se leen «Turnada (sin dependencia anotada)», sin fecha | Encontrado en el navegador: decían «Turnada a Dependencia sin anotar · 31 dic 1969» |
| 3 | — | El formulario y el detalle se cargan aparte de la lista (`next/dynamic`) | La primera carga de Escucha subía de 132 a 148 kB; ahora es 121 kB |
| 4 | `coberturaPorSeccion` en `lib/estructura-electoral.ts` | Dos archivos, como Escucha: `lib/estructura-electoral.ts` (roles, casilla, filtros; sin base, se importa en la pantalla) y `lib/estructura-electoral-servicio.ts` (consultas y cambios) | La pantalla necesita los roles y los filtros sin arrastrar la base al navegador |
| 4 | Regla `user_id IS NOT NULL OR contact_id IS NOT NULL` | **Una de las dos, nunca las dos** (`(user_id IS NOT NULL) <> (contact_id IS NOT NULL)`) | Una fila con cuenta y ciudadano a la vez no diría a quién se nombró; la aplicación nunca escribe las dos |
| 4 | Mapeo de roles: las dos etiquetas de la pantalla y `coordinador%` | También `general_responsible` y `casilla_responsible` (los escribían los scripts de carga) y los textos «Representante general…» / «de casilla…». «Promotor» se queda como está y se enseña como «Otro: Promotor» | Encontrado al revisar los scripts: había un tercer vocabulario. Los cuatro scripts que cargan representantes escriben ya las claves nuevas |
| 4 | Sugerir a quienes dijeron en la encuesta que quieren ser RC | Además, los dos formularios de alta ofrecen «Ser representante de casilla el día de la elección» (guarda «Representante de casilla», el mismo texto de los datos importados) | Los formularios no ofrecían esa respuesta: la sugerencia solo habría servido con datos viejos. No se quitó ninguna opción |
| 4 | Chips «Sin coordinador», «Sin RC», «Completas» | También «Sin RG»; «Completas» = coordinación, RG y las 2 casillas estimadas | Las tres preguntas de la pantalla son por rol |
| 4 | Buscador «por sección o colonia» | También por el nombre de quien cubre, solo entre lo que quien mira ve | «¿Dónde quedó Juan?» es la otra pregunta frecuente; buscar no destapa nombres de otra estructura (hay prueba) |
| 4 | — | En «Nombrar», el rol viene elegido: el primero que le falta a la sección | Ahorra un toque en lo más común |
| 4 | F4.4 (opcional): capa de cobertura en el mapa | No se hizo | Era opcional; queda para después si el dueño la pide |
| 4 | — | `POST /api/electoral/representatives` responde 201 con el id (antes 200 sin datos) y nombrar exige `commandUserIds` (antes `allowedUserIds`) | Su único llamador es la pantalla nueva. Nombrar es de quien manda (§4.4): ver a alguien no basta |
| 4 | — | En el teléfono, el botón «Nombrar» de cada tarjeta va a la izquierda y el detalle pone «Cambiar» y «Quitar» debajo del nombre | Encontrado en el navegador: el «+» flotante tapaba el botón y los botones cortaban el nombre |
| 5 | P1 «con las dos direcciones de Zapopan» | Las pruebas usan las dos direcciones de Tonalá de la estructura de prueba (D y DB); en la copia del simulacro se comprobó con Zapopan Norte | La estructura de prueba tiene una sola dirección en Zapopan; el caso es el mismo: dos direcciones, un almacén |
| 5 | El historial recorta el nombre de quien recibe | También el de quien registró el movimiento, y las notas de otra estructura no se enseñan | Quien registra también es una persona de otra estructura, y las notas suelen nombrar a alguien |
| 5 | — | `lib/logistica-tipos.ts` (sin base) junto a `lib/logistica.ts` | La pantalla filtra el inventario sin pedirlo al servidor (son decenas de artículos) y no debe arrastrar la base |
| 5 | — | Editar y archivar quedan en la auditoría (`inventory.*`) | Archivar saca un artículo de la lista: conviene saber quién y cuándo |
| 5 | «Nuevo… ▾» (un menú) | Dos botones: «Nuevo artículo» y «Nuevo almacén» | Un menú de dos opciones es un toque de más |
| 5 | — | En el teléfono, «Editar» de cada artículo es solo el ícono del lápiz (para lectores de pantalla dice «Editar …») | Con el texto, los tres botones no cabían en una línea a 375 px |
| 5 | — | Al abrir «Entregado a personas», el cursor queda en su buscador | Contado en el navegador, L4 salía en 4 toques (límite 3) |
| 6 | «20 ciudadanos y el total» | El total y la lista cuentan solo ciudadanos activos (antes el perfil listaba también los dados de baja) | Así «Ver los N en el Directorio» lleva a los mismos N: el Directorio solo enseña activos |
| 6 | La lista de ciudadanos del perfil | Ya no trae domicilio, profesión ni correo de cada ciudadano; el buscador y el filtro de colonia de esa lista se cambian por «Buscar entre sus N en el Directorio» | Buscar sobre 20 engañaría; el Directorio ya busca por nombre, teléfono, colonia o sección entre todos. Los datos siguen en la ficha de cada ciudadano |
| 6 | Tarjetas «Pláticas», «Visitas», «Eventos» | Los tres tipos que más hace, con su nombre real de la Agenda, contados en la base | Se adivinaban por el título de cada actividad (C5) |
| 6 | «Ver todas en la Agenda» (`/equipo?responsable=`) | `/equipo?vista=todas&scope=equipo&responsable=` | La Agenda abre en «Hoy»: sin `vista=todas` el enlace llegaba casi siempre vacío (comprobado en el navegador). Con `scope=equipo`, al quitar el filtro de la persona se ve el equipo y no la agenda propia de quien mira |
| 7 | Borrar `packages/ui/styles.css` | Nada que borrar | Ya se había borrado en #25 (8932083); la verificación del plan se hizo sobre una copia vieja |
| 7 | — | Al abrir el perfil con `?pestana=`, la pantalla baja hasta las pestañas, sin animación | En el teléfono las pestañas quedan debajo de la cabecera y las cifras (a 1,066 px): quien llega desde lo que fue Ajustes no veía la pestaña abierta. Con el desplazamiento suave de la página, se quedaba a medio camino |
| 7 | — | Las cuatro pestañas del perfil miden 44 px de alto | Medían 34 (regla de 44 px para tocar) |
| 7 | «Lint sin avisos nuevos» | Lint sin ningún aviso: se quitaron los cinco que seguían (`currentUserId` e `isEditingName` sin usar en el perfil, `_error` en `admin-incidencias/actions.ts`, `_parseErr` y `_e` en `api/map/autocomplete/route.ts`) | Eran restos del mismo tipo, y con cero cualquier aviso nuevo salta a la vista |
| 7 | Prueba de la redirección en `tests/unit` | En `apps/web/src/lib/perfil-pestanas.test.ts` | La comprobación de tipos de la raíz no resuelve `next/navigation` desde `tests/unit` (módulos ESM); la de `apps/web` sí |
| 7 | P3 «Maestro cambia su contraseña» | Contado en el navegador con administración municipal; que el maestro ya no tiene Ajustes lo cubren `capacidades` y `menu-claro` | La sesión del maestro de la copia usa la contraseña del `.env`, que no se usa en pruebas; el camino «Más → Mi perfil → Seguridad» es el mismo para todos los roles |
| 7 | — | El título de la sección del menú sigue siendo «Mi cuenta y ajustes» | Debajo quedan Usuarios y permisos y Problemas reportados, que son ajustes de la administración |
| 8 | «Una ficha por pantalla» | 20 fichas; las 11 de pantallas que este plan no rediseñó dicen «ficha de referencia» | Describen la pantalla como está, con sus archivos, APIs y pruebas, sin prometer revisiones que no se hicieron |
| 8 | — | La ficha de Incidencias dice qué parámetro es cada chip («Sin asignar» = `responsable=sin`) y dónde está su condición | La IA de prueba buscó la condición del chip en `incidencias-filtros.ts` (solo lee el parámetro): la ficha no lo decía |
| 8 | — | El mapa de pantallas dice dónde vive cada prueba nombrada sin ruta | La IA tuvo que buscar si `incidencias-consulta` era de `apps/web/tests/` o de `src/lib/` |
| 8 | — | `CLAUDE.md`: el líder ve su brigada **y** lo que se asigna a su equipo aunque venga de otra estructura | La tabla decía solo «su brigada» y se quedaba corta (`incidentScopeCondition` deja ver lo asignado a sus equipos) |
| 8 | — | `sqlCondicionIncidencias` (gemela en SQL a mano de `incidentScopeCondition`) se documenta como sin llamadas | No la usa nadie; se deja (no estaba en la lista de D3) y se anota en el §21 |

## 21. Lo que quedaba (hecho el 2026-10-28, con el visto bueno del dueño)

Ninguno rompió lo que ya funcionaba: pruebas antes del cambio, el comportamiento de siempre conservado (enlaces
viejos, `GET` de la exportación y del catálogo) y cada prueba nueva con su mutación atrapada (`scripts/local/mutaciones.py`,
`MUTACIONES_PENDIENTES` y `MUTACIONES_O3`, índices 87 a 97).

| Qué | Cómo quedó | Pruebas |
|---|---|---|
| O2: el buscador del Directorio, su exportación y el de «Usuarios y permisos» iban en `?q=` | `POST /api/directorio/consulta` y `POST /api/admin/usuarios/consulta`, con la primera página del servidor (el patrón de Incidencias); la dirección lleva solo filtros (`lib/directorio-filtros.ts`, `lib/usuarios-filtros.ts`). «Exportar» es un formulario `POST`. Los enlaces viejos con `?q=` siguen buscando y la pantalla quita el texto de la dirección | `directorio-consulta` (6), `directorio-filtros` (3), `usuarios-consulta` (5), `usuarios-filtros` (3); `perfil-liviano` ajustada a las props nuevas |
| O3: «Registrar ciudadano» descargaba las 3,791 secciones con colonias y conteos cada vez | `GET /api/electoral/sections?ligera=1` (id, número, municipio), una vez por visita y guardada 10 minutos en el navegador (`lib/secciones-del-catalogo.ts`). El GET completo no cambia | `secciones-del-catalogo` (2), `secciones-ligeras` (3) |
| La lista de la Agenda sin prueba propia | `apps/web/tests/bitacora-consulta.test.ts`: cada vista y sus números, «Mi agenda» y «Todo mi equipo» (quien no asigna ve lo suyo), `responsable=` solo dentro del alcance, la visita ligada una vez, el buscador, quién ve la actividad de quién. No cambió nada de la Agenda: ya se portaba así | `bitacora-consulta` (8) |
| El chip «Sin asignar» contra otra brigada de la misma dirección | Caso nuevo en `incidencias-consulta`: L1 no ve lo de B2 ni L2 lo de B1; D ve las dos. Ya se portaba así | `incidencias-consulta` (14) |
| `sqlCondicionIncidencias` sin llamadas | Borrada; `incidentScopeCondition` es la única | typecheck y build |
| Errata en Términos | «información verídica» | — |
| El título «Mi cuenta y ajustes» | Se deja: cambiarlo es cosmético y obliga a tocar las pruebas del menú | — |

## 22. Revisión de seguridad (2026-10-30)

Se revisó todo el proyecto: rutas, pantallas, acciones de servidor, sesión, archivos, cifrado, configuración y
librerías. No maneja PHP. Cada arreglo tiene su prueba y su mutación atrapada (`MUTACIONES_SEGURIDAD`, índices 98 a 106).

| Qué | Cómo quedó | Pruebas |
|---|---|---|
| El QR público revelaba si un teléfono está en el padrón: «ya registrado» (409) o «elige el municipio» (400), sin guardar nada | Lo demás se revisa antes que el teléfono. Sin la sesión de quien opera el enlace, un repetido responde igual que un registro nuevo, no se guarda y la respuesta no trae la ficha ni si fue repetido. Con esa sesión se sigue diciendo (409). `modo` en el cuerpo no cuenta. El tope va por la persona dueña del enlace, no por cómo se escribió | `registro-publico-sin-oraculo` (7); `altas-de-campo` y `municipio-llave` ajustadas |
| `telefono-repetido` llevaba el teléfono en `?telefono=` | `POST` con el teléfono en el cuerpo; ya no hay `GET` | `rutas-experiencia-sencilla` |
| Next.js 15.5.23: ejecución remota de código en el optimizador de imágenes (`/_next/image`, sin sesión) | Next 15.5.28. Además el optimizador solo acepta `/brand` y `/media` (`images.localPatterns`): nunca lo que sube la gente | `imagenes-solo-propias` (2) |
| `sharp` 0.34.5, con fallas en libvips, libheif y librsvg | 0.35.5, fijada en `overrides` de `pnpm-workspace.yaml` porque Next acepta las dos | `imagenes-solo-propias`; imagen de producción construida |
| `zod` 4.4.3 (memoria con colecciones enormes) y `maplibre-gl` 6.3.0 (nadie la importa) | Actualizadas | Toda la suite |

**Se dejan a propósito:** `postcss` 8.4.31, `nanoid` y `source-map-js`, fijados por Next: solo actúan al compilar el CSS
propio, nunca con datos de quien usa el sistema. `pnpm audit --prod` los sigue contando.

**Lo que cambia para la gente:** quien vuelve a registrarse por QR sin sesión ve «registro completado» y no «ya estás en la
red». En modo evento sin sesión abierta pasa lo mismo, y el contador del evento también lo suma.

**Observaciones sin arreglar (no dan acceso a nada):**

- `/api/auth/register` y `/api/public/unirme` dicen si un correo ya tiene cuenta; probar uno nuevo crea una solicitud pendiente.
- Un administrador municipal puede poner meta a otro de su municipio o nombrarlo representante (`puedeFijarMeta`, `nombrar`).
- El perfil enseña el nombre de equipos que quien mira no puede abrir (`equiposDePersona`).
- Los textos de ejemplo de `.env.production.example` pasan la revisión de largo: copiados sin cambiar, la aplicación arranca.
