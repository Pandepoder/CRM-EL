# Bitácora — línea base (paso 1 del plan)

Referencia para evaluar los cambios de la bitácora. Solo lectura del código; no se modificó
ningún dato. Estado del repositorio: rama `claude/bitacora-issues-plan-2f8779`, sobre `9cbebff`.

## 1. Fallos confirmados en el código

| # | Fallo | Evidencia |
|---|-------|-----------|
| F1 | Los tipos de actividad viven en código y se traducen a categorías de incidencia (`apoyos`→`emergencia`, `evento`/`estructura`→`mitin`, etc.) más un prefijo en el título. | `api/equipo/tareas/route.ts:113-140` |
| F2 | El tipo se deduce del prefijo del título; un título que ya contiene `[`…`]` no recibe prefijo y pierde el tipo visible. | `route.ts:138-140` |
| F3 | Ubicación y asistentes se concatenan dentro de `description` como texto. | `route.ts:142-148` |
| F4 | Con `contactId` se crea la actividad **y** una visita sin vínculo entre ambas (posible doble conteo). | `route.ts:172-205` |
| F5 | Si la sección no tiene colonia, se usa la primera colonia de la tabla; si no hay ninguna, la visita se omite en silencio. | `route.ts:174-187` |
| F6 | El formulario de resultado ofrece `positive_commitment`, `needs_followup`, `rescheduled`, `cancelled`; la base solo admite `successful`, `no_contact`, `follow_up_required`, `rejected` (`visit_results_outcome_check`). | `AgendaClient.tsx:1436-1450` vs `schema.ts:475-483` |
| F7 | Para actividades que no son visitas se envía siempre `status: "resolved"`; el resultado elegido se ignora y solo el resumen se anexa a `description`. | `AgendaClient.tsx:198-201`, `tareas/[id]/route.ts:47-53` |
| F8 | Contactos y secciones de los selectores se cargan con `limit(100)`. | `equipo/page.tsx:379, 394` |
| F9 | La consulta de actividades no selecciona `mediaUrls`; `MediaGallery` nunca recibe evidencias en el listado. | `page.tsx:146-160` vs `AgendaClient.tsx:665` |
| F10 | La hora inicial del formulario usa `toISOString()` (UTC) para un `datetime-local` (hora local): desfase de horas. | `AgendaClient.tsx:144, 249` |
| F11 | Alta de actividad exige coordenadas; el formulario no siempre las tiene, y el servidor responde 400 solo tras el envío. | `route.ts:53-58` |
| F12 | La creación exige `requireLiderParaIncidencias`; el resto de acciones del listado usa `actorFromSession`. Botones y permisos reales no coinciden en todos los casos (por verificar en el paso 8). | `route.ts:18` vs `[id]/route.ts:18` |
| F13 | Sin protección contra doble envío (no hay clave de idempotencia). | `route.ts` (sin control) |

Pendientes de confirmar con datos (no de solo lectura): "Reportar resultado" que solo muestra
aviso, notas privadas de prospectos dentro del alcance de red, duplicados de conversión de
prospectos, conteos de productividad por creador y responsable.

## 2. Flujos que deben seguir funcionando

Para cada flujo: pantallas donde se debe comprobar el efecto.

1. **Crear actividad** (`POST /api/equipo/tareas`): aparece en bitácora y en el mapa con su categoría; queda registro en `audit_logs` (`agenda.task.create`).
   Verificar: bitácora, mapa, resumen.
2. **Actividad con contacto**: entra en el historial del contacto; exige acceso al contacto (404 si no).
   Verificar: ficha del contacto, bitácora.
3. **Asignar a otra persona**: solo dentro del alcance de red (403 fuera); el admin global sin restricción.
4. **Municipio**: el explícito del catálogo o el de la sección del punto; nunca Tonalá por defecto.
5. **Registrar resultado de visita** (`…/visits/[visitId]/complete`) con los cuatro resultados válidos.
6. **Cambiar estado de actividad** (`PATCH /api/equipo/tareas/[id]`): estado validado, permiso por incidencia.
7. **Borrar actividad** (`DELETE`): solo con el permiso de borrar.
8. **Adjuntar evidencia** al crear (`mediaUrls`).
9. **Capturar prospecto** (`/api/prospectos`) y **convertirlo** (`/api/prospectos/[id]/convertir`).
10. **Consulta de equipo**: filtros de periodo y alcance por rol (`page.tsx:60-120`).

### Matriz de permisos a comprobar

| Acción | Admin | Líder / dirección | Operador |
|--------|-------|-------------------|----------|
| Crear actividad | sí | sí (a su equipo) | no |
| Ver actividades ajenas | todas | las de su cascada, nunca otra dirección | propias |
| Cambiar estado / borrar | sí | según `puedeSobreIncidencia` | según `puedeSobreIncidencia` |

## 3. Datos de prueba representativos (solo local)

Crear en `scripts/local/` (excluido de git, ver memoria del proyecto):

- Actividad de cada uno de los 8 tipos.
- Actividad con contacto y sección con colonia; con contacto y sección **sin** colonia.
- Contacto número 101+ (orden alfabético) y sección número 101+.
- Actividad con evidencia adjunta.
- Actividad cercana a medianoche (23:30 local) para F10.
- Un prospecto sin convertir y uno convertido.
- Usuarios: admin, líder de dirección A, líder de dirección B, operador.

## 4. Criterio de cierre del paso 1

- [x] Lista de fallos confirmados (sección 1).
- [x] Lista de comportamientos a preservar (sección 2).
- [ ] Datos de prueba locales creados (sección 3).
- [ ] Pruebas automáticas de caracterización para F4, F6, F7, F8, F9 y F10 (fallan hoy, pasan al corregir).

## 5. Estado tras la implementación

| # | Fallo | Cómo quedó |
|---|-------|-----------|
| F1 | Tipos en código, deducidos a categorías de incidencia | Catálogo `activity_catalog_options` (migración 0017). `event_reports.category` sigue siendo la categoría del mapa; el tipo es `activity_type_id`. Se crean, renombran, ordenan, archivan y fusionan desde la app. |
| F2 | Tipo deducido por el prefijo del título | El título se guarda tal cual. Los registros antiguos recuperan su tipo solo por el prefijo exacto que escribía la app; el resto queda «sin tipo», con su información intacta. |
| F3 | Ubicación y asistentes mezclados en la descripción | Columnas propias `location_text` y `estimated_attendees`. |
| F4 | Contacto creaba actividad + visita sin relación | `event_reports.visit_id` las une; la visita se agenda con `scheduleVisit` solo si el tipo lo indica (`creates_visit`). Listado, resumen, resumen global y perfil cuentan un solo registro. |
| F5 | «Primera colonia disponible» | La colonia sale del territorio confirmado del contacto; si no se puede agendar, la actividad se guarda y se avisa por qué. |
| F6 | Resultados ofrecidos ≠ aceptados | Lista única (`lib/actividades`): 5 resultados, iguales en formulario, servidor y ambos `CHECK` de la base. Reprogramar y cancelar son acciones, no resultados. |
| F7 | Siempre «resuelta» | Completar guarda resultado, conclusión, autor y fecha real; cierra también la visita vinculada. |
| F8 | Selectores con `limit(100)` | Búsqueda en servidor, paginada, con el mismo alcance que el directorio. |
| F9 | Evidencias no llegaban al listado | La consulta las trae; la ficha las muestra y permite agregarlas. |
| F10 | Hora inicial en UTC | Helpers de hora local; días de la bitácora en zona `America/Mexico_City`. |
| F11 | Ubicación exigida solo tras enviar | Se valida en el formulario, junto al campo. |
| F12 | Botones ≠ permisos | «Nueva actividad» y «Administrar opciones» solo para quien puede crear; acciones por fila según `puedeActuar`. |
| F13 | Sin protección contra doble envío | `client_request_id` único: reintento o doble clic devuelve la misma actividad. |

Migraciones nuevas: `0017_bitacora_catalogo_y_seguimiento.sql`, `0018_prospectos_seguimiento_y_perfiles.sql`
(aditivas; las columnas nuevas no se leen desde la versión anterior).
