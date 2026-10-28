# Mapa de pantallas

Una ficha por pantalla del panel: para qué sirve, quién entra, qué ve cada quien, qué cuida de la
privacidad, dónde está el código y qué pruebas la cubren. Las reglas generales están en
[CLAUDE.md](../CLAUDE.md); las decisiones, en [PLAN_AUDITORIA_MENUS.md](PLAN_AUDITORIA_MENUS.md) (D1 a D12) y
[PLAN_EXPERIENCIA_SENCILLA.md](PLAN_EXPERIENCIA_SENCILLA.md).

Quién entra a cada pantalla lo dice una sola lista, `ACCESO_A_PANTALLAS` en `packages/ui/capacidades.ts`;
esta guía la repite para leerla rápido, pero si no coinciden, manda el código.

Las pruebas se nombran sin `.test.ts`: las de integración están en `apps/web/tests/` (y `tests/integration/`),
las de unidad en `apps/web/src/lib/` o `tests/unit/`; `mapa/html.test.ts` vive junto a su pantalla.

> Estado: completo al 2026-10-18, una ficha por pantalla del panel. Las que dicen «ficha de referencia»
> describen la pantalla como está; no se rediseñaron en el plan de auditoría de menús.

## Pantallas retiradas

Siguen existiendo solo para que un enlace o marcador viejo no se rompa.

| Dirección vieja | Lleva a | Desde |
|---|---|---|
| `/equipo/mis-contactos` | `/crm/contacts?asignados=mios` | M14 |
| `/equipo/mis-visitas` | `/equipo?responsable=<quien entra>` | M14 |
| `/crm/my-visits` | `/equipo/mis-visitas` | — |
| `/inbox` | `/` (el inicio de cada rol) | — |
| `/admin-inbox` («Todos los reportes») | `/admin-incidencias?vista=todas` | D2, 2026-10 |
| `/historial-incidencias` | `/admin-incidencias?vista=cerradas` | D2, 2026-10 |
| `/settings` («Ajustes») | `/perfil?pestana=seguridad` (nombre y contraseña); sin sesión, antes al login | D1, 2026-10 |

## Documentos históricos

| Documento | Qué es |
|---|---|
| `docs/cliente/TONALA_OS_V1_QUE_FALTA.*` | Lista de pendientes de la versión 1 (cuando se llamaba Tonalá OS). Ya no está al día |
| `docs/PRODUCT_OPERABILITY_PLAN_V1.md`, `docs/PRODUCT_OPERABILITY_PLAN_MOBILE_FIRST.md`, `docs/ROADMAP_V1.md` | Planes de la versión 1 |

---

## Fichas

### Incidencias · `/admin-incidencias`

- **Para qué:** aceptar lo que llega de campo, asignarlo y seguir su avance; buscar y revisar lo cerrado.
- **Casos de uso:** I1 a I8 (`PLAN_AUDITORIA_MENUS.md` §6.1).
- **Quién entra:** `admin`, `direction`, `territorial_coordinator`. Capturista y brigadista no: avisan desde
  `/avisar-incidencia`.
- **Quién ve qué:** `condicionDeIncidencias` (`lib/incidencias-consulta.ts`): `incidentScopeCondition`
  (`lib/incident-visibility.ts`) sin actividades de la Agenda. Es la única: su gemela en SQL escrito a mano
  (`sqlCondicionIncidencias`), que nadie llamaba, se borró. Quién la trabaja: `incidenciasQuePuedeTrabajar` (= `puedeSobreIncidencia` en el
  servidor; `matriz-incidencias.test.ts` comprueba que coinciden). Lo que se ve y no se trabaja dice «Solo
  consulta».
- **Privacidad:** «Reportó» y «Atiende» llegan recortados del servidor: fuera del alcance, «Otra estructura» /
  «Otro equipo». El buscador viaja en el cuerpo de `POST /api/incidencias/consulta`, nunca en la dirección.
- **Archivos:** `admin-incidencias/page.tsx` (primera página en el servidor), `IncidenciasClient.tsx` (vistas,
  buscador, chips, páginas), `TarjetaIncidencia.tsx`, `HojasDeIncidencia.tsx` («Asignar» y «Más»),
  `StatusSelector.tsx` (`modo`: acciones o desplegable), `lib/incidencias-filtros.ts` (filtros sin base),
  `lib/incidencias-consulta.ts` (consulta, indicadores, `contarPorAceptar`).
- **APIs:** `POST /api/incidencias/consulta`; `PATCH /api/map/reports/[id]` (estado, sección, asignación);
  server action `updateReportStatusAction`.
- **Chips → código:** «Por aceptar» `por_aceptar=1`, «Sin asignar» `responsable=sin`, «Más de 7 días»
  `antiguedad=7`, «Sin sección» `sin_seccion=1`, «Asignadas a mí» `responsable=mias`. Se leen en
  `leerFiltrosDeIncidencias` (`lib/incidencias-filtros.ts`); la condición de cada uno y su número (`indicadores`)
  están en `consultarIncidencias` (`lib/incidencias-consulta.ts`), siempre dentro de `condicionDeIncidencias`.
  Pruebas del chip: `incidencias-consulta` (lo que trae y su número por perfil, también contra la otra brigada de
  la misma dirección).
- **El número del menú:** `contarPorAceptar`, el mismo que el chip «Por aceptar» (`(shell)/layout.tsx`).
- **Pruebas:** `incidencias-consulta`, `incidencias-filtros`, `matriz-incidencias`, `avisos-de-campo`,
  `incidencias-brigadas`.
- **Decisiones:** D2 (una sola pantalla), D9 (avisos de campo).

### Avisar de una incidencia · `/avisar-incidencia`

- **Para qué:** que capturista y brigadista avisen de un bache, una fuga o una luminaria, y vean en qué va.
- **Casos de uso:** I5, I7.
- **Quién entra:** `capturist`, `visit_responsible` (el «+» se lo ofrece a quien no coordina: `boton-mas.ts`).
- **Qué pasa con el aviso:** `POST /api/map/reports` lo guarda «por aceptar», sin equipo ni responsable aunque
  los mande (`puedeLevantarComoAviso`). Lo ven y lo aceptan quienes mandan sobre quien avisó. Quien avisó solo
  lo retira (queda rechazado con «Lo retiró quien avisó.»); no lo acepta, no lo reabre y no lo borra, ni por el
  mapa ni por la Agenda (`esAvisoDeQuienNoCoordina`, `motivoSiAvisoPorAceptar` en `permisos-incidencias.ts`).
- **Archivos:** `avisar-incidencia/page.tsx`, `AvisarIncidenciaClient.tsx`, `lib/avisos-de-campo.ts` (sin
  base: tipos, título, estado para quien avisó), `lib/avisos-de-campo-servicio.ts` («Mis avisos»).
- **Sin señal:** cola `incidencia` de `cola-de-envios.ts`, con `clientRequestId`.
- **Pruebas:** `avisos-de-campo.test.ts` (12), `atajos-por-rol.test.ts`.
- **Decisiones:** D9, D12.

### Escucha Social · `/escucha-social`

- **Para qué:** anotar lo que pide o propone un vecino, ligado a él, y darle seguimiento hasta cerrarlo o
  turnarlo a una dependencia.
- **Casos de uso:** E1 a E6 (`PLAN_AUDITORIA_MENUS.md` §6).
- **Quién entra:** los cinco perfiles (`capacidades.ts`). Quien coordina abre en «Pendientes»; quien no
  coordina, en «Las que anoté».
- **Quién ve qué:** `condicionPorAutor` (lista, detalle y capa del mapa). Quién la trabaja (estado y notas):
  `condicionParaTrabajarPorAutor`; lo que se ve y no se trabaja dice «Solo consulta». Turnar: solo
  administración, sobre lo que ve (`turnarPeticion`). La matriz completa es la del plan §4.3 y la prueba
  `matriz-escucha.test.ts`.
- **Privacidad:** el nombre del vecino solo llega a quien puede ver su ficha (`contactIdRestriction`, como el
  Directorio); si no, «un vecino». Ligar a un vecino que no se ve es 404. La capa del mapa
  manda solo tipo, estado y punto. El buscador viaja en el cuerpo de `POST /api/escucha-social/consulta`. El
  formulario avisa si el texto parece un teléfono (`pareceTelefono`): el texto no va cifrado.
- **En otras pantallas:** «Lo que ha pedido» en la ficha del ciudadano (`components/LoQueHaPedido.tsx`, D10:
  todas sus peticiones a quien ve al vecino; las notas, solo de las que también ve en Escucha). Capa
  «Peticiones» del mapa (`useCapaPeticiones` en `mapa/capas.ts`, globo con «Ver petición»). «Petición de un
  vecino» en el «+» (`boton-mas.ts`).
- **Archivos:** `escucha-social/page.tsx` (`?nueva=1`, `&contacto=`, `?peticion=`), `EscuchaSocialClient.tsx`
  (pestañas, buscador, chips, páginas), `FormularioPeticion.tsx`, `DetallePeticion.tsx`,
  `lib/escucha-social.ts` (catálogos y filtros, sin base), `lib/escucha-social-servicio.ts` (consulta, alta,
  estado, turno, ficha y mapa).
- **APIs:** `GET/POST /api/escucha-social` (`?contacto=` para la ficha), `GET/PATCH /api/escucha-social/[id]`
  (`turno` para turnar o quitarlo), `POST /api/escucha-social/consulta`, `GET /api/map/escucha`.
- **Formulario:** quién lo pide → qué es → qué te pidieron. La frase es opcional: sin ella, la primera oración
  del texto (`tituloDesdeTexto`). Cada paso deja el cursor en el siguiente (5 toques en la calle).
- **Turno:** la fecha es el día de Jalisco (`fechaDeTurno`, mediodía de ese día). Las gestiones que la versión
  anterior marcó como formales llegan sin dependencia ni fecha (`TurnoDeGestion` con `null`) y se leen
  «Turnada (sin dependencia anotada)».
- **Sin señal:** cola `escucha` de `cola-de-envios.ts`, con `clientRequestId` (índice único parcial, `0028`).
- **Auditoría:** `social.status_change`, `social.turn`, `social.unturn`.
- **Pruebas:** `escucha-social.test.ts` (integración y migración `0028`), `matriz-escucha.test.ts`,
  `src/lib/escucha-social.test.ts`, `atajos-por-rol.test.ts`.
- **Decisiones:** D6 (turnar), D10 (la ficha), D12 (el «+»).

### Estructura Electoral · `/estructura-electoral`

- **Para qué:** saber qué secciones del municipio ya tienen coordinación, representante general (RG) y
  representantes de casilla (RC) para el día de la elección, y nombrar, cambiar o quitar a quien falta.
- **Casos de uso:** S1 a S5 (`PLAN_AUDITORIA_MENUS.md` §6.3).
- **Quién entra:** `admin`, `direction`, `territorial_coordinator` (`capacidades.ts`, `MANDO`). El maestro elige
  municipio (`?municipio=`); los demás ven el suyo; sin municipio, un aviso.
- **Quién ve qué (D11):** el maestro y la administración municipal cuentan todo el municipio; dirección y líder,
  solo su estructura (`nombradosVisibles`: la cuenta en `sqlRestriccionPersonas` o el ciudadano en
  `contactosVisibles`). Nunca reciben conteos ni nombres de otra estructura, tampoco buscándolos.
- **Quién nombra:** cuentas de su mando (`commandUserIds`; la administración, la gente de su municipio; el
  maestro, cualquiera) o ciudadanos que ve (D4), en secciones de su municipio. Casilla opcional si es RC (D5).
- **Quién cambia o quita:** la administración en su municipio; quien coordina, si la persona nombrada está bajo
  su mando o la nombró alguien de su mando (`puedeCambiarNombrado`; las filas viejas, por la persona). Lo demás
  sale como «Solo consulta: lo nombró otra estructura».
- **Sugerencias al nombrar RC:** ciudadanos visibles que respondieron en la encuesta que quieren ser
  representantes de casilla (`participation_form` con «casilla»), primero los que viven en esa sección. Los dos
  formularios de alta ofrecen esa respuesta desde la fase 4.
- **Archivos:** `estructura-electoral/page.tsx`, `EstructuraClient.tsx` (barras, chips, buscador, tarjetas),
  `Nombrar.tsx`, `DetalleSeccion.tsx` (colonias y quién la cubre), `lib/estructura-electoral.ts` (roles,
  casilla, filtros, sin base), `lib/estructura-electoral-servicio.ts` (cobertura, candidatos, nombrar, cambiar,
  quitar).
- **APIs:** `POST /api/electoral/cobertura`, `POST /api/electoral/candidatos`, `POST /api/electoral/representatives`,
  `PATCH` y `DELETE /api/electoral/representatives/[id]`; «Agregar una colonia» usa `POST /api/electoral/sections`
  (la comparten «Levantar incidencia» y la hoja «Más» de Incidencias: no cambiar sus permisos).
- **Datos:** migración `0029` (ciudadano o cuenta, casilla, quién nombró, un solo vocabulario de roles con reglas
  `NOT VALID`). Un rol viejo fuera del catálogo («Promotor») se enseña como «Otro: …» y no cuenta.
- **Auditoría:** `electoral.assign`, `electoral.change`, `electoral.remove`.
- **Pruebas:** `estructura-electoral.test.ts` (con la migración), `matriz-estructura.test.ts`,
  `src/lib/estructura-electoral.test.ts`.
- **Decisiones:** D4, D5, D11.

### Logística e Inventarios · `/logistica`

- **Para qué:** saber qué material hay en los almacenes del municipio, entregarlo, recibir lo que regresa y ver qué
  se está acabando.
- **Casos de uso:** L1 a L4 (`PLAN_AUDITORIA_MENUS.md` §6.4).
- **Quién entra:** `admin` y `direction` (`capacidades.ts`; la guarda está en `logistica/layout.tsx`). Almacenes:
  el maestro todos; administración y dirección, los de su municipio; sin municipio, ninguno (`almacenesVisibles`).
- **Quién hace qué (§4.5):** alta de almacén y de artículos, editar, entregar, resurtir y recibir devoluciones:
  administración y dirección. Archivar y devolver a la lista: solo administración (`puedeArchivar`). Se entrega a
  personas activas del alcance (`allowedUserIds`; el maestro, a cualquiera).
- **Privacidad (P1):** dirección ve los almacenes de su municipio, que tienen entregas de otra dirección. Los nombres
  de quien recibe y de quien registra salen solo si la persona está en el alcance de quien mira; lo demás dice
  «Otras estructuras», y en «Entregado a personas» va sumado. Las notas de otra estructura no se enseñan. Se
  recorta en el servidor (`historial`, `enManos`).
- **Por agotarse (D7):** mínimo por artículo (`min_quantity`); con las existencias en o por debajo, sale en la
  tarjeta del resumen, en el chip y en la tarjeta del artículo.
- **Reglas de los movimientos:** una salida no deja existencias negativas; una devolución no pasa de lo que esa
  persona tiene; un artículo archivado no se mueve. La fila del artículo se bloquea (`FOR UPDATE`): dos movimientos
  a la vez no se pasan.
- **Archivos:** `logistica/page.tsx`, `InventarioClient.tsx` (resumen, pestañas, buscador, chips, tarjetas,
  historial), `MovimientoHoja.tsx` (entregar, resurtir, devolución), `EnManos.tsx`, `EditarArticulo.tsx`,
  `CreateItemModal.tsx`, `CreateWarehouseModal.tsx`, `actions.ts`, `lib/logistica.ts` (consultas y cambios),
  `lib/logistica-tipos.ts` (sin base: tipos, por agotarse, buscador).
- **Datos:** migración `0030` (mínimo, archivado, `updated_at`, tipo `devolucion` y reglas `NOT VALID`, índice por
  fecha).
- **Auditoría:** `inventory.edit`, `inventory.archive`, `inventory.restore`. Los movimientos quedan en
  `inventory_transactions`.
- **Pruebas:** `logistica.test.ts` (P1, devoluciones, archivar, por agotarse, por fecha, migración),
  `matriz-logistica.test.ts`, `src/lib/logistica-tipos.test.ts`.
- **Decisiones:** D7; corrige P1.

### Perfil · `/perfil` y `/perfil/[id]`

- **Para qué:** quién es una persona, en qué equipos está, qué ciudadanos registró, qué actividades hizo y en qué
  colonias y secciones trabaja. El propio, además, cambia su nombre, foto, domicilio y contraseña.
- **Casos de uso:** P1 y P2 (`PLAN_AUDITORIA_MENUS.md` §6.5).
- **Quién abre qué (§4.6):** `puedeVerPerfil` (`lib/perfil.ts`), la misma regla para el perfil y para
  «Registrados por…» del Directorio: el propio; el maestro, cualquiera (queda en la auditoría); la administración, la
  gente de su municipio; el resto, su estructura (`teammateUserIds`). Si no: 404.
- **Liviano (fase 6):** 20 ciudadanos y el total (`CIUDADANOS_EN_EL_PERFIL`), con «Ver los N en el Directorio»
  (`/crm/contacts?registro=<id>`); 30 actividades (`ACTIVIDADES_EN_EL_PERFIL`) con el tipo real de la Agenda, «Visita»
  o «Incidencia», y «ver todas en la Agenda» (`/equipo?vista=todas&scope=equipo&responsable=<id>`); colonias (por el territorio del
  ciudadano) y secciones contadas en la base sobre todos sus ciudadanos. Los totales de actividades y el cumplimiento
  se cuentan en la base, no sobre las 30 de la lista. Del líder de prueba: 1.3 MB → 129 KB.
- **Privacidad:** los ciudadanos y las actividades se recortan a lo que quien mira puede ver (`contactosVisibles`,
  `incidentScopeCondition`); entrar al perfil de alguien no amplía lo que se ve. El domicilio, solo la propia persona y
  la administración que la gobierna. La lista ya no lleva domicilio ni profesión de cada ciudadano (están en su ficha).
- **Pestañas (fase 7):** `?pestana=contactos|agenda|territorio|seguridad` abre esa pestaña y la pone a la vista
  (`lib/perfil-pestanas.ts`). «Seguridad» (nombre y contraseña) solo existe en el perfil propio; en el de otra persona,
  o con una pestaña que no hay, abre la primera. Ahí lleva lo que fue Ajustes (`/settings`).
- **Archivos:** `perfil/page.tsx` (el propio), `perfil/[id]/page.tsx`, `LeaderProfileClient.tsx`, `lib/perfil.ts`,
  `lib/perfil-pestanas.ts`, `lib/equipos-de-persona.ts`.
- **Pruebas:** `perfil-liviano.test.ts`, `perfil-equipo.test.ts`, `perfil-pestanas.test.ts` (con la redirección de
  `/settings`).

### Directorio · `/crm/contacts`

- **Para qué:** buscar y abrir a los ciudadanos que se pueden ver; chips «Sin ubicación» y «Asignados a mí», filtro
  de PAN y «Registrados por…». Exportar a CSV.
- **Quién entra:** todos. **Qué ve:** `contactosVisibles` (`contact-visibility.ts`): el líder, su brigada; la
  dirección, su cascada; la administración, su municipio; el capturista, lo suyo y lo de sus compañeros; el
  brigadista, lo suyo y lo que le asignan.
- **Privacidad:** la lista lleva nombre y colonia; lo demás, en la ficha. El texto del buscador viaja en el cuerpo de
  `POST /api/directorio/consulta` y nunca en la dirección (O2, 2026-10); la dirección lleva solo los filtros
  (`registro`, `asignados`, `pan`, `ubicacion`, `page`). Un enlace viejo con `?q=` todavía busca, y la pantalla quita
  el texto de la dirección. «Exportar» es un formulario `POST` con el texto en el cuerpo; tiene tope y queda en la
  auditoría (`contacts.export`, con la búsqueda). El `GET` de la exportación se conserva para scripts viejos.
- **«Registrados por…» (fase 6):** `?registro=<id>` filtra a lo que registró (o refirió) esa persona, solo si quien
  mira puede abrir su perfil (`puedeVerPerfil`); un id ajeno o inventado se ignora sin decir si existe. Lo demás del
  Directorio sigue igual (alcance, búsqueda, filtros). Un aviso arriba dice de quién y ofrece «Ver a todos».
- **Archivos:** `crm/contacts/page.tsx` (la primera página), `DirectorioClient.tsx`, `lib/directorio-consulta.ts`
  (la consulta), `lib/directorio-filtros.ts` (filtros sin base: qué va en la dirección y qué no).
- **APIs:** `POST /api/directorio/consulta`; `POST` (y `GET`) `/api/crm/contacts/export`.
- **Pruebas:** `directorio-consulta` (el texto solo encuentra lo visible, otra dirección y otro municipio no ven nada,
  exportar por `POST` con auditoría, el enlace viejo), `directorio-filtros` (unidad: la dirección nunca lleva el
  texto), `visibilidad-contactos`, `contact-visibility` (unidad), `perfil-liviano` (`?registro=`).

### Ficha del ciudadano · `/crm/contacts/[id]`

- **Para qué:** sus datos, Llamar, WhatsApp y Cómo llegar, domicilio, sección y colonia, visitas, notas, a quién
  está asignado y «Lo que ha pedido» (Escucha Social, D10).
- **Quién entra:** quien ve al ciudadano (`veCiudadano`); si no, 404. Lo que abre el maestro queda en la auditoría
  (`registrarConsultaDelMaestro`).
- **Quién hace qué:** corregir datos y domicilio, quien ya lo ve; sección y colonia, la regla de
  `POST /api/crm/contacts/[id]/territory`.
- **Archivos:** `crm/contacts/[id]/page.tsx`, `DatosPersonales.tsx`, `EditarDomicilio.tsx`,
  `components/AccionesDeContacto.tsx`, `components/LoQueHaPedido.tsx`.
- **APIs:** `/api/crm/contacts/[id]` y sus `territory`, `notes`, `assignment`, `visits`.
- **Pruebas:** `datos-del-ciudadano`, `domicilios`, `acciones-de-contacto` (unidad), `escucha-social`.
- Ficha de referencia.

### Registrar ciudadano · `/crm/nuevo`

- **Para qué:** el alta en pocos toques: «usar mi ubicación» llena el domicilio, la sección se filtra por
  municipio, el teléfono repetido se avisa al escribirlo. Se guarda sin señal.
- **Quién entra:** administración, dirección, líder y capturista. El brigadista no registra.
- **Archivos:** `crm/nuevo/page.tsx`, `NuevoContactoForm.tsx`, `components/ColonySelector.tsx`,
  `components/LocationPicker.tsx`.
- **APIs:** `POST /api/crm/contacts` (con `clientRequestId`), `/api/crm/contacts/telefono-repetido`.
- **Secciones del selector (O3, 2026-10):** `lib/secciones-del-catalogo.ts` pide
  `GET /api/electoral/sections?ligera=1` (id, número y municipio, sin colonias ni conteos) una sola vez por visita,
  y el navegador la guarda 10 minutos. Antes bajaba el catálogo completo, con colonias y conteos, cada vez que se
  abría el formulario.
- **Pruebas:** `altas-de-campo`, `datos-del-ciudadano` (teléfono repetido), `rutas-experiencia-sencilla`,
  `cola-de-envios`, `secciones-del-municipio`, `secciones-del-catalogo` (unidad: una sola vez, reintento si falla),
  `secciones-ligeras` (solo las tres claves, con sesión; el GET completo no cambia).
- Ficha de referencia.

### Agenda · `/equipo`

- **Para qué:** las actividades (vistas Hoy, Vencidas, Próximas, Con seguimiento, Historial, Esta semana, Este
  mes, Todas), los prospectos, el resumen del equipo y los recordatorios.
- **Quién entra:** todos. **Qué ve:** «Mi agenda» o «Todo mi equipo» (`scope=equipo`) y una persona
  (`responsable=<id>`, solo de su alcance). La regla de avisos «por aceptar» (D9) también vale aquí.
- **Archivos:** `equipo/page.tsx`, `AgendaClient.tsx`, `equipo/componentes/*`; `lib/bitacora-consulta.ts`,
  `lib/actividades*.ts`, `lib/prospectos.ts`, `lib/recordatorios.ts`, `lib/catalogo-actividades.ts`.
- **APIs:** `/api/equipo/tareas`, `/api/equipo/opciones`, `/api/prospectos`, `/api/equipo/buscar/*`.
- **Pruebas:** `bitacora-consulta` (cada vista y sus números, «Mi agenda» y «Todo mi equipo», `responsable=` solo
  dentro del alcance, la visita ligada una sola vez, el buscador, quién ve la actividad de quién),
  `rutas-experiencia-sencilla` (cierres repetidos), `avisos-de-campo`, `incidencias-brigadas`, `metas-y-equipo`,
  `cola-de-envios`.
- Ficha de referencia.

### Equipos · `/admin-equipos` y `/admin-equipos/[id]`

- **Para qué:** el tablero de equipos (arrastrar a otro equipo **copia**, no mueve), crear y editar equipos, sus
  integrantes y las solicitudes del QR.
- **Quién entra:** administración, dirección y líder. **Quién hace qué** (`permisos-equipos.ts`): cada quien
  gestiona dentro de su mando; borrar, solo administración; mover estructura entre municipios, el maestro.
- **Archivos:** `admin-equipos/page.tsx`, `TableroEquipos.tsx`, `TeamsClient.tsx`, `actions.ts`, `[id]/page.tsx`,
  `[id]/TeamDetailClient.tsx`, `[id]/SolicitudesPendientes.tsx`; `lib/integrantes-equipo.ts`, `lib/admision.ts`.
- **APIs:** `/api/admin/teams`.
- **Pruebas:** `tablero-equipos`, `alcance-mando`, `perfil-equipo`.
- Ficha de referencia.

### Mapa · `/mapa`

- **Para qué:** secciones, ciudadanos, incidencias y peticiones sobre el mapa; «Reportar aquí» con el GPS;
  `?incidencia=<id>` centra y abre una incidencia. El centro de mando exporta a CSV y, solo administración, limpia
  las resueltas en lote.
- **Quién entra:** todos; lo que trae cada capa lo acota su API.
- **Capas:** `/api/map/contacts`, `/api/map/reports` (y `/bulk`, solo administración), `/api/map/escucha` (sin
  nombres), `/api/map/teams`, `/api/map/users`. Cada capa en su gancho de `mapa/capas.ts`; los globos, en
  `mapa/html.ts`.
- **Archivos:** `mapa/page.tsx`, `capas.ts`, `html.ts`, `CentroDeMando.tsx`, `PanelDelMapa.tsx`,
  `ModalesDeIncidencia.tsx`.
- **Pruebas:** `mapa/html.test.ts`, `matriz-incidencias`, `matriz-escucha`, `incidencias-brigadas`,
  `avisos-de-campo`.
- Ficha de referencia.

### Levantar incidencia · `/reportes`

- **Para qué:** quien coordina levanta una incidencia completa: categoría, sección por número, equipo y persona.
  Se llega desde Incidencias, el Resumen y el «+».
- **Quién entra:** administración, dirección y líder. Capturista y brigadista usan «Avisar de una incidencia».
- **Archivos:** `reportes/page.tsx`, `ReportesClient.tsx`, `components/SeccionBuscable.tsx`.
- **APIs:** `POST /api/map/reports` (sin señal, tipo `incidencia`).
- **Pruebas:** `incidencias-brigadas`, `matriz-incidencias`, `avisos-de-campo`.

### Resumen · `/resumen`

- **Para qué:** el inicio de quien coordina: los contadores de hoy, «Mi día», el tablero de su gente (personas, PAN,
  agenda, medalla y los siete puntos de la semana), el pulso y «Poner meta».
- **Quién entra:** administración, dirección y líder (es su pantalla de inicio). **Qué ve:** el líder, su brigada
  activa; la dirección, su cascada; la administración municipal, su municipio; el maestro, a todos.
- **Archivos:** `resumen/page.tsx`, `ResumenClient.tsx`; `lib/resumen-kpis.ts`, `lib/resumen-tablero.ts`,
  `lib/logros.ts`.
- **Pruebas:** `resumen-hoy`, `metas-y-equipo`, `alcance-mando`, `logros` (unidad).
- Ficha de referencia.

### Análisis Demográfico · `/analytics`

- **Para qué:** el padrón en números: crecimiento, edades, origen del registro, militancia, canal y horario, avance
  por equipo, lo que urge en sus colonias y las áreas de participación (contadas por área, no por combinación).
- **Quién entra:** administración y dirección. **Qué ve:** los ciudadanos de su alcance.
- **Archivos:** `analytics/page.tsx`, `AnalyticsClient.tsx`, `graficas.tsx`; `lib/analisis-demografico.ts`,
  `lib/areas-de-participacion.ts`.
- **Pruebas:** `analisis-demografico`, `areas-de-participacion` (unidad).
- Ficha de referencia.

### Reportar un problema · `/reportar-problema` y Problemas reportados · `/problemas-reportados`

- **Para qué:** cualquiera avisa que algo falla o no se entiende, con captura opcional; la administración lo revisa,
  contesta y la persona ve la respuesta.
- **Quién entra:** reportar, todos (solo sobre pantallas y funciones que abre); revisar, administración sobre la
  gente de su alcance (el maestro, todo).
- **Archivos:** `reportar-problema/*`, `problemas-reportados/*`; `lib/problemas.ts`, `lib/problemas-servicio.ts`.
- **APIs:** `/api/problemas`, `/api/problemas/vistos`.
- **Pruebas:** `problemas` (unidad), `reportar-problema`.
- Detalle: `docs/PLAN_EXPERIENCIA_SENCILLA.md` §9.

### Usuarios y permisos · `/admin-usuarios`

- **Para qué:** buscar cuentas (25 por página), dar de alta, cambiar el rol, atender solicitudes pendientes y
  actuar sobre las cuentas que se gobiernan (nombre y municipio, contraseña, desactivar, reactivar, eliminar si no
  tiene datos).
- **Quién entra:** administración. El maestro ve todas y filtra por municipio; la administración municipal, las de
  su municipio. Ningún administrador toca a otro (`gobierno-de-cuentas.ts`); todo queda en la auditoría.
- **Privacidad:** el nombre o correo buscado viaja en el cuerpo de `POST /api/admin/usuarios/consulta`, nunca en la
  dirección (O2, 2026-10); rol, estado, municipio y página sí van en ella. Un enlace viejo con `?q=` todavía busca.
- **Archivos:** `admin-usuarios/page.tsx` (conteos, solicitudes y la primera página), `TablaDeUsuarios.tsx` (buscador,
  filtros, tabla y páginas; al cambiar algo de una fila, vuelve a pedir la lista con sus filtros), `actions.ts`,
  `CreateUserModal.tsx`, `RoleSelector.tsx`, `UserActions.tsx`, `PendingUsersCard.tsx`; `lib/usuarios-consulta.ts`,
  `lib/usuarios-filtros.ts`.
- **APIs:** `POST /api/admin/usuarios/consulta`, `/api/users/role`.
- **Pruebas:** `usuarios-consulta` (401, 403 a quien no es administración, cada administración su municipio, el
  municipio es filtro solo del maestro, las acciones solo donde gobierna, el enlace viejo), `usuarios-filtros`
  (unidad), `administracion-municipal`, `capacidades`.
- Ficha de referencia.

### Administración por municipio · `/administracion-municipal` (solo el maestro)

- **Para qué:** quién administra cada municipio, cuándo entró por última vez y qué municipios con gente activa no
  tienen quien los administre; restablecer, reactivar, cerrar sesiones, transferir, retirar o nombrar. Si se pierde
  el acceso al propio maestro: `pnpm admin:rescatar` en el servidor.
- **Archivos:** `administracion-municipal/page.tsx`, `actions.ts`, `ControlesDelPanel.tsx`; `lib/gobierno-de-cuentas.ts`.
- **Pruebas:** `administracion-municipal`.
- Ficha de referencia.

### Sin municipio confirmado · `/sin-municipio` (solo el maestro)

- **Para qué:** asignar su municipio a lo que quedó en «General» (personas sin municipio ni equipo, ciudadanos sin
  sección registrados por ellas).
- **Archivos:** `sin-municipio/page.tsx`, `actions.ts`, `AsignarMunicipio.tsx`.
- **Pruebas:** `municipio-llave`, `administracion-municipal`.
- Ficha de referencia.

### Auditoría de cambios · `/auditoria` (solo el maestro)

- **Para qué:** quién cambió qué y cuándo: roles, municipios, altas, bajas, admisiones, contraseñas, exportaciones
  del padrón y lo que abre el propio maestro. Lo hecho desde la consola sale sin autor.
- **Archivos:** `auditoria/page.tsx`; `lib/auditoria.ts`, `lib/auditoria-acciones.ts` (el nombre de cada acción).
- **Pruebas:** `auditoria-acciones`.
- Ficha de referencia.
