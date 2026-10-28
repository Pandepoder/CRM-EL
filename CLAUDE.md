# Jalisco OS: guía para trabajar con IA

CRM territorial de campaña (antes «Tonalá OS»): brigadas en la calle registran ciudadanos, visitas,
incidencias y peticiones; quien coordina ve el avance. Se usa sobre todo **en el teléfono**, a veces sin
señal, por gente que nunca usó un CRM. Todo el texto de la interfaz va en **español de todos los días**.

Antes de cambiar una pantalla, lee su ficha en [docs/MAPA_DE_PANTALLAS.md](docs/MAPA_DE_PANTALLAS.md).

## Comandos

| Para | Comando |
|---|---|
| Base local (Docker, `127.0.0.1:54329`) | `pnpm db:start` |
| Lo mismo que CI (typecheck, lint, fronteras de módulos, todas las pruebas) | `pnpm validate` |
| Compilar | `pnpm web:build` (detén antes el servidor de desarrollo) |
| CI en una base vacía y desechable (solo local) | `node scripts/local/como-ci.mjs` |

- `scripts/local/` **no se versiona**: ahí viven los datos y las cuentas de prueba, la copia del simulacro
  (`tonala_os_simulacro`, en `:3300`), el recorrido de pantallas por rol y las mutaciones. Nunca se suben.
- Las migraciones se prueban en la copia o en una base desechable, **nunca en `tonala_os`**. En producción
  las aplica sola el servicio `migrate` al desplegar.
- El recorrido de pantallas va contra `next start`, no contra `next dev` (en desarrollo la primera visita
  compila y a veces responde 404).

## Reglas de oro

1. Sin commit ni PR hasta que el dueño lo pida. Nunca `git add -A`: casi siempre hay trabajo a medias.
2. No se quita información: una pantalla que se retira redirige a donde quedó lo que enseñaba.
3. Migraciones **solo aditivas**, escritas a mano (`db/migrations/NNNN_*.sql` + `meta/_journal.json`),
   idempotentes. `tests/integration/esquema-vs-migraciones.test.ts` compara tablas y columnas con
   `packages/shared/database/schema.ts`, pero **no** ve `NOT NULL` ni restricciones: esas llevan su propia prueba.
4. Ningún botón ni campo de adorno: `tests/unit/sin-adorno.test.ts` lo vigila.
5. Teléfono primero: 375 px sin desborde, 44 px para tocar, ventanas `z-[110]`.
6. Formularios de campo: se guardan sin señal (`enviarOEncolar`), sin duplicados (`clientRequestId`) y
   siempre dicen qué pasó (`avisar`).
7. Antes de cambiar el permiso de una ruta, **busca todas sus llamadas**: varias pantallas comparten rutas.
8. Contraseñas nunca en el navegador; las sesiones de prueba se sacan por la API
   (`scripts/local/sesion-de-prueba.mjs`).

## Roles, alcance y permisos

| Perfil | Rol | Qué ve |
|---|---|---|
| Maestro | `admin` con `is_master_admin` (hay **uno solo**: índice único) | Todo, los 125 municipios; lo que consulta de una persona queda en la auditoría |
| Adm. municipal | `admin` con municipio | Su municipio y lo que hizo su gente |
| Dirección | `direction` | Su cascada (coordinación → líderes → brigadas); nunca otra dirección |
| Líder | `territorial_coordinator` o quien lidera un equipo | Su brigada, y lo que se asigna a su equipo aunque venga de otra estructura |
| Capturista | `capturist` | Lo suyo y lo de sus compañeros (lo ve, no lo cambia) |
| Brigadista | `visit_responsible` | Solo lo suyo y lo que le asignan |

Tres preguntas distintas, tres lugares:

- **¿Quién entra a una pantalla?** `packages/ui/capacidades.ts` (`ACCESO_A_PANTALLAS`). Cada pantalla llama
  a `requirePageAccess` (no a `requirePageRole`; `tests/unit/capacidades.test.ts` lo exige). El menú
  (`packages/ui/role-home.ts`) sale de la misma lista.
- **¿Qué ve dentro?** El alcance: `resolveUserNetworkScope` (`apps/web/src/lib/network-hierarchy.ts`) y sus
  condiciones: `contact-visibility.ts` y `permisos-contacto.ts` (ciudadanos), `incident-visibility.ts`
  (incidencias), `alcance-municipal.ts` (lo que tiene municipio y autor: Escucha Social, equipos, cuentas),
  `perfil.ts` (`puedeVerPerfil`: perfiles y «Registrados por…»). Un alcance vacío ve **nada**, nunca «sin filtro».
- **¿Qué puede cambiar?** «Ver no es trabajar»: `commandUserIds`, `condicionParaTrabajarPorAutor`,
  `incidenciasQuePuedeTrabajar`, `puedeSobreIncidencia` (`permisos-incidencias.ts`), `permisos-equipos.ts`. Lo
  que se ve pero no se trabaja sale como «Solo consulta» (403).
- **Avisos «por aceptar»:** lo que levanta en campo un capturista o brigadista entra pendiente y lo aceptan
  quienes mandan sobre esa persona, nunca ella misma (`esAvisoDeQuienNoCoordina`, `motivoSiAvisoPorAceptar`).

Lo que no se ve no existe: un id fuera del alcance o mal formado responde **404**, no 403 (`esUuid`, `lib/ids.ts`).

## Privacidad

- Del ciudadano van cifrados nombres, teléfono, correo, domicilio, colonia, municipio escrito, profesión e
  intereses (`encryptedText`). **`contacts.display_name` va en claro** (con él se busca): cuida quién lo recibe.
- Los nombres de personas se recortan **en el servidor** según el alcance; esconderlos solo en la pantalla no
  basta. Quien no puede ver a alguien lee «un vecino», «Otra estructura» o «Ciudadano del padrón».
- Listas con nombre y colonia como mucho; teléfono, correo y domicilio solo en la ficha.
- Nada personal en la dirección web: el texto de un buscador viaja en el cuerpo de un `POST` (modelo:
  `POST /api/incidencias/consulta` y `lib/incidencias-filtros.ts`, con `direccionDe…` que nunca lleva el texto).
- Exportaciones con tope y en la auditoría. Lo delicado se anota en `audit_logs` con su etiqueta en
  `apps/web/src/lib/auditoria-acciones.ts`.

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Pantallas del panel | `apps/web/app/(shell)/<pantalla>/` |
| Rutas de API | `apps/web/app/api/` |
| Lógica de negocio | `apps/web/src/lib/*-servicio.ts` y vecinos; la ruta solo valida y delega |
| Menú, barra del teléfono, botón «+» | `packages/ui/role-home.ts`, `packages/ui/AppShell.tsx`, `packages/ui/boton-mas.ts` |
| Esquema | `packages/shared/database/schema.ts` |
| Avisos y celebración | `apps/web/src/lib/avisos.ts`, `components/CapaDeAvisos.tsx`, `components/CapaDeCelebracion.tsx` |
| Cola sin señal | `apps/web/src/lib/cola-de-envios.ts` |
| Glosario «¿Qué es esto?» | `apps/web/src/components/QueEsEsto.tsx` |
| Planes y decisiones | `docs/PLAN_AUDITORIA_MENUS.md`, `docs/PLAN_EXPERIENCIA_SENCILLA.md`, `docs/adr/` |

## Recetas (cada una con su prueba)

- **Pantalla nueva y su entrada al menú.** `app/(shell)/<pantalla>/page.tsx` con
  `await requirePageAccess("/<pantalla>")`; la pantalla y sus roles en `ACCESO_A_PANTALLAS`; la entrada con
  `entrada(...)` en su sección de `role-home.ts` (los roles salen solos de la lista) y su ícono en
  `getIconForNavKey` (`AppShell.tsx`); su ficha en `docs/MAPA_DE_PANTALLAS.md`. Pruebas: `capacidades`,
  `menu-claro`, `sin-adorno`; `atajos-por-rol` si entra al «+» o a «Primeros pasos». Una pantalla que se retira
  redirige y va en las `EXCEPCIONES` de `capacidades.test.ts`.
- **Ruta de API.** Sesión primero, `esUuid` (404) y el cuerpo validado; la lógica en un `*-servicio.ts` que
  recibe el alcance. Si crea algo, acepta `clientRequestId` (reenviar no duplica). Prueba de integración con
  `crearBaseDesechable` y la sesión simulada, y su matriz (quién sí y quién NO).
- **Migración.** `db/migrations/NNNN_slug.sql` a mano, aditiva e idempotente (`IF NOT EXISTS`); su renglón en
  `meta/_journal.json` (`idx`, `when` mayor que la anterior, `tag`); `schema.ts` igual. Una regla nueva
  (`CHECK`, `NOT NULL`) va `NOT VALID` dentro de un `DO $$ … IF NOT EXISTS (SELECT 1 FROM pg_constraint …)`
  y lleva **su propia prueba**: `esquema-vs-migraciones` solo compara tablas y columnas. Se aplica a la copia
  (`scripts/local/migrar-simulacro.mts`), nunca a `tonala_os`.
- **Formulario de campo sin señal.** Un `tipo` nuevo en `TipoDeEnvio` (`cola-de-envios.ts`), el envío con
  `enviarOEncolar` y `clientRequestId`, y `avisar` con lo que pasó. Prueba: `cola-de-envios.test.ts` y la de la ruta
  (reenvío = 200 lo mismo; con la clave de otra persona, 409).
- **Capa del mapa.** Su gancho en `mapa/capas.ts`, su globo en `mapa/html.ts` y su ruta `GET /api/map/<capa>`
  acotada al alcance y sin nombres de más. Pruebas: `mapa/html.test.ts` y la matriz de la ruta.
- **Término del glosario.** En `GLOSARIO` (`components/QueEsEsto.tsx`) y `<QueEsEsto termino="…" />` junto a la
  palabra. Frases cortas, sin claves técnicas.
- **Acción delicada.** Su etiqueta en `auditoria-acciones.ts` (y su grupo); `auditoria-acciones.test.ts` exige
  que toda acción que se anota tenga nombre.
- **Renglón de la matriz.** En `apps/web/tests/matriz-<pantalla>.test.ts` con la estructura compartida
  `tests/estructura-de-prueba.ts` (seis perfiles, dos direcciones en Tonalá, Zapopan aparte).
- **Antes de cambiar el permiso de una ruta, busca todas sus llamadas**: varias pantallas comparten rutas.

## Cómo se prueba

1. Unidad (`apps/web/src/lib/*.test.ts`, `tests/unit/`).
2. Integración con base desechable (`apps/web/tests/`, `crearBaseDesechable`, sesión simulada con
   `vi.mock("@/lib/api-helpers")`).
3. Matriz de permisos: cada «quién puede y quién no» del plan, con las seis cuentas, contra la API.
4. Privacidad: que la **respuesta** no traiga lo que no se debe ver.
5. Esquema contra migraciones.
6. Mutaciones (`python scripts/local/mutaciones.py`): una falla a propósito tiene que poner una prueba en rojo.
7. Navegador con cuentas de prueba, a 375 px y en computadora, contando toques.

## Lo que parece sobrar y no sobra

- La proyección `walking_skeleton` y el trabajador del outbox: decisión de arquitectura (`docs/adr/ADR-010`,
  `ADR-011`), con pruebas.
- Módulos de `packages/modules/` sin pantalla y la tabla `inbox_messages`: se conservan con sus datos.
- Pantallas retiradas que solo redirigen (`/equipo/mis-contactos`, `/crm/my-visits`, `/inbox`, `/settings`…): son
  para enlaces viejos guardados. La lista completa, en `docs/MAPA_DE_PANTALLAS.md`.

## Cómo pedir un arreglo

```
Lee CLAUDE.md y la ficha de <pantalla> en docs/MAPA_DE_PANTALLAS.md.
Problema: <qué pasa>, con el rol <rol>, en <teléfono/computadora>.
Esperado: <qué debería pasar>.
Respeta quién ve y quién hace qué, y la privacidad de la ficha.
Antes de cambiar una ruta o un permiso, busca todas sus llamadas.
Primero escribe una prueba que lo demuestre (incluida la de quien NO debe poder),
después arréglalo y confirma con como-ci, web:build y el navegador a 375 px.
No hagas commit.
```
