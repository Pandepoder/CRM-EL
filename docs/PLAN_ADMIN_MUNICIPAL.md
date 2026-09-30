# Plan de mejora e implementación — Jalisco OS

**Fecha:** 2026-09-22 · **Rama:** `claude/municipal-admin-improvement-04c080`
**Base del análisis:** `pnpm typecheck` (correcto) · 205 pruebas unitarias (correcto) · aplicación levantada contra la base local (177 usuarios, 3 385 ciudadanos, 19 equipos, 612 incidencias, 3 791 secciones)

Este documento es el registro completo. Contiene **147 entradas** en la tabla del §3. Cinco pares son
el mismo defecto visto desde el código y desde la aplicación corriendo (van marcadas con «Ver»); una
entrada se **descartó** al verificarla (M12, falso positivo) y otra se **reclasificó** como no
defecto (C20). Son **140 defectos distintos**. Cada entrada lleva su identificador, cómo se comprobó,
el archivo donde vive y la etapa que la cierra.

Catorce entradas aparecieron al revisar y construir la propia etapa 1: R18, R19, D11 y C22 en la
primera revisión; A14, A15, R20, R21, R22, R23, D12, M15, M16 y M17 al implementarla. Seis más al
implementar la etapa 2: A16, R24, D13, M18, M19 y M20. Ocho más al implementar la etapa 3: A17,
R25, R26, D14, D15, M21, M22 y M23. Catorce más al implementar la etapa 4: A18, R27, R28, R29, D16,
D17, D18 y de M24 a M30. Dos más al implementar la etapa 5: M31 y M32. Cuatro más al implementar la
etapa 6: A19, M33, M34 y M35. Nueve más en el simulacro de evento que se corrió después de la etapa 6: A20, R30, R31, D19, D20, M36, M37, M38 y M39. Nueve más en la revisión de fondo antes del commit: A21, D21, D22, D23, D24, R32, M40, M41 y M42. Cuatro más al revisar domicilios y GPS: D25, D26, D27 y M43. Dos más en el ensayo de despliegue: M44 y M45. Cinco se **reescribieron** porque, al verificarlas, eran
distintas de como se habían registrado (D6, D10, C20, R16 y C16). Cada una lo dice en su fila. Nada queda en prosa suelta: si algo no está en la
tabla del §3, no está en el plan.

Comprobado mecánicamente (`scripts/local/recontar-plan.mjs`): todas las filas tienen sus seis
columnas, **ninguna entrada se queda sin etapa asignada**, cada entrada aparece en el texto de su
etapa y ninguna etapa referencia un identificador que no exista.

---

## §0 · Decisiones cerradas

| Decisión | Resuelto |
| :--- | :--- |
| ¿Cuántos admins por municipio? | **Varios.** Ninguno puede tocar a otro admin: crear, editar, mover y eliminar administradores es **solo del MOM**. |
| ¿Qué ve el MOM? | **Todo de todos**, sin recorte. Cada consulta al detalle queda en `audit_logs`. |
| ¿Datos sin municipio? | **No se aceptan.** Si no se resuelve, se marca con el distintivo **General** —actividad estatal— de forma visible, nunca en nulo ni en silencio. |
| ¿Colaboraciones entre equipos? (2026-09-26) | **Fuera de este plan.** El dueño las deja para más adelante; la etapa 7 se retiró. Lo que se había acordado sirve de punto de partida cuando se retomen: entre equipos, con fecha de fin, compartiendo solo lo de la gente bajo el mando de cada equipo y en solo lectura. |
| ¿Recuperación de acceso? | Tres niveles: panel del MOM, `session_version` que mata sesiones, y rescate por consola desde el servidor. |
| ¿Hace falta el territorio para repartir ciudadanos? (2026-09-25) | **No para asignar; sí para agendar visita.** Y las altas lo crean solas cuando traen una colonia que ya está en el catálogo de su municipio; una colonia que no está no se inventa desde un formulario, se confirma en la ficha. |
| ¿Qué domicilio se pide? (2026-09-26) | **Ciudadanos:** en el alta del panel, calle y número obligatorios (o el punto del mapa, que los rellena); en el registro por QR la colonia es obligatoria y la calle opcional, para no frenar un evento. **Usuarios:** calle y número, colonia y municipio donde viven, en el formulario de registro (QR de brigada y auto-registro); el alta por administración no lo pide. Lo ven la propia persona y la administración que la gobierna. Un punto marcado en un mapa o por GPS se guarda exacto, tal cual. |
| ¿Qué ve un integrante de lo de sus compañeros? (2026-09-25, tras el simulacro de evento) | **Solo el capturista** ve lo de su brigada (captura y convierte prospectos para ella). **Los líderes de una misma coordinación no se ven entre sí**, y **el brigadista ve solo lo suyo y lo que le asignan**, a él o a su brigada. La dirección y administración, como siempre. |

---

## §1 · Método de verificación

Cada defecto lleva en la tabla del §3 una marca de **cómo se supo**:

| marca | significa |
| :--- | :--- |
| **MED** | Medido con números concretos (tiempos, tamaños, conteos). Los números están en el §4. |
| **REP** | Reproducido en la aplicación corriendo: se provocó y se vio. |
| **DOM** | Verificado inspeccionando el DOM o la base de datos (posiciones, z-index, conteos SQL). |
| **COD** | Leído en el código, con archivo y función identificados. No se provocó en ejecución. |

Se recorrió la aplicación como **Administración, Dirección, Líder, Capturista y Brigadista**, en
escritorio (1024 px) y en teléfono (375 px), y se probó por API si cada pantalla que el menú ofrece
se puede realmente usar.

### Qué se tocó del entorno del usuario

1. **Se aplicaron las migraciones 0017 y 0018**, que faltaban en la base local. Es lo que descubrió
   el defecto **C1**. La base pasó de 17 a 19 migraciones aplicadas.
2. **Se crearon 88 contactos de prueba y se borraron todos.** La base volvió a sus **3 385**
   contactos exactos, verificado por conteo.
3. Los scripts de prueba quedaron en `scripts/local/` (excluido de git por convención del repo):
   `evento-masivo.mjs`, `verificar-menus-por-rol.mjs`, `que-puede-escribir-brigadista.mjs`,
   `medir-escaneo-padron.mts`.
4. El servidor de desarrollo quedó corriendo en el puerto 3000.

---

## §2 · Resumen por severidad

Sobre las 147 entradas del §3 (recontadas con un script, no a mano):

| severidad | entradas | qué significa |
| :--- | ---: | :--- |
| **Crítica** | 14 | Hoy se cae, pierde datos o deja pasar una escalada de privilegios |
| **Alta** | 51 | Bloquea trabajo de campo, filtra datos entre estructuras o no escala |
| **Media** | 58 | Molesta, confunde o es una trampa para el siguiente cambio |
| **Baja** | 22 | Ruido, código muerto, detalle cosmético |
| *sin severidad* | 2 | Verificadas y no son defecto: M12 (falso positivo) y C20 (reclasificada) |

Por familia: **21** de aislamiento y privilegios (A), **32** de disponibilidad (R), **27** de
integridad de datos (D), **45** de coherencia y menús (M) y **22** verificados en la aplicación
corriendo (C).

Y por cómo se supo: **12 medidos** con números, **49 reproducidos** en ejecución, **18 verificados**
contra el DOM o la base, y **68 leídos** en el código con archivo y función identificados. Es decir:
**79 de 147 se comprobaron con la aplicación en marcha**; los 68 restantes están localizados en el
código pero no se provocaron, y así se declaran.

---

## §3 · Registro completo de defectos

### 3.1 Aislamiento y privilegios (A)

| id | defecto | cómo | archivo | sev. | etapa |
| :-- | :--- | :-: | :--- | :-: | :-: |
| **A1** | No existe llave de municipio: `isGlobal` cortocircuita todo filtro, así que dos admins de municipios distintos ven exactamente lo mismo, todo | COD | `src/lib/network-hierarchy.ts` (rama `roleKey === "admin"`) | Crítica | 5, 6 |
| **A2** | Cualquier admin puede crear, degradar o borrar a otro admin, incluido el que lo creó: solo se comprueba `roles.includes("admin")` | COD | `packages/modules/governance/application/change-user-role.ts` | Crítica | 6 |
| **A3** | `rejectUserAction` hace `DELETE` de la fila del usuario; el líder, para el mismo acto, marca `rejected`. Con datos asociados el `DELETE` choca contra la clave foránea y devuelve un 500 opaco | COD | `(shell)/admin-usuarios/actions.ts` vs `(shell)/admin-equipos/actions.ts` | Crítica | 2, 6 |
| **A4** | Logística no tiene alcance ninguno: `warehouses` no tiene municipio y la guarda solo mira el rol, así que `admin` y `direction` ven todos los almacenes del sistema | COD | `(shell)/logistica/actions.ts`, `schema.ts` (`warehouses`) | Alta | 6 |
| **A5** | Ningún cambio de privilegio se audita. `audit_logs` existe y se usa para contactos, visitas y catálogo, pero no para rol, baja, aprobación ni contraseña | COD | `admin-usuarios/actions.ts`, `api/users/role`, `api/admin/promover` | Alta | 6 |
| **A6** | Tres rutas de equipos confían solo en la cookie (`getServerSession`) en vez de revalidar en la base: **un líder desactivado sigue añadiendo y quitando integrantes**, porque la comprobación es `equipo.leaderId === userId`. *Reproducido al cerrar 1.8: con la cuenta del líder dada de baja y su cookie abierta, quitar un integrante y renombrar el equipo respondieron **200*** | REP | `api/admin/teams/route.ts`, `api/admin/teams/[id]/route.ts`, `api/admin/teams/[id]/members/route.ts` | Alta | 1, 6 |
| **A7** | `/api/admin/promover` lee rol y `accessType` pero **no `status`**: un admin desactivado sigue promoviendo gente. *Reproducido al cerrar 1.8, en la misma prueba que A6: con la cuenta dada de baja, la petición pasó la guarda y llegó a buscar a la persona (404 con un id de prueba)* | REP | `api/admin/promover/route.ts` | Alta | 1, 6 |
| **A8** | Quitarle privilegios a alguien no mata su sesión abierta. Las rutas con `actorFromSession` lo notan; las que usan solo la cookie, nunca | COD | `src/lib/session.ts`, `src/lib/api-helpers.ts` | Alta | 6 |
| **A9** | La sesión no caduca: `getSessionOptions()` no fija `ttl` ni `maxAge`, así que vale el valor por omisión de iron-session (14 días). En teléfonos compartidos de brigada es mucho | COD | `src/lib/session.ts` | Media | 1 |
| **A10** | El catálogo de actividades con `scope = "organization"` es global: los tipos que cree el admin de un municipio los verá el de otro | COD | `src/lib/catalogo-actividades.ts` | Media | 6 |
| **A11** | `/api/map/sections/geojson?municipality=all` entrega la cartografía de los 125 municipios a cualquier sesión | COD | `api/map/sections/geojson/route.ts` | Media | 6 |
| **A12** | Los archivos subidos no tienen dueño: `/api/uploads/<nombre>` exige sesión, pero **cualquier sesión sirve**; no se comprueba si quien pide la foto puede ver la incidencia a la que pertenece | COD | `api/uploads/[filename]/route.ts` | Media | 3 |
| **A13** | La exportación CSV no tiene tope de filas ni deja constancia: cualquiera con `ContactsRead` descarga todo su padrón visible, descifrado | COD | `api/crm/contacts/export/route.ts` | Media | 6 |
| **A14** | **Una cuenta dada de baja con la cookie abierta caía en un bucle de redirecciones, o seguía entrando.** El layout del panel solo miraba la cookie. `/crm/contacts` rebotaba al login y el login devolvía al panel, sin fin. `/mapa` y `/perfil` **seguían abriendo** (200). *Encontrado al cerrar 1.8* | REP | `(shell)/layout.tsx`, `src/lib/authorization.ts`. Seguido salto a salto con `scripts/local/baja-y-redirecciones.mts`: `307 /crm/contacts → 307 /login → 307 /crm/contacts → …` | Alta | 1 |
| **A15** | **Los errores de la base llegaban al navegador con la consulta SQL y sus valores.** `safeErrorMessage` buscaba `SELECT`/`INSERT`/`UPDATE` en mayúsculas, pero Drizzle escribe el SQL en minúsculas, así que un error corto pasaba tal cual. Además, el detalle de ciudadano devolvía el `message` crudo de la excepción, la ruta de territorio respondía `err.message` y dos acciones de equipos devolvían `e.message`. *Encontrado al revisar 1.10* | REP | `src/lib/safe-error.ts`, `api/crm/contacts/[id]/route.ts`, `…/territory/route.ts`, `admin-equipos/actions.ts`. Con sesión de administración, `GET /api/crm/contacts/no-es-uuid` → 404 con la consulta entera del detalle | Media | 1 |
| **A16** | **Un líder podía rechazar la solicitud de cualquier cuenta pendiente del sistema.** Rechazar desde el detalle de equipo comprobaba que quien rechaza liderara *ese* equipo, pero no que la persona perteneciera a él: con el id de cualquier cuenta pendiente, ajena a su brigada, la dejaba rechazada. Aceptar sí lo comprobaba. *Encontrado al implementar 2.13* | COD | `(shell)/admin-equipos/actions.ts` (`rechazarSolicitudAction`) | Media | 2 |
| **A17** | **La ruta estática `/uploads/<nombre>` entregaba los archivos a cualquier sesión, sin pasar por la guarda de `/api/uploads`.** Las fotos se guardan en `public/uploads`, y lo que hay en `public` Next lo sirve tal cual: aunque `/api/uploads` decidiera quién ve cada archivo (A12), bastaba con quitar `/api` de la URL. *Encontrado al implementar 3.9* | REP | `apps/web/middleware.ts`; `api/upload/route.ts` escribe en `public/uploads`. En desarrollo, con la sesión de un líder de otra estructura, `/uploads/<nombre>` → 200. **En producción no se comprobó** (Next solo entrega lo que había en `public` al compilar, y puede que ahí no ocurriera): se cerró igual, en el middleware | Media | 3 |
| **A18** | **El mapa pegaba sin escapar, en el HTML que entrega a Leaflet, textos que escribe gente**: el nombre del ciudadano, su colonia, su municipio y el nombre de quien lo registró en el globo del contacto; el título, la descripción y el municipio de la incidencia en el suyo; las colonias en el rótulo de la sección. Leaflet pone ese HTML tal cual en la página, y parte de esos textos llega del registro público, sin sesión: marcado escrito en un nombre podía ejecutarse en el mapa de quien lo abriera, con su sesión. *Encontrado al partir el mapa (4.7). Leído en el código; no se provocó* | COD | `(shell)/mapa/page.tsx` de antes (globos de incidencia y de contacto, título del marcador), frente a `mapa/html.ts` | Alta | 4 |
| **A19** | **Cualquiera se cambiaba de municipio desde el alta inicial (onboarding), también un administrador.** La acción escribía el municipio elegido en el perfil «solo si no tenía», pero miraba el TEXTO, y desde la 0022 casi nadie lo tiene aunque sí tenga llave (la toma de su equipo): escribirlo recalculaba la llave. Con administradores por municipio, un administrador sin municipio habría elegido él mismo cuál gobernar. *Encontrado al implementar 6.3* | COD | `app/onboarding/actions.ts` (`completeOnboardingAction`: `isNull(userProfiles.municipality)`) frente al disparador `user_profiles_municipio` de la 0022 | Alta | 6 |
| **A20** | **Un líder cambiaba el estado de lo que levantó otro líder de su coordinación, o su propia dirección.** La regla para modificar una incidencia —«quien manda trabaja lo de su gente»— usaba la lista de todo lo que la persona VE, y en un equipo donde solo es integrante eso incluye a los compañeros. Ver lo de los compañeros es el modelo del dueño; trabajarlo, no. Pasaba en el globo del mapa, en la Gestión de incidencias y en las actividades de la bitácora. Además, una incidencia que alguien no ve respondía 403 en vez de 404, confirmando que el identificador existe. *Encontrado en el simulacro de evento* | REP | `src/lib/permisos-incidencias.ts` (`personas: alcance.allowedUserIds`), `(shell)/admin-incidencias/actions.ts` (condición de visibilidad). En el simulacro, el líder de Zalatitán resolvió una incidencia de Tonalá Centro (200) | Alta | 6 |
| **A21** | **En Escucha social, ver era trabajar.** Con la regla del 2026-09-25 el capturista ve lo de su brigada, y la ruta que cambia el estado y las notas de resolución usaba esa misma regla: el capturista cerraba el reporte de un compañero. Además aceptaba cualquier texto como estado (un estado inventado sacaba el registro de todos los filtros) y a quien no lo veía le contestaba «no pertenece a tu equipo», confirmando que el identificador existía. *Encontrado en la revisión de fondo antes del commit* | REP | `api/escucha-social/[id]/route.ts` (`condicionPorAutor` para escribir) | Media | 6 |

### 3.2 Disponibilidad y rendimiento (R)

| id | defecto | cómo | archivo | sev. | etapa |
| :-- | :--- | :-: | :--- | :-: | :-: |
| **R1** | El alta pública de ciudadano **carga toda la tabla de contactos y descifra todos los teléfonos** para buscar un duplicado, en cada alta, en un endpoint público sin sesión. Ver también **C2** | MED | `api/public/registro/route.ts` (`.from(schema.contacts)` sin `where`) | Crítica | 1 |
| **R2** | Cero fronteras de error en toda la aplicación. Ver **C5** | REP | `apps/web/app/**` | Crítica | 1 |
| **R3** | `visibleContactIds()` materializa la lista completa de identificadores visibles y la mete en un `IN (...)`. Postgres corta en 65 535 parámetros: pasado ese punto **revienta**, no se degrada. Además descifra el municipio de cada fila en memoria | COD | `src/lib/contact-visibility.ts` | Crítica | 8 |
| **R4** | `/resumen` carga en memoria todos los contactos, visitas e incidencias del alcance para agregar en JavaScript, y encadena ~12 consultas en serie sin `Promise.all` | COD | `(shell)/resumen/page.tsx` | Alta | 8 |
| **R5** | `/api/map/reports` devuelve todas las incidencias visibles: sin límite, sin recuadro, sin ventana de fechas | MED | `api/map/reports/route.ts` (GET) | Alta | 4 |
| **R6** | `/api/map/contacts` aplica el recuadro visible **en JavaScript después** de traer de la base todo el alcance | MED | `api/map/contacts/route.ts` | Alta | 4 |
| **R7** | Escucha Social no tiene límite ni `where` para administración: devuelve todos los registros que existan | COD | `(shell)/escucha-social/page.tsx`, `api/escucha-social/route.ts` | Alta | 8 |
| **R8** | `/analytics` hace `SELECT *` de todos los contactos visibles y descifra cuatro campos de cada uno para contar | MED | `(shell)/analytics/page.tsx` | Alta | 8 |
| **R9** | `decryptData` lanza excepción si el descifrado falla, y corre dentro del mapeo de filas de Drizzle: **una sola fila corrupta hace fallar la consulta entera** | COD | `packages/shared/database/crypto.ts` | Alta | 1 |
| **R10** | Pool de 10 conexiones, `connectionTimeoutMillis: 5000`, sin `statement_timeout`, sin reintento en error transitorio | COD | `src/lib/db.ts` | Alta | 1 |
| **R11** | El login filtra por `lower(user_profiles.email)` mientras el índice único es sobre `email` crudo: recorrido secuencial en cada intento de entrar | COD | `src/lib/auth.ts`, `0000_tonala_os_initial.sql:347` | Media | 1 |
| **R12** | Las copias de seguridad se quedan en el mismo VPS. Señalado como pendiente en el propio archivo: ante pérdida del disco no sirven | COD | `docker-compose.yml` (servicio `backup`) | Alta | 1 |
| **R13** | El limitador de peticiones vive en la memoria del proceso: correcto para un VPS, deja de proteger con dos instancias | COD | `src/lib/rate-limit.ts` | Media | 8 |
| **R14** | Sin telemetría en producción. `/api/resumen` instancia `DevelopmentLogger`; el `correlationId` ya existe en `ActorContext` y no se usa para nada | COD | transversal | Media | 1 |
| **R15** | El healthcheck solo hace `SELECT 1`: no comprueba migraciones aplicadas ni atasco del outbox | COD | `api/health/route.ts` | Media | 1 |
| **R16** | **Sin idempotencia en las altas de campo**: un doble toque, o el reintento tras un corte de señal cuando el servidor sí alcanzó a guardar, crea otro registro. Afecta al alta de ciudadano (interna y pública), de prospecto y **de incidencia**. *Corrige la versión anterior de esta entrada, que decía que la idempotencia existía «solo en incidencias» y faltaba en actividades: es al revés. `event_reports.client_request_id` (0017) solo lo usaba la bitácora; `POST /api/map/reports` no lo leía* | COD | transversal; `api/map/reports/route.ts` frente a `actividades-servicio.ts` | Alta | 3 |
| **R17** | `(shell)/mapa/page.tsx` son **3 203 líneas** en un archivo, y es la pantalla más usada en campo | COD | `(shell)/mapa/page.tsx` | Media | 4 |
| **R18** | **Un reinicio de Postgres tumba el proceso web.** El pool no tenía manejador de `error`; `pg` emite ese evento cuando se cae una conexión inactiva, y en Node un `error` sin nadie escuchando termina el proceso. *Encontrado en la revisión de la etapa 1* | REP | `src/lib/db.ts`. Reproducido: 3 conexiones inactivas + `docker restart` de la base → `Unhandled 'error' event`, código de salida 1 | Crítica | 1 |
| **R19** | `/registro/[slug]` consulta **300 colonias en cada escaneo del QR** para pasárselas al cliente, que no las usa (`coloniesList` sale en lint como argumento sin usar). Una consulta de más por persona en la página pública con más carga. *Encontrado en la revisión de la etapa 1* | COD | `app/registro/[slug]/page.tsx`, `PublicRegistrationClient.tsx:12` | Media | 3 |
| **R20** | **El outbox crece sin fin y el worker lo recorre entero cada 10 s.** La consulta que reclama eventos filtra por `status = 'pending'` y ordena por `created_at`, pero la tabla solo tiene la clave primaria: `Seq Scan` en cada sondeo. Y nada purga los eventos procesados ni sus acuses, así que ese recorrido crece con cada alta, visita e incidencia de la historia del sistema. Hoy son 56 eventos; el costo aparece con el uso. *Encontrado al revisar 1.4* | DOM | `packages/shared/outbox/infrastructure/index.ts` (reclamo), `pg_indexes` de `transactional_outbox` (solo `_pkey`), `EXPLAIN` del reclamo → `Seq Scan … Filter: (status = 'pending')`; sin `DELETE` de eventos fuera de `clean-production.ts` | Media | 8 |
| **R21** | **El despliegue automático nunca ha funcionado.** Las **26 de 26** ejecuciones del flujo `deploy` fallaron en el paso de SSH («Faltan los secretos VPS_SSH_KEY o VPS_HOST»): todo despliegue ha sido a mano. Y aun con los secretos, la comprobación de salud posterior habría fallado siempre: hacía `curl` a `127.0.0.1:3000` desde el VPS, y `web` no publica ese puerto (solo Caddy lo alcanza por la red de Docker). *Encontrado al revisar 1.4* | MED | Historial de ejecuciones en GitHub Actions; `.github/workflows/deploy.yml`; `docker-compose.yml` (`web` sin `ports`) | Alta | 1 |
| **R22** | **El respaldo guardaba volcados vacíos como buenos, y con ellos podaba los buenos.** Sin `pipefail`, `pg_dump \| gzip` terminaba con el resultado de `gzip`: con la base inalcanzable, el script escribió `[backup] ok tonala_os-….sql.gz — 20 bytes`, un archivo que pasa `gzip -t` y no trae ni una línea de SQL. Tras `BACKUP_RETENTION_DAYS` días así, la poda habría borrado todos los respaldos buenos. `restore.sh` tenía el mismo hueco: solo comprobaba `gzip -t`. *Encontrado al cerrar 1.11* | REP | `scripts/ops/backup.sh`, `scripts/ops/restore.sh`. Reproducido apuntando el respaldo a un host que no existe | Crítica | 1 |
| **R23** | **Restaurar un respaldo viejo encima de la base viva la deja inconsistente.** `pg_dump --clean` solo borra los objetos que trae el volcado: las tablas creadas por migraciones posteriores al respaldo sobreviven, mientras el registro de migraciones vuelve atrás. La siguiente `db:migrate` intentaría crearlas otra vez. Era el procedimiento documentado para «restaurar de verdad». *Encontrado al cerrar 1.11* | REP | `scripts/ops/restore.sh`, README. Con bases desechables: tras restaurar encima, 20 migraciones registradas y la tabla de la 21 todavía presente | Alta | 1 |
| **R24** | **Cada vista del Directorio traía y descifraba a todo el padrón visible para enseñar 25 filas.** La paginación se hacía en JavaScript: para administración, 3 291 fichas por vista, cinco campos cifrados cada una (teléfono, colonia, municipio, profesión, intereses). *Encontrado al implementar 2.15* | COD | `(shell)/crm/contacts/page.tsx` (`allFiltered.slice`) | Media | 2 |
| **R25** | **El registro público rechazaba a la persona 61 de cada hora en un evento.** El límite era de 60 por IP y enlace, pensado para contener el escaneo del padrón que la etapa 1 retiró. En la WiFi de un salón, o detrás de la misma IP de la compañía telefónica, toda la gente cuenta como una sola. *Encontrado al implementar 3.1* | REP | `api/public/registro/route.ts`. En la prueba de carga, con el límite de antes, la tanda de 100 a la vez desde la misma IP recibió 429 | Alta | 3 |
| **R26** | **El alta interna de ciudadano perdía todo lo capturado ante cualquier error de validación.** Era una acción de servidor que **lanzaba** sus errores («la sección no existe», «el responsable debe pertenecer a tu equipo»): en producción Next oculta el mensaje de lo que lanza una acción y la pantalla cae en la frontera de error, sin decir qué pasó y con el formulario perdido. *Encontrado al implementar 3.3* | COD | `(shell)/crm/actions.ts` (`createContactAction`). El enmascarado de Next se comprobó en la etapa 2 con otras acciones | Alta | 3 |
| **R27** | **La cartografía de secciones unía y mandaba datos que nadie leía.** Por cada sección unía también sus incidencias y sus representantes (con su cuenta), sobre la unión que ya hacía con colonias, ciudadanos y visitas, para calcular tres cifras —visitas agendadas, incidencias activas y resueltas—, una lista de representantes y un nombre que ninguna pantalla leía. Y mandaba las coordenadas con los 6 decimales guardados (10 cm) cuando 5 (1 m) bastan para dibujar una sección. *Encontrado al implementar 4.4* | MED | `api/map/sections/geojson/route.ts`. Tonalá de 496 a 444 KB (119 a 99 KB comprimido); Zapopan de 1 158 a 1 026 KB (248 a 208 KB) | Media | 4 |
| **R28** | **Cada acción sobre una incidencia volvía a descargar la cartografía entera.** Cambiar un estado, borrar, purgar, crear o editar llamaba otra vez a la cartografía del municipio, sin caché: 496 KB en Tonalá, 1 158 KB en Zapopan y 3 294 KB en todo Jalisco, por clic. *Encontrado al implementar 4.7* | MED | `(shell)/mapa/page.tsx` de antes (cinco `await fetchSections()`); tamaños de la línea base de la etapa 4 | Media | 4 |
| **R29** | **Alejado, los grupos se amontonaban en una sola pila.** La rejilla que agrupa contactos e incidencias tenía un lado fijo por debajo del zoom 11 (0,04° y 0,05°): a zoom 7, la vista de todo Jalisco en escritorio, una celda mide unos 4 px, y cientos de burbujas quedaban una sobre otra en el centro del estado. *Encontrado al verificar 4.5* | DOM | `(shell)/mapa/page.tsx` de antes, `lib/mapa-rejilla.ts`; captura a 1024 px de la línea base | Media | 4 |
| **R30** | **Sumarse a la brigada por el QR con dos o tres toques respondía 500.** Los toques pasaban juntos la comprobación del correo; el índice único dejaba pasar a uno y los demás caían en error del servidor, aunque la solicitud sí se había enviado. Y la cuenta y su lugar en la brigada eran dos escrituras sueltas: un fallo entre ellas dejaba una solicitud que ningún líder veía. *Encontrado en el simulacro de evento* | REP | `api/public/unirme/route.ts`. Triple toque: `500, 200, 500` | Media | 6 |
| **R31** | **Un doble toque en el registro por QR podía responder «este teléfono ya está registrado».** Entre la búsqueda por clave de la solicitud y la del teléfono hay unos milisegundos; si el otro toque guardaba justo ahí, esta encontraba el teléfono y respondía 409, aunque era su propio registro. *Encontrado en el simulacro de evento: 1 de 15 dobles toques* | REP | `api/public/registro/route.ts` (paso 3). Llamando a la ruta sin servidor la ventana casi nunca se alcanza; por HTTP, sí | Media | 6 |
| **R32** | **La suite de pruebas se cortaba al azar sin que fallara ninguna prueba.** Una de cada tres o cuatro corridas completas abortaba al arrancar con «Channel closed» (`ERR_IPC_CHANNEL_CLOSED`): el CI podía fallar sin motivo, y quien lo viera no sabría si había un error. Es una falla de tinypool, el administrador de procesos de vitest 3.2 ([vitest#8201](https://github.com/vitest-dev/vitest/issues/8201)), que vitest 4 corrige cambiando de mecanismo. *Visto en la etapa 1 y en el simulacro; medido en la revisión de fondo* | MED | `vitest.config.ts`: con procesos, 2 de 8 corridas cortadas; con hilos, 0 de 8, en el mismo tiempo | Media | 6 |

### 3.3 Integridad de datos (D)

| id | defecto | cómo | archivo | sev. | etapa |
| :-- | :--- | :-: | :--- | :-: | :-: |
| **D1** | El alta pública guarda el municipio **sin validar**: `buscarMunicipio(x) ?? (x?.trim() \|\| null)`. Si no está en el catálogo, escribe el texto tal cual. Todo el resto del sistema valida estrictamente | COD | `api/public/registro/route.ts` | Alta | 3 |
| **D2** | Se permiten correos duplicados por diferencia de mayúsculas: el índice único es sobre `email` crudo y el login busca por `lower(email)` con `LIMIT 1` | COD | `schema.ts`, `src/lib/auth.ts` | Alta | 1 |
| **D3** | Doble descifrado en siete sitios: se llama a `decryptData()` sobre columnas que Drizzle **ya descifró**. Hoy es inocuo porque devuelve el valor intacto si no tiene forma de cifrado, pero es una trampa para el siguiente cambio | COD | `analytics/page.tsx`, `perfil/[id]/page.tsx`, `admin-equipos/[id]/page.tsx`, `api/crm/contacts/export`, `api/map/contacts`, `api/equipo/buscar/contactos`, `prospectos-servicio.ts` | Media | 8 |
| **D4** | Año de nacimiento inventado: si falta se usa `2000` en silencio, en el alta interna y en la pública. *Se adelantó a la etapa 6 cuando la ficha empezó a enseñar la fecha de nacimiento (D21): el 2000 inventado se habría leído como cierto* | COD | `(shell)/crm/actions.ts`, `api/public/registro/route.ts` | Media | 6 |
| **D5** | Un contacto puede quedar sin municipio cuando no hay sección ni municipio capturado. Reproducido en **C4** | REP | `(shell)/crm/actions.ts` | Alta | 5 |
| **D6** | **Instantáneas de drizzle-kit incompletas, y el procedimiento documentado produce una migración que tumba el despliegue.** Faltan `meta/*.json` de 0012-0015, 0017 y 0018. Reproducido: con el esquema sin tocar, `drizzle-kit generate` produce una migración de 52 sentencias que vuelve a crear tablas de la 0017 (`activity_catalog_options`, `activity_history`, `activity_tag_links`) y borra y recrea una restricción; aplicada falla en la primera línea, y como `web` espera a que `migrate` termine bien, el sistema no arrancaría. Es el paso 2 de la guía de migraciones del repo. **Toda migración nueva debe escribirse a mano** | REP | `db/migrations/meta/`; prueba sobre una copia de `db/migrations` | Alta | 8 |
| **D7** | `teams.leaderId` no exige que el líder esté activo ni que pertenezca al municipio del equipo | COD | `schema.ts` (`teams`) | Media | 8 |
| **D8** | Esquema y migraciones divergen a propósito: el índice único por nombre normalizado del catálogo «vive solo en la migración 0017», según el comentario del propio archivo | COD | `schema.ts` (`activityCatalogOptions`) | Media | 8 |
| **D9** | **Se crean objetos de esquema fuera de las migraciones.** La base local tenía la tabla `rapid_activity_prospects` con las migraciones 0017 y 0018 **sin aplicar** (17 de 19 registradas): un objeto que ninguna migración describía | DOM | `drizzle.__drizzle_migrations` vs `information_schema` | Alta | 1 |
| **D10** | **Dos caminos de borrado de un ciudadano con semántica opuesta, y el del Directorio falla en uno de cada seis.** La API (`DELETE /api/crm/contacts/[id]`) hace baja lógica y la audita; el botón del Directorio y del detalle de equipo llama a `deleteContactAction`, que hace **borrado físico, irreversible y sin auditoría**. Su cascada a mano cubre 5 de las 9 claves foráneas que apuntan a `contacts` —faltan `event_reports`, `inbox_conversations`, `rapid_activity_prospects` y `social_listening`— y no borra `visit_results`, así que revienta en `DELETE FROM visits`. Y su comentario asegura que «el DELETE de la API ya lo tenía así», que es falso. *Corrige la versión anterior de esta entrada, que decía que un contacto con notas no se podía borrar: la acción borra las notas antes; eso solo pasaba con SQL a mano* | REP | `(shell)/crm/actions.ts` (`deleteContactAction`) vs `api/crm/contacts/[id]/route.ts`. Reproducido con la secuencia exacta de la acción dentro de una transacción deshecha: falla en `visit_results_visit_id_visits_id_fk`. **549 de 3 385 ciudadanos (16 %) no se pueden borrar** | Alta | 2 |
| **D11** | **El script de rotación de llave documentaba un comportamiento que nunca existió**: decía que `decryptData` no lanzaba. Lanzaba desde el primer commit (`a978071`), así que quien leyera ese comentario creería que una fila ilegible era inofensiva. *Encontrado en la revisión de la etapa 1* | COD | `scripts/db/rotate-encryption-key.ts`; historial de `crypto.ts` | Baja | 1 |
| **D12** | **Los registros del servidor guardaban datos de ciudadanos.** Drizzle arma el mensaje de todo error de consulta como `Failed query: <sql>\nparams: <valores>`, y la traza lo repite: al fallar una escritura, los valores que se estaban guardando quedaban en el registro. El nombre del ciudadano va en claro (`display_name` no está cifrado); los campos cifrados salen cifrados, y la huella del teléfono también aparecía. Venía de antes (`console.error(error)` imprimía lo mismo), pero el registro estructurado de 1.10 lo habría dejado además en cada línea JSON. Hay dos vías más, vistas con `next start`. Los errores que nadie atrapa, en pantallas y acciones de servidor, los imprime **Next por su cuenta**, con `params:` incluido. Y el propio mensaje de Postgres repite el valor que no pudo convertir (`invalid input syntax for type uuid: "…"`); en un duplicado, `detail` trae `Key (email)=(…)`. *Encontrado al revisar 1.10* | REP | `src/lib/registro.ts`, `instrumentation.ts`. Un alta que choca con una clave foránea, con `scripts/local/datos-en-errores.mts`: mensaje y traza con el nombre en claro. `/perfil/<texto>` en el build de producción: el texto aparecía en la línea `params:` y en el mensaje de la causa | Alta | 1 |
| **D13** | **/resumen contaba en «hoy» y en «PAN confirmado» a ciudadanos dados de baja**, mientras el total no los contaba: podía haber más confirmados que ciudadanos. *Encontrado al implementar 2.9* | COD | `(shell)/resumen/page.tsx` | Baja | 2 |
| **D14** | **Las altas no eran atómicas.** La interna escribía el ciudadano, luego sus datos de campo con un `UPDATE` aparte, luego la nota y luego la encuesta: cuatro escrituras sueltas. La pública, tres. Un fallo a medias dejaba un ciudadano sin su nota o sin su encuesta, y con la idempotencia de 3.3 el reintento lo habría dado por bueno. *Encontrado al implementar 3.3* | COD | `(shell)/crm/actions.ts`, `api/public/registro/route.ts` | Media | 3 |
| **D15** | **Un 31 de febrero se guardaba como 2 o 3 de marzo.** `Date.UTC` no rechaza fechas imposibles: las corre al mes siguiente en silencio, en el alta interna y en la pública. *Encontrado al implementar 3.3* | COD | `(shell)/crm/actions.ts`, `api/public/registro/route.ts` | Baja | 3 |
| **D16** | **«Purgar resueltas» borraba de verdad, y se llevaba actividades de la bitácora con su historial.** Era un `DELETE` de todo lo que estuviera en `resolved`, sin distinguir incidencias de actividades, sin auditoría y sin vuelta atrás; `activity_history` y `activity_tag_links` caen en cascada con cada actividad. En la base local habría borrado **160 filas: 130 incidencias y 30 actividades**. Lo ofrecía el Centro de Mando del mapa a administración. *Encontrado al implementar 4.4* | DOM | `api/map/reports/bulk/route.ts` (`purge_resolved`); `pg_constraint` (`ON DELETE CASCADE` en las dos tablas); conteo por tipo y estado en `event_reports` | Crítica | 4 |
| **D17** | **El mapa y la Gestión de incidencias trataban las actividades de la bitácora como incidencias.** Desde el globo del mapa, la Gestión y las acciones en bloque se podían cerrar, reabrir, reasignar o borrar, saltándose el cierre con resultado de la Agenda; y entraban en las listas y en las cifras de incidencias. *Encontrado al implementar 4.4* | COD | `api/map/reports/[id]/route.ts`, `api/map/reports/bulk/route.ts`, `(shell)/admin-incidencias/actions.ts` y `page.tsx`, `(shell)/historial-incidencias/page.tsx` | Alta | 4 |
| **D18** | **Cerrar una incidencia no dejaba cuándo ni quién.** Ninguna vía de cierre —globo del mapa, Gestión, acciones en bloque— escribía `closed_at` ni `closed_by_user_id`, y ningún cambio de estado tocaba `updated_at` (no hay disparador ni `$onUpdate`). En la base local, **0 de 221** incidencias cerradas los tienen. *Encontrado al implementar 4.4* | DOM | `api/map/reports/[id]/route.ts`, `bulk/route.ts`, `admin-incidencias/actions.ts`; conteo en `event_reports` | Baja | 4 |
| **D19** | **El mismo teléfono registrado a la vez creaba varios ciudadanos.** El registro público buscaba el teléfono y después guardaba; dos solicitudes distintas del mismo número —la persona desde su teléfono y desde el kiosco del evento— pasaban las dos la búsqueda antes de que ninguna guardara. El índice del teléfono no es único a propósito (1.1), así que nada lo impedía. *Encontrado en el simulacro de evento* | REP | `api/public/registro/route.ts`. Cuatro solicitudes a la vez con el mismo número: **4 fichas** de 4, las cuatro respondieron 200 | Alta | 6 |
| **D20** | **Ninguna alta crea el territorio del ciudadano, y sin territorio confirmado no se le puede asignar responsable ni agendar visita** (regla del dominio en `assign-responsible` y `schedule-visit`). Solo el botón «Territorio» de la ficha lo crea. Ni el alta interna —que sí captura colonia y sección—, ni el QR, ni el modo evento, ni la conversión de prospectos. En la base local el 93 % sí lo tiene porque lo sembró el guion del escenario, no la aplicación. Con la regla del 2026-09-25 pesa más: el brigadista solo ve lo asignado, y el líder tendría que confirmar el territorio de cada ciudadano de un evento, uno por uno, antes de repartirlo. *Encontrado en el simulacro de evento* | DOM | `contact_territory`: 0 de 264 ciudadanos del simulacro; `packages/modules/territory` (`linkContactToColony`, único que la crea) | Alta | 6 |
| **D21** | **Los datos personales de un ciudadano no se podían corregir, y la ficha ni siquiera los enseñaba.** Solo había una ruta que escribiera sobre un ciudadano ya registrado: la del domicilio electoral (colonia, sección). Un teléfono mal tecleado en un evento se quedaba así, y con él la búsqueda por teléfono y el aviso de repetidos. La ficha tampoco mostraba el correo, la fecha de nacimiento ni la calle y el número que se capturaron. *Encontrado en la revisión de fondo antes del commit* | COD | `grep` de escrituras sobre `contacts`: solo `territory/route.ts` y `baja-ciudadano.ts`; `(shell)/crm/contacts/[id]/page.tsx` | Alta | 6 |
| **D22** | **El alta del panel no miraba el teléfono.** El registro por QR rechaza un teléfono repetido, pero quien ya se había registrado por el QR quedaba con una segunda ficha si luego lo capturaban desde el panel. *Encontrado en la revisión de fondo antes del commit* | REP | `lib/alta-ciudadano.ts` (sin búsqueda por `phone_hash`) | Alta | 6 |
| **D23** | **Corregir el domicilio aceptaba un municipio distinto al de la sección.** El ciudadano quedaba con el municipio escrito de un lado y la sección —y la llave de municipio, que sale de ella— del otro. El alta ya lo rechazaba; la ficha no. *Encontrado en la revisión de fondo antes del commit* | REP | `api/crm/contacts/[id]/territory/route.ts` | Media | 6 |
| **D24** | **Editar una incidencia no validaba nada, y el municipio escrito la mudaba de municipio.** Se guardaba cualquier categoría, un título vacío, una fecha imposible (500) o una sección inexistente (500). Y como la llave de municipio de una incidencia sale de su texto antes que de su sección (0022), escribir «Zapopan» sobre una incidencia de una sección de Tonalá la dejaba a la vista de la administración de Zapopan. Al levantarla pasaba lo mismo: el municipio escrito mandaba sobre la sección del punto, y unas coordenadas que no son número o una sección inventada daban 500. *Encontrado en la revisión de fondo antes del commit* | REP | `api/map/reports/[id]/route.ts` (PATCH), `api/map/reports/route.ts` (POST), disparador `fijar_municipio_incidencia` | Alta | 6 |
| **D25** | **El pin del selector de ubicación no caía donde se tocaba, y el punto podía quedar con datos de otro.** El ícono era un círculo anclado en su centro con un `translate(-50%, -50%)` adentro: se dibujaba 17 px a la izquierda y 29 px arriba del punto que se guardaba (medido; unas decenas de metros al acercamiento de una calle). En el teléfono, además, Leaflet se quedaba con el tamaño del diálogo antes de su animación y proyectaba mal. El mapa se creaba con el `onChange` y el valor del primer render; dos toques seguidos podían guardar la dirección del primero con el punto del segundo; y en el alta de ciudadano, Escucha, actividades y Reportes, la sección y la calle del punto anterior se quedaban cuando el nuevo no las traía. El GPS del selector de colonia descartaba el punto si no llegaba la dirección. *Encontrado al revisar domicilios y GPS* | MED | `components/LocationPicker.tsx`, `components/ColonySelector.tsx`, `scripts/local/pin-exacto.mts` (antes 17/29 px; después 0 px en escritorio y teléfono) | Alta | 6 |
| **D26** | **Corregir el domicilio desde la ficha tiraba el punto marcado y la calle.** El diálogo mandaba solo colonia, sección y municipio; tenía dos campos de sección (el del selector se ignoraba) y arrancaba con el municipio de quien editaba, no el del ciudadano. El brigadista que marcaba la puerta con su GPS no guardaba nada de eso. *Encontrado al revisar domicilios y GPS* | REP | `(shell)/crm/contacts/[id]/page.tsx` (diálogo «territory»), `api/crm/contacts/[id]/territory/route.ts` | Alta | 6 |
| **D27** | **Elegir una sugerencia de dirección movía la incidencia marcada.** Con el punto puesto por doble clic o por GPS, la sugerencia lo cambiaba por el suyo: si era una colonia o una sección, por su centro. *Encontrado al revisar domicilios y GPS* | REP | `(shell)/mapa/ModalesDeIncidencia.tsx` (`onSelect` de `AddressAutocomplete`) | Media | 6 |

### 3.4 Coherencia, menús y código muerto (M)

| id | defecto | cómo | archivo | sev. | etapa |
| :-- | :--- | :-: | :--- | :-: | :-: |
| **M1** | «Gestión de Equipos» es una trampa: el menú la ofrece a `direction` y `territorial_coordinator`, pero crear, editar y borrar exige `isGlobal`. Reproducido en **C6** | REP | `packages/ui/role-home.ts` vs `api/admin/teams/*` | Alta | 2 |
| **M2** | Dos caminos para crear un equipo, uno muerto: `createTeamAction` tiene ramas para no-globales que nunca se ejecutan porque el cliente llama al API | COD | `(shell)/admin-equipos/actions.ts` | Media | 2 |
| **M3** | Nombres de rol cruzados: `territorial_coordinator` se muestra «Líder» y `capturist` «Coordinador Territorial». En campo, «el coordinador territorial» no coordina nada y «el líder» sí | DOM | `scripts/db/seed-data.ts` | Alta | 2 |
| **M4** | `/resumen` tiene dos fuentes de números: `/api/resumen` da totales del sistema solo a admin, y la página hace sus propias consultas acotadas | COD | `api/resumen/route.ts` vs `(shell)/resumen/page.tsx` | Media | 2 |
| **M5** | 17 entradas de menú; el teléfono muestra 4 más «Más» | DOM | `packages/ui/role-home.ts`, `AppShell.tsx` | Media | 2 |
| **M6** | Los avisos legales rebotan al login. Reproducido en **C8** | REP | `apps/web/middleware.ts` | Alta | 2 |
| **M7** | La memoización del alcance se anula sola: `resolveUserNetworkScope` está envuelta en `cache()`, que memoiza por argumentos, y dos pantallas la piden con `(userId, accessType)` mientras el layout usa `(userId)`. Se resuelve **dos veces por petición** (una decena de consultas cada vez), y `accessType` ya no cambia el resultado | COD | `crm/contacts/page.tsx`, `escucha-social/page.tsx` | Media | 2 |
| **M8** | `puedeAsignar` repite una condición que `isLeader` ya cubre (`roleKey === "territorial_coordinator"`) | COD | `src/lib/bitacora-consulta.ts` | Baja | 8 |
| **M9** | Dos pantallas se saltan `requirePageRole` y redirigen a mano, en contra de la regla que el propio `authorization.ts` documenta | COD | `(shell)/escucha-social/page.tsx`, `(shell)/crm/contacts/page.tsx` | Media | 2 |
| **M10** | `accessType` (`coordinacion`/`enlace`/`conexion`) es un modelo de privilegios fantasma: convive con los roles, aparece en consultas y pantallas, y no decide nada salvo en `/api/admin/promover` | COD | transversal | Media | 8 |
| **M11** | Gestión e Historial de Incidencias son dos entradas de menú para lo que por dentro ya son pestañas del mismo flujo | COD | `packages/ui/role-home.ts` | Baja | 2 |
| **M12** | ~~El login revela existencia de cuenta~~. **Descartado tras verificarlo: era un falso positivo de esta auditoría.** El estado de la cuenta solo se revela *después* de comprobar la contraseña correcta; sin ella, cuenta inexistente, pendiente y activa responden idéntico (`401 invalid_credentials`, tiempos equivalentes). Y quien sí sabe su contraseña necesita saber que su solicitud está pendiente | REP | `src/lib/auth.ts:55-72`. Probado en vivo con la cuenta pendiente del escenario | — | descartado |
| **M13** | `packages/ui/styles.css` no lo importa nadie: es código muerto | DOM | `packages/ui/styles.css` | Baja | 2 |
| **M14** | **Dos pantallas huérfanas y sin estilos.** `/equipo/mis-contactos` y `/equipo/mis-visitas` no están en el menú (0 coincidencias en `role-home.ts`), solo se enlazan entre sí y desde un redirect, y usan **tres clases CSS que no existen** (`crm-container`, `page-lead`, `ui-empty`: 0 coincidencias en `globals.css`), así que se renderizan sin estilo | DOM | `(shell)/equipo/mis-contactos/page.tsx`, `(shell)/equipo/mis-visitas/page.tsx`, `packages/ui/EmptyState.tsx` | Media | 2 |
| **M15** | **Un id mal formado en la URL daba 500, y un id inexistente, «éxito».** Con sesión de administración, **9 de 23** llamadas a las rutas con `[id]` respondían 500 ante un id que no es UUID: la base lo rechaza (`22P02`) y el cliente oía «el servidor se cayó» por un enlace mal copiado. La guarda de la ficha (`puedeVerContacto`) deja pasar a administración sin mirar el id. Al revés, con un UUID que no existe, dar de baja un ciudadano respondía `success` **y escribía en `audit_logs` la baja de un ciudadano que nunca existió**. Editar o borrar un equipo, o editar un registro de escucha siendo administración, también decían `success`. Un PATCH de escucha sin campos daba 500. Y dos **pantallas**: `/perfil/no-es-uuid` y `/admin-equipos/no-es-uuid` respondían 500 con `next start` y caían en la frontera de error. Misma familia que **C3**. *Encontrado en la revisión de la etapa 1. Los 500 se provocaron; los «success» con UUID inexistente se leyeron en el código (`UPDATE` sin comprobar filas afectadas) y se comprobaron ya corregidos: 404 y ninguna fila de auditoría* | REP | `scripts/local/ids-mal-formados.mjs` recorre todas las rutas con `[id]` y cada método. Rutas: `admin/teams/[id]`, `crm/contacts/[id]` y sus subrutas, `escucha-social/[id]`, `map/reports/[id]` | Media | 1 |
| **M16** | **Sin `.gitattributes`, los scripts de shell salen con CRLF en Windows y no corren.** Con `core.autocrlf=true`, `scripts/ops/*.sh` se escribían con finales de línea de Windows. Montados en el contenedor de respaldo, `sh` falla en la primera línea (`set: illegal option -`) antes de respaldar nada. En el VPS (Linux) no pasa; en una máquina de desarrollo con Windows, el servicio `backup` no funciona | REP | `scripts/ops/restore.sh` con CRLF en `postgres:16-alpine` → `set: line 16: illegal option -` | Baja | 1 |
| **M17** | **La ficha de ciudadano nunca muestra su propio «Contacto no encontrado».** Guarda la respuesta de la API sin mirar si fue un error. Un 404 (ficha inexistente o de otra brigada) se pintaba como si `{ error }` fuera la ficha, y la pantalla de «no encontrado» que ya existe no se veía nunca | COD | `(shell)/crm/contacts/[id]/page.tsx` (`fetchDetail`) | Baja | 1 |
| **M18** | **`GET /api/crm/contacts` ignoraba `q`, `page` y `pageSize`**: el caso de uso los acepta, pero la ruta no se los pasaba, así que cualquier búsqueda devolvía la primera página del padrón. Y la búsqueda del módulo hacía `ILIKE` sobre el teléfono cifrado (la otra mitad de **C22**). *Encontrado al implementar 2.15* | REP | `api/crm/contacts/route.ts`, `packages/modules/contacts/infrastructure/drizzle-contacts.ts`. Buscando un teléfono, un nombre o una colonia, la API devolvía siempre la misma primera ficha | Baja | 2 |
| **M19** | **El filtro de militancia del Directorio solo filtraba la página a la vista.** Se aplicaba en el navegador sobre las 25 filas cargadas: el total y las páginas seguían contando a todo el padrón, y en la página 2 aparecían «confirmados» que no estaban en la 1. *Encontrado al implementar 2.10* | COD | `(shell)/crm/contacts/DirectorioClient.tsx` (`filterPan`) | Media | 2 |
| **M20** | **El rechazo por no ser líder decía «levantar incidencias» también a quien intentaba registrar una actividad**, y remitía «a tu coordinador territorial», que era el nombre del rol que no coordina (**M3**). *Encontrado al implementar 2.5* | REP | `src/lib/authorization.ts` (`requireLiderParaIncidencias`); `POST /api/equipo/tareas` con un capturista | Baja | 2 |
| **M21** | **`perfil/ProfileClient.tsx` era código muerto, con un botón «Editar Foto» que no hacía nada.** Nadie lo importaba: `/perfil` usa `LeaderProfileClient`. *Encontrado al implementar 3.6* | COD | `(shell)/perfil/ProfileClient.tsx` | Baja | 3 |
| **M22** | **Escucha Social callaba los fallos al guardar.** Si el alta no pasaba, el formulario seguía abierto sin ningún mensaje, como si no se hubiera pulsado nada. *Encontrado al implementar 3.7* | COD | `(shell)/escucha-social/EscuchaSocialClient.tsx` (`handleCreate`) | Media | 3 |
| **M23** | **19 diálogos van en `z-50`**: por debajo del botón flotante (60) y a la altura de la barra inferior (50), que va después en el documento y se pinta encima, así que en el teléfono el pie del diálogo puede quedar tapado. La convención del repo para diálogos es 110. Los dos de Escucha Social se corrigieron en la etapa 3; los otros 17 quedan para la escala de z-index de la etapa 4. *Encontrado al implementar 3.7* | COD | 19 coincidencias de `fixed inset-0 … z-50` en `apps/web`, entre ellas `PersonalLinkModal.tsx` | Media | 3, 4 |
| **M24** | **El mapa contaba otra cosa que la Gestión de incidencias, con el mismo nombre.** «Centro de Mando (233)» y «Pendientes» contaban solo el estado `active` y sumaban las actividades de la bitácora (198 + 35); la Gestión cuenta **356** abiertas —pendientes, aceptadas y en proceso— sin actividades. Y la lista llamaba «Pendiente» a todo lo que no fuera «resuelta», también a lo archivado y a lo rechazado. *Encontrado al implementar 4.1* | DOM | `(shell)/mapa/page.tsx` de antes (`activeReportsCount`, etiquetas de estado); conteo por estado y tipo en `event_reports` | Media | 4 |
| **M25** | **«Mi ubicación» abría el alta de incidencia, y el doble toque también.** Buscar la propia posición terminaba en un formulario, también para quien no puede levantar incidencias; y en el teléfono el doble toque es el gesto de acercar, así que acercar abría el alta. *Encontrado al implementar 4.1* | COD | `(shell)/mapa/page.tsx` de antes (`handleLocateMe`, `map.on("dblclick")`) | Media | 4 |
| **M26** | **«+ Reportar» se ofrecía a todos los roles**, y al guardar la API les respondía que no a brigadistas y capturistas (§5). *Encontrado al implementar 4.1* | COD | `(shell)/mapa/page.tsx` de antes, frente a `POST /api/map/reports` (`requireLiderParaIncidencias`) | Media | 4 |
| **M27** | **«Ver sus ciudadanos», en el panel de una sección, perdía la sección**: llevaba a `/crm?seccion=…`, que redirige al Directorio sin el filtro. *Encontrado al implementar 4.7* | COD | `(shell)/mapa/page.tsx` de antes; `(shell)/crm/page.tsx` (`redirect("/crm/contacts")`) | Baja | 4 |
| **M28** | **El CSV de incidencias del mapa salía con los acentos rotos en Excel y sin neutralizar fórmulas**: sin marca BOM (el encabezado se leía «TÃ­tulo»), y un título que empezara con `=` se abría como fórmula. La exportación de contactos ya hacía las dos cosas. *Encontrado al implementar 4.7* | COD | `(shell)/mapa/page.tsx` de antes (`handleExportCSV`), frente a `api/crm/contacts/export/route.ts` | Baja | 4 |
| **M29** | **La ficha de ciudadano escondía «Editar» territorio y «Asignar» a todo el que no fuera administración**, aunque la API deja corregir el domicilio a los cinco roles —al brigadista a propósito, «es quien toca la puerta»— y asignar a dirección y líder (§5). El aviso de no ubicables del mapa mandaba a corregirlos a gente que no veía el botón. *Encontrado al implementar 4.6* | COD | `(shell)/crm/contacts/[id]/page.tsx` (`hidden={!detail.canManageSensitive}`), `api/crm/contacts/[id]/route.ts` (`canManageSensitive: roles.includes("admin")`), frente a `lib/permissions.ts` | Media | 4 |
| **M30** | **«Resultado electoral» pintaba de gris, sin decir por qué, los municipios que el atlas no cubre.** Hoy el atlas solo tiene Zapopan (163 secciones): en Tonalá el modo deja todo gris y la leyenda seguía ofreciendo PAN, Morena y MC. *Encontrado al verificar 4.1* | DOM | `section_electoral_results` unida a `electoral_sections` por municipio; captura a 1024 px | Baja | 4 |
| **M31** | **ESLint no revisaba las rutas públicas de la API.** El patrón que excluía los archivos estáticos, `apps/**/public/**`, también atrapaba `apps/web/app/api/public/`: el alta por QR y la de brigadistas —las rutas más expuestas, sin sesión— nunca pasaban por el lint. Al volver a incluirlas salió un error que llevaba ahí desde entonces. *Encontrado al implementar 5.8* | REP | `eslint.config.mjs`; `eslint apps/web/app/api/public/registro` respondía «all of the files matching the glob pattern … are ignored» | Media | 5 |
| **M32** | **Logística no tiene alta de almacenes.** El único almacén que la aplicación crea es un «Almacén Principal» que se inventa en silencio al dar de alta el primer artículo, sin municipio ni autor; los almacenes con nombre solo existen si los siembra un script. *Encontrado al implementar 5.3: la regla del plan para almacenes —«el de quien los creó»— no se puede aplicar, porque no guardan quién* | COD | `(shell)/logistica/actions.ts` (`createInventoryItemAction`); `warehouses` no tiene `created_by` | Baja | 6 |
| **M33** | **«Registrar movimiento», en Logística, no guardaba nada.** Al confirmar decía «Movimiento registrado… el stock ha sido actualizado exitosamente mediante el Outbox Pattern» y el inventario seguía igual; como responsables ofrecía tres personas inventadas («Juan Pérez - Coordinador Zona Norte», «María Gómez», «Carlos Ruiz»). *Encontrado al implementar 6.9* | COD | `(shell)/logistica/AssignModal.tsx` de antes: el formulario solo pasaba al paso 2, sin llamar a nada | Alta | 6 |
| **M34** | **El módulo `packages/modules/logistics` queda sin uso**, y su `getAllItems` lee el inventario entero sin alcance: si alguien lo vuelve a usar, se salta la frontera de municipio. *Encontrado al implementar 6.9* | COD | `packages/modules/logistics/infrastructure/drizzle-logistics.ts`; ya nadie importa `logistics-deps.ts` (se retiró) | Baja | 8 |
| **M35** | **Administración, dirección y líder completan la cartografía de secciones de cualquier municipio** (`POST /api/electoral/sections`: municipio y geometría si faltaban, y colonias). Es cartografía pública y solo rellena lo vacío, pero no respeta la frontera de municipio. *Encontrado al revisar 6.3* | COD | `api/electoral/sections/route.ts` (POST) | Baja | 8 |
| **M36** | **Un doble envío resuelto queda en el registro del servidor como error.** Cuando dos envíos del alta interna llegan con la misma clave, el caso de uso anota «Extended contact registration failed … unexpected_error» antes de que la ruta devuelva el ciudadano que ya se creó. Para quien captura no pasó nada; en un evento con dobles toques, el registro se llena de errores que no lo son. *Visto en el simulacro de evento* | REP | `packages/modules/contacts` (`registerExtendedContact`) frente a `lib/idempotencia.ts` | Baja | 8 |
| **M37** | **Las tarjetas de la Gestión de incidencias no decían lo que contaban, y su aviso invitaba a aceptar lo ajeno.** «Resueltas» mostraba las que están en proceso —la pantalla solo lee abiertas, así que nunca podía contar resueltas—, «Activas / Pendientes» solo las aceptadas y «Total» solo las abiertas. Y «Hay N reportes esperando aceptación» contaba también los de un compañero de coordinación, que esa persona no puede aceptar (A20). Venía de antes (`main`). *Visto en las capturas del simulacro de evento* | DOM | `(shell)/admin-incidencias/page.tsx` (`resolvedCount = cuantas("in_progress")`); captura del líder de Zalatitán a 1700 px | Media | 6 |
| **M38** | **La API del Directorio paginaba de forma inestable.** Ordenaba solo por fecha de alta; en un evento se registran muchos en el mismo instante, y sin desempate una ficha salía en dos páginas y otra en ninguna (al maestro le faltó 1 de 264 recorriendo las páginas). La página del Directorio ya desempataba por id. *Encontrado en el simulacro de evento* | REP | `packages/modules/contacts/infrastructure/drizzle-contacts.ts` (`ORDER BY c.created_at DESC`) | Media | 6 |
| **M39** | **Asignar responsable o territorio desde la ficha solo decía «no se pudo».** Quien asignaba a un ciudadano sin territorio no sabía que primero tenía que confirmar su colonia; el motivo traducido ya existía para las visitas. *Encontrado en el simulacro de evento* | COD | `(shell)/crm/contacts/[id]/page.tsx` (`handleAssignResponsible`, `handleAssignTerritory`) | Media | 6 |
| **M40** | **Cuatro acciones en bloque sin uso y sin rastro.** `POST /api/map/reports/bulk` resolvía, reabría, borraba y reasignaba incidencias en bloque. Ninguna pantalla lo usaba (solo «archivar resueltas»), ninguna dejaba fila en la auditoría ni evento en el outbox, y «borrar» las eliminaba para siempre. *Encontrado en la revisión de fondo antes del commit* | COD | `api/map/reports/bulk/route.ts`; único uso en `(shell)/mapa/page.tsx` (`purge_resolved`) | Media | 6 |
| **M41** | **Una nota que no es texto daba 500**, y no tenía límite de largo; las notas de resolución de Escucha social, tampoco. *Encontrado en la revisión de fondo antes del commit* | REP | `api/crm/contacts/[id]/notes/route.ts` | Baja | 6 |
| **M42** | **Las cuentas aceptaban un correo mal escrito** («juan», «juan@»), en el auto-registro y en el alta por administración: la cuenta quedaba creada y nadie podía entrar con ella. Y dos toques a «Enviar» en el auto-registro chocaban con el índice único del correo: 500. *Encontrado en la revisión de fondo antes del commit* | COD | `api/auth/register/route.ts`, `lib/gobierno-de-cuentas.ts` (`crearCuenta`) | Media | 6 |
| **M43** | **`/onboarding` estaba huérfana y duplicaba ciudadanos.** Nada llevaba a ella; quien la abría a mano creaba una ficha de ciudadano con sus propios datos cada vez, sin revisar repetidos. El domicilio de las cuentas, que era lo que pedía, ahora va en el registro. *Encontrado al revisar domicilios* | COD | `app/onboarding/` (sin enlaces ni redirecciones hacia ella) | Baja | 6 |
| **M44** | **Las pantallas se dibujaban con la hora del contenedor (UTC) y el teléfono con la de Jalisco.** Next dibuja cada pantalla primero en el servidor y luego en el navegador: cada fecha u hora formateada sin zona salía distinta en uno y otro (lo de las 19:00 en adelante era «del día siguiente» en el servidor), React tiraba el error #418 y volvía a dibujar la página. Y «hoy» en el Resumen se contaba con la medianoche del proceso: los contadores de hoy volvían a cero a las 18:00. Ya pasaba en producción, que corre `main` igual en UTC; en el equipo de desarrollo no se veía porque todo corre en la hora de Jalisco. *Encontrado en el ensayo de despliegue* | REP | Revisión de celular contra la imagen de Docker: 21 pantallas con #418 (Escucha, Perfil, Estructura, solicitudes, detalle de equipo); con el navegador en UTC, ninguna. `lib/resumen-kpis.ts` (`new Date(año, mes, día)`); la prueba nueva falla con ese cálculo en UTC | Media | 8 |
| **M45** | **El alta de ciudadano revisaba los datos antes que el permiso.** Un brigadista, que no puede dar de alta, recibía 400 con lo que le faltaba al formulario en vez de 403. No exponía datos ni creaba nada: el permiso se revisaba después, antes de escribir. *Encontrado en el ensayo de despliegue* | REP | `api/crm/contacts/route.ts` (POST); el simulacro de evento lo marcó al exigirse la calle en el alta | Baja | 8 |

### 3.5 Verificados en la aplicación corriendo (C)

| id | defecto | cómo | evidencia | sev. | etapa |
| :-- | :--- | :-: | :--- | :-: | :-: |
| **C1** | **`/resumen` se cae en blanco cuando la base va una migración atrás.** La pantalla principal de Administración, Dirección y Líder devolvió 500 y mostró el texto crudo de Next: *«Application error: a server-side exception has occurred»*, sin menú y sin volver atrás | REP | Registro del servidor: `column x.visit_id does not exist`, `digest 2854465517`, en `resumen/page.tsx:86`. La base tenía 17 de 19 migraciones. Tras `pnpm db:migrate`, la pantalla volvió | Crítica | 1 |
| **C2** | **El registro masivo en un evento se serializa y crece con el padrón.** Latencia uno a uno con la concurrencia; techo de ~19 registros/segundo | MED | 1→140 ms, 10→513 ms, 25→1 129 ms, 50→2 542 ms (p50). Escaneo medido en 22 µs por fila. Detalle en §4 | Crítica | 1 |
| **C3** | **Un error de validación se devuelve como HTTP 500.** El cliente no puede distinguir «te faltó un campo» de «el servidor se cayó» | REP | `POST /api/crm/contacts` con nombre vacío → `500 {"code":"contact_display_name_required"}` | Crítica | 1 |
| **C4** | **Se acepta un ciudadano sin municipio, sin sección y sin teléfono** | REP | `POST /api/crm/contacts` con solo `displayName` → **200** y ficha creada | Crítica | 5 |
| **C5** | **Cero fronteras de error.** No existe un solo `error.tsx`, `global-error.tsx`, `not-found.tsx` ni `loading.tsx` en toda la aplicación. Es lo que convierte C1 en pantalla en blanco | REP | Búsqueda exhaustiva en `apps/web/app` | Crítica | 1 |
| **C6** | **Dirección y Líder no pueden crear ni editar equipos, y el menú se los ofrece.** Un líder no puede dar de alta su propia brigada | REP | Con sus cuentas reales: `POST /api/admin/teams` → `403 {"error":"Unauthorized"}`; `PATCH /api/admin/teams/{id}` → 403, para los dos roles | Alta | 2 |
| **C7** | **El botón flotante ofrece «Evento o actividad» a quien no puede crearla y no pasa nada.** Lleva a `/equipo?crear=evento`, y `AgendaClient` descarta el parámetro porque `puedeCrear` es falso: no se abre el formulario y no se muestra ningún mensaje | REP | `QuickCreateFab` incluye `capturist` y `visit_responsible`; `AgendaClient.tsx:59` | Alta | 2 |
| **C8** | **Los avisos legales rebotan al login, y el login exige aceptarlos.** Nadie puede leer lo que se le obliga a aceptar | REP | Sin sesión: `/terminos` → **307** a `/login`, `/privacidad` → **307**, `/onboarding` → **307**. La pantalla de entrada enlaza a los dos y tiene casilla obligatoria | Alta | 2 |
| **C9** | **La barra inferior del teléfono no lleva al Mapa ni a la Agenda.** Se toman *los primeros cuatro* elementos del menú, no los más usados | REP | A 375 px, estando **dentro del mapa**, la barra ofrecía Resumen, Análisis, Directorio, Registrar y «Más». `AppShell.tsx`: `allItems.filter(...).slice(0, 4)` | Alta | 2 |
| **C10** | **El mapa manda casi 2 MB por carga con una base pequeña** | MED | `/api/map/contacts` = **1 507 KB** en 1 204 ms; `/api/map/reports` = **421 KB** en 939 ms, con 3 385 ciudadanos y 612 incidencias. ~450 bytes por ciudadano | Alta | 4 |
| **C11** | **`/admin-usuarios` devuelve 2 MB de HTML y tarda 5,3 s** con 177 usuarios, sin paginar ni buscar en servidor. Es la pantalla desde la que el MOM gobernará los 125 municipios | MED | `2 036 KB`, `5 294 ms` | Alta | 2 |
| **C12** | **El mapa no respeta la escala de z-index del propio repo.** Al abrir el detalle de una sección, su título y su botón de cerrar quedan tapados por la barra de herramientas, y el globo de la sección se pinta encima del panel | DOM | Panel de sección en **z 40** (debajo de la nav inferior 50 y del FAB 60); barras en **20**; tres elementos en **5000**, por encima de los avisos (1200); controles de Leaflet en **1000**, encima de la interfaz propia | Media | 4 |
| **C13** | **El panel de sección se sale de la pantalla en el teléfono.** El texto aparece cortado: «ección Electoral #2112», «OLONIAS EN ESTA SECCIÓN» | DOM | A 375 px el panel va de **x = −4 a x = 347** (28 px muertos a la derecha); la barra de estadísticas queda en **y = 808** de una pantalla de 812; «Secciones» desborda a 381 px | Media | 4 |
| **C14** | **El menú del mapa son doce botones en tres filas** que mezclan capa base (Calles HD, Noche, OSM, Satélite), capas de datos (Contactos, Incidencias), acciones (GPS, Buscar, Reportar, Capas) y modos (Mapa Cartográfico, Centro de Mando). Ocupan casi un cuarto de la altura útil en escritorio | REP | Captura a 1024 px y a 375 px | Media | 4 |
| **C15** | **No existen fotos de perfil.** `user_profiles` no tiene ninguna columna de imagen; la barra lateral pinta iniciales. Nadie —ni el MOM— puede ponerse una foto | DOM | Búsqueda de columnas de imagen en `schema.ts`: solo `barda_photo_url` (contactos), `media_urls` (incidencias), `image_url` (inventario), `photo_urls` (escucha) | Media | 3 |
| **C16** | **Escucha Social tiene fotos que no hay forma de subir ni de ver.** La tabla tiene `photo_urls` y la API las acepta, pero el formulario de alta solo tiene Categoría, Título, Descripción y Ubicación: **no hay campo de foto**, así que el arreglo siempre llega vacío. *Corrige la versión anterior de esta entrada, que decía que la ficha las mostraba: ninguna pantalla leía `photoUrls` más allá de declararlo en el tipo* | COD | `EscuchaSocialClient.tsx` (formulario y ficha), `api/escucha-social/route.ts` (POST acepta `photoUrls`) | Media | 3 |
| **C17** | **La foto de barda del ciudadano se pide como una URL escrita a mano**, mientras `MediaUploader` —que sí sube desde el teléfono— ya existe y se usa en la bitácora y en el mapa. Un brigadista en la calle no puede teclear la URL de una foto que acaba de tomar | COD | `crm/nuevo/NuevoContactoForm.tsx:353` («URL Foto de Barda / Espacio Ofrecido») | Media | 3 |
| **C18** | **El registro público no tiene modo evento.** Tras guardar muestra «¡Muchas Gracias!» y **no ofrece ninguna acción**: para la siguiente persona hay que recargar a mano. Y el **municipio es un campo de texto libre** sin selector ni validación | REP | `PublicRegistrationClient.tsx:114-137` (pantalla terminal sin botón) y `:300-308` (input de texto) | Alta | 3 |
| **C19** | **Ya hay datos sin municipio en la base.** Los **7 administradores tienen municipio nulo**, más 22 usuarios de otros roles. Y hay una cuenta llamada «Brigadista Norte» con rol `admin` | DOM | Conteo por rol: `admin` 7/7 sin municipio, `visit_responsible` 11, `capturist` 6, `territorial_coordinator` 3, `direction` 2 | Alta | 5 |
| **C20** | Cada alta pública crea también una nota del ciudadano. No es un defecto por sí mismo; se registra porque explica por qué borrar a mano con SQL a un ciudadano registrado por QR choca con `contact_notes`. **Las claves `NO ACTION` hacia `contacts` son una protección del historial y se conservan:** ponerles `ON DELETE CASCADE`, como proponía la versión anterior de este plan, habría convertido el error de D10 en pérdida silenciosa de datos. Ver **D10** | REP | `api/public/registro/route.ts`; `pg_constraint` | — | 2 |
| **C21** | **216 ciudadanos activos no aparecen en el mapa y nada lo dice.** No tienen GPS ni sección, así que no son ubicables; el rótulo del mapa dice «Contactos (3075)» como si fueran todos. Son el **6,6 %** del padrón activo | DOM | 3 291 activos; 3 075 ubicables (GPS o sección); **216 no ubicables** | Alta | 4 |
| **C22** | **El buscador del Directorio solo encuentra por nombre**, aunque el cuadro promete *«Buscar por nombre, teléfono o colonia…»*. La página filtra con `ILIKE` sobre `displayName` y sobre `colony`, que está cifrada: `ILIKE` sobre texto cifrado con IV aleatorio nunca coincide. Por teléfono ni lo intenta. El listado del módulo de contactos tiene el mismo defecto con `c.phone ILIKE`. *Encontrado en la revisión de la etapa 1* | REP | `(shell)/crm/contacts/page.tsx:62-63`, `packages/modules/contacts/infrastructure/drizzle-contacts.ts:158`. Con un ciudadano real: nombre completo → 1 resultado; teléfono completo → 0; colonia → 0 | Alta | 2 |

---

## §4 · Mediciones

### 4.1 Registro masivo en un evento (`/api/public/registro`)

Con 3 385 ciudadanos en la base, personas registrándose a la vez:

| concurrencia | p50 | p95 | total | estados |
| ---: | ---: | ---: | ---: | :--- |
| 1 | 140 ms | 140 ms | 140 ms | 100 % 200 |
| 10 | 513 ms | 515 ms | 550 ms | 100 % 200 |
| 25 | 1 129 ms | 1 147 ms | 1 182 ms | 100 % 200 |
| 50 | 2 542 ms | 2 592 ms | 2 658 ms | 100 % 200 |

La latencia crece **uno a uno** con la concurrencia: el techo es de ~19 registros por segundo y no
mejora. No es trabajo en paralelo, es un cuello serializado.

Con el padrón de **50 000** ciudadanos —en la prueba de carga de la etapa 3, con el escaneo de antes
reintroducido a propósito para comprobar que la prueba lo detecta—: una sola alta, **446 ms**; 50 a
la vez, p95 **9,2 s** y **errores 500** al agotarse el pool de conexiones. Es decir, con el padrón
lleno el código de antes no solo era lento en un evento: fallaba. Con el arreglo, sobre el mismo
padrón y desde la misma IP: una sola **10 ms**; 50 a la vez, p95 **137 ms**; 100 a la vez, p95
**206 ms**; todas registradas. Medido llamando al manejador de la ruta, sin servidor HTTP (ver §9,
«Etapa 3»).

### 4.2 Costo del escaneo por tamaño del padrón

Medido aparte, en solo lectura: **22 µs por fila** (leer y descifrar).

| padrón | escaneo por cada registro |
| ---: | ---: |
| 3 471 | 76 ms |
| 20 000 | 438 ms |
| 50 000 | **1 095 ms** |
| 100 000 | **2 190 ms** |

Un mitin con 50 personas registrándose a la vez y 50 000 ciudadanos en el padrón son **~55 segundos
de trabajo puro de escaneo** contra un pool de 10 conexiones. Y el limitador permite 60 escaneos
completos por hora desde una sola IP, sin sesión.

### 4.3 Peso de las pantallas

| recurso | tamaño | tiempo |
| :--- | ---: | ---: |
| `/api/map/contacts` | 1 507 KB | 1 204 ms |
| `/api/map/reports` | 421 KB | 939 ms |
| `/admin-usuarios` | 2 036 KB | 5 294 ms |
| `/logistica` | 229 KB | 4 014 ms |
| `/analytics` | — | 675 ms |
| `/settings` | 56 KB | 2 964 ms |

Proyección del mapa a 50 000 ciudadanos: **~22 MB** en una sola respuesta a un teléfono de gama
baja en datos móviles.

### 4.4 Escala de z-index del mapa frente a la convención del repo

| elemento | real | convención |
| :--- | ---: | :--- |
| Panel «Detalle de Sección Electoral» | **40** | 110 (en móvil se comporta como diálogo) |
| Barra de herramientas / estadísticas | **20** | 30 |
| Tres elementos sueltos | **5000** | fuera de escala (avisos son 1200) |
| Controles de Leaflet | **1000** | deben quedar por debajo de la interfaz propia |
| *(referencia)* nav inferior móvil | 50 | 50 |
| *(referencia)* botón flotante | 60 | 60 |

### 4.5 El mapa antes y después de la etapa 4

Build de producción de cada versión (`next build` + `next start`, que comprime como Caddy) en el mismo
equipo, con Chrome sin ventana, **CPU 4× más lenta y red de 4 Mbps con 150 ms de latencia
emuladas** —no es un teléfono real—, sin caché y tres corridas por caso (salieron casi idénticas; se
da la mediana). «Antes» es `main` (`10c968f`), compilado en un worktree temporal; «después», esta
rama. Se mide hasta que el mapa tiene dibujadas las incidencias y las secciones (o los municipios).

| caso | antes | después | por la red, antes → después |
| :--- | ---: | ---: | ---: |
| Líder de Tonalá, teléfono | 3,1 s | 2,9 s | 1 181 → 944 KB |
| Administración en Zapopan, escritorio | 7,2 s | 5,1 s | 2 138 → 1 995 KB |
| Administración en todo Jalisco, teléfono | 12,5 s | 2,7 s | 5 666 → 843 KB |

«Por la red» incluye JavaScript y mosaicos del mapa base, no solo datos. Las respuestas de datos, sin
comprimir, en la carga inicial:

| respuesta | antes | después |
| :--- | ---: | ---: |
| Contactos, administración (la capa arranca apagada) | 1 516 KB | 0,2 KB (solo las cifras) |
| Contactos, líder de Tonalá (capa apagada) | 205 KB | 0,2 KB |
| Contactos, administración, capa encendida en todo el estado a zoom 8 | 1 516 KB | 1 KB (4 grupos) |
| Secciones, Tonalá | 496 KB | 444 KB |
| Secciones, Zapopan | 1 158 KB | 1 026 KB |
| Secciones, todo Jalisco | 3 294 KB | no se piden |
| Personas para asignar | 2–24 KB | solo al abrir un formulario |
| Incidencias, administración | 423 KB | 414 KB |

El JavaScript de la pantalla creció un poco: 27,4 kB → 30 kB (146 → 150 kB con lo compartido).

---

## §5 · Qué puede escribir cada rol hoy

Probado contra la API con cuentas reales de cada rol. «NO» = 401 o 403.

| acción | brigadista | capturista | líder |
| :--- | :-: | :-: | :-: |
| Alta de ciudadano | NO | sí | sí |
| Crear actividad de bitácora | NO | NO | sí |
| Levantar incidencia | NO | NO | sí |
| Reporte de escucha social | sí | sí | sí |
| Alta de prospecto | sí | sí | sí |
| Convertir prospecto a ciudadano | NO | sí | sí |
| Nota en ficha de ciudadano | sí | sí | sí |
| Corregir domicilio | sí | sí | sí |
| Agendar visita | sí | sí | sí |
| Asignar ciudadano a alguien | NO | NO | sí |
| Subir foto o video | sí | sí | sí |
| Crear opción de catálogo | NO | NO | sí |
| Cambiar su propio nombre | sí | sí | sí |

Esta tabla **no es un defecto**: es el modelo vigente, y el §7 explica qué parte se conserva.

---

## §6 · Las etapas

El orden responde a una regla: **primero lo que hoy se cae o miente, después lo que el encargo pide
construir.** El rediseño de privilegios va en medio y no al principio porque sin frontera de error y
sin llave de municipio habría que rehacer los filtros dos veces.

> **Numeración de migraciones.** Las etapas 1, 2 y 3 necesitaron una cada una, así que las siguientes se corren:
> `0019` robustez · `0020` nombre del rol capturista · `0021` evento, fotos e idempotencia · `0022` municipio · `0023` administrador maestro · `0024` año de nacimiento conocido (D4) · `0025` domicilio de la persona.
> Todas **escritas a mano** por **D6**.

### Etapa 1 — Que no se caiga ni pierda trabajo

*Todo esto es un defecto de hoy, con o sin el resto del plan.*

| # | Entregable | Cierra |
| :-- | :--- | :--- |
| 1.1 | **Migración `0019`, escrita a mano y aditiva:** columna `phone_hash` —HMAC con subllave HKDF derivada de la llave de cifrado; no puede ser un SHA-256 sin llave, que con 10 dígitos se revierte por fuerza bruta— con índice parcial, más un índice parcial de filas pendientes; correos normalizados a minúsculas salvo los que chocarían; índice único sobre `lower(email)`, que se degrada a uno no único si ya hay repetidos para no bloquear el despliegue, y que `pnpm db:migrate` convierte en único en cuanto se corrigen. `pnpm db:migrate` rellena las huellas al terminar (también `pnpm db:backfill-phone-hash`). La rotación de llave borra las huellas y la siguiente migración las recalcula. **Se retiró el `ON DELETE` de `contact_notes` que proponía el plan: ver C20** | R1, R11, D2 |
| 1.2 | El alta pública busca el duplicado **por la huella del teléfono** en vez de leer y descifrar la tabla entera, con una red de seguridad que revisa aparte las filas todavía sin huella. Misma regla de siempre (todos los dígitos); un teléfono sin ningún dígito pasa a ser 400 en vez de coincidir con cualquier teléfono guardado sin dígitos | **C2**, R1 |
| 1.3 | `error.tsx` por grupo de rutas, `global-error.tsx`, `not-found.tsx`, `loading.tsx` en las pantallas pesadas | **C5**, C1, R2 |
| 1.4 | Comprobación de esquema al arrancar y en `/api/health`: migraciones aplicadas, retraso del outbox, latencia de base. Si falta una migración, la aplicación lo dice en pantalla en vez de morir. La comprobación de salud del despliegue pregunta dentro del contenedor `web`, que es donde está el puerto. Los secretos del despliegue automático quedan pospuestos (ver §9, «Pendientes operativos pospuestos») | **C1**, R15, D9, R21 |
| 1.5 | Los errores de validación devuelven 400: revisar la categoría de cada `ApplicationError` y el mapeo de `resultToResponse` | **C3** |
| 1.6 | `decryptData` deja de lanzar en lectura: **devuelve el valor cifrado sin tocar** y lo registra con una huella, nunca con el dato; `encryptData` deja pasar lo que ya tiene forma de cifrado. **Cambio respecto al plan original**, que decía «devolver un marcador»: si un formulario cargara ese marcador y alguien guardara la ficha, sobrescribiría el dato cifrado original, y la causa realista de una fila ilegible —cifrada con otra llave— es recuperable. Así el viaje de ida y vuelta la conserva byte por byte | R9, D11 |
| 1.7 | **Manejador de `error` en el pool** (sin él, un reinicio de la base tumba el proceso), máximo y espera por conexión configurables, `statement_timeout` (30 s) e `idle_in_transaction_session_timeout` (60 s). **Dos puntos del plan original se descartaron a propósito:** no se añade `query_timeout` —el límite del servidor cubre el caso realista y el del cliente no cancela la consulta en el servidor—, ni reintento automático de consultas —repetir a ciegas una escritura puede duplicarla; el reintento seguro vive donde hay idempotencia— | R10, **R18** |
| 1.8 | Todas las rutas usan `actorFromSession` (revalida rol y estado), ninguna se queda en `getServerSession` para autorizar. El panel también: una cuenta dada de baja sale al login con un aviso, sin bucle | A6, A7, **A14** |
| 1.9 | `ttl` y `maxAge` explícitos en la sesión | A9 |
| 1.10 | Registro estructurado con `correlationId` en todas las rutas, **sin los valores de las consultas** | R14, **D12** |
| 1.11 | Respaldo que solo guarda volcados completos y solo poda tras uno bueno; restauración solo en base vacía, con procedimiento de cambio de nombres; ensayo real; scripts de shell siempre con LF. La copia fuera del VPS queda pospuesta (ver §9, «Pendientes operativos pospuestos») | R12, **R22**, **R23**, M16 |
| 1.12 | ~~Respuesta uniforme del login~~ — **no se hace: M12 resultó ser un falso positivo** | M12 |
| 1.13 | Prohibir crear objetos de esquema fuera de migraciones: comprobación en CI que compara `information_schema` con el esquema declarado | D9 |
| 1.14 | Ids de la URL y errores hacia el cliente: un id que no es UUID es 404, un id que no existe es 404 (y no deja auditoría), y ningún error de la base sale al navegador con su consulta. La ficha de ciudadano muestra «no encontrado» | **M15**, **A15**, M17 |

**Criterio de aceptación:** con la base apagada o una migración por detrás, cada pantalla explica qué
pasa y cómo reintentar; ninguna queda en blanco. Un alta pública con 50 000 contactos responde por
debajo de 300 ms. 50 registros simultáneos no superan 1 s de p95.

### Etapa 2 — Que los menús no mientan

*Barata —una sola migración, de datos: el nombre de un rol— y es la mitad de la queja de campo.*

| # | Entregable | Cierra |
| :-- | :--- | :--- |
| 2.1 | Dirección y Líder crean y editan equipos dentro de su mando; se borra el camino muerto y queda una sola ruta. **Dentro de su mando** significa: el líder del equipo nuevo es la propia persona o un integrante de un equipo bajo su mando (con cualquier otro, el equipo nacería fuera de su vista); en los equipos desde los que manda no puede cambiar al líder (perdería el mando sobre toda su estructura); borrar sigue siendo de administración. Regla única en `permisos-equipos.ts` para la pantalla y la API | **C6**, M1, M2 |
| 2.2 | El botón flotante deja de ofrecer «Evento o actividad» a quien no puede crearla. Lo decide el servidor con la misma condición que la API (administración o quien lidera un equipo), no una lista de roles | **C7** |
| 2.3 | `/terminos` y `/privacidad` en `publicPaths`. **`/onboarding` no**: es para quien ya entró y la propia página exige sesión; la versión anterior del plan la incluía por error | **C8**, M6 |
| 2.4 | La barra inferior del teléfono se elige por rol —Mapa y Agenda primero para quien opera— en vez de tomar los primeros cuatro | **C9** |
| 2.5 | Un único mapa de capacidades (`packages/ui/capacidades.ts`) del que salgan el menú **y** la guarda de cada pantalla (`requirePageAccess`), con prueba de arquitectura que falla si divergen (`tests/unit/capacidades.test.ts`) | M1, M9, M20 |
| 2.6 | `/admin-usuarios` con paginación y búsqueda en servidor | **C11** |
| 2.7 | `capturist` pasa a llamarse **«Capturista»** (solo `roles.name`, migración `0020`). **`territorial_coordinator` conserva «Líder»**, apartándose de la versión anterior del plan («Coordinador de Brigadas»): el cruce de M3 era que el capturista se llamaba «Coordinador Territorial», y «Líder» es como toda la interfaz nombra ya a quien lleva una brigada («Solo el líder de la brigada…», «Líder de Brigada»). Cambiarlo es una línea en una migración si se decide otra cosa | **M3** |
| 2.8 | Menú a cuatro secciones de tres o cuatro entradas; fusionar Gestión e Historial de Incidencias | M5, M11 |
| 2.9 | Una sola fuente de números para `/resumen`: la pantalla y `/api/resumen` salen de `resumen-kpis.ts`, con el mismo alcance y los mismos roles | M4, D13 |
| 2.10 | Resolver las dos pantallas huérfanas: se retiran y se redirige. «Mis contactos» pasa a ser el filtro **Asignados a mí** del Directorio; «Mis visitas», la Agenda filtrada por responsable. El filtro de militancia pasa al servidor | **M14**, M19 |
| 2.11 | Borrar `packages/ui/styles.css` y las clases CSS inexistentes | M13, M14 |
| 2.12 | Arreglar la memoización del alcance (una sola firma de llamada) | M7 |
| 2.13 | Unificar la admisión de altas: un solo flujo y un solo resultado, nunca `DELETE` (`admision.ts`). Solo se decide sobre cuentas pendientes, y desde un equipo solo sobre quien pidió entrar a él | A3, A16 |
| 2.14 | El botón «eliminar» del Directorio y del detalle de equipo usa la **misma baja lógica y auditada** que la API. El borrado físico deja de estar en la interfaz; si se necesita, será del MOM (etapa 6) | **D10**, C20 |
| 2.15 | El buscador del Directorio encuentra **por teléfono** usando la huella de la migración 0019, y por **colonia** usando `contact_territory → colonies`, que está en claro; también por número de sección, y sin distinguir acentos. Cuenta y pagina en la base. La API del módulo, igual | **C22**, R24, M18 |

### Etapa 3 — Evento masivo y fotos

| # | Entregable | Cierra |
| :-- | :--- | :--- |
| 3.1 | **Modo evento (kiosco)** en el registro público: `/registro/<enlace>?modo=evento`, desde «Tu enlace» en el Directorio. Se fijan una vez el municipio y la sección del evento; tras guardar, «Registrar a otra persona» en un toque, con los campos limpios, municipio y sección ya puestos y un contador de registros del teléfono. **Prefijados, no bloqueados**, apartándose de la versión anterior («fijados»): quien sea de otro municipio o sección lo cambia en su registro, porque en la etapa 5 la sección decide el municipio del ciudadano. «Registrar a otra persona» también fuera del modo evento. El límite del registro público pasa de 60 a 300 por hora por IP y enlace, y quien opera con su sesión abierta tiene uno propio de 1 000 | **C18**, R25 |
| 3.2 | **Selector de municipio validado** en el registro público: la lista nativa de los 125 municipios, la misma del alta interna, con el municipio de quien comparte el enlace ya elegido. La API rechaza, con el campo que falló, un municipio fuera del catálogo y una sección que no es de ese municipio; lo mismo en el alta interna. Un 31 de febrero ya no se corre al 3 de marzo. La sección solo se pide en el modo evento: a un ciudadano en la calle no se le pide un dato que casi nadie sabe de memoria | **C18**, D1, D15 |
| 3.3 | **Idempotencia** por `clientRequestId` en alta de ciudadano (interna y pública), de prospecto y **de incidencia**; la actividad ya la tenía (ver R16, corregida). La clave de otra persona devuelve 409. El alta interna deja de ser una acción de servidor: `POST /api/crm/contacts` devuelve el error con su campo en vez de lanzarlo. Ciudadano, datos de campo, nota y encuesta van en una sola transacción, en la interna y en la pública (`lib/idempotencia.ts`, `lib/alta-ciudadano.ts`) | R16, R26, D14 |
| 3.4 | **Cola de reintento en el teléfono** (`lib/cola-de-envios.ts`) para ciudadano, registro público, actividad, prospecto e incidencia (en `/reportes` y en el mapa). Sin señal, tiempo agotado, 5xx, 408, 429 o sesión caducada: el alta queda en el teléfono y se reenvía sola al volver la conexión, al volver a la pestaña y cada 30 s; un aviso en el panel dice cuántas esperan y deja enviarlas o descartarlas. Un rechazo del servidor no se encola: vuelve al formulario con el motivo. Cada envío guarda de quién es: en un teléfono compartido no se envía con la sesión de otra persona. **Escucha Social no entra**: no está en 3.3 y no tiene clave | R16 |
| 3.5 | Prueba de carga en CI (`apps/web/tests/carga-registro-publico.test.ts`, en una base desechable): padrón de 50 000 con teléfono cifrado y huella; una sola, 50 y 100 a la vez **desde la misma IP**; umbrales de 300 ms, p95 1 s y p95 2 s, y un `EXPLAIN` que exige índice | **C2**, R25 |
| 3.6 | **Foto de perfil**: columna `user_profiles.photo_url` (0021), subida desde el teléfono en el perfil propio; sustituye las iniciales en la barra lateral, el encabezado, la ficha y la lista de integrantes del equipo. Solo una foto, subida por la propia persona. Se borra el `ProfileClient.tsx` muerto | **C15**, M21 |
| 3.7 | **Foto en Escucha Social**: `MediaUploader` en el alta (hasta 4 fotos) y galería en la ficha, que antes no las mostraba; los fallos al guardar se dicen; sus dos diálogos pasan a `z-[110]` | **C16**, M22, M23 |
| 3.8 | **Foto de barda por subida, no por URL**; la ficha la muestra como imagen (las URL escritas antes siguen como enlace) | **C17** |
| 3.9 | `/api/uploads` entrega un archivo a quien lo subió; a quien puede ver el registro que lo usa (incidencia o actividad, escucha, barda), con la misma regla de alcance que esas pantallas; y a cualquier sesión si es una foto de perfil. A nadie más: 404. Quién subió cada archivo queda en la tabla `uploaded_files` (0021). Al guardar solo se aceptan archivos subidos por quien guarda: si no, bastaría copiar la URL de una foto ajena a la propia foto de perfil para dejarla a la vista de todos. La ruta estática `/uploads/` se cierra en el middleware. La caché del navegador pasa de «un año sin volver a preguntar» a revalidar con `ETag` (304 sin cuerpo): en un teléfono compartido, la foto ya no sale de la caché para quien no puede verla | A12, A17 |
| 3.10 | Quitar la consulta de 300 colonias que el registro público hacía en cada escaneo y nadie usaba | **R19** |

> **Restricción para 3.6-3.8.** `next.config.ts` envía `Permissions-Policy: camera=()`, que bloquea la cámara dentro de la página en toda la aplicación. Subir fotos con `<input type="file">` sigue funcionando —el teléfono abre su propia aplicación de cámara— y es lo que usa `MediaUploader`. Si alguna función necesitara capturar desde la página (`getUserMedia`), habría que abrir esa cabecera de forma acotada, no quitarla.

### Etapa 4 — Mapa: menú, maquetación y peso

| # | Entregable | Cierra |
| :-- | :--- | :--- |
| 4.1 | **Menú del mapa en tres grupos**: *Qué veo* (incidencias, contactos, secciones o municipios), *Cómo lo veo* (municipio, coloreado territorial o por resultado, mapa base) y *Qué hago* (mi ubicación, buscar, reportar, lista). En escritorio, una columna a la izquierda que se pliega, con el resumen y la leyenda al pie; en el teléfono, una barra plegada con ubicarme, buscar y reportar, y una hoja inferior con el resto | **C14** |
| 4.2 | **Escala de z-index del repo**: los paneles del mapa a 30 en escritorio y a 110 como hoja en el teléfono, sin ningún `5000`; las capas y controles de Leaflet quedan contenidos en el mapa (`isolation`) en vez de competir con la interfaz; y los 17 diálogos que seguían en `z-50`, a `z-[110]` | **C12**, M23 |
| 4.3 | **Maquetación móvil**: el mapa mide lo que queda entre la cabecera y la barra inferior —se mide al montar; antes restaba 64 px fijos— y la página no se desplaza; los paneles son hojas inferiores dentro de la pantalla; el menú se esconde mientras hay un panel abierto; el formulario de incidencia va en una columna | **C13** |
| 4.4 | **Recuadro y ventana en SQL.** Contactos: el recuadro va en la consulta y se agrupan en el servidor con la misma rejilla del mapa; solo viajan completos los que quedan sueltos, con tope de 3 000 y aviso; con la capa apagada, solo las cifras. Incidencias: las abiertas más las resueltas de los últimos 30 días, con tope de 2 000 y aviso; lo demás está en Incidencias → Historial. La cartografía deja de unir y mandar lo que nadie lee, y una acción sobre una incidencia ya no la vuelve a descargar | **C10**, R5, R6, R27, R28 |
| 4.5 | **Nivel de detalle por zoom.** En todo Jalisco no se piden secciones: se dibujan los 125 municipios del catálogo, con rótulo los que caben y un punto los demás; tocar uno lo abre. La rejilla que agrupa contactos e incidencias crece al alejarse | **C10**, R29 |
| 4.6 | **Ciudadanos no ubicables a la vista**: el menú dice cuántos no aparecen y enlaza al filtro **Sin ubicación** del Directorio, que cuenta exactamente a los mismos con una sola regla (`lib/ubicacion-contacto.ts`). La ficha ofrece «Editar» territorio y «Asignar» a quien la API deja hacerlo, no solo a administración | **C21**, M29 |
| 4.7 | **Partir `(shell)/mapa/page.tsx`**: de 3 203 líneas a 712, con las capas, el HTML, el menú, los paneles, la lista y los formularios cada uno en su archivo. Primer render medido con CPU y red emuladas (§4.5), **no en un teléfono real** | R17 |
| 4.8 | **Todo el HTML que va a Leaflet se escapa** (`mapa/html.ts`, con pruebas); los identificadores de los botones del globo solo pasan si son UUID, y las cifras de la API se fuerzan a número | **A18** |
| 4.9 | **Las actividades de la bitácora no son incidencias**: el mapa las enseña pero no las cierra, reabre, reasigna ni borra (409 en la API; el globo lleva a la Agenda), y la Gestión, el Historial, las acciones en bloque y las cifras de incidencias las dejan fuera. «Purgar» pasa a **archivar**, solo incidencias, en una transacción y con una fila de auditoría por incidencia. Cerrar deja fecha y autor; reabrir los quita | **D16**, D17, D18 |
| 4.10 | **Cifras y nombres como en el resto del sistema**: «abiertas» según el catálogo de estados, sin actividades, y cada estado con su nombre | M24 |
| 4.11 | **«Reportar» solo a quien puede**, con la misma condición que la API; «Mi ubicación» y el doble toque ya no abren el alta; «Reportar» usa la última ubicación GPS si tiene menos de dos minutos, y si no, el centro del mapa | M25, M26 |
| 4.12 | **Enlaces, exportación y leyenda**: «Ver sus ciudadanos» abre el Directorio buscando la sección; el CSV del mapa lleva BOM y neutraliza fórmulas, como el de contactos; «Resultado electoral» dice cuándo el municipio no tiene resultados cargados | M27, M28, M30 |

### Etapa 5 — El municipio como llave obligatoria

**Migración `0022_municipio_como_llave.sql`, escrita a mano.**

| # | Entregable | Cierra |
| :-- | :--- | :--- |
| 5.1 | Tabla **`municipalities`**: los 125 del catálogo que ya usa la aplicación, más la fila especial **«General (estatal)»**. Con nombre normalizado único, «TONALA», «Zapopan Jal.» o «Tlaquepaque» dejan de poder entrar como municipios distintos | C19 |
| 5.2 | **`municipality_id` obligatorio** en `user_profiles`, `teams`, `contacts`, `event_reports`, `warehouses`, `activity_catalog_options`, `social_listening` y `rapid_activity_prospects`; y nulable en `electoral_sections` (una sección sin municipio no se inventa). La columna de texto se conserva y se retira en la etapa 8 | A1 (parcial), D5 |
| 5.3 | **Relleno por orden de confianza**: personas, su municipio → el equipo que lidera → el equipo al que pertenece; equipos, el suyo → el de su líder; ciudadanos, **su sección** → quien lo registró (nunca el municipio cifrado); incidencias, el suyo → su sección → quien la creó; catálogo, escucha y prospectos, quien los creó; almacenes, el último tramo de su dirección. Lo que no se resuelve, a General | D5, C19 |
| 5.4 | **La base pone la llave en toda fila nueva**, con las mismas reglas, y la recalcula cuando cambia lo que la decide (el texto, la sección, el líder) si la aplicación no la trae. La sección de un ciudadano manda siempre. Quien sale de General se lleva lo que registró y estaba en General por no tener municipio. Por eso el `NOT NULL` no rompe a la versión anterior durante el despliegue ni a ningún script | D5 |
| 5.5 | La migración **se detiene sin aplicar nada** ante un error de estructura: una sección con un municipio fuera del catálogo, o un ciudadano con sección cartografiada que acabe en otro municipio. Al terminar, `pnpm db:migrate` imprime cuánto quedó en General por tabla | — |
| 5.6 | Índices por llave; compuestos con `status` en `contacts` y `event_reports` | — |
| 5.7 | Pantalla **«Sin municipio confirmado»** (Configuración, solo administración): cuánto hay en General por tabla y asignación en lote, solo de filas en General, con una fila de auditoría por cada una | C19 |
| 5.8 | **Ningún ciudadano sin municipio**: el alta interna y el registro público lo exigen (400 con el campo) y guardan la llave del municipio elegido, no la de quien registra | **C4**, D5, D1 |
| 5.9 | **General a la vista**: el Directorio, la ficha de ciudadano, Control de usuarios, equipos e incidencias muestran el municipio de la llave, y General se marca como tal | — |
| 5.10 | El municipio de cada persona —la marca, dónde abre el mapa— sale de su llave, no de una cadena que se armaba en cada petición | — |
| 5.11 | ESLint vuelve a revisar las rutas `api/public/*` | M31 |

**Qué significa General:** no es una puerta trasera. El MOM lo ve todo. Los demás ven lo marcado
General **solo por la cascada de mando de siempre** —lo registró su gente o se lo asignaron—. El
municipio deja de ampliar la vista, pero no la abre a todos. Hoy quiere decir «sin municipio
confirmado»: no hay forma de marcar algo como estatal a propósito.

**Cierra:** A1 (parcial), C4, C19, D5, D1 (refuerzo), M31.

### Etapa 6 — MOM y administradores municipales

**Migración `0023_administrador_maestro.sql`, escrita a mano.**

| # | Entregable | Cierra |
| :-- | :--- | :--- |
| 6.1 | **Migración `0023`:** marca `is_master_admin` en `user_profiles` con índice único (un solo maestro, también con transacciones simultáneas); regla en la base: el maestro es administración y está en General, y un administrador municipal activo tiene municipio real —solo al cambiar rol, estado o municipio: a los que la 0022 dejó en General no los toca—; los disparadores de la 0022 ya no mueven al maestro de General; `session_version` y `last_login_at`; `warehouses.created_by_user_id`; `audit_logs` sin autor para la consola, con índices | A2 (en la base), A8 |
| 6.2 | **Quién es el maestro.** `pnpm db:migrate` nombra, si falta, a la cuenta de `ADMIN_EMAIL` —el «Administrador Maestro» de `pnpm db:clean`— si ya es administración activa, y lo deja auditado; después informa cuántos administradores siguen sin municipio y qué municipios con gente no tienen administración. `pnpm db:clean` crea al maestro con su marca | — |
| 6.3 | **El embudo.** `isGlobal` se partió en `isAdmin` (qué puede hacer), `isMaster` (ve todo) y `adminMunicipalityId`; se quitó para que el compilador señalara cada uso (43 en 35 archivos) y se revisaron uno por uno. Un administrador municipal ve lo que tiene la llave de su municipio y lo que hizo su gente; uno sin municipio, solo lo suyo. Ciudadanos por subconsulta, con una sola regla para las pantallas y para el módulo de contactos (`ciudadanosDeAdministracion`); incidencias, escucha, prospectos, equipos, catálogo, logística, tableros, archivos, acciones en bloque, perfiles y bitácora, cada uno con la suya. El alta inicial ya no cambia a nadie de municipio | **A1**, A19 |
| 6.4 | **Gobierno de cuentas** (`gobierno-de-cuentas.ts`, una regla para Control de usuarios, el panel y `/api/users/role`): ningún administrador toca a otro; solo el maestro nombra administradores, cambia municipios y elimina cuentas, y solo sin datos; nadie se gobierna a sí mismo desde la aplicación. Un administrador municipal ve y gobierna las cuentas de su municipio, y las da de alta ahí. Se retira `changeUserRole` del módulo, que solo pedía ser administración. Las acciones devuelven el motivo en vez de lanzar | **A2**, A3 |
| 6.5 | **Auditoría:** alta, admisión (también desde el detalle de equipo), rol, categoría, estado, nombre, municipio, contraseña, cierre de sesiones, eliminación, exportación del padrón y cada ficha que abre el maestro. Pantalla **«Auditoría de cambios»** para el maestro; una prueba falla si el código escribe una acción sin nombre en claro | **A5** |
| 6.6 | **Sesiones:** la cookie guarda `session_version`; cambiar rol, estado, contraseña o marca —o el municipio de un administrador— la sube en la base y la sesión anterior deja de valer en su siguiente petición. Quien cambia su propia contraseña conserva su sesión y pierde las demás. La salida dice «cambiaron tu acceso», no «tu cuenta ya no está activa» | **A8**, A6, A7 |
| 6.7 | **Panel «Administración por municipio»** (solo el maestro): administradores de cada municipio con su última entrada, alerta de municipios con gente y sin administración activa, administradores sin municipio, y en un clic asignar o transferir municipio, nombrar administrador, retirar el rol, restablecer contraseña, reactivar, dar de baja y cerrar sesiones | — |
| 6.8 | **Rescate desde la consola:** `pnpm admin:rescatar --email … --maestro [--reemplazar] \| --municipio \| --reactivar \| --contrasena-temporal \| --cerrar-sesiones`, con la confirmación destructiva de siempre y constancia sin autor en la auditoría | — |
| 6.9 | **Logística:** almacenes por municipio (el maestro, todos; administración y dirección, los de su municipio), alta de almacén con municipio y autor, artículos solo en almacenes que se ven, y movimientos que suman o restan existencias de verdad —nunca por debajo de cero— con responsable de la estructura | **A4**, M32, **M33** |
| 6.10 | **Catálogo por municipio:** las opciones «de organización» de un administrador municipal son de su municipio; las del maestro y las que ya existían, estatales. Nombre único dentro de cada municipio | A10 |
| 6.11 | **Cartografía de todo el estado, solo el maestro** (`municipality=all`); el resto pide un municipio | A11 |
| 6.12 | **Exportación del padrón:** tope (50 000 para administración, 2 000 para el resto) con el motivo en claro si se pasa, y fila de auditoría con cuántos y con qué búsqueda | A13 |
| 6.13 | **Pantallas del maestro:** «Administración por municipio», «Sin municipio confirmado», «Auditoría de cambios» y «Ajustes». `capacidades.ts` las reserva a `master_admin` y la prueba de arquitectura lo exige; el menú del maestro las añade | — |
| 6.14 | **Aviso en todas las pantallas** para un administrador que sigue sin municipio: solo ve lo suyo hasta que el maestro se lo asigna | — |
| 6.15 | **Lo que encontró el simulacro de evento** (ver §9): el mismo teléfono a la vez ya no crea dos ciudadanos —candado por huella dentro de la transacción; el doble toque de la misma solicitud sigue siendo el mismo registro—; modificar una incidencia o una actividad es de quien la levantó, la tiene asignada, su equipo o quien manda sobre ellos, ya no de los compañeros de equipo, con una sola regla para el mapa, la Gestión y la bitácora (`commandUserIds`, `incidenciasQuePuedeTrabajar`), y lo que alguien no ve es 404; sumarse por el QR con varios toques ya no da 500, y la cuenta y su brigada se guardan juntas; las tarjetas de la Gestión dicen lo que cuentan (abiertas, por aceptar, en proceso, sin sección) y su aviso cuenta solo lo que esa persona puede aceptar; un doble toque del QR ya no responde «ya registrado»; la API del Directorio desempata por id; la ficha dice por qué no se pudo asignar. Y la regla nueva del dueño: solo el capturista ve lo de sus compañeros —los líderes de una coordinación ya no se ven entre sí y el brigadista ve lo suyo y lo asignado—. Y el territorio (decisión del dueño): asignar ya no lo exige —agendar visita sí— y las altas lo crean cuando traen una colonia del catálogo de su municipio (`territorio-del-alta.ts`, con el caso de uso de la ficha) | D19, D20, A20, R30, R31, M37, M38, M39 |
| 6.16 | **Revisión de fondo antes del commit** (ver §9): los datos personales del ciudadano se ven en su ficha y los corrige quien puede registrar, sobre quien ya ve, con control de versión y auditoría sin datos cifrados en claro (`editar-ciudadano.ts`); el alta del panel avisa de un teléfono repetido y deja seguir si se confirma (`telefono-repetido.ts`), también desde la cola del teléfono; el año de nacimiento que no se capturó ya no se da por cierto (0024); domicilio, incidencias (al levantarlas y al editarlas: `campos-incidencia.ts`) y Escucha social validan lo que se escribe; en Escucha social y al cerrar visitas o asignar, trabajar es de quien manda, no de quien ve; las acciones en bloque sin uso se retiraron; las cuentas validan el correo; las pruebas corren en hilos y ya no se cortan al azar | D4, D21, D22, D23, D24, A21, R32, M40, M41, M42 |
| 6.17 | **Domicilios y ubicación** (ver §9): el pin del mapa es una gota cuya punta es el punto que se guarda, exacto; el mapa se vuelve a medir cuando cambia su contenedor; cada punto nuevo sustituye sección, colonia y calle del anterior salvo lo escrito a mano; la ficha corrige colonia, sección, calle y punto (y lo audita); una sugerencia de dirección no mueve una incidencia marcada; calle y número obligatorios en el alta del panel, colonia en el QR; el domicilio de las cuentas en el QR de brigada y el auto-registro (0025), visible para la propia persona y quien la gobierna; se retiró `/onboarding` | D25, D26, D27, M43 |

**Qué ve cada quien.** El municipio acota a **administración**; la cascada de mando de los demás no
cambia (§7: lo propio siempre se ve, y una brigada que registra a alguien del municipio vecino lo sigue
viendo). Un administrador municipal ve lo de su municipio **y lo que hizo su gente** —las personas con
su llave— aunque sea de otro municipio: lo mismo que ya ve el líder de esa brigada.

**Quién puede qué:**

| acción | MOM | Admin municipal | resto |
| :--- | :-: | :-: | :-: |
| Ver todo de todos los municipios | Sí | No | No |
| Ver todo su municipio y lo de su gente | Sí | Sí | No (cascada) |
| Crear, editar, mover o borrar **administradores** | Sí | No | No |
| Cambiar el municipio de una persona | Sí | No | No |
| Eliminar una cuenta | Sí (solo sin datos) | No | No |
| Alta, aprobación, baja, rol y contraseña de su gente | Sí | Sí (su municipio, por debajo de admin) | líder, admisiones de su equipo |
| Crear equipos | Sí | Sí (en su municipio) | dirección y líder (etapa 2) |
| Ajustes, «Sin municipio», auditoría, panel por municipio | Sí | No | No |
| Su propia cuenta de maestro | consola del servidor | — | — |

**Recuperación de acceso**, en tres niveles: el panel del maestro (6.7); `session_version`, que hace
que retirar a alguien o restablecerle la contraseña cierre sus sesiones (6.6); y el rescate desde la
consola si se pierde el acceso al propio maestro (6.8). **Retirar o borrar a un administrador nunca
borra lo que registró:** eliminar solo se puede sin datos.

**Cierra:** A1, A2, A3, A4, A5, A6 (refuerzo), A7 (refuerzo), A8, A10, A11, A13, A19, A20, A21, D4, D19, D20, D21, D22, D23, D24, D25, D26, D27, R30, R31, R32, M32, M33, M37, M38, M39, M40, M41, M42, M43.

### Etapa 7 — Retirada

Las colaboraciones entre equipos se sacaron del plan el 2026-09-26, a pedido del dueño: se harán más
adelante, con su propio diseño. No había nada construido (ni migración ni código). La numeración de la
etapa 8 se conserva para no romper las referencias del registro.

### Etapa 8 — Rendimiento de fondo, pruebas y retirada

| # | Entregable | Cierra |
| :-- | :--- | :--- |
| 8.1 | **Sustituir la lista de identificadores por condición SQL** en `visibleContactIds` —posible solo con `municipality_id` ya en su sitio— | **R3** |
| 8.2 | Agregados en SQL y en paralelo en los tableros | R4, R7, R8 |
| 8.3 | Limitador de peticiones compartido si hay más de una instancia | R13 |
| 8.4 | **Pruebas de aislamiento**: dos municipios, varios admins en cada uno, una aserción por superficie de que ninguno ve nada del otro | A1 |
| 8.5 | **Pruebas de escalada**: un admin que intenta promoverse a MOM, degradar a otro admin, cambiarse de municipio o tocar a un admin ajeno. Las cuatro fallan | A2 |
| 8.7 | **Pruebas de recuperación**: municipio sin administración detectado; `session_version` mata las sesiones | A8 |
| 8.8 | **Escenario E2E por rol** ampliando `scripts/audit-e2e-field-scenarios.ts`, incluido el intento de cruzar la frontera de municipio | — |
| 8.9 | **Regenerar las instantáneas de drizzle-kit** para que `generate` vuelva a servir | D6, D8 |
| 8.10 | Retirar la columna `municipality` de texto y `accessType` | M10 |
| 8.11 | Quitar el doble descifrado | D3 |
| 8.13 | Restricciones sobre el líder de equipo: activo y del mismo municipio | D7 |
| 8.14 | Quitar la condición repetida en `puedeAsignar` | M8 |
| 8.15 | **Ensayo de migración sobre copia de producción**, con conteo por tabla antes y después. Hecho en local con las imágenes de Docker de producción y una base en el estado de hoy (ver §9, «Ensayo de despliegue»); con los datos reales lo corre `scripts/ops/ensayo-despliegue.sh` en el servidor, sin tocar producción. De ahí: contenedores en la hora de Jalisco, «hoy» del Resumen en el día de Jalisco y el permiso del alta antes que sus datos | M44, M45 |
| 8.16 | **Outbox:** índice parcial para el reclamo (`WHERE status = 'pending'`) y purga periódica de eventos procesados y sus acuses pasados N días. La purga no toca `dead_letter`: son los que alguien tiene que revisar | R20 |
| 8.17 | Retirar el módulo de logística que quedó sin uso, con su lectura sin alcance | M34 |
| 8.18 | La cartografía de secciones se completa solo en el propio municipio (o por el maestro) | M35 |
| 8.19 | Que un doble envío resuelto por la clave no quede en el registro del servidor como error | M36 |

---

## §7 · Lo que se conserva (y no hay que «arreglar»)

- **La cascada de mando sigue mandando dentro de cada municipio.** El municipio es una frontera
  *adicional*, no un sustituto. Todo lo decidido y probado sobre quién ve a quién sigue vigente
  (`apps/web/tests/alcance-mando.test.ts`, `visibilidad-contactos.test.ts`).
- **Lo propio siempre se ve:** lo que alguien registró no le desaparece aunque su equipo cambie de
  territorio.
- **El brigadista no da de alta ciudadanos, no levanta incidencias y no registra actividades.**
  Comprobado con su cuenta (§5): sí consulta el directorio, corrige domicilios, agenda y cierra
  visitas, levanta reportes de escucha social, da de alta prospectos y sube fotos. Es una decisión
  de producto documentada, y la pantalla de Agenda la explica bien: *«Las actividades las registra
  quien lidera tu equipo…»*. Lo único que se corrige es el botón flotante (**C7**).
- **El cifrado en reposo de los datos del ciudadano.** La llave de municipio y el índice ciego del
  teléfono se añaden **al lado**; no se descifra nada que hoy esté cifrado.
- **El outbox transaccional y su worker**, que están bien montados y corriendo en producción.
- **La lista blanca de tipos de archivo del `/api/upload`**, que ya cierra el hueco de subir un
  `.html` o un `.svg` al mismo origen.

---

## §8 · Lo que no se verificó

Para que no haya falsa precisión, esto es lo que **no** se comprobó y por qué:

1. **Comportamiento en producción real** (VPS, Caddy, contenedores). Todo se midió en desarrollo
   local. Los tamaños de respuesta y los conteos no dependen del entorno; **los tiempos sí** —en
   producción serán menores—, pero la forma de la curva de **C2** (lineal con la concurrencia) es
   estructural y no cambia.
2. **El comportamiento con padrones grandes** se **proyectó** a partir del costo medido por fila
   (22 µs), no se ejecutó con 50 000 contactos.
3. **La restauración de una copia de seguridad** se ensayó en local con los scripts reales dentro de
   `postgres:16-alpine`, contra bases desechables (ver §9, 1.11). **No se ensayó en el VPS**, ni el
   procedimiento completo con `docker compose` sobre la pila levantada: se probaron las piezas
   (respaldo, restauración, cambio de nombres en una transacción), no la secuencia de comandos del
   README de principio a fin.
4. **Las pantallas de Logística, Auditoría de Eventos, Estructura Electoral e Inbox** se
   comprobaron solo a nivel de que responden 200 y en cuánto tiempo; no se recorrió su
   funcionalidad campo por campo.
5. **El flujo de alta por QR de brigadista** (`/unirme/<slug>`) se comprobó que abre sin sesión;
   no se completó un alta de extremo a extremo.
6. **Navegadores distintos de Chromium** y **dispositivos reales** no se probaron: la emulación a
   375 px no sustituye a un teléfono de gama baja con datos móviles.

---

## §9 · Estado de la implementación

Etapa 1 implementada; la réplica de respaldos fuera del VPS (1.11) queda pospuesta (ver
«Pendientes operativos pospuestos»). Etapas 2, 3, 4, 5 y 6 implementadas (ver «Etapa 2», «Etapa 3»,
«Etapa 4», «Etapa 5» y «Etapa 6» abajo), más lo que corrigió el simulacro de evento (ver «Simulacro de
evento y pantalla de inicio») y la revisión de fondo antes del commit (ver «Revisión de fondo antes del
commit»). La etapa 7 (colaboraciones) se retiró del plan.
**Nada commiteado todavía.**

**Línea base fijada antes de tocar nada:** `typecheck` (correcto) · `tsc -p apps/web` (correcto) · `lint` 0 errores
(17 avisos preexistentes) (correcto) · 205 pruebas (correcto).

| entregable | estado | cómo se comprobó |
| :--- | :--- | :--- |
| **1.3** fronteras de error, carga y 404 | **terminado y revisado** | Apagando la base (fallo real, sin tocar código) y rompiendo una pantalla concreta. Ciclo de reintento completo. 404 del panel con menú |
| **1.5** validación devuelve 422, no 500 | **terminado** | Antes 500, ahora 422; 403 sigue 403. 9 pruebas |
| **1.6** una fila ilegible no tumba la consulta | **terminado** | Ficha cifrada con otra llave: cinco pantallas abren; una sola línea en el registro para cinco peticiones. 9 pruebas, 4 de ellas fallan con el código viejo |
| **1.7** pool: manejador de error y límites | **terminado** | Con el pool real: límites aplicados en la conexión, sentencia larga cortada por el servidor, proceso vivo tras reiniciar la base. 4 pruebas de configuración |
| **1.9** caducidad de sesión explícita | **terminado** | `Max-Age = 604740` en la cookie (7 días − 60 s). 6 pruebas |
| **1.12** login uniforme | **descartado** | M12 era un falso positivo: comprobado en vivo |
| **1.1** migración 0019 | **terminado** | Sobre dos copias de la base antes de la real: idempotente (2ª corrida no cambia nada); las 3 384 huellas recalculadas con una implementación independiente, todas correctas; con un correo repetido la migración termina bien, avisa, y crea el índice único al corregirlo. Instalación desde cero: `applies migrations from an empty database` (correcto) |
| **1.2** alta pública por huella | **terminado** | 7 comprobaciones funcionales, incluida la red de seguridad para filas sin huella. Carga: 50 a la vez p95 **820 ms** (antes p50 2 542 ms). A 50 000 filas, `Index Scan` en 0,068 ms frente al `Seq Scan` de antes |
| **1.8** todas las guardas releen la cuenta | **terminado** | Con cuentas dadas de baja y su cookie abierta, cinco operaciones. Antes: quitar integrante y renombrar equipo, **200**; cambiar contraseña y promover pasaban la guarda (400 y 404, más adelante); crear equipo, 403. Ahora las cinco dan **401**. Seguido salto a salto: `/crm/contacts`, `/mapa`, `/perfil` y `/escucha-social` terminan en `/login?motivo=cuenta-inactiva`, sin bucle. Una cuenta activa no se ve afectada, y `/api/auth/salir` no cierra la sesión de una cuenta activa |
| **1.4** esquema y salud | **terminado** | Contrato público de `/api/health` compatible (`status`, `degradado`, `timestamp`; el detalle, solo para administración). Quitando a propósito el registro de la última migración: 503 y aviso `[arranque] ESQUEMA DESACTUALIZADO` al arrancar; la fila se restauró idéntica (id 21, `created_at` 1789600000000). 6 pruebas, entre ellas una que falla si el journal y los `.sql` no cuadran. **Sin probar:** el paso de salud del flujo `deploy` dentro del VPS (el YAML se validó; el `docker compose exec` no se ejecutó en un servidor) |
| **1.10** registro estructurado y correlación | **terminado** | 48 `console.error` de 36 rutas pasan a `registrarError`/`registrar`, una línea JSON por evento. Un mismo identificador une la cabecera `x-request-id` de la respuesta, la línea del registro, `audit_logs.correlation_id` y el `metadata.correlation_id` del outbox (comprobado con una petición real contra el servidor de desarrollo). **D12:** con un alta que choca con una clave foránea, el mensaje y la traza de Drizzle traían el nombre del ciudadano; la línea del registro ahora conserva la consulta y el código de Postgres y marca `params: [omitidos]`. Para los errores que imprime Next por su cuenta, `instrumentation.ts` envuelve `console.error`/`warn` al arrancar. Comprobado con `next start`, provocando a propósito un error sin atrapar en `/perfil/<texto>` (compilación de prueba, con el arreglo de 1.14 quitado solo para eso): sin la envoltura, el texto salía en `params:` y en la causa; con ella, `params: [omitidos]` e `invalid input syntax for type uuid: [omitido]`, y se conservan la consulta, `digest`, `code` y `routine`. 12 pruebas. Las 7 que describen el defecto fallan si se quita cada parte de la corrección |
| **1.13** esquema frente a migraciones en CI | **terminado** | Base vacía + solo migraciones, comparada columna a columna con `schema.ts` en los dos sentidos. Probada con una columna de más en cada lado: falla en los dos casos |
| **1.11** respaldo y restauración | **terminado en lo local; la copia fuera del VPS depende de una decisión** | **Respaldo** (en `postgres:16-alpine`, contra la base local): con el host inalcanzable dice `FALLÓ`, no deja archivo y conserva el respaldo viejo; con la base bien, 7,4 MB con la línea de cierre de `pg_dump`, y poda el viejo. **Restauración**, siempre en bases desechables: rechaza un nombre no válido, un volcado vacío y uno cortado a la mitad (que `gzip -t` da por bueno) **antes de crear nada**; se niega a restaurar sobre una base con tablas, y la deja intacta; una falla a media restauración lo dice y pide borrar la base a medias; la restauración buena reproduce **las 38 tablas con conteos idénticos al origen** (3 385 ciudadanos, 177 usuarios, 20 migraciones) y la columna `phone` cifrada idéntica byte a byte (mismo md5). El cambio de nombres en una transacción (`psql -1`) se deshace entero si el segundo falla, y falla limpio si hay sesiones abiertas. `.gitattributes` fija LF en los `.sh` (M16 reproducido con CRLF). **Sin hacer:** la réplica fuera del servidor, que necesita un destino y credenciales que decide el dueño (ver abajo) |
| **1.14** ids de la URL y errores al cliente | **terminado** | `scripts/local/ids-mal-formados.mjs` recorre las 16 rutas con `[id]` y cada método (23 llamadas). Como administración: de **9 respuestas 500 y 1 con SQL** a **0 y 0**, en desarrollo y otra vez contra `next start`. Como líder: 0 y 0, y los 403 siguen en su sitio. Pantallas, con `next start`: `/perfil/no-es-uuid` pasa de 500 a 404, y `/admin-equipos/no-es-uuid` de 500 a la misma redirección que un equipo inexistente. Regresión con ids válidos (`regresion-ids-validos.mts`, 16 comprobaciones): ficha, visitas, baja auditada, equipos, escucha e incidencias responden como antes. Una baja con un UUID inexistente ya da 404 y no deja fila en `audit_logs`. La base quedó con los mismos conteos. 9 pruebas (7 de `safeErrorMessage`, 2 de `esUuid`); las 5 que describen el defecto fallan con el `safeErrorMessage` viejo. **Sin ver en el navegador:** la pantalla «Contacto no encontrado» de M17 (el navegador integrado no tenía sesión y no se inició una) |

### Correcciones que salieron al revisar lo ya hecho

1. **Las páginas públicas caían en la frontera del panel.** Un ciudadano registrándose por QR que se
   topara con un fallo veía *«No es tu teléfono ni tu cuenta… avisa a quien te dio el acceso»* —no
   tiene cuenta— e «Ir al inicio» lo mandaba a Conóceme, fuera del formulario. Ahora
   `/registro/[slug]` y `/unirme/[slug]` tienen frontera propia, con texto para un ciudadano y solo
   «Reintentar». Comprobado: el reintento lo devuelve al formulario.
2. **Un texto prometía algo que no se puede garantizar** («tus datos no se han enviado todavía»).
   Retirado.
3. **El comentario del esqueleto de carga atribuía mal la espera del mapa**, que trae sus datos desde
   el navegador y no la cubre `loading.tsx`. Corregido; el texto del mapa pasa a «Abriendo el mapa…».
4. **El contador de fallos de descifrado era uno por copia del módulo**: la misma fila salía tres
   veces en el registro, cada una con «fallosAcumulados: 1». Pasó a `globalThis`, como el pool.

5. **La migración proponía `ON DELETE CASCADE` en `contact_notes`.** Al verificarlo, esas claves son
   lo que impide que el borrado del Directorio se lleve el historial: se retiró de la migración y la
   corrección real (baja lógica) pasa a la etapa 2. Ver D10 y C20.
6. **Un mensaje de `db:migrate` prometía algo falso** («corrige las cuentas y vuelve a migrar»): una
   migración aplicada no se repite, así que el índice único nunca habría llegado. Ahora
   `db:migrate` lo crea en cuanto no quedan repetidos. Comprobado.

### Decisiones que se apartan del plan original, y por qué

- **1.6:** se devuelve el valor cifrado sin tocar, no un marcador. Ver la fila 1.6 del §6.
- **1.7:** sin `query_timeout` y sin reintento automático de consultas. Ver la fila 1.7 del §6.
- **1.9:** la sesión pasa de 14 días implícitos a **7 días**, ajustable con `SESSION_TTL_HOURS`. Las
  sesiones abiertas antes del cambio conservan su caducidad; nadie queda fuera al desplegar.
- **1.1:** sin `ON DELETE CASCADE` (ver arriba), y el índice del teléfono **no es único**: el alta
  interna nunca deduplicó y hay un número repetido real en los datos.

### Etapa 2

Todos los entregables hechos. Scripts en `scripts/local/` (fuera de git); los datos de prueba `zz-`
se borraron y la base terminó cada prueba con los mismos conteos con que empezó.

| entregable | cómo se comprobó |
| :--- | :--- |
| **2.14** baja lógica en todas partes | Un ciudadano con visita cerrada (con `visit_results`), visita agendada y nota —el caso con que el borrado físico fallaba—: queda inactivo, conserva nota, visitas y resultados, la agendada se cierra como «rejected», una fila en `audit_logs` y desaparece del Directorio. Botones y textos dicen «dar de baja». No queda ningún `DELETE` de ciudadanos ni de usuarios en la aplicación |
| **2.13** admisión | 12 comprobaciones sobre `admision.ts`: aceptar solo pendientes (no reactiva bajas), rechazar deja la cuenta `rejected` y fuera de equipos, una cuenta con datos a su nombre se rechaza sin error (antes, 500 por clave foránea), y aceptar y rechazar a la vez: gana exactamente una. Las acciones devuelven el error en vez de lanzarlo (en producción Next oculta el mensaje de lo que se lanza) |
| **2.3** avisos legales | Sin sesión: `/terminos` y `/privacidad` 200; `/onboarding` y el panel siguen pidiendo sesión |
| **2.2** botón de crear | Con las cinco cuentas del escenario, el botón aparece exactamente a quien la Agenda deja crear (Administración, Dirección, Líder) |
| **2.4** barra del teléfono | En el HTML de cada rol: Mapa y Agenda primero; «Más» se marca cuando la pantalla abierta no está en la barra. 13 pruebas |
| **2.1** equipos por mando | 20 comprobaciones contra la API con las cuentas del escenario: el líder da de alta su brigada (antes 403) y una al frente de un integrante, le cambia el líder a esa pero no a la suya, no pone al frente a alguien fuera de su mando, un equipo que no ve responde 404 y uno donde solo es integrante 403 con motivo; municipio validado y guardado con su nombre oficial; capturista sin gestión; borrar, solo administración. `verificar-menus-por-rol.mjs`: ninguna acción que la pantalla ofrece la rechaza la API |
| **2.15** buscador | Directorio y API del módulo encuentran por nombre (parcial, sin acentos), teléfono completo escrito de cualquier forma (`33 1234 5678`, `+52 …`), colonia con o sin acentos y número de sección; un «_» ya no coincide con todo. El alcance se respeta al buscar. Cada vista cuenta y pagina en la base (25 filas) en vez de descifrar el padrón entero. 5 pruebas |
| **2.6** Control de Usuarios | Con 177 cuentas: de 2 036 KB y 5,3 s a ~400 KB y ~0,45 s por página (medido en desarrollo); búsqueda por nombre o correo y filtros de rol y estado, contados en la base. Las rechazadas se ven como «Rechazada» |
| **2.7** nombre del rol | Migración `0020` aplicada en local (21 registradas; `/api/health` en «ok»). La clasificación de la Agenda ya no escribe los nombres a mano: los lee de la base |
| **2.12** memoización | `resolveUserNetworkScope` acepta un solo argumento: ya no se puede llamar de dos formas |
| **2.10 y 2.11** pantallas huérfanas | `/equipo/mis-contactos` lleva al Directorio con «Asignados a mí» y `/equipo/mis-visitas` a la Agenda filtrada por la persona (redirección no permanente: el destino lleva su id y los teléfonos de brigada se comparten). Por el `loading.tsx` de `/equipo`, Next las hace dentro del HTML (200 con redirección) y no con un 307: comprobado que el destino es el correcto. Filtros del Directorio medidos: el brigadista, 15 asignados de 223; «PAN confirmado» cuenta ahora en todo el padrón (535 para administración). Borrados `packages/ui/styles.css` y `EmptyState` |
| **2.9** una fuente para /resumen | Pantalla y API dan exactamente los mismos seis números para Administración, Dirección y Líder; capturista, denegado en las dos |
| **2.5 y 2.8** capacidades y menú | `tests/unit/capacidades.test.ts` recorre los archivos de `app/(shell)`: 11 pruebas, y cada una de cinco roturas provocadas a propósito la hace fallar (una lista propia, una pantalla sin guarda, la guarda de otra pantalla, el inicio de un rol que no puede abrir, una entrada del menú con otros roles). Menú en cuatro secciones: 15 entradas para administración (antes 17), 5 para el brigadista. `verificar-menus-por-rol.mjs`: todas las pantallas del menú abren para los cinco roles |

**Sin comprobar en esta etapa:** nada se vio pintado en un navegador con sesión (mismo motivo que en la
etapa 1); el caso de un brigadista que lidera un equipo se probó por la regla, no con su cuenta (su
contraseña no es la del escenario y no se tocó).

### Etapa 3

Todos los entregables hechos. Migración `0021` aplicada en local (22 registradas); corrida a mano una
segunda vez, sin efecto. Scripts en `scripts/local/` (`archivos-antes.mjs`, `etapa3-http.mts`): lo
que crearon se borró —filas, eventos de outbox, auditoría y archivos en disco— y la base y los
contadores de la proyección quedaron exactamente como estaban.

Las pruebas de integración nuevas (`altas-de-campo.test.ts`, `carga-registro-publico.test.ts`) no
tocan la base de desarrollo: cada una crea su propia base desechable y la borra al terminar
(`apps/web/tests/base-desechable.ts`), porque las altas procesan el outbox y mueven contadores que no
se podrían dejar como estaban.

| entregable | cómo se comprobó |
| :--- | :--- |
| **3.9** archivos | Antes, con `archivos-antes.mjs`: un líder de otra estructura bajaba la foto que subió un líder de Tonalá (200), y también por `/uploads/<nombre>` (200). Ahora, contra el servidor de desarrollo **y contra `next start`**: el ajeno, 404; la ruta estática, 404 con y sin sesión; quien la subió, 200 con `ETag` y 304 al revalidar; ya en una incidencia, la dirección de Tonalá y administración 200 y el líder de Chapalita 404; igual con escucha y barda; adjuntar la foto de otra persona, 400. 5 pruebas de integración: abrir la guarda hace fallar 4 |
| **3.3** idempotencia | Ciudadano interno y público, prospecto e incidencia: la misma clave dos veces es un solo registro (201 y luego 200 con el mismo id); la de otra persona, 409; cinco envíos simultáneos con la misma clave, uno. Nota y encuesta, una vez. Por HTTP y en 8 pruebas de integración: quitar la clave del alta interna hace fallar 3, y en la pública, buscar el teléfono antes que la clave hace fallar la del reenvío |
| **3.2** municipio y sección | La página pública trae la lista de 125 municipios. Un municipio fuera del catálogo, una sección de otro municipio y un 31 de febrero: 400 con el campo, en el alta interna y en la pública, sin crear nada |
| **3.1** modo evento | En el navegador integrado, a 375 px (la página es pública, no hace falta sesión): configuración del evento con el municipio del líder ya elegido, formulario con municipio y sección puestos, «Registrar a otra persona» con los campos limpios y el contador. Con la red cortada a propósito en la página: «Registro guardado… se enviará solo» y nada en la base; al volver la red, «Se envió el registro…» y **un** ciudadano en la base, con origen «evento», su sección y su nota. Por HTTP, 70 registros seguidos desde la misma IP y el mismo enlace: ninguno 429 |
| **3.4** cola | 13 pruebas unitarias: qué se encola y qué no; un «200» que no viene de la API (la página de acceso de una WiFi) no cuenta como enviado; el reenvío lleva la misma clave; un rechazo queda a la vista con su motivo; sin señal se detiene en el primero; en un teléfono compartido no se envía lo de otra persona. El flujo completo, en el navegador (fila anterior) |
| **3.5** carga | En CI. Medido: una sola 10 ms; 50 a la vez p95 137 ms; 100 a la vez p95 206 ms (dentro de la corrida completa de integración, 147 y 223 ms). Comprobado que falla: con el escaneo de antes, 446 ms, p95 9,2 s y errores 500; con el límite de 60 por hora, 429 |
| **3.6** foto de perfil | Por HTTP: un video o la foto de otra persona, 400; la propia, 200, y desde entonces cualquier sesión la ve; el HTML de `/perfil` la trae en la barra lateral y en la ficha; quitarla, 200 |
| **3.7** Escucha Social | Con su foto, 200 y la foto guardada; con una ajena, 400; su líder la ve, otro líder no |
| **3.8** barda | Subida por un capturista: la ve su líder y no otro; una ajena, 400 con el campo |
| **3.10** colonias | La página pública ya no las consulta; con eso se va el aviso de lint de `coloniesList` (16 avisos, uno menos que la línea base) |

**Comprobaciones completas al cerrar la etapa:** `pnpm validate:unit` (correcto) —tipos, lint con 0 errores
y 16 avisos, fronteras de módulos, 319 pruebas en 37 archivos— · `pnpm test:integration` (correcto) (129
pruebas en 18 archivos, con la de carga) · `pnpm web:build` (correcto) · las 38 comprobaciones por HTTP
dieron lo mismo contra el servidor de desarrollo que contra `next start`, sin errores en su registro.

**Sin comprobar en esta etapa:** las pantallas con sesión —alta interna, perfil, Escucha Social, el
aviso de la cola en el panel— no se vieron pintadas en el navegador, por el mismo motivo que en las
etapas anteriores: el navegador integrado no inicia sesión en nombre de nadie. Su comportamiento se
comprobó por la API y en el HTML que devuelve el servidor. El corte de señal se simuló en la página;
no se probó en un teléfono real sin cobertura. Si en producción la ruta estática `/uploads/` servía
los archivos subidos después de compilar (A17) no se comprobó: se cerró igual.

**Decisiones de esta etapa:** municipio y sección del evento prefijados y no bloqueados (3.1); la
sección solo se pide en el modo evento (3.2); Escucha Social fuera de la cola (3.4); los nuevos
límites del registro público (R25).

### Etapa 4

Todos los entregables hechos, más los que salieron al hacerla (4.8 a 4.12). **Sin migración**: no hizo
falta tocar el esquema. Scripts en `scripts/local/` (`capturas.mts`, `mapa-contactos-comparar.mts`,
`zoom-bajo.mjs`, `sin-ubicacion.mts`, `archivar-y-actividades.mjs`, `medir-mapa.mts`). Esta vez sí se
vio todo pintado con sesión: Chrome sin ventana con la sesión obtenida por la API, como
`scripts/test-ui-contrast.ts`, sin escribir contraseñas en un navegador.

| entregable | cómo se comprobó |
| :--- | :--- |
| **4.4** contactos | `mapa-contactos-comparar.mts`, contra la ruta de antes, para administración, dirección y líder: el mismo conjunto de contactos, ni uno de más ni de menos; a zoom 12, los grupos más los sueltos suman lo mismo; mismo total del alcance y mismos no ubicables; pasado el tope, 3 000 de 3 075 y avisado. En todo el estado, de zoom 6 a 11, grupos más sueltos suman los 3 075 ubicables (`zoom-bajo.mjs`) |
| **4.9** actividades y archivo | Con administración, sobre una actividad: PATCH y DELETE, 409 `es_actividad`, y reabrirla en bloque no cambia nada (0); la actividad quedó igual. Archivar las resueltas de Tonalá: exactamente las 47 incidencias, ninguna de las 30 actividades resueltas, y 47 filas de auditoría. Se devolvieron a su estado con su `updated_at` idéntico al microsegundo (comparado contra una instantánea) y se quitó la auditoría de la prueba. Desde el formulario del mapa, como líder, una incidencia `zz-` quedó con sección, clave de envío y autor; cerrarla desde el globo dejó `closed_at` y `closed_by_user_id`, y reabrirla los quitó. Se borró con sus 3 eventos de outbox |
| **4.1, 4.3 y 4.11** menú y maquetación | Capturas a 375 px con líder, brigadista y administración, y a 1024×640 y 1280×800 con administración. Sin desplazamiento de página; el mapa termina 15 px sobre la barra inferior (antes quedaba debajo); la barra plegada deja sitio al botón flotante; en escritorio, menú, leyenda y resumen en una columna que no se tapan ni a 640 px de alto; el formulario de incidencia en una columna a 375 px (con dos, las etiquetas se montaban). El brigadista no ve «Reportar» en ningún sitio y su «Lista» ocupa la fila entera; el líder abre el alta desde el panel de una sección con municipio y sección ya detectados |
| **4.2** z-index | Ya no queda en `apps/web` ningún `fixed inset-0` en `z-50`: 25 diálogos en `z-[110]`. Las fotos a pantalla completa siguen por encima de todo (99999). La hoja del mapa, medida en 110, sobre el botón flotante |
| **4.5** todo Jalisco | Sin ninguna petición de secciones (antes 3,3 MB). Capturas a 375 y 1280 px: los municipios grandes con rótulo, el resto como punto, y las incidencias en grupos legibles |
| **4.6** no ubicables | `sin-ubicacion.mts` con las cinco cuentas del escenario: la cifra del mapa y la del filtro del Directorio coinciden (216, 63, 37, 22 y 22), y el total también. La ficha ofrece «Editar» territorio a los cinco roles y «Asignar» a administración, dirección y líder, lo mismo que deja la API |
| **4.7** partición y primer render | 712 líneas en `page.tsx`. Medición en §4.5 |
| **4.8** escape | 13 pruebas de `mapa/html.ts`; quitar el escape de `<` hace fallar 5. 12 pruebas de `lib/mapa-rejilla.ts`; volver al lado fijo de la rejilla hace fallar 2 |

**Lo que la propia verificación obligó a corregir antes de cerrar**, visto en las capturas: en el
teléfono el menú arrancaba desplegado y tapaba medio mapa; la página se desplazaba 64 px por el hueco
que AppShell deja al botón flotante, que el mapa ahora descuenta; en todo Jalisco los 125 rótulos se
encimaban; en escritorio la leyenda y el resumen podían quedar bajo el menú; las cifras de contactos
se pedían dos veces al cargar; y el formulario de incidencia, a dos columnas en 375 px, montaba sus
etiquetas.

**Comprobaciones completas al cerrar la etapa:** `pnpm validate` (correcto) —tipos de las dos
configuraciones, lint con 0 errores y los mismos 16 avisos de antes, fronteras de módulos, **473
pruebas en 57 archivos**, unitarias y de integración— · `pnpm web:build` (correcto).

**Decisiones que se apartan del plan:**

- **4.5:** en todo Jalisco no se dibujan secciones simplificadas sino los 125 municipios, desde el
  catálogo y sin pedir nada al servidor. A esa escala una sección ocupa unos píxeles.
- **4.4:** las resueltas se ven 30 días; lo anterior, en el Historial. «Paginación» se resolvió con
  tope y aviso, no con páginas: un mapa no se lee por páginas.
- **4.9:** «Purgar» pasa a archivar. Borrar no tenía vuelta atrás y se llevaba actividades.
- **4.2:** los z-index propios de Leaflet no se tocaron: se contienen en el mapa con `isolation`.
- **4.7:** el primer render se midió con emulación, no en un teléfono real.
- «Por atender» pasa a «abiertas», la palabra de la Gestión de incidencias, porque cuenta lo mismo.

**Sin comprobar en esta etapa:** un teléfono real, con red móvil de verdad (§8). La leyenda de
«Resultado electoral» con datos se vio en Zapopan; con el aviso de «sin resultados», solo en Tonalá.
**Sin hacer:** la cartografía todavía une colonias, ciudadanos y visitas por sección para dos cifras;
es trabajo de consultas agregadas, como el de la etapa 8.

### Etapa 5

Todos los entregables hechos. Migración `0022` ensayada dos veces sobre copias de la base local
(menos de 1 s; la segunda corrida no cambia nada) y aplicada después a la base local, con un respaldo
previo. Scripts en `scripts/local/` (`sin-ubicacion.mts`, `sin-municipio-acceso.mjs`).

| entregable | cómo se comprobó |
| :--- | :--- |
| **5.1 a 5.6** migración | Informe al migrar la base local: **82 filas en General** —29 personas (entre ellas los 7 administradores), 2 equipos, 16 ciudadanos, 14 reportes de escucha y 21 prospectos—; 0 incidencias; los 4 almacenes resueltos por su dirección, «Tlaquepaque» incluido; ninguna sección sin llave. Las 16 opciones de catálogo del sistema quedan en General a propósito y no cuentan. `municipio-llave.test.ts`, en una base desechable: la base y la aplicación resuelven igual **más de 500 variantes** de los 125 nombres (la prueba encontró una diferencia —«Jalisco» solo acababa como pedazo de «Ojuelos de Jalisco»— y se corrigió en la migración); cada regla de cada tabla al insertar y al cambiar; que no se puede dejar una fila sin llave; el relleno de filas de antes de la 0022, corriendo la migración otra vez sin disparadores, como la primera vez; y que se detiene sin aplicar nada ante una sección con un municipio fuera del catálogo. Quitar «la sección manda» o la exigencia del alta interna hace fallar 4 de las 10 |
| **5.7** pantalla | Con administración, asignar a Zapopan a una persona en General: sus 5 ciudadanos en General la siguieron, el mensaje lo dijo y quedó una fila de auditoría. Se devolvió todo a su estado exacto, comparado contra una instantánea. Dirección, líder y brigadista: la pantalla los redirige y no la ven en el menú; la acción rechaza a quien no es administración. Sin desplazamiento horizontal a 375 px |
| **5.8** municipio obligatorio | Por HTTP, como líder: un alta sin municipio, 400 `municipio_requerido` con el campo. En las pruebas: el alta interna guarda la llave del municipio elegido aunque quien registra sea de otro; el registro público, igual |
| **5.9** General a la vista | Ficha, Directorio, Control de usuarios y equipos marcan «General» (leído en el HTML con sesión) |
| menús | `verificar-menus-por-rol.mjs`: todas las pantallas del menú abren para los cinco roles |

**Comprobaciones completas al cerrar la etapa:** `pnpm validate` (correcto) —tipos de las dos
configuraciones, lint con 0 errores y los mismos 16 avisos (ahora también sobre `api/public/*`),
fronteras de módulos, **483 pruebas en 58 archivos**— · `pnpm web:build` (correcto).

**Decisiones que se apartan del plan:**

- **La llave la pone la base, con disparadores**, y no cada ruta de la aplicación. Hay unas 15 rutas
  y otros tantos scripts y pruebas que insertan en estas tablas; con disparadores, ninguno puede
  dejar una fila sin municipio y el `NOT NULL` no rompe a la versión anterior durante el despliegue.
  Las reglas viven en un solo lugar, la migración, y una prueba las ata a las de la aplicación.
- **No hay umbral de General que detenga el despliegue.** Mucho en General es un problema de datos, y
  la pantalla para corregirlo llega en ese mismo despliegue: detenerlo impediría arreglarlo. Lo que sí
  lo detiene es un error de estructura (5.5). Pasado un 25 % en una tabla, el informe avisa fuerte.
- **Almacenes, por su dirección**: no guardan quién los creó (ver M32). Solo se lee el último tramo;
  si no nombra un municipio con certeza, General.
- **Las secciones también llevan llave**, nulable. Es la verdad geográfica de ciudadanos e
  incidencias; así se busca por llave y no por nombre.
- **Quien sale de General se lleva sus registros en General.** Es la regla del relleno («el de quien lo
  creó») aplicada cuando por fin se sabe.
- **El municipio se exige también en el registro público**: el plan dice que no se aceptan datos sin
  municipio, y cualquiera sabe dónde vive.
- **No se asignó municipio a nadie a mano.** Los 7 administradores y las demás personas en General,
  incluida la cuenta «Brigadista Norte» con rol de administración, se asignan en la pantalla nueva:
  a qué municipio pertenece cada administrador es una decisión sobre datos reales, no una deducción.

**Sin comprobar:** cuánto quedará en General con los datos de producción, que pueden repartirse
distinto; el informe de `pnpm db:migrate` lo dirá en el despliegue.

### Etapa 6

Todos los entregables hechos. Migración `0023` ensayada sobre una copia de la base local —dos veces
seguidas sin efecto la segunda, y a través de `pnpm db:migrate`, que nombró al maestro— y aplicada
después a la base local, con un respaldo previo. Scripts en `scripts/local/` (`etapa6-http.mts`).

| entregable | cómo se comprobó |
| :--- | :--- |
| **6.1** migración | Sobre la copia, con aserciones en SQL: un segundo maestro choca con el índice; el maestro no puede tener municipio ni otro rol, y escribirle un municipio en texto no lo mueve; no se activa ni se asciende a un administrador en General, y uno con municipio no vuelve a General; la versión de sesión sube con contraseña, estado y rol, y con el municipio solo si es administración; el maestro entra a un equipo con municipio sin salir de General; dos municipios pueden tener la misma opción de catálogo, uno no puede tenerla dos veces; auditoría sin autor. Lo mismo, en `administracion-municipal.test.ts` |
| **6.2** maestro | En la base local, `db:migrate` nombró a la cuenta de `ADMIN_EMAIL` («Administrador Tonalá») y dejó su fila de auditoría; la segunda corrida dice «ya había». En la prueba: sin variable, «sin variable»; con el correo de una brigadista, no la asciende |
| **6.3** alcance | `administracion-municipal.test.ts`, base desechable con dos municipios y tres administradores: cada uno ve sus ciudadanos, incidencias, escucha, equipos, catálogo y almacenes, y los de su gente, y nada más; el maestro, todo; el módulo de contactos devuelve exactamente lo mismo que las pantallas. Por HTTP, con un administrador de Tonalá creado para la prueba: la API de ciudadanos devuelve **1 143 de 1 143**, los que da la regla escrita aparte en SQL; una ficha de Zapopan, 404, y darla de baja, 404 sin tocarla; el mapa, 190 incidencias y ninguna de otro municipio; una acción en bloque sobre una de Zapopan, 0 filas y sin tocarla |
| **6.4** cuentas | En la prueba, 14 intentos de escalada rechazados: tocar a otro administrador, al maestro o a alguien de otro municipio; ascender a administración; cambiar municipios; crear un administrador o una cuenta de otro municipio; que el maestro se toque a sí mismo; nombrar administrador a alguien sin municipio. Lo permitido queda auditado. Por HTTP: 404 al tocar a otro administrador, a Zapopan o al maestro; 403 al ascender a una brigadista; 404 a que el maestro se cambie el rol a sí mismo |
| **6.5** auditoría | La ficha que abre el maestro deja su fila y la pantalla la enseña; la exportación de Tonalá deja la suya con los 1 143. `auditoria-acciones.test.ts`: las 38 acciones que el código escribe tienen nombre; quitarle el nombre a una la hace fallar |
| **6.6** sesiones | Por HTTP: una sesión abierta vale; tras restablecer su contraseña, 401 en la siguiente petición y la salida dice «sesión cerrada»; quien cambia su propia contraseña sigue dentro con la cookie nueva y la anterior da 401 |
| **6.7** panel | Capturas del maestro a 1280 y 375 px, sin desplazamiento horizontal; la línea del maestro se partía en columnas en el teléfono y se corrigió |
| **6.8** rescate | En la prueba: sin `--reemplazar` no cambia de maestro; con él, el anterior pierde la marca y queda de baja; la contraseña temporal funciona con argon2 y no queda en la auditoría. El comando real, sin tocar datos: ayuda, correo inexistente y orden vacía |
| **6.9** logística | En la prueba: almacén dado de alta en el municipio de quien lo crea aunque pida otro; Zapopan no mueve material de Tonalá; una salida mayor que las existencias no pasa; a una persona de otro municipio, tampoco. Por HTTP, la pantalla de Tonalá enseña solo su almacén de los cuatro |
| **6.10 a 6.13** | Catálogo y cartografía en la prueba y por HTTP (`all`: 400 a Tonalá, 200 al maestro). Las cuatro pantallas del maestro: 200 a él, redirección a un administrador municipal. `capacidades.test.ts`: solo las abre `master_admin` |
| menús | `verificar-menus-por-rol.mjs`: todo abre para los cinco roles. El administrador de escenario, que sigue sin municipio, recibe 403 al crear un equipo por la API —el botón ya no se le ofrece— con el motivo en claro, y ve el aviso de 6.14 |

**Comprobaciones completas al cerrar la etapa:** `pnpm validate` (correcto) —tipos de las dos
configuraciones, lint con 0 errores y los mismos 16 avisos, fronteras de módulos, **505 pruebas en 60
archivos**— · `pnpm web:build` (correcto). Rotas a propósito, cuatro protecciones hacen fallar
`administracion-municipal.test.ts`: que administración vea todos los ciudadanos (2 pruebas), que un
administrador gobierne a otro (4), que cualquiera nombre administradores (4) y que administración vea
todas las incidencias (1).

**Lo que la propia implementación obligó a corregir:** `pnpm db:seed` y `pnpm db:clean` creaban
administradores sin municipio que la regla nueva rechaza (se vio al montar la base desechable de la
prueba): la semilla deja a «Admin de Pruebas» como maestro si no hay uno —así CI y cada base
desechable lo tienen— o como administrador de Tonalá si ya lo hay, y `db:clean` crea al maestro con su
marca. Tres pruebas que creaban administradores sin municipio o daban por hecho que cualquiera lo veía
todo usan ahora al maestro o un municipio. El informe de `db:migrate` contaba al maestro entre las
personas «sin municipio».

**Decisiones que se apartan del plan:**

- **El maestro es una marca, no un rol** (`is_master_admin` en una cuenta de administración). Así todo
  lo que administración ya podía hacer lo puede él sin tocar cada comprobación, y ninguna pantalla que
  reparte roles puede fabricar un maestro. En el código aparece como `master_admin` en los roles del
  actor y en `capacidades.ts`.
- **El municipio acota a administración, no a la cascada.** El plan lo ponía sobre todos; con eso, una
  brigada que registra a alguien del municipio vecino dejaría de verlo, contra el §7.
- **Un administrador municipal ve también lo de su gente**, aunque sea de otro municipio: lo mismo que
  su líder. Sin eso vería menos que sus subordinados.
- **Los administradores en General no ven nada** (solo lo suyo) hasta que el maestro les asigna
  municipio. Deducirlo sería decidir por el dueño a quién gobierna cada uno.
- **«Sin municipio confirmado» y «Ajustes» pasan al maestro.** Lo que está en General no es de ningún
  municipio, y cambiar a alguien de municipio es suyo.
- **Las opciones de catálogo que ya existían quedan estatales**: se crearon cuando «organización» quería
  decir todos, y hay brigadas usándolas.
- **La versión de sesión no sube por el municipio de quien no es administración**: su alcance no
  depende de él, y no hay por qué sacar a una brigada a media calle cuando su equipo recibe municipio.
- **Dirección lleva la logística de su propio municipio.**

### Simulacro de evento y pantalla de inicio (después de la etapa 6)

**Pantalla de inicio (pedido del dueño, 2026-09-25):** quien puede abrir el Resumen —administración,
también el maestro; dirección y líder— entra por él. Capturista y brigadista no lo abren y conservan
el suyo (Directorio y Agenda). El middleware tenía su propia copia de la regla; ahora usa la misma
función (`@tonala/ui/role-home.js`, permitido por su ruta en `check-module-boundaries.mjs` porque no
trae React) y `capacidades.test.ts` falla si vuelve a tener una lista propia o si ese módulo importa
algo más. Terminar el alta inicial (onboarding) también lleva a la pantalla de inicio de cada rol.

**El simulacro** (`scripts/local/simulacro-evento.mts` y `privacidad-menus.mts`, fuera de git) corre
contra una copia de la base (`tonala_os_simulacro`) y un servidor de producción aparte en el puerto 3300
(`servidor-simulacro.mjs`, que se niega a arrancar si no apunta a la copia; comprobado con una marca
puesta solo en la copia). Un mitin en Tonalá y otro en Zapopan a la misma hora:

| qué | resultado |
| :--- | :--- |
| 150 personas por el QR del líder, 25 a la vez desde tres IP, uno de cada diez con doble o triple toque | todas registradas, cada doble toque un solo registro; p95 **184 ms** |
| La misma persona desde cuatro teléfonos a la vez | antes **4 fichas**; ahora 1 y tres «ya registrado» (D19) |
| Errores de captura (municipio fuera del catálogo, sin municipio, 31 de febrero, teléfono sin números, sin nombre, enlace inexistente) | rechazados con el campo; nada guardado |
| Modo evento: el capturista registra 40 con su sesión, 5 a la vez | origen «evento», sección y municipio; p95 **51 ms**; una sección de Zapopan con municipio Tonalá, 400 |
| 60 por el QR de un líder de Zapopan, 20 a la vez | todas registradas |
| 11 brigadistas por el QR de brigada (y un triple toque) | pendientes en su brigada; el líder acepta 5 y rechaza 1; otro líder no acepta en la ajena; Zapopan no aprueba en Tonalá; Tonalá aprueba como capturista pero no como administración; el triple toque ya no da 500 (R30) |
| Altas internas de capturista, líder, dirección, administración y maestro; brigadistas | 201 para quien puede, 403 para los brigadistas; doble envío, un solo ciudadano |
| Prospectos del brigadista y su conversión | el capturista de la brigada convierte; el brigadista y el capturista de Zapopan, no |
| Incidencias: asignada a persona y a brigada, con foto, triple toque | una sola; brigadista y capturista 403; asignarla a Zapopan, rechazado; el líder de la brigada de al lado ya no la cierra (A20); el administrador de Zapopan, 404 |
| Equipos e integrantes | el líder crea una brigada al frente de un brigadista nuevo; la administradora suma integrantes de Tonalá y no de Zapopan; no crea en Zapopan; el maestro sí; el líder no borra |
| Actividades | el líder las programa y registra el mitin con su resultado; el brigadista la inicia y la cierra; capturista y brigadista no crean; otra brigada no la ve |

**Privacidad, pantalla por pantalla:** con la sesión de 14 cuentas (maestro, administración de Tonalá y
de Zapopan, dos direcciones, tres líderes, capturistas, brigadistas y un brigadista recién aceptado) se
miró qué de lo creado aparece en el Directorio (página y API), la ficha, la exportación, el mapa, el
Resumen, el mapa de incidencias, la Gestión, las actividades, los prospectos, la escucha, los equipos,
Control de usuarios, las personas que se pueden elegir y las fotos, y si cada pantalla del panel abre o
rebota. **179 comprobaciones, todas bien:** las superficies coinciden entre sí para cada cuenta (el
Resumen sube exactamente lo que se ve en el Directorio); la administración municipal ve exactamente lo
que dice la regla escrita aparte en SQL; nada cruza de municipio ni de brigada; cada cadena ve lo suyo;
cada foto la ve quien ve su registro.

**Decidido por el dueño (2026-09-25):** el simulacro mostró que los líderes de una coordinación, como
compañeros de equipo, se veían lo registrado por el QR del otro (**175 registros** del evento de Tonalá
Centro a la vista del líder de Zalatitán), y que un brigadista recién aceptado veía todo el padrón de su
líder (180). Ahora **solo el capturista ve lo de sus compañeros**; el líder no ve lo de los otros líderes
y el brigadista ve lo suyo y lo asignado, a él o a su brigada (`network-hierarchy.ts`, paso 4). Con la
regla nueva, repetido todo: **138 comprobaciones del simulacro y 195 de privacidad**, todas bien. El líder
de Zalatitán ve 0 del evento ajeno; el brigadista, exactamente sus 3 asignados más 4 prospectos suyos ya
convertidos; el recién aceptado, 0; la capturista, lo de su brigada. Las pruebas de la cascada lo fijan en
los dos sentidos: volver a la regla vieja rompe 4 y quitárselo también al capturista rompe 2.

**Territorio (D20, decidido por el dueño el 2026-09-25):** ninguna alta creaba el territorio del
ciudadano y sin él no se asignaba, así que para repartir un evento había que confirmar colonia y sección
ficha por ficha. Ahora asignar no lo exige (agendar visita sí) y las altas lo crean cuando traen una
colonia del catálogo de su municipio, escrita como sea (sin acentos ni mayúsculas), con el mismo caso de
uso, auditoría y evento que la ficha; en el registro público, a nombre del dueño del enlace. Una colonia
que no está en el catálogo no se inventa. En el simulacro: los 27 del evento que escribieron
«alfareros» quedaron con territorio y nadie más; el líder asignó tres del QR sin territorio al
brigadista; este no pudo agendarles visita (404 con el motivo), confirmó el domicilio en la puerta y la
agendó. **139 comprobaciones del simulacro y 195 de privacidad**, todas bien. Pruebas: 4 en
`altas-de-campo.test.ts` (quitar el vínculo del alta interna, del registro público o el filtro por
municipio rompe una cada uno) y las de asignación, que ahora exigen que se pueda asignar sin territorio.

**Doble clic en el mapa para reportar (pedido del dueño, 2026-09-25):** la etapa 4 lo había quitado (M25)
porque el doble toque es también el gesto de acercar y cada acercamiento abría el alta. Vuelve así: a quien
puede reportar (administración, dirección, líder) el doble clic o doble toque abre «Registrar incidencia»
**en el punto exacto del clic** —dirección, municipio y sección los detecta el formulario desde ese punto, nunca
del polígono— y ya no acerca (se acerca con la rueda, pellizcando o con los botones). Las secciones cubren casi
todo el municipio y su clic abre el panel: para quien puede reportar, ese clic espera 300 ms por si llega el
segundo; sin eso, el doble clic nunca llegaba al mapa (visto al probarlo). A brigadista y capturista no les
cambia nada. Comprobado con Chrome sin ventana, ratón y toques reales (`scripts/local/doble-clic-mapa.mts`, 20
comprobaciones): líder y dirección en escritorio y teléfono, sobre una sección y fuera de ellas; coordenadas del
formulario iguales a las del clic; el clic sencillo sigue abriendo el panel; brigadista y capturista, sin
formulario.

**Sin comprobar:** en un teléfono real; con el servidor del VPS; con más de un evento por municipio a la vez.

**Sin comprobar:** con los datos de producción, quién es la cuenta de `ADMIN_EMAIL` —será el maestro al
desplegar; si no es la de la persona que debe serlo, se cambia con `pnpm admin:rescatar --email … --maestro
--reemplazar`— y cuántos administradores quedan sin municipio (lo dice `db:migrate`). La consulta del
maestro se audita al abrir una ficha de ciudadano o un perfil, no en listas ni en el mapa. «Ajustes»
sigue siendo una pantalla sin efectos reales; solo cambió quién la abre.

### Revisión de fondo antes del commit (2026-09-26)

Pedido del dueño: antes de commitear, asegurarse de que el registro de usuarios y de ciudadanos con
sus datos, las incidencias y la privacidad funcionen de verdad; y sacar las colaboraciones del plan
(la etapa 7 se retiró: se harán más adelante).

**Método.** Se inventariaron las 56 rutas de la API y los 9 archivos de acciones de servidor: con qué comprueban la
sesión, con qué el alcance, y se leyó cada una que escribe sobre un registro por su identificador.
Las que filtran por alcance dentro de un servicio (`permisos-contacto.ts`, `prospectos-servicio.ts`,
`archivos.ts`, `cargarContextoIncidencia`) se siguieron hasta el servicio.

**Decisiones del dueño (2026-09-26):** corregir los datos personales de un ciudadano lo hace quien puede
registrar (capturista, líder, dirección, administración), solo sobre ciudadanos que ya ve, y queda en
la auditoría; el brigadista sigue corrigiendo solo el domicilio. Y un teléfono que ya está en otra ficha,
en el alta del panel, **avisa y deja seguir** si quien captura confirma que es otra persona (una familia
que comparte teléfono); el registro por QR lo sigue rechazando.

| qué | cómo quedó |
| :--- | :--- |
| Datos personales (D21) | La ficha enseña teléfono, correo, nacimiento y calle; «Editar datos» los corrige (`PATCH /api/crm/contacts/[id]`, `editar-ciudadano.ts`): versión de la ficha (409 si alguien más la cambió), nueva huella del teléfono, nombre visible rehecho, y una fila `contacts.update` en la auditoría con teléfono, correo y domicilio **enmascarados**, porque en la ficha van cifrados |
| Teléfono repetido (D22) | `telefono-repetido.ts`, compartido por el alta y la corrección: aviso 409 con la ficha existente si quien captura la ve, sin decir de quién es si no; «Es otra persona: guardar» lo confirma, también desde la cola del teléfono sin señal |
| Año de nacimiento (D4) | Migración `0024`: `birth_year_known`. Sin año, la ficha dice «12 de marzo (año no capturado)». Las fechas que ya había con año 2000 pasan a no capturado: en la copia del simulacro fueron 326, casi todos registros por QR sin año |
| Domicilio (D23) | Una sección de un municipio con otro municipio escrito se rechaza diciendo cuál es |
| Incidencias (D24) | `campos-incidencia.ts`, al levantarlas y al editarlas: categoría, título, descripción, fecha, coordenadas y sección se validan; la sección manda sobre el municipio escrito; lo que llega igual a lo guardado no se revalida, para que una incidencia antigua no quede bloqueada |
| Escucha social (A21) | Estados válidos; ver no es trabajar (`condicionParaTrabajarPorAutor`): la capturista ve lo de su brigada como «solo consulta» y la API responde 403 exactamente ahí; lo que no se ve es 404 |
| Visitas y asignación | Cerrar la visita y asignar usan `commandUserIds` (quien manda), ya no a quien se ve. Hoy no cambia a nadie —el capturista no tiene esos permisos—, pero ya no depende de eso |
| Acciones en bloque (M40) | Solo queda «archivar resueltas», la única que usaba una pantalla |
| Notas y cuentas (M41, M42) | Una nota que no es texto es 400, con tope de largo; el auto-registro y el alta por administración validan el correo, y el doble toque del auto-registro ya no da 500 |
| Pruebas que se cortaban (R32) | `vitest.config.ts` con `pool: "threads"` |

**Comprobado.** `apps/web/tests/datos-del-ciudadano.test.ts` (27 pruebas contra los manejadores de verdad
y una base desechable) y 2 más en `cola-de-envios.test.ts`. **16 mutaciones**, una por corrección —quitar
el aviso, el control de versión, el permiso, la visibilidad, la huella, el enmascarado, la marca del año
en cada alta, la coherencia del domicilio, la validación de la nota, la regla y los estados de Escucha,
la validación de incidencias al editarlas y al levantarlas—: cada una rompe al menos una prueba. En vivo,
contra una copia recién sacada de la base local ya migrada y el build de producción: **simulacro 139**,
**privacidad de lectura 195**, **escrituras 576** (`privacidad-escrituras.mts`, nuevo: con cada cuenta
del escenario intenta corregir, anotar, agendar, cambiar domicilio, asignar, y tocar incidencias,
escucha y prospectos ajenos, con datos inválidos a propósito para no cambiar nada; ninguna cuenta toca
lo que no ve, y el «solo consulta» de la pantalla coincide con el 403 de la API), **pantallas 18**
(`ficha-y-avisos.mts`, Chrome sin ventana, escritorio y 375 px) y **doble clic 20**.

Encontrado al probar, y no era defecto: la capturista no ve lo que su líder registró fuera del
territorio de la brigada (lo propio solo se le garantiza a su dueño; §0). El aviso de teléfono repetido
lo respetó: le dijo que el número existe sin decirle de quién.

**Migración `0024` en la base local:** respaldo previo dentro del contenedor; mismos conteos antes y
después (3 385 ciudadanos, 612 incidencias, 177 usuarios); 25 migraciones; 66 fechas con año 2000
marcadas como no capturadas.

**Sin comprobar:** el ensayo de las migraciones 0019 a 0024 sobre una copia de producción (8.15) y un
teléfono real.

### Domicilios, ubicación exacta y vista de celular (2026-09-26)

Pedido del dueño: que al registrar un ciudadano o un usuario se ponga su dirección, que el clic en el
mapa de ese menú funcione y se guarde bien, que todo lo que usa ubicación la guarde exactamente donde se
marca, y revisar la vista de celular.

| qué | cómo quedó |
| :--- | :--- |
| Pin exacto (D25) | Gota con la punta como ancla. Medido con `scripts/local/pin-exacto.mts`: antes 17 px y 29 px de desfase; ahora 0 px en escritorio y en 375 px (con `ResizeObserver`, como el mapa principal). El mapa se crea una vez y lee el valor y el `onChange` vigentes; solo cuenta la dirección del último punto; tocar lejos acerca al punto |
| El punto manda | Sección, colonia y calle salen del punto marcado; las del anterior no se quedan. La calle escrita a mano no la pisa un punto nuevo (alta, ficha, Escucha, actividades). El GPS del selector guarda el punto aunque no llegue la dirección y dice su precisión |
| Alta de ciudadano | Calle y número obligatorios en el panel (API y formulario): el mapa rellena solo «calle #número», no la dirección entera. Colonia obligatoria en el QR |
| Ficha (D26) | «Territorio → Editar» es un formulario nuevo (`EditarDomicilio.tsx`): colonia, sección y municipio del selector, calle y el punto, que abre donde está guardado y se puede quitar. La ruta valida el punto y lo audita (`contacts.update`, sin datos en claro) |
| Incidencias (D27) | Con punto marcado (doble clic o GPS), una sugerencia solo escribe la dirección. «Reportar» sin GPS y «Reportar en esta sección» avisan que el punto es aproximado |
| Usuarios | Migración `0025` (`home_address`, `home_colony` cifradas; `home_municipality`). Se piden en el QR de brigada y el auto-registro (`domicilio-persona.ts`); se corrigen en «Mi perfil»; los ve la propia persona y la administración que la gobierna, y quien decide una solicitud pendiente |
| `/onboarding` (M43) | Retirada |

**Comprobado.** `apps/web/tests/domicilios.test.ts` (9 pruebas) y las de alta ajustadas a las reglas
nuevas; **9 mutaciones** —quitar la calle obligatoria, la colonia del QR, la validación del domicilio en el
QR de brigada, en el auto-registro y en el perfil, y en la ficha guardar el punto, la calle, validar el
punto o auditar—: cada una rompe una prueba. En Chrome sin ventana, escritorio y 375 px, contra el build de
producción y la copia del simulacro (`scripts/local/domicilio-y-mapa.mts`, 10 comprobaciones cada uno): el
punto guardado es exactamente el del pin, sin redondear; otro punto cambia la calle del mapa y respeta la
escrita; la ficha abre el mapa en su punto y guarda el nuevo; la incidencia se queda en el punto del doble
clic aunque se elija una sugerencia. `pnpm validate`: **558 pruebas**, 0 errores de lint; `pnpm web:build` (correcto).

**Vista de celular** (`scripts/local/revision-movil.mts`): **93 pantallas** a 375 × 812 con emulación de
teléfono —las públicas y todas las que abre cada rol: maestro, administración, dirección, líder, capturista
y brigadista, más una ficha y un detalle de equipo—. Ninguna más ancha que la pantalla, ningún elemento
fuera de ella, ningún error en la consola y, al final de cada página, nada tapado por la barra inferior ni
por el botón de crear (medido con desplazamiento instantáneo: la página usa desplazamiento suave y la
primera medición daba falsos positivos). Queda como mejora, no como falla: varias pantallas tienen enlaces
de texto de menos de 24 px de alto (el Resumen, el detalle de equipo).

**Migración `0025` en la base local:** respaldo previo (borrado después); mismos conteos (3 385 ciudadanos,
177 usuarios); 26 migraciones.

**Sin comprobar:** en un teléfono real con GPS de verdad (la emulación no mueve el receptor); los
formularios de Escucha, actividades y Reportes se revisaron en el código y con la API, no con clics.

### Ensayo de despliegue (2026-09-26)

Pedido del dueño: ensayar el despliegue antes de hacerlo de verdad, «que sea la buena». Desde este equipo no
hay acceso al servidor, así que el ensayo va en dos partes: completo en local, con las mismas imágenes de
Docker y el mismo `docker-compose.yml` que producción, y un script que lo repite en el servidor con los datos
reales sin tocar producción (8.15).

**Producción de hoy, en local.** Un proyecto de compose aparte (`ensayo`, con nombres y puertos que no chocan
con la base de desarrollo), con el código exacto de `main` (`git archive`, con fin de línea LF como en el
servidor) y una copia de la base local llevada al estado 0018: se quitó a mano lo que añaden la 0019 a la 0025,
y su esquema quedó idéntico, línea por línea (770), al de una base nueva con las migraciones de `main`. 3 385
ciudadanos, 612 incidencias, 177 cuentas. Humo con las cinco cuentas de rol: sin fallas.

**El despliegue, como en el servidor:** respaldo previo (el servicio `backup` vuelca en cuanto se reinicia),
`docker compose up -d --build` con la versión nueva y, mientras tanto, `/api/health` por Caddy cada medio
segundo.

| qué | resultado |
| :--- | :--- |
| Caída del sitio | De 10.3 a 12.9 s en cinco despliegues. El build (de 40 s con caché a 3½ min) corre mientras la versión anterior sigue atendiendo |
| Migraciones | De la 0019 a la 0025 en unos 5 s y en una sola transacción; 3 384 huellas; maestro nombrado (la cuenta de `ADMIN_EMAIL`); 74 filas en General; 4 administradores sin municipio |
| Filas por tabla | Las mismas antes y después en las 36 tablas que ya existían, salvo el registro de migraciones (+7) y la auditoría (+1, el nombramiento del maestro) |
| Esquema | Idéntico al de una base nueva con las 26 migraciones y al de la base local de desarrollo (1 118 líneas) |
| Rescate | `docker compose run --rm migrate pnpm admin:rescatar … --contrasena-temporal` funciona dentro del contenedor |
| Vuelta atrás | `main` sobre la base ya migrada arranca (11.4 s de caída), entran las cinco cuentas, registra por QR, levanta incidencias y suma brigadistas; los disparadores les ponen municipio. La huella que esa versión no calcula la rellena el siguiente `db:migrate` (1 huella, comprobado al volver a desplegar) |

**Comprobaciones contra la imagen de Docker y la base migrada, con la versión final:** simulacro de evento
**140** (actualizado a las reglas de domicilio y a leer los ids de las acciones del build que responde),
privacidad de menús **195**, escrituras **576**, ficha y avisos **18**, doble clic **20**, domicilio y mapa
**10 + 10**, pin exacto a **0 px** en escritorio y teléfono, revisión de celular sin errores de consola y
tapados **9/9**. En el teléfono, un paso del domicilio (la sugerencia de dirección, que viene de un servicio
externo) no llegó a tiempo una vez; repetido, 10/10.

**Lo que encontró: M44 y M45** (§3). La revisión de celular contra la imagen de Docker dio el error #418 de
React en 21 pantallas. En el equipo no salía porque ahí todo corre en la hora de Jalisco; con el navegador en
UTC, como el servidor, desaparecía: la causa era la zona. Web, migrate y outbox-worker corren ahora con
`TZ=America/Mexico_City`: con el navegador en la hora de Jalisco, 0 errores (salen, al revés, con el navegador
en UTC). Ningún dato se mueve: todas las columnas de fecha son `timestamptz` (comprobado en la base) y los
nacimientos se guardan y leen en UTC. «Hoy» del Resumen usa el día de Jalisco con o sin esa variable.

`pnpm validate`: **561 pruebas** (dos nuevas; quitar cada arreglo rompe la suya), 0 errores de lint; las 561
pasan también con `TZ=UTC`, como en CI. `pnpm web:build` (correcto). Una corrida completa se cortó con código 127 sin
que fallara ninguna prueba; repetida, pasó entera.

**En el servidor, con los datos reales:** `scripts/ops/ensayo-despliegue.sh`. Construye la versión nueva,
copia la base de producción a una base aparte con `pg_dump` (solo lee, sin escribir el padrón en ningún
archivo), cuenta, migra, vuelve a contar, arranca la aplicación contra la copia y borra todo al terminar,
también si falla o se interrumpe. Si algo sale mal lo dice y se detiene. Probado aquí contra la copia en
0018: correcto, 51 s con la caché del build, sin dejar nada.

**Sin comprobar:** el ensayo con los datos de producción, hasta que se corra en el servidor (dirá cuántas
filas quedan en General, quién queda como maestro y si hay teléfonos que no se descifran); en un teléfono
real.

### Comprobado con el build de producción (`next build` + `next start`)

- Compila sin errores; los avisos son los de siempre.
- `/api/health` responde 200 `{"status":"ok"}` con `x-request-id`, y el arranque deja
  `{"nivel":"info","evento":"arranque.esquema-al-dia","migraciones":20}`.
- **404 del panel desde la primera petición.** La primera petición tras arrancar, un perfil con
  UUID inexistente, responde 404. Su HTML ya trae la frontera del panel («No encontramos ese
  registro»): Next la envía en la carga que pinta el navegador. En `/registro/…`, que no es del
  panel, solo viaja la de raíz.
- Rutas y pantallas con ids mal formados, y la limpieza de valores en el registro: ver 1.14 y 1.10.

### Sin comprobar

- **Nada se vio pintado en un navegador con sesión.** El navegador integrado no tenía sesión y no
  se inició una: iniciar sesión en nombre de alguien no es algo que se haga sin su intervención.
  Afecta a la frontera 404 del panel (vista en la respuesta, no en pantalla) y a M17.
- `global-error.tsx`: compila, pero no se provocó un fallo del layout raíz.
- El procedimiento de restauración completo con `docker compose` y el paso de salud del
  despliegue dentro del VPS (ver 1.11 y 1.4).

### Pendientes operativos pospuestos

Por decisión del dueño (2026-09-23) no se atienden todavía. Quedan anotados como `PENDIENTE` en el
código, junto a lo que afectan, para que nadie los tome por resueltos:

- secretos del despliegue automático y rotación de la contraseña de root del VPS →
  `.github/workflows/deploy.yml` (encabezado);
- copia de los respaldos fuera del VPS → `docker-compose.yml` (servicio `backup`);
- custodia de `DATABASE_ENCRYPTION_KEY` fuera del servidor → `.env.production.example`.

### Estado de las comprobaciones

- **CI reproducido en local**, con sus mismas variables y un Postgres 16 vacío en un contenedor
  desechable: `pnpm db:migrate` → `pnpm db:seed` → `pnpm validate` (correcto). Tipos de las dos
  configuraciones, lint con **0 errores** (los mismos 17 avisos de la línea base), fronteras de
  módulos y **374 pruebas en 47 archivos**, unitarias y de integración. `pnpm web:build` (correcto).
- **Una corrida se cayó sin que fallara ninguna prueba.** De cinco ejecuciones completas de
  `vitest run` contra esa base, la primera abortó con `ERR_IPC_CHANNEL_CLOSED`: se cerró el canal
  entre vitest y uno de sus procesos de trabajo. Las otras cuatro pasaron 47/47. No se volvió a
  reproducir y **no se determinó la causa**. Si aparece en CI, se relanza; si se repite, hay que
  investigarlo. *(Resuelto el 2026-09-26, R32: es una falla de tinypool en vitest 3.2; las pruebas
  corren ahora en hilos.)*
- Contra la base local: `pnpm validate:unit` (correcto) y `pnpm test:integration` (correcto) (16 archivos). La
  base quedó idéntica: 3 385 ciudadanos, 177 usuarios, 19 equipos.

### Qué se tocó del entorno en este bloque

- La base local tiene la migración 0019 aplicada y las 3 384 huellas calculadas.
- Se crearon y borraron bases temporales: `copia_0019_a`, `copia_0019_b`, `escala_50k`,
  `tonala_os_ensayo_restore`, `tonala_os_simulada*`, `zz_rest_*`, `zz_ren_*` y las de las pruebas
  de integración. También un contenedor `ci-simulada`, ya eliminado.
- **Quedan 76 bases `tonala_os_*` que no son de este trabajo**: 75 de corridas anteriores de las
  pruebas de integración (la más reciente, del 21 de septiembre) y `tonala_os_escala` (20 de
  septiembre, 132 MB). Las corridas de este trabajo no dejaron ninguna. No se tocaron. *(La versión
  anterior de esta nota decía «8 bases»: solo contaba las `tonala_os_test_*`.)*
- Todos los datos de prueba `zz-` se borraron, y también los eventos de outbox y las filas de
  auditoría que generaron las pruebas.
- Se arrancó Docker Desktop, que estaba apagado.
- El volcado de prueba de la base local (7,4 MB) se hizo en el directorio temporal de la sesión,
  fuera del repositorio, y **se borró** al terminar: lleva los nombres en claro (`display_name` no
  está cifrado).
- `apps/web/.next` contiene ahora un build de producción. El servidor de desarrollo arranca igual
  sobre él (comprobado) y quedó corriendo en el puerto 3000.
- **Etapa 3:** la base local tiene la migración 0021 aplicada. Las pruebas de integración nuevas
  crearon y borraron sus bases (`tonala_os_altas_campo_*`, `tonala_os_carga_*`); siguen siendo las
  mismas 76 bases ajenas de antes. Las pruebas por HTTP y en el navegador crearon ciudadanos,
  incidencias, prospectos, reportes de escucha y archivos `zz-e3`, y se borraron todos, con sus
  eventos de outbox, su auditoría, sus filas de `uploaded_files` y los archivos en disco; la foto de
  perfil de prueba se quitó y los contadores de `walking_skeleton_projection_v1` se devolvieron a su
  valor exacto. El navegador integrado quedó sin la configuración del modo evento ni la cola.
- Al empezar la etapa 3 había un proceso de Next de este mismo worktree ocupando el puerto 3000 sin
  responder, que quedó huérfano cuando la aplicación detuvo el servidor de desarrollo de la etapa
  anterior. Se detuvo y se arrancó uno nuevo.
- **Etapa 4:** sin migración. Se crearon y borraron una incidencia `zz-` (con sus 3 eventos de
  outbox) y la prueba de archivo se deshizo fila por fila; la base terminó con los mismos conteos
  (3 385 ciudadanos, 612 incidencias con el mismo reparto por estado, 62 filas de auditoría, 56
  eventos de outbox, 0 archivos subidos). Para medir el «antes» se compiló `main` en un worktree
  temporal fuera del repositorio, con una copia del `.env`; el worktree y la copia se borraron. El
  build de producción y el servidor de desarrollo comparten `apps/web/.next`: para compilar se
  detuvo el de desarrollo, y quedó otra vez corriendo en el puerto 3000.
- **Etapa 5:** la base local tiene la migración 0022 aplicada (23 registradas). Antes se sacó un
  respaldo dentro del contenedor y se ensayó en `copia_0022`; las dos cosas se borraron al terminar.
  La prueba de asignación desde la pantalla se deshizo fila por fila; la base terminó con los mismos
  conteos (3 385 ciudadanos, 612 incidencias, 62 filas de auditoría, 56 eventos de outbox).
- **Etapa 6:** la base local tiene la migración 0023 aplicada (24 registradas) y su maestro es
  «Administrador Tonalá», la cuenta de `ADMIN_EMAIL` del `.env` local, con una fila de auditoría del
  nombramiento. Antes se sacó un respaldo dentro del contenedor y se ensayó en `copia_0023`; las dos
  cosas se borraron. La prueba por HTTP creó tres administradores `zz-` y le puso a la cuenta del maestro
  una contraseña temporal (generada en memoria, nunca impresa); al terminar se borró lo de prueba y la
  cuenta volvió a su hash, su versión de sesión y sus fechas exactas. La base terminó con los mismos
  conteos (3 385 ciudadanos, 612 incidencias, 177 usuarios, 121 movimientos de inventario, 56 eventos de
  outbox) y una fila de auditoría más, la del nombramiento.
