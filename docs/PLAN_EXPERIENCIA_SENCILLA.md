# Plan: un CRM que cualquiera pueda usar

> Fecha: 2026-10-04 · Rama: `claude/crm-intuitive-improvements-e7fe1b` · **Plan completo**: fases 1 a 4 hechas
> (la 4 son las decisiones del §4, tomadas el 2026-10-06), revisión de pruebas y «Reportar un problema» el
> 2026-10-07. Qué cambió, en palabras sencillas: §0. Estado: §5. Qué prueba cada prueba y quién ve qué: §8.
> Reportar un problema: §9. Para desplegar: las migraciones `0026` y `0027` se aplican solas (§5, «Para
> desplegar»).

El objetivo es que una persona que nunca usó un CRM abra el sistema en su celular, en la calle, y sepa
**qué hacer, cómo hacerlo y que lo hizo bien**, sin capacitación previa. Y, de paso, que lo disfrute un
poco.

Este plan lo arma un equipo de especialistas, cada uno con una lente distinta. Cuatro de ellos auditaron el
código por separado (solo lectura) y entregaron sus hallazgos con archivo y línea. Los demás cuidan que lo
que se cambie no rompa lo que ya está decidido.

## 0. Qué cambió, en palabras sencillas

Para quien usa el sistema, sin términos técnicos. Ningún campo ni dato se quitó: lo que se movió (acciones
poco usadas, columnas de tablas) sigue a un toque. Quién ve qué no cambió, salvo el total de la brigada sin
nombres (§4, decisión 3).

**Para todos**
- **«Mi día»**: una tarjeta con la meta del día en un anillo, la racha de semanas trabajadas y la siguiente
  insignia. Al tocarla enseña las 14 insignias, el ritmo («Tranquilo», «Normal», «Con todo») y, si la
  persona tiene equipo, el total de su equipo en la semana.
- **Celebración** al guardar: confeti, una vibración corta y una frase de ánimo. Al cumplir la meta o ganar
  una insignia, se anuncia en grande.
- **«Primeros pasos»**: la primera vez, cuatro pasos según el rol, en su pantalla de inicio. Se cierra una vez.
- **Avisos dentro de la página** en lugar de las ventanitas grises del navegador: en rojo si algo falló (con
  qué hacer) y en verde si salió bien.
- **«?» junto a las palabras difíciles** (militancia, sección, prospecto, seguimiento, efectividad, Escucha
  Social, QR, medallas, meta): al tocarlo, la explicación sale abajo.
- **Menú**: nombres cortos («Mapa», «Agenda»), los nombres que la campaña ya usa con una línea debajo que
  dice qué son («Estructura Electoral — Representantes por sección»), «Todos los reportes» en vez de
  «Auditoría de Eventos» y «Mi cuenta y ajustes». Ningún título queda sobre un solo enlace (al brigadista,
  Escucha Social le queda junto a Mapa, Agenda y Directorio). Cambiar de pantalla ya no recarga la página.
- **Letra y botones**: los botones de cerrar y de paginar miden 44 px (se tocan con el dedo); la letra de 9-10
  px pasó a 11 px y los grises claros a uno más oscuro en las pantallas de campo y en el menú.
- **Entrar**: si falla, dice qué revisar y ofrece «¿Olvidaste tu contraseña?». La solicitud de acceso ya no
  promete un correo que el sistema no manda.

**Al registrar a un ciudadano**
- Al guardar: «¡Listo! Juan quedó registrado», con «Registrar a un vecino» (conserva colonia, sección y
  municipio) y «Ver su ficha».
- El «+» de abajo ofrece «Ciudadano» primero; si es lo único que la persona puede crear, va directo al alta.
- **«Estoy en su domicilio: usar mi ubicación»**, grande y primero: llena municipio, sección, colonia y calle.
- La lista de secciones es la del municipio elegido; si se escribe una de otro, dice de cuál es.
- El teléfono repetido se avisa al terminar de escribirlo, no al final.
- Mensajes por campo y en español; la fecha de primer contacto en hora de Jalisco; el panel ya no
  autocompleta con los datos de quien captura; «Cancelar» con algo escrito pregunta antes de borrar.

**En la calle (Agenda, Directorio y ficha)**
- **Llamar, WhatsApp y Cómo llegar** en la ficha, en las tarjetas del Directorio y en el perfil.
- El Directorio, las Incidencias y la lista del perfil son **tarjetas en el teléfono**, sin deslizar de lado.
- **«Registrar resultado»**: un botón grande, cinco resultados con emoji, frases rápidas y el borrador que se
  guarda solo. Lo poco usado está en «Más acciones».
- **Sin señal**: el resultado de una visita o actividad se guarda en el teléfono y se envía solo cuando vuelve
  la conexión; reenviarlo no lo cierra dos veces. La ficha distingue «sin señal» de «no existe».
- La visita pendiente sale arriba de la ficha; el mapa abre la actividad exacta en la Agenda.
- Al cerrar una visita, el cuadro de texto no deja escribir más de lo que la visita acepta (1000 caracteres), y
  los avisos de las visitas salen en español («Esta visita ya estaba cerrada»), no en inglés.
- La Agenda vacía dice la verdad según lo que cada quien puede hacer.

**QR público y «Unirme»**
- El QR confirma con nombre y teléfono; el teléfono repetido se dice en ámbar («ya estás en la red»), no
  como error. Campos de 16 px (el iPhone ya no hace zoom), la encuesta contestada se envía aunque se pliegue
  y el botón dice «Registrarme».
- «Unirme» repite el correo y ofrece «Ir a iniciar sesión» y «Sumar a otra persona».

**Reportar un problema** (§9)
- En el menú, en «Mi cuenta y ajustes», todos tienen **«Reportar un problema»**: dónde pasó (solo pantallas
  y funciones que la persona usa), qué pasó (cuatro botones: algo falla, no sé usarlo, se ve mal, tengo una
  idea), una frase (con frases rápidas) y, si quiere, una captura de pantalla. Funciona sin señal.
- Cada aviso de error trae **«Reportar este problema»** y no se borra solo mientras sigas en esa pantalla. La
  pantalla de «No pudimos cargar esta pantalla» también lo trae. El formulario llega con la pantalla y el
  mensaje ya puestos: son tres toques.
- Desde el menú, el formulario ya dice la pantalla donde estabas («Es donde estabas»): son cinco toques.
- «Enviar» siempre se ve, aun en un teléfono chico; la captura es un botón chico que se abre si se quiere.
- Cuando administración contesta, sale un aviso «Te respondieron un reporte» con «Ver respuesta», y un número
  junto a «Reportar un problema» y en «Más». Al abrirlo, la respuesta sale primero.
- «Primeros pasos» dice, al pie, dónde reportar.
- Administración tiene **«Problemas reportados»**, con el número de nuevos en el menú: cuántos hay por estado,
  en qué pantallas se reporta más, cada reporte con sus datos técnicos, y la respuesta para quien reportó.

**Para quien coordina (Resumen y metas)**
- **Medallas por meta propia**: oro, plata o bronce según los días de la semana en que cada quien llegó a su
  meta. Ya no premian el lugar en la lista; varias personas pueden tener oro.
- **Siete puntos por persona** (lunes a domingo): verde el día que cumplió, con «Hoy: 4 de 10».
- **«Cambiar meta»**: quien coordina le pone a alguien de su equipo una meta del día (o se la quita); la
  persona la ve en su «Mi día».
- **Pulso de tu gente** en «Mi día»: cuánto lleva tu equipo esta semana contra la pasada.
- El Resumen se calcula en la base (más rápido con equipos grandes) y se lee bien en el teléfono.

## 1. Tres reglas para todo el equipo

1. **Una pantalla, una tarea.** Lo primero que se ve es lo que la persona vino a hacer. Encabezados,
   adornos y opciones raras van después o plegados.
2. **Siempre decir qué sigue.** Toda acción termina con una confirmación clara («Listo: Juan quedó
   registrado») y el siguiente paso a un toque («Registrar a un vecino», «Ver su ficha»). Una pantalla
   vacía no dice «no hay datos»: explica qué es y ofrece la acción.
3. **Celebrar lo que cuenta, no lo que infla.** Los logros se calculan con registros activos y sin
   duplicados. Dar de baja un registro basura quita el logro solo. No hay rankings nuevos entre personas
   que no se mandan entre sí.

**Lo que no se toca** (decidido por el dueño, ver `docs/PLAN_ADMIN_MUNICIPAL.md` y las pruebas de alcance):
quién ve qué, el mando en cascada, quién puede crear qué y las reglas de cada formulario (teléfono
repetido, domicilio obligatorio en el panel, colonia en el QR). Este plan cambia presentación, lenguaje,
orden, atajos y retroalimentación. Ninguna API da datos nuevos de otras personas, con una sola excepción
decidida en el §4 (decisión 3): el total de la semana de la brigada, sin nombres y con 4 o más personas.

## 2. El equipo

| # | Agente | Lente | Pregunta que se hace |
|---|---|---|---|
| 1 | **Dirección de producto** | Prioridad y coherencia | ¿Esto lo nota quien está en la calle hoy? |
| 2 | **Investigación de usuarios y lenguaje** | Primer uso, palabras, estados vacíos | ¿Lo entiende alguien que nunca usó un CRM? |
| 3 | **Diseño de interacción y formularios** | Altas, QR, incidencias, actividades | ¿Cuántos toques cuesta y qué ve al terminar? |
| 4 | **Experiencia móvil y de campo** | Agenda, ficha, directorio, sin señal | ¿Se puede con una mano, al sol y sin señal? |
| 5 | **Motivación y juego** | Metas, rachas, insignias, celebración | ¿Dan ganas de volver mañana? |
| 6 | **Guardiana de privacidad y permisos** | Alcance, mando, datos personales | ¿Esto enseña algo que antes no se veía? |
| 7 | **Calidad (QA)** | Pruebas, validación, capturas a 375 px | ¿Cómo sé que funciona para cada rol? |
| 8 | **Plataforma y rendimiento** | Navegación, consultas, carga | ¿Se siente rápido con mala señal? |

### Agente 1 · Dirección de producto

**Misión.** Ordenar el trabajo por impacto en campo, fijar qué es «hecho» y defender las tres reglas.

**Decisiones de este plan:**
- La fase 1 es solo lo de alto impacto y bajo riesgo, sin migraciones ni cambios de permisos.
- Los renombres grandes del menú (Escucha Social, Estructura Electoral, Logística, Análisis) cambian
  nombres que la campaña ya usa. Se propusieron al dueño, que delegó la decisión (§4).
- Toda cifra nueva sale de registros propios de quien la ve. Nada de comparar brigadas ajenas.

**Hecho quiere decir:** `pnpm validate` y `pnpm web:build` en verde, capturas a 375 px de las pantallas
tocadas con al menos tres roles, y el plan actualizado en §5.

### Agente 2 · Investigación de usuarios y lenguaje

**Encontró:**
- **L1.** No hay bienvenida dentro del panel: `BienvenidaConoceme` solo sale en las páginas públicas.
  Después de iniciar sesión nadie explica qué hacer primero.
- **L2.** Con la agenda vacía, al brigadista se le dice «también puedes registrar una nueva», aunque no
  puede (`equipo/componentes/ListaActividades.tsx`).
- **L3.** La misma persona ve cuatro nombres para su rol: Brigadista, «Brigada Territorial», `CONEXION`,
  «promovido a ENLACE» (`DirectorioClient.tsx`, `ResumenClient.tsx`, `crm/nuevo/page.tsx`).
- **L4.** Botones que llevan a pantallas que rebotan sin explicar: «Registrar Ciudadano» para el
  brigadista en el Directorio; «Programar Nueva Actividad» en el perfil.
- **L5.** Una tarea, muchos nombres: «Nuevo Registro», «Registro Social», «+ Contacto», «Registros
  Sociales»; «Agenda Operativa», «bitácora de campo», «Bitácora».
- **L6.** En el celular se ven dos títulos distintos para la misma pantalla.
- **L7.** Escucha Social se confunde con Incidencias (el ejemplo del formulario es una luminaria).
- **L8.** Si fallas al entrar, no hay qué hacer: no existe «¿Olvidaste tu contraseña?».
- **L9.** «Solicitar acceso» promete un aviso por correo que el sistema no envía.
- **L10.** Pantallas vacías sin siguiente paso (Resumen sin equipo, Escucha, Estructura, Prospectos…).
- **L11.** Palabras técnicas a la vista: «ficha 360°», «El ID no es válido», «Nota Inicial Inmutable»,
  coordenadas en números, «Delegar Operador Responsable».
- **L12.** 50 `alert()`/`confirm()` del navegador con errores genéricos.
- **L13.** No hay ayuda contextual («¿Qué es esto?») para PAN declarada/confirmada, sección, prospecto.
- **L14.** El menú del brigadista tiene secciones de una sola entrada («Configuración» → solo Mi Perfil).

**Entrega:**
- Fase 1: L1 (tarjeta «Primeros pasos» por rol), L2, L4, L8, L9, L11 y los renombres seguros del menú.
- Fase 2: L3, L5, L6, L7, L10, L14 y el componente `<QueEsEsto>` (L13).
- Fase 3: cambiar los `alert()` por avisos dentro de la página (L12).

### Agente 3 · Diseño de interacción y formularios

**Encontró:**
- **F1.** El alta de ciudadano termina sin confirmación: salta al directorio en silencio. «Registrar
  otro» solo aparece cuando no hay señal (`crm/nuevo/NuevoContactoForm.tsx`).
- **F2.** El botón «+» no ofrece registrar ciudadanos, que es lo que más se hace (`packages/ui/QuickCreateFab.tsx`).
- **F3.** El cierre del QR no confirma datos, y el teléfono repetido sale en rojo como si fuera error.
- **F4.** Autocompletado al revés: el panel sugiere los datos de quien captura; el QR, donde la persona
  llena lo suyo, no ayuda.
- **F5.** La «fecha de primer contacto» se calcula en UTC: después de las 18:00 propone mañana.
- **F6.** Mensajes de validación en inglés o genéricos («Datos de registro inválidos.»).
- **F7.** El QR enseña 15 campos (6 obligatorios); la encuesta plegada pierde lo contestado.
- **F8.** Los errores de territorio no llevan al campo; la lista de secciones no se filtra por municipio.
- **F9.** Incidencia: el botón Guardar se bloquea mientras se busca la dirección, sin tiempo límite.
- **F10.** Un toque fuera del formulario borra todo lo capturado, sin preguntar.
- **F11.** Actividad: «Ubicación *» con placeholder «(opcional)»; lo obligatorio es el punto del mapa.
- **F12.** `/unirme` termina sin siguiente paso («Sumar a otra persona», «Iniciar sesión»).
- **F13.** El alta del panel está ordenada para oficina: el GPS, que llena cinco campos, es un botón chico.
- **F14.** La categoría de incidencia viene elegida por omisión («servicios»).
- **F15.** El teléfono repetido se descubre hasta el final.

**Entrega:**
- Fase 1: F1, F2, F4 (panel), F5, F9 y la celebración al guardar.
- Fase 2: F3, F6, F7, F10, F11, F12, F13.
- Fase 3: F8, F14, F15.

### Agente 4 · Experiencia móvil y de campo

**Encontró:**
- **C1.** No hay Llamar, WhatsApp ni «Cómo llegar» hacia un ciudadano en todo el sistema. El teléfono y
  la ubicación son solo texto (`crm/contacts/[id]/page.tsx`, `FichaActividad.tsx`).
- **C2.** Registrar el resultado de una visita cuesta unos 18 toques: 11 botones chicos y un formulario
  que aparece abajo.
- **C3.** El resultado de una visita se pierde sin señal (la cola solo cubre altas).
- **C4.** Sin señal, la ficha dice «Contacto no encontrado».
- **C5.** La primera pantalla del celular son encabezados apilados (~450 px antes del primer dato).
- **C6.** El Directorio es una tabla de 800 px: en 375 px hay que deslizar de lado para «Ver Ficha».
- **C7.** La búsqueda del Directorio no usa el teclado de búsqueda.
- **C8.** Poca respuesta al guardar: sin vibración y el mensaje sale fuera de la vista.
- **C9.** «Hoy» vacío: tres mensajes de vacío apilados, uno de ellos falso.
- **C10.** «Duplicar como nueva» se ofrece a quien no puede crear: cierra la ficha y no pasa nada.
- **C11.** Del mapa a la Agenda se pierde la actividad (enlaza a `/equipo` a secas).
- **C12.** Toques de menos de 44 px (cerrar diálogos, «Ver Ficha», flechas de página).
- **C13.** Letra de 10-11 px y gris claro difícil de leer al sol.
- **C14.** Cada toque del menú recarga la página completa (`<a href>` en vez de navegación de Next).
- **C15.** La ficha del ciudadano está ordenada para oficina: la visita pendiente va al final.

**Entrega:**
- Fase 1: C1 (ficha y directorio), C4, C6 (tarjetas en móvil), C7, C8 (vía la capa de celebración),
  C9, C10, C11.
- Fase 2: C2 (botón «Registrar resultado» fijo y resultados de un toque), C5, C12, C13, C15.
- Fase 3: C3 (resultado en la cola sin señal), C14.

### Agente 5 · Motivación y juego

**Encontró:**
- **M1.** No hay metas, rachas, logros ni celebraciones. Al registrar a un ciudadano no pasa nada.
- **M2.** Las cifras de cada persona ya existen sin cambiar el esquema: `contacts.created_by_user_id`,
  `visits.completed_by_user_id`, `event_reports.closed_by_user_id`, `rapid_activity_prospects` y
  `social_listening`, con los días de Jalisco de `lib/actividades.ts`.
- **M3.** El único elemento de juego es un ranking con medallas por posición en el Resumen.

**Diseño:**
- **«Mi día».** Una tarjeta con la meta del día (anillo), la racha semanal y la siguiente insignia. Va en
  el inicio de cada rol: Agenda, Directorio y Resumen.
  - Meta por rol: 10 acciones para quien registra, 5 para el brigadista.
  - La persona elige el ritmo («Tranquilo», «Normal», «Con todo»), que se guarda en su teléfono.
- **Racha semanal, no diaria.** Cuenta semanas seguidas con dos o más días activos, para no castigar a
  quien ayuda solo los fines de semana.
- **Insignias calculadas en vivo** (§6): sin tabla nueva, así que si se da de baja un registro, la
  insignia se recalcula sola.
- **Celebración ligera.** Confeti solo con CSS, una vibración corta y un aviso abajo con una frase de
  ánimo distinta cada vez. Respeta «reducir movimiento». Cuando se gana una insignia, se anuncia en
  grande.
- **Antitrampa.**
  - Solo cuentan registros activos, y los completos se cuentan por teléfono distinto.
  - Pasando el doble de la meta ya no hay más celebración («ya cumpliste; ahora, calidad»).
  - No hay insignias por militancia PAN.

**Entrega:**
- Fase 1: todo lo anterior. La API es personal (`GET /api/yo/progreso`): no recibe ningún id, así que no
  se puede pedir el progreso de otra persona.
- Fase 2: «Pulso de mi brigada» para el líder, con `commandUserIds`, el total de la semana contra la
  anterior y solo reconocimientos positivos.
- Fase 4 (decidida en el §4): una meta que fije el líder (columna nueva) y que las medallas del Resumen midan
  a cada quien contra su propia meta.

### Agente 6 · Guardiana de privacidad y permisos

**Revisa cada cambio con tres preguntas:**
1. ¿Lee datos de personas? Entonces parte de `resolveUserNetworkScope` y de las restricciones de siempre.
2. ¿Ofrece una acción? Entonces se decide con la misma regla del servidor (`puedeAbrir`, `puedeCrear`,
   `canEditData`…), nunca con una lista de roles nueva.
3. ¿Enseña algo en la calle? La celebración y las frases nunca llevan nombres de ciudadanos.

**Sobre la fase 1:**
- «Mi día» solo cuenta registros propios: `created_by`, `completed_by`, `closed_by` iguales a quien
  pregunta.
- Llamar y WhatsApp usan el teléfono que la ficha ya enseñaba.
- «Cómo llegar» usa el punto o el domicilio que la ficha ya enseñaba.
- Ocultar botones que rebotan no cambia permisos: la guarda de cada pantalla sigue igual.

**Sobre la fase 4:**
- La meta del líder se decide con `commandUserIds`, la misma lista con que se decide quién trabaja lo de quién;
  ver no basta. Nadie se la pone a sí mismo.
- El total de la brigada es una suma sin nombres ni ids, solo con 4 o más personas activas, y la API sigue sin
  recibir ningún id. El pulso de quien coordina suma a la gente que ya ve en el Resumen.
- Las medallas y los puntos de la semana del Resumen salen de las mismas personas y registros que el Resumen
  ya enseñaba.

### Agente 7 · Calidad (QA)

- Pruebas unitarias de la lógica pura de logros: racha, insignias, meta, frases, meta del líder y medallas
  (`apps/web/src/lib/logros.test.ts`).
- `pnpm validate` (tipos, lint, fronteras de módulos, pruebas) y `pnpm web:build`.
- Capturas a 375 px y en escritorio con la copia del simulacro (`tonala_os_simulacro`, `:3300`), con
  sesión por cookie y nunca escribiendo contraseñas en el navegador. Mínimo: brigadista, capturista,
  líder y administración, en Agenda, Directorio, ficha, alta y Resumen.

### Agente 8 · Plataforma y rendimiento

- Fase 1: las consultas de «Mi día» son unos seis conteos indexados por persona y se piden al abrir la
  pantalla y después de cada envío, sin sondeo periódico.
- Pasar el tablero del Resumen a `GROUP BY` (hecho en la fase 4; antes traía todas las filas a memoria).
- Navegación del menú sin recarga completa (C14), pasando el `Link` de Next desde `ShellWrapper` (fase 2).
- Índices en `visits(completed_by_user_id)` y `event_reports(closed_by_user_id)` (fase 4, migración `0026`):
  las medallas del Resumen cuentan los cierres de todo el equipo cada vez que se abre.

## 3. Fases

| Fase | Qué | Riesgo |
|---|---|---|
| **1 · Ya** | Mi día con insignias y celebración; alta con confirmación y «Registrar a un vecino»; «+» con Ciudadano; Llamar, WhatsApp y Cómo llegar; directorio en tarjetas; primeros pasos por rol; agenda vacía honesta; textos técnicos y de acceso; renombres seguros del menú | Bajo: sin migraciones ni permisos |
| **2 · Siguiente** | Registrar resultado en 5 toques; QR más corto con mensajes claros; un solo nombre por tarea y por rol; títulos iguales al menú; estados vacíos con acción; «¿Qué es esto?»; pulso de la brigada | Bajo-medio |
| **3 · Después** | Resultado de visita sin señal; navegación sin recarga; secciones filtradas por municipio; avisos dentro de la página en vez de `alert()` | Medio |
| **4 · Decisiones** | Las cuatro del §4: menú con ayuda, medallas por meta propia, total de la brigada sin nombres, meta del líder; y los pendientes menores (títulos, nombres, letra, botones) | Medio: una migración compatible (`0026`) |

## 4. Decisiones del dueño

Se propusieron cuatro cambios que tocan cómo la campaña nombra las cosas, qué se mide o qué ve cada quien. El
2026-10-06 el dueño delegó la decisión («toma la mejor opción»). Se eligió, en cada una, la opción que ayuda a
quien llega nuevo **sin quitarle nada** a quien ya usa el sistema y sin enseñar datos de otras personas.

1. **Renombres grandes del menú → nombre de siempre más una línea que dice qué es.**
   - Escucha Social y Gestiones: «Lo que piden los vecinos».
   - Estructura Electoral: «Representantes por sección».
   - Logística e Inventarios: «Material y almacén».
   - Análisis Demográfico: «El padrón en números».
   - **Por qué así:** cambiar el nombre desorienta a quien ya lo dice así en las juntas y en los mensajes; la
     línea de abajo orienta al nuevo sin cambiar lo que los demás conocen.
   - **La excepción es «Auditoría de Eventos», que pasa a «Todos los reportes»** («Incidencias y eventos a tu
     cargo»): convivía con «Auditoría de cambios», que es otra cosa, y la pantalla ya se titulaba «Reportes e
     Incidencias». Ahora el título de la pantalla es el del menú y las categorías salen con su nombre.
   - Dónde: `packages/ui/role-home.ts` (campo `ayuda`), `AppShell.tsx`, `globals.css`, `admin-inbox/page.tsx`.
2. **Medallas del Resumen → por días con la meta propia cumplida, no por lugar.**
   - Oro: 3 días o más de la semana (lunes a domingo); plata: 2; bronce: 1. Varias personas pueden tener oro.
   - La meta de cada quien es la que le puso quien lo coordina o, si no tiene, la de su rol (10 al día para quien
     registra, 5 para quien hace visitas). El ritmo que la persona eligió en su teléfono no lo conoce el
     servidor; «Mi día» se lo explica.
   - Cada tarjeta enseña siete puntos (verde el día cumplido) y «Hoy: 4 de 10». No se quitó ningún número: las
     personas, PAN y agenda de cada quien siguen igual, y la lista conserva su orden.
   - **Por qué así:** antes dos personas que cumplían igual quedaban en escalones distintos, y quien ayuda poco
     pero constante nunca veía una medalla. Medir contra la meta propia premia la constancia.
   - Dónde: `lib/logros.ts` (`medallaDeLaSemana`, `diasConMeta`), `resumen/page.tsx`, `ResumenClient.tsx`,
     glosario «medallas».
3. **Total de la brigada para el brigadista → sí, sin nombres y con 4 o más personas activas.**
   - «Tu brigada esta semana: 40. Tú aportaste 8 (20%).» Es la suma de los líderes e integrantes de los
     equipos donde la persona es integrante. Sin ningún nombre ni id.
   - Con menos de 4 personas no se enseña: el total menos lo propio dejaría adivinar lo de un compañero.
   - Quien coordina recibe en su lugar el **pulso de su gente**: la semana contra la pasada y cuántas personas
     ya sumaron (es la gente que ya ve en el Resumen). Administración no lo lleva: tiene el Resumen.
   - **Por qué así:** el trabajo en equipo motiva más que el individual, y la regla de 4 mantiene la privacidad.
     Es el único dato nuevo de otras personas en todo el plan; lo revisó la guardiana de privacidad (agente 6).
   - Dónde: `lib/mi-progreso.ts` (`equipoDe`), `lib/acciones-por-dia.ts`, `components/MiDia.tsx`. La API sigue
     sin recibir ningún id (`GET /api/yo/progreso`).
4. **Meta fijada por el líder → sí, con una columna nueva y la persona puede rebasarla.**
   - Quién puede ponerla: quien tiene a la persona bajo su mando (líder, dirección de su coordinación,
     administración de su municipio, el maestro). Nadie se la pone a sí mismo; un compañero de coordinación,
     una capturista o una dirección de otra coordinación, no.
   - De 1 a 200 acciones al día. «Quitar meta» devuelve a la persona a su ritmo. Cada cambio queda en la
     auditoría («Meta del día fijada»).
   - Se pone desde el Resumen («Cambiar meta» en la tarjeta, o la columna «Meta al día» en la tabla), con tres
     opciones rápidas (los ritmos del rol) u otra cantidad.
   - La persona la ve en su «Mi día» («Tu meta: 12 al día. Te la puso quien coordina tu equipo»), y la
     celebración de meta cumplida usa esa meta.
   - **Por qué así:** la meta la conoce mejor quien coordina; el ritmo en el teléfono sigue para quien no
     tiene una.
   - Dónde: migración `db/migrations/0026_meta_del_lider.sql`, `lib/meta-del-lider.ts`,
     `PUT /api/equipo/personas/[id]/meta`, `lib/logros.ts` (`metaVigente`, `opcionesDeMeta`).

## 5. Estado

### Fase 1: hecha el 2026-10-04

| Punto | Agente | Dónde |
|---|---|---|
| Plan y equipo | 1 | Este documento |
| M1-M2: «Mi día», insignias y API personal | 5 | `lib/logros.ts` (lógica pura), `lib/mi-progreso.ts` (conteos propios), `api/yo/progreso`, `components/MiDia.tsx`; en Agenda, Directorio y Resumen |
| Capa de celebración compartida (C8) | 5, 4 | `lib/celebraciones.ts`, `components/CapaDeCelebracion.tsx` (montada en `ShellWrapper`) y estilos al final de `globals.css` |
| Celebraciones conectadas | 5 | Alta de ciudadano, visita completada (ficha y Agenda), actividad completada o guardada, prospecto, incidencia y envíos pendientes que salen solos |
| F1: alta con «¡Listo!», «Registrar a un vecino» (conserva colonia, sección y municipio) y «Ver su ficha» | 3 | `crm/nuevo/NuevoContactoForm.tsx` |
| F2: «+» con Ciudadano (directo al alta si es la única opción) | 3 | `packages/ui/QuickCreateFab.tsx`, `AppShell.tsx` |
| F4: el panel ya no autocompleta con los datos de quien captura · F5: fecha de primer contacto en hora de Jalisco | 3 | `NuevoContactoForm.tsx` |
| F9: la incidencia se guarda sin esperar la dirección (corte a los 6 s) | 3 | `mapa/ModalesDeIncidencia.tsx` |
| C1: Llamar, WhatsApp y Cómo llegar | 4 | `lib/acciones-de-contacto.ts`, `components/AccionesDeContacto.tsx`; ficha y tarjetas del directorio |
| C4: la ficha distingue «sin señal» de «no existe», con Reintentar | 4 | `crm/contacts/[id]/page.tsx` |
| C5 (parcial): el encabezado de la Agenda ocupa menos en el teléfono | 4 | `equipo/AgendaClient.tsx` |
| C6-C7: directorio en tarjetas en el teléfono; búsqueda con teclado de búsqueda; toques de 44 px en la paginación | 4 | `crm/contacts/DirectorioClient.tsx` |
| C9-C11: vacío de la Agenda honesto por permiso; «Duplicar» solo para quien crea; el mapa abre la actividad exacta | 4 | `ListaActividades.tsx`, `FichaActividad.tsx`, `mapa/html.ts`, `mapa/CentroDeMando.tsx` |
| L1: «Primeros pasos» por rol en su inicio, se cierra una vez | 2 | `components/PrimerosPasos.tsx` |
| L3 (parcial): nivel con nombre («Integrante», «Líder de equipo») en Directorio, alta y Resumen | 2 | `lib/lenguaje.ts` |
| L4: el brigadista ya no ve «Registrar ciudadano»; le ofrece compartir su QR | 2 | `DirectorioClient.tsx` |
| L8-L9: entrada fallida que dice qué revisar, «¿Olvidaste tu contraseña?» y solicitud sin promesa de correo | 2 | `api/auth/login`, `login/page.tsx`, `register/page.tsx` |
| L11 (parcial): «ficha 360°», «El ID no es válido», «Nota Inicial Inmutable», «+ Contacto», «Bienvenido» | 2 | Ficha, alta y Resumen |
| Renombres seguros del menú | 2 | `packages/ui/role-home.ts` |

**Cómo se comprobó (agente 7):**
- `pnpm validate` en verde: 600 pruebas, incluidas 20 nuevas de `logros.test.ts` y `acciones-de-contacto.test.ts`. La prueba del globo del mapa se actualizó al enlace nuevo.
- `pnpm web:build` en verde.
- Con el simulacro (`tonala_os_simulacro`, `:3300`), dos guiones locales que no se versionan.
  - `scripts/local/mi-dia-http.mts` (46 comprobaciones, todas bien) compara cada cifra de `/api/yo/progreso` con un conteo hecho a mano en la base, para administración, dirección, líder, capturista y brigadista. También comprueba que sin sesión responde 401, que un `?userId=` ajeno se ignora y que cada inicio abre.
  - `scripts/local/experiencia-sencilla.mts` (20 comprobaciones, todas bien) recorre en un teléfono de 375 px: el alta con «¡Listo!» y celebración; el vecino con la colonia conservada; la ficha nueva con sus tres enlaces; el «+» por rol (el del capturista lleva directo al alta; el del líder abre un menú con Ciudadano primero; el brigadista no tiene botón); «Primeros pasos», que se cierra y no vuelve ni sale fuera del inicio; y la entrada fallida.
- Capturas a 375 px y en escritorio de Agenda (brigadista), Directorio (capturista) y Resumen (líder), sin desborde horizontal.

### Fase 2: hecha el 2026-10-05

Indicación del dueño para esta fase: más fácil y más vistoso, **sin quitar la posibilidad de capturar ni de ver información**. Ningún campo ni dato se eliminó: lo que se movió (acciones poco usadas, columnas de tablas) sigue a un toque.

| Punto | Agente | Dónde |
|---|---|---|
| C2: registrar resultado en pocos toques. Botón grande «Registrar resultado»; cinco resultados como botones con emoji; frases rápidas; acciones poco usadas en «Más acciones» (ninguna se quitó) | 3, 4 | `components/ElegirResultado.tsx` (compartido), `equipo/componentes/FichaActividad.tsx` |
| C3 (parcial): la conclusión y el resultado quedan como borrador en el teléfono hasta enviarse | 4 | `FichaActividad.tsx` |
| C15: la ficha del ciudadano pone la visita pendiente arriba, con el mismo selector de resultado en una hoja que sale desde abajo | 4 | `crm/contacts/[id]/page.tsx` |
| F10: cerrar con algo escrito pregunta antes (actividad, prospecto, incidencia, resultado de visita y «Cancelar» del alta) | 3 | `FormularioActividad.tsx`, `Prospectos.tsx`, `ModalesDeIncidencia.tsx`, ficha, `NuevoContactoForm.tsx` |
| F3: el QR confirma con nombre y teléfono; el teléfono repetido se dice en ámbar («ya estás en la red») y no como error | 3 | `registro/[slug]/PublicRegistrationClient.tsx` |
| F4 (QR): autocompletado de la persona fuera del modo evento; campos de 16 px (iPhone ya no hace zoom); año solo con números | 3 | Ídem |
| F6: mensajes de validación por campo y en español en las dos altas (antes, el de Zod en inglés o «Datos inválidos») | 3 | `lib/mensajes-de-validacion.ts`, `api/crm/contacts`, `api/public/registro` |
| F7: la encuesta contestada se envía aunque se pliegue; la pregunta 2 ya tiene dónde escribir «Otra» | 3 | `PublicRegistrationClient.tsx` |
| F12: «Unirme» repite el correo y ofrece «Ir a iniciar sesión» y «Sumar a otra persona»; contraseña con «Mostrar» | 3 | `unirme/[slug]/UnirmeForm.tsx` |
| L13: «¿Qué es esto?»: militancia, sección, prospecto, seguimiento, efectividad, Escucha Social, QR | 2 | `components/QueEsEsto.tsx` (glosario único) |
| L7: Escucha Social explica qué va ahí y qué es incidencia; ejemplo nuevo; vacío con botón | 2 | `escucha-social/EscuchaSocialClient.tsx` |
| L10: vacíos con siguiente paso (prospectos, incidencias) | 2 | `Prospectos.tsx`, `admin-incidencias/page.tsx` |
| L4: el perfil ya no ofrece «Registrar contacto» a quien no puede; «Programar nueva actividad» → «Ir a la Agenda» | 2 | `perfil/[id]/LeaderProfileClient.tsx` |
| Incidencias en el teléfono como tarjetas (la tabla de 900 px cortaba título, ubicación y sección); categoría con su nombre y color («Lona dañada», no LONA_DANADA) | 4 | `admin-incidencias/page.tsx` |
| Perfil: lista de ciudadanos como tarjetas en el teléfono, con Llamar, WhatsApp y todos sus datos | 4 | `LeaderProfileClient.tsx` |
| Equipos: tarjeta legible en el teléfono; botones de editar y borrar de 40 px | 4 | `admin-equipos/TeamsClient.tsx` |
| C14: el menú navega sin recargar la página (`next/link` inyectado en el armazón) | 8 | `packages/ui/AppShell.tsx`, `ShellWrapper.tsx` |
| Encabezado del teléfono: foto o iniciales (lleva a «Mi perfil») en vez del nombre en dos renglones | 4 | `AppShell.tsx`, `globals.css` |

**Cómo se comprobó:**
- `pnpm test`: 602 pruebas en verde, con 2 nuevas de `mensajes-de-validacion.test.ts`.
- tsc y eslint sin errores (los 15 avisos son de archivos que no se tocaron).
- `pnpm web:build` en verde.
- La primera corrida de `pnpm validate` la cortó Windows con 0xC0000409 a mitad de las pruebas, sin ninguna fallida. Al repetir `pnpm test`, todo pasó.
- `scripts/local/qr-y-unirme.mts` (15 comprobaciones, todas bien): campos de 16 px; año mal escrito con el mensaje en español; encuesta plegada que se guarda; «¡Listo, nombre!» con su teléfono; repetido en ámbar y sin `role=alert`; y «Unirme» completo.
- `mi-dia-http.mts` y `experiencia-sencilla.mts` de la fase 1, otra vez todo bien.
- En el navegador:
  - el menú cambia de pantalla sin recargar (una marca en `window` sobrevive a la navegación);
  - el borrador del resultado sobrevive a cerrar y abrir la ficha;
  - capturas a 375 px de Incidencias, Perfil, Escucha Social, Equipos, Análisis y Mapa, sin nada que se salga a lo ancho.

### Fase 3: hecha el 2026-10-06

| Punto | Agente | Dónde |
|---|---|---|
| C3: el resultado de una visita o actividad sin señal entra en la cola del teléfono y se envía solo al volver la conexión; la pantalla se pone al día | 4, 8 | `lib/cola-de-envios.ts` (tipo `resultado`, método PATCH), `FichaActividad.tsx`, `crm/contacts/[id]/page.tsx`, `EnviosPendientes.tsx` |
| El mismo cierre reenviado ya no es un error: la misma persona, con el mismo resultado y la misma conclusión, recibe 200 (`repetido`); cualquier otro cierre sobre algo cerrado sigue siendo 409 | 8, 6 | `lib/actividades-servicio.ts`, `api/crm/contacts/[id]/visits/[visitId]/complete` |
| L12: 34 `alert()` de 13 pantallas pasan a avisos dentro de la página (rojo si falló, verde si salió bien) con mensajes que dicen qué hacer; donde no hay panel, sigue el `alert()` | 2 | `lib/avisos.ts`, `components/CapaDeAvisos.tsx` |
| F8: en el alta, la lista de secciones es la del municipio elegido; si se escribe una de otro municipio, se dice de cuál | 3 | `components/ColonySelector.tsx` |
| F13: «Estoy en su domicilio: usar mi ubicación», grande y primero; «Buscar en el mapa» al lado | 3 | Ídem |
| F15: el teléfono repetido se avisa al salir del campo. Usa el mismo permiso que el alta, tiene un tope de 120 consultas por hora y por persona, y no se usa en el QR público | 3, 6 | `api/crm/contacts/telefono-repetido`, `NuevoContactoForm.tsx` |
| F11: en la actividad, «Punto en el mapa *» como botón y «Nombre del lugar (opcional)» aparte; el foco del error va al botón del mapa | 3 | `FormularioActividad.tsx` |
| F14: «¿Qué pasa? Toca uno» con botones de 44 px en la incidencia (la categoría por omisión se mantiene) | 3 | `mapa/ModalesDeIncidencia.tsx` |
| Sección con teclado numérico y «?» que explica qué es; menú: «Mi cuenta y ajustes» (L14); el alta sin el recuadro que repetía el encabezado (L6) | 2, 4 | `ColonySelector.tsx`, `role-home.ts`, `NuevoContactoForm.tsx` |

**Cómo se comprobó:**
- `pnpm validate` en verde, con 604 pruebas. Hay 2 nuevas en `cola-de-envios.test.ts`: el resultado se guarda sin señal y se reenvía por PATCH, y las altas siguen por POST.
- `pnpm web:build` en verde.
- `scripts/local/resultado-sin-senal.mts` (13 comprobaciones, todas bien). Con el teléfono sin señal, el cierre queda en la cola y la actividad sigue pendiente en la base. Al volver la señal, la cola lo envía y la actividad queda cerrada, con la frase rápida y a nombre de quien la cerró. Reenviar el mismo cierre da 200 y uno distinto da 409, con un solo cierre en el historial. Lo mismo con una visita suelta del brigadista.
- `scripts/local/alta-fase3.mts` (8 comprobaciones, todas bien). Cubre el teléfono repetido al salir del campo (el aviso se quita al corregir), la 2683 de Tonalá con Zapopan elegido, que al elegir Tonalá sí sale, el botón de ubicación y el teclado numérico.
- Los nombres de municipio de las 3,791 secciones (123 municipios) coinciden todos con el catálogo, así que el filtro no esconde secciones. Tonalá tiene 131 y Zapopan 499.
- Los recorridos de las fases 1 y 2 (`mi-dia-http`, `experiencia-sencilla`, `qr-y-unirme`), otra vez todo bien.
- La consulta de teléfono responde 401 sin sesión y 403 al brigadista.

### Fase 4: hecha el 2026-10-06

Las cuatro decisiones del §4 y lo que quedaba pendiente de las fases anteriores.

| Punto | Agente | Dónde |
|---|---|---|
| Decisión 1: menú con la línea «qué es» y «Todos los reportes» (título y categorías legibles, vacío que explica) | 1, 2 | `role-home.ts`, `AppShell.tsx`, `globals.css`, `admin-inbox/page.tsx` |
| Decisión 2: medallas por días con la meta propia; siete puntos por persona; «Hoy: N de M»; leyenda con «?» | 5 | `lib/logros.ts`, `resumen/page.tsx`, `ResumenClient.tsx`, `QueEsEsto.tsx` |
| Decisión 3: total de la brigada sin nombres (4+ personas) y pulso de la gente de quien coordina (era el «Pulso de mi brigada» de la fase 2 del agente 5) | 5, 6 | `lib/mi-progreso.ts`, `lib/acciones-por-dia.ts`, `MiDia.tsx` |
| Decisión 4: meta del líder (columna, permiso por mando, auditoría, diálogo en el Resumen, «Mi día» y celebración) | 5, 6, 8 | `0026_meta_del_lider.sql`, `schema.ts`, `lib/meta-del-lider.ts`, `api/equipo/personas/[id]/meta`, `auditoria-acciones.ts`, `CapaDeCelebracion.tsx` |
| Agente 8: el tablero del Resumen cuenta en la base con `GROUP BY` (antes traía todas las filas a memoria y filtraba por persona); índices `visits(completed_by_user_id)` y `event_reports(closed_by_user_id)` | 8 | `resumen/page.tsx`, `0026` |
| L6: títulos iguales al menú (Logística e Inventarios, Usuarios y permisos, Ajustes, Escucha Social y Gestiones, Todos los reportes) | 2 | Cada pantalla |
| L5 y L11: «Notas» (antes «Bitácora de Notas Fechadas»), «¿Quién la atiende?» (antes «Delegar Operador Responsable»), «Buscar la sección con el punto del mapa», «Punto en el mapa» (antes «Coordenadas»), «Registrarme» en el QR (antes «Completar Registro Social») | 2 | Ficha, `ReportesClient.tsx`, `IncidentSectionAssigner.tsx`, `ModalesDeIncidencia.tsx`, `PublicRegistrationClient.tsx` |
| C12: 19 botones de cerrar de 32 px pasan a 44 px (16 pantallas); paginación de «Todos los reportes» de 44 px | 4 | Diálogos del panel |
| C13: letra de 9-10 px a 11 px en Directorio, ficha, Resumen, Agenda, alta y enlace personal; grises claros más oscuros; barra de abajo y títulos del menú más grandes | 4 | Esas pantallas y `globals.css` |
| Resumen en el teléfono: las pestañas y el buscador ya no se salen a lo ancho | 4 | `ResumenClient.tsx` |

**Cómo se comprobó:**
- `pnpm validate`: tipos, lint (los mismos 15 avisos de archivos que no se tocaron), fronteras y **610 pruebas en
  verde** (6 nuevas en `logros.test.ts`: meta válida, meta vigente, opciones, medallas, semana de lunes a
  domingo y días con meta). Las pruebas de integración usan la base local, que necesita la `0026`: se corrieron
  en una copia desechable con la migración (`tonala_os_pruebas_rama`, borrada al terminar) para no tocar
  `tonala_os`.
- `pnpm web:build` en verde.
- Repetido como lo hace CI (2026-10-07): base vacía, `pnpm db:migrate` (con la `0026`), `pnpm db:seed` y
  `pnpm validate`: 610 pruebas en verde (`scripts/local/como-ci.mjs`, base desechable borrada al terminar).
- La `0026` aplicada a la copia del simulacro: se puede correr dos veces sin efecto y la base rechaza una meta
  de 500.
- `scripts/local/fase4-http.mts` (41 comprobaciones, todas bien):
  - Meta: 401 sin sesión; 403 a la capturista del equipo, a uno mismo, a otro líder, a la dirección de otra
    coordinación y a la administración de otro municipio; 400 con 0, 201, 2.5, «10», true o un cuerpo roto; 404
    con un id mal formado; 200 a su líder, a la dirección de su coordinación y a la administración de su
    municipio. Queda en la base con quién la puso y una sola fila de auditoría por cambio. El brigadista la ve en
    su «Mi día».
  - Brigada: el total y lo propio coinciden con un conteo a mano en la base, sin ningún nombre ni id; el pulso
    del líder coincide esta semana y la pasada; administración no lo recibe.
  - Resumen de la líder: para cada una de las 16 personas, personas y PAN (contra lo que ella ve en el
    directorio), acciones de la semana, días con meta, medalla y permiso de cambiar la meta coinciden con la base.
- En el navegador a 375 px: «Cambiar meta» con 1 al día le dio a un integrante la medalla de plata (dos días
  cumplidos) y el aviso verde; «Quitar meta» lo regresó a la de su rol. El menú con sus líneas de ayuda, «Mi
  día» del brigadista con su brigada y su meta, y «Todos los reportes» en escritorio. Sin desborde horizontal.
- Los recorridos de las fases 1 a 3 (`mi-dia-http`, `experiencia-sencilla`, `qr-y-unirme`,
  `resultado-sin-senal`, `alta-fase3`), otra vez todo bien.

### Revisión de pruebas: hecha el 2026-10-07

Pedido del dueño: que a nadie le falte información que deba ver, y que las pruebas prueben de verdad la
estructura y todas las funciones necesarias. Hasta aquí, lo nuevo de la fase 4 solo se había comprobado con los
guiones locales, que no corren en GitHub. Ahora todo tiene pruebas permanentes (§8), que corren en cada PR.

| Punto | Dónde |
|---|---|
| El tablero del Resumen sale de la página a `lib/resumen-tablero.ts` para poder probarlo contra una base; la página lo llama. Mismo resultado | `resumen/page.tsx`, `ResumenClient.tsx` (los tipos salen de ahí) |
| Reglas sacadas de las pantallas para probarlas: secciones del municipio (`lib/secciones-del-municipio.ts`), resultados de un toque (`lib/resultados-rapidos.ts`), pasos de «Primeros pasos» (`lib/primeros-pasos.ts`) y opciones del «+» (`packages/ui/boton-mas.ts`). Las pantallas hacen lo mismo que antes | `ColonySelector.tsx`, `ElegirResultado.tsx`, `PrimerosPasos.tsx`, `QuickCreateFab.tsx` |
| **Lo que encontraron las pruebas nuevas:** al capturista y al brigadista les quedaba la sección «Territorio» con una sola entrada. Ahora una sección de una sola entrada se junta con la anterior (salvo «Mi cuenta y ajustes»): su Escucha Social queda en «Trabajo de campo» | `juntarSeccionesSueltas` en `role-home.ts`, `AppShell.tsx` |
| **Lo que encontró la revisión del código:** al cerrar una visita, el cuadro de texto dejaba escribir 4000 caracteres, pero la visita acepta 1000, y el rechazo llegaba en inglés («Visit summary is too long.»). Ahora el cuadro no deja pasar de 1000 cuando se cierra una visita, y todos los mensajes del módulo de visitas que llegan a la pantalla están en español («Esta visita ya estaba cerrada.») | `FichaActividad.tsx`, ficha del ciudadano, `lib/actividades.ts`, `packages/modules/visits` |
| 9 archivos de prueba nuevos, 70 pruebas más: de 610 a **680**, todas en verde | §8 |

**Cómo se comprobó:**
- Igual que CI, en una base vacía y desechable: `pnpm db:migrate`, `pnpm db:seed`, `pnpm validate` (tipos, lint
  sin errores, fronteras y las 680 pruebas en 78 archivos). `pnpm web:build` en verde.
- **Fallas a propósito:** se metieron 17 errores en el código, uno por uno, y cada uno puso en rojo al menos una
  prueba (§8, «Las pruebas atrapan errores»). El código quedó como estaba (se comparó archivo por archivo).
- Los recorridos locales (`mi-dia-http`, `fase4-http`, `experiencia-sencilla`, `alta-fase3`,
  `resultado-sin-senal`), otra vez todo bien. En el navegador, el menú del brigadista ya sin la sección suelta.

### Reportar un problema: hecho el 2026-10-07

Pedido del dueño: una manera muy fácil de reportar errores y dar retroalimentación sobre el menú o la función
donde se está, en un menú aparte, sobre lo que cada quien puede usar. Detalle en el §9.

| Punto | Dónde |
|---|---|
| Tabla `problem_reports` (migración `0027`, solo crea; compatible con la versión anterior) | `db/migrations/0027_reportes_de_problemas.sql`, `schema.ts` |
| Reglas: lugares por rol, tipos, estados, validación, quién ve un reporte, del aviso al formulario | `lib/problemas.ts` |
| Guardar (una sola vez aunque llegue dos veces), leer los propios, revisar, contestar, contar los nuevos | `lib/problemas-servicio.ts` |
| `POST`/`GET /api/problemas`, `PATCH /api/problemas/[id]` | `app/api/problemas` |
| Pantallas «Reportar un problema» (todos) y «Problemas reportados» (administración); el menú y sus íconos | `(shell)/reportar-problema`, `(shell)/problemas-reportados`, `capacidades.ts`, `role-home.ts`, `AppShell.tsx` |
| «Reportar este problema» en los avisos de error y en las pantallas de error del panel | `CapaDeAvisos.tsx`, `PantallaDeError.tsx`, `error.tsx` del panel, Directorio, Agenda y Mapa |
| Número de reportes nuevos junto a «Problemas reportados» | `(shell)/layout.tsx`, `ShellWrapper.tsx` |
| La captura la ven quien la subió y la administración que revisa ese reporte | `lib/archivos.ts` |
| Sin señal, el reporte espera en el teléfono como un alta | `lib/cola-de-envios.ts` (tipo `problema`) |

**Cómo se comprobó:**
- Como CI, en una base vacía: **717 pruebas en 80 archivos**, todas en verde; `pnpm web:build` en verde. Las
  nuevas: `problemas.test.ts` (22) y `reportar-problema.test.ts` (12); más en `menu-claro.test.ts`,
  `avisos.test.ts` y `atajos-por-rol.test.ts`.
- Seis fallas metidas a propósito en esta función, las seis atrapadas (§8).
- En el navegador, a 375 px, con la copia del simulacro: el brigadista toca «Reportar este problema» en un
  aviso de error, el formulario llega con «Agenda», «Algo falla» y el mensaje; lo envía y lo ve como
  «Recibido». Administración de Tonalá lo ve con el número «1» en el menú, le contesta y lo marca como
  resuelto; el brigadista ve «Resuelto» con la respuesta.

### Reportar un problema, más fácil: hecho el 2026-10-07

El dueño preguntó si era fácil de usar así. No del todo: desde el menú costaba unos 7 toques y una deslizada,
la entrada estaba escondida, el aviso de error se iba a los 9 segundos y nadie se enteraba de la respuesta.

| Antes | Ahora | Dónde |
|---|---|---|
| Desde el menú, «¿Dónde pasó?» llegaba vacío, con 14 a 20 opciones | Ya dice la pantalla donde estaba la persona, con «Es donde estabas» | `anotarUltimaPantalla` (armazón del panel), `leerUltimaPantalla` |
| «Enviar» quedaba debajo de la barra del teléfono | Formulario más corto (captura como botón, frases en una fila, texto de 2 renglones) y «Enviar» fijo sobre la barra en el teléfono; en «Reportar un problema» no sale el «+», que lo tapaba | `ReportarProblemaClient.tsx`, `AppShell.tsx` |
| El aviso de error con «Reportar» se borraba a los 9 segundos | Se queda hasta que la persona lo cierra o se va a otra pantalla; reporta la pantalla donde salió | `CapaDeAvisos.tsx` |
| Nadie se enteraba de la respuesta | Aviso «Te respondieron un reporte» con «Ver respuesta», número junto a «Reportar un problema» y en «Más»; al abrir, la respuesta va primero y queda vista | `contarRespuestasNuevas`, `POST /api/problemas/vistos`, `reporter_seen_at` en la `0027`, `ShellWrapper.tsx` |
| No había cómo saber que existía | Pie de «Primeros pasos» para todos los roles | `PIE_PARA_REPORTAR` en `primeros-pasos.ts` |

Toques: desde un aviso de error, 3 (Reportar → una frase → Enviar); desde el menú, 5 (Más → Reportar un
problema → qué pasó → una frase → Enviar).

**Cómo se comprobó:** 717 pruebas en verde, como CI; tres fallas más metidas a propósito, atrapadas (§8). En el
navegador: el aviso «Te respondieron» y el número en «Más»; al tocar «Ver respuesta», la respuesta arriba y el
número fuera; desde el menú, «Agenda» ya elegida; «Enviar» visible a 375×812 y a 375×667 (un iPhone SE); el
aviso de error sigue a los 12 segundos y se quita al ir al Directorio; en escritorio todo igual.

### Para desplegar

- Las migraciones `0026_meta_del_lider.sql` y `0027_reportes_de_problemas.sql` se aplican solas: el servicio
  `migrate` corre en cada despliegue antes de arrancar la aplicación. Las dos son compatibles con la versión
  anterior (columnas que admiten nulo, índices y una tabla nueva), así que volver atrás no rompe nada.
- En una copia local de desarrollo, `pnpm db:migrate` antes de `pnpm test`: si no, las pruebas de integración
  que usan la base local fallan («column "daily_goal" does not exist»). Sin tocar la base local:
  `node scripts/local/como-ci.mjs` hace lo mismo que CI en una base desechable.
- Nada de esto se ha subido: todo está sin commitear en la rama hasta que el dueño diga.

### Lo que queda

Nada del plan. Ideas que no se hicieron porque cambian decisiones ya tomadas o necesitan al dueño:
- Poner la meta también desde el perfil de cada persona (hoy se pone desde el Resumen, donde está toda su gente).
- Que el servidor conozca el ritmo que la persona eligió en su teléfono, para que las medallas usen esa meta en
  vez de la de su rol cuando el líder no puso una.

## 6. Insignias

Se calculan en `apps/web/src/lib/logros.ts` con los conteos de `apps/web/src/lib/mi-progreso.ts`. Un
**registro completo** es un ciudadano activo, con sección, que registró la persona. Se cuenta por
teléfono distinto, así que capturar dos veces el mismo número no suma.

| Insignia | Condición | Quién la ve |
|---|---|---|
| Primer paso | 1 ciudadano registrado | Quien registra |
| Ya agarré la onda | 10 registros completos | Quien registra |
| Medio centenar | 50 registros completos | Quien registra |
| La Centena | 100 registros completos | Quien registra |
| Padrón de barrio | 250 registros completos | Quien registra |
| Mapa al día | 20 ciudadanos propios con su punto en el mapa | Quien registra |
| Toca-toca | 1 visita o actividad cerrada | Quien hace campo |
| Suela gastada | 25 visitas o actividades cerradas | Quien hace campo |
| Puerta que se abre | 10 cierres con resultado exitoso o con acuerdo | Quien hace campo |
| De prospecto a vecino | 3 prospectos pasados al directorio | Quien registra |
| Oídos en la colonia | 5 peticiones de Escucha Social | Todos |
| Tu enlace trabaja | 5 personas registradas con tu QR o enlace | Todos |
| Diez días en la calle | 10 días distintos con actividad | Todos |
| De hueso colorado | 4 semanas seguidas con 2 o más días activos | Todos |

## 7. Medallas y metas

| Concepto | Regla | Dónde se ve |
|---|---|---|
| Meta del día | La que puso quien coordina (1-200); si no hay, la del rol con el ritmo de la persona: 10 para quien registra y 5 para quien hace visitas, por 0.5, 1 o 2 | «Mi día» |
| Acción | Ciudadano activo dado de alta (también por su QR), visita o actividad cerrada (una vez), prospecto, petición de Escucha Social | «Mi día», Resumen, brigada |
| Medalla de la semana | Días de lunes a domingo con la meta cumplida: 3+ oro, 2 plata, 1 bronce. En el Resumen se mide con la meta del líder o la del rol | Resumen |
| Total de la brigada | Suma de la semana de los líderes e integrantes de sus equipos; solo con 4+ personas activas; sin nombres | «Mi día» del integrante |
| Pulso de tu gente | Suma de la semana de quienes están bajo su mando, contra la semana pasada | «Mi día» de quien coordina |

## 8. Pruebas: qué prueba qué

Hay dos clases de prueba:
- **Permanentes** (en el repositorio). Corren en cada PR con `pnpm validate`, en CI. Las de integración arman su
  propia base vacía y la borran al terminar (`apps/web/tests/base-desechable.ts`), así que no dependen de datos
  de nadie.
- **Recorridos locales** (`scripts/local/`, fuera de git porque usan las cuentas del simulacro). Abren el sistema
  en un teléfono de 375 px contra la copia `tonala_os_simulacro`. Cubren lo que solo se ve en pantalla.

### La estructura que se prueba

`apps/web/tests/metas-y-equipo.test.ts` arma, en una base desechable:

```
Tonalá   D (dirección) ── C: L1, L2
         L1 (líder) ── B1: M1, M4, M5 (brigadistas), K1 (capturista), MI (dada de baja)
         L2 (líder) ── B2: M2                    (2 personas: menos del mínimo de 4)
         AT (administración de Tonalá)
Zapopan  D2 (dirección) ── C2: L3
         L3 (líder) ── B3: M3, M6, M7, M8
         AZ (administración de Zapopan)
         y el administrador maestro de la semilla
```

con acciones en fechas exactas de una semana (altas, una a las 23:30 de Jalisco; un ciudadano dado de baja; una
visita cerrada junto con su actividad; una actividad abierta; una visita pendiente; prospecto; petición de
Escucha; lo de la semana anterior). Cada prueba pide **las dos cosas**: que a quien le toca no le falte nada y
que no vea nada de más.

### Quién ve qué (lo nuevo del plan)

| Qué | Lo ve | No lo ve | Prueba |
|---|---|---|---|
| «Mi día»: sus números, racha, insignias | La propia persona (la API no recibe ningún id) | Nadie más | `rutas-experiencia-sencilla` (sin parámetros), `metas-y-equipo` |
| Total de la brigada | Integrantes de un equipo de 4+ personas activas: el total y lo suyo, sin nombres | Brigadas de menos de 4; administración | `metas-y-equipo` (B1 = 5 personas, B2 = 2, B3 de Zapopan aparte) |
| Pulso de la gente | Quien coordina: su cascada activa, esta semana y la pasada | Otra dirección; administración y maestro (tienen el Resumen) | `metas-y-equipo` (L1, D, D2) |
| Tablero del Resumen | Líder: su brigada activa. Dirección: su cascada. Administración municipal: su municipio. Maestro: todas las personas activas | Gente de otra brigada o dirección; personas dadas de baja | `metas-y-equipo` (lista exacta y además igual al alcance completo) |
| Personas, PAN y agenda en el tablero | Lo visible para quien mira, como antes | — | `metas-y-equipo` (contra el cálculo anterior, fila por fila) |
| Medalla y siete puntos de la semana | Quien abre el Resumen, de su gente | — | `metas-y-equipo`, `logros.test` |
| Poner meta | Líder a su brigada, dirección a su cascada, administración a su municipio, maestro a todos | Uno mismo, compañeros, capturista, otro líder, otra dirección, otro municipio | `metas-y-equipo` (7 personas × 12 cuentas), `rutas-experiencia-sencilla` (401/403/400/404/200) |
| Meta puesta por el líder | La persona en su «Mi día»; quien la coordina en el Resumen | — | `metas-y-equipo`, `rutas-experiencia-sencilla` |
| De quién es un teléfono repetido | Quien da de alta y puede ver esa ficha | Quien no la ve (solo sabe que está repetido); el brigadista (403) | `rutas-experiencia-sencilla` |
| Menú, «Primeros pasos» y botón «+» | Cada rol, exactamente las pantallas que abre | Pantallas que rebotan | `menu-claro`, `atajos-por-rol`, `capacidades.test` |
| Reportar un problema | Todos, sobre pantallas y funciones que usan | Pantallas que no abren | `problemas.test`, `reportar-problema` |
| Un reporte y su respuesta | Quien lo hizo; administración de su municipio; el maestro | Líderes, dirección, administración de otro municipio | `reportar-problema` |
| La captura de un reporte | Quien la subió y quien revisa ese reporte | Cualquier otra persona | `reportar-problema` |

### Archivo por archivo

| Archivo | Pruebas | Qué asegura |
|---|---|---|
| `apps/web/tests/metas-y-equipo.test.ts` | 21 | Acciones por persona y día (día de Jalisco, sin bajas ni pendientes, la visita con actividad una vez, sin ids raros); «Mi día» de cada rol con brigada, pulso y meta; quién pone meta a quién; meta guardada con auditoría y sin duplicarla; la base rechaza una meta fuera de rango; el tablero del Resumen por rol, sus números contra el cálculo anterior, medallas y «Cambiar meta» donde la API acepta |
| `apps/web/tests/rutas-experiencia-sencilla.test.ts` | 10 | Las rutas con la sesión de cada rol: meta (401, 404, 400, 403, 200); «Mi día» sin parámetros y sin caché; teléfono repetido (401, 403, de quién solo si se ve); mensajes del alta en español con el campo; el mismo cierre reenviado por la cola (visita y actividad: 200 lo mismo, 409 cualquier otro, un solo cierre en historial y auditoría, 1000 caracteres con mensaje en español) |
| `tests/unit/menu-claro.test.ts` | 8 | Cada rol ve en el menú justo lo que abre; sin nombres repetidos; la línea «qué es» de las áreas; «Todos los reportes»; ningún título sobre una sola entrada; juntar secciones no pierde entradas; barra del teléfono por rol |
| `tests/unit/atajos-por-rol.test.ts` | 8 | «Primeros pasos»: cuatro por rol, cada enlace y cada pantalla nombrada abre para ese rol, solo se habla del «+» a quien lo tiene, y el pie de «Reportar un problema» abre para todos; el «+»: orden y opciones que abren |
| `apps/web/src/lib/logros.test.ts` | 21 | Racha semanal, insignias por rol, meta y ritmo, meta del líder, medallas por días, semana de lunes a domingo, frases |
| `apps/web/src/lib/secciones-del-municipio.test.ts` | 6 | Filtro por municipio sin acentos; nada se esconde sin municipio; «es de Tonalá, no de Zapopan» |
| `apps/web/src/lib/resultados-rapidos.test.ts` | 5 | Los botones de resultado son exactamente los que acepta el servidor; frases rápidas; el límite de 1000 coincide con el de visitas |
| `apps/web/src/lib/celebraciones.test.ts` | 8 | Ritmo, insignias vistas y «Primeros pasos» en el teléfono, también con el almacenamiento bloqueado; una sola petición de progreso a la vez |
| `apps/web/src/lib/avisos.test.ts` | 5 | Avisos dentro de la página con la capa montada; `alert()` sin ella; un aviso con botón y su propia duración |
| `apps/web/src/lib/lenguaje.test.ts` | 2 | Nombre del nivel sin claves técnicas |
| `apps/web/src/lib/cola-de-envios.test.ts` | 17 | La cola sin señal, incluidos los resultados por PATCH (2 nuevas) |
| `apps/web/src/lib/acciones-de-contacto.test.ts` | 5 | Llamar, WhatsApp y Cómo llegar |
| `apps/web/src/lib/mensajes-de-validacion.test.ts` | 2 | Mensaje por campo y el general |
| `apps/web/app/(shell)/mapa/html.test.ts` | 14 | El globo del mapa abre la actividad exacta |
| `apps/web/src/lib/problemas.test.ts` | 22 | Lugares por rol (solo su menú y sus funciones), la pantalla de donde se viene y la última recordada, validación y contexto recortado, quién ve un reporte, tipos y estados iguales a la base, del aviso al formulario, cuándo hay respuesta nueva |
| `apps/web/tests/reportar-problema.test.ts` | 12 | De punta a punta con sesión por rol: reportar (401, 400 por campo, 201, reenvío sin duplicar, clave ajena 409), captura propia y ajena, mis reportes, revisar solo administración y solo su gente, contestar (403, 404, 400, 200) y que la persona vea la respuesta, número de nuevos, respuestas nuevas y vistas (solo las propias, y no lo que cambia uno mismo), quién ve la captura |

### Lo que sumó el plan de auditoría de menús (2026-10)

Detalle, fases y desviaciones en [`PLAN_AUDITORIA_MENUS.md`](PLAN_AUDITORIA_MENUS.md) §18 y §20; cada pantalla, en
[`MAPA_DE_PANTALLAS.md`](MAPA_DE_PANTALLAS.md). Las matrices usan la estructura compartida
`apps/web/tests/estructura-de-prueba.ts` (seis perfiles, dos direcciones en Tonalá, Zapopan aparte).

| Qué | Lo ve o lo hace | No | Prueba |
|---|---|---|---|
| Incidencias (vistas, chips, buscador en el cuerpo) | Quien coordina, su alcance; «Reportó» y «Atiende» con nombre solo dentro de él | Otra estructura (lee «Otra estructura») | `incidencias-consulta`, `matriz-incidencias` |
| Avisos «por aceptar» (D9) | Capturista y brigadista avisan; aceptan quienes mandan sobre ellos | La misma persona; otra brigada | `avisos-de-campo` |
| Escucha Social | Su alcance; el vecino con nombre solo si se ve su ficha; turnar, solo administración | Quien no ve al vecino (lee «un vecino») | `escucha-social`, `matriz-escucha` |
| Estructura Electoral | Dirección y líder cuentan su estructura; la administración, su municipio | Conteos y nombres de otra estructura (D11) | `estructura-electoral`, `matriz-estructura` |
| Logística | Nombres solo dentro del alcance; editar, administración y dirección; archivar, administración | Nombres de otra dirección (P1: «Otras estructuras», sumado) | `logistica`, `matriz-logistica` |
| Perfil y «Registrados por…» | El propio, su estructura, la administración de su municipio, el maestro | Cualquier otra persona (404; en el Directorio, se ignora) | `perfil-liviano`, `perfil-equipo` |
| Seguridad del perfil (lo que fue Ajustes) | Solo en el perfil propio | En el de otra persona no existe | `perfil-pestanas` |
| Lo que se busca en Directorio y Usuarios | Viaja en el cuerpo de un `POST`; la dirección lleva solo filtros | El historial del navegador y los registros del servidor | `directorio-consulta`, `usuarios-consulta`, `*-filtros` |
| La lista de la Agenda | Mi agenda; quien asigna, su equipo y una persona de su alcance | Otra brigada, dirección o municipio; quien no asigna, la del equipo | `bitacora-consulta` |

| Archivo | Pruebas | Qué asegura |
|---|---|---|
| `apps/web/tests/incidencias-consulta.test.ts` | 13 | Sin actividades de la Agenda; vistas, chips y buscador; nombres recortados |
| `apps/web/src/lib/incidencias-filtros.test.ts` | 4 | Los chips y los días abiertos en hora de Jalisco |
| `apps/web/tests/matriz-incidencias.test.ts` | 8 | Quién ve, asigna y cambia cada incidencia, por perfil |
| `apps/web/tests/avisos-de-campo.test.ts` | 12 | Avisar, retirar, aceptar; nadie se acepta solo |
| `apps/web/tests/escucha-social.test.ts` | 29 | Alta ligada al vecino (404 si no se ve), lista por páginas, estado con auditoría, turnar, capa del mapa sin nombres, sin señal |
| `apps/web/src/lib/escucha-social.test.ts` | 11 | Categorías y estados del catálogo; lo desconocido, «Otra: …» |
| `apps/web/tests/matriz-escucha.test.ts` | 5 | 14 autores por 7 perfiles |
| `apps/web/tests/estructura-electoral.test.ts` | 23 | Cobertura por sección, nombrar ciudadanos o cuentas, cambiar y quitar, reglas de la migración 0029 |
| `apps/web/src/lib/estructura-electoral.test.ts` | 7 | Roles, casilla y filtros sin base |
| `apps/web/tests/matriz-estructura.test.ts` | 6 | Quién nombra, cambia y quita, por perfil |
| `apps/web/tests/logistica.test.ts` | 12 | Movimientos con candado, devoluciones con tope, editar, archivar, historial por páginas, P1 |
| `apps/web/src/lib/logistica-tipos.test.ts` | 5 | Buscador sin acentos, «Por agotarse», tipos de movimiento |
| `apps/web/tests/matriz-logistica.test.ts` | 7 | Quién entrega, edita y archiva; nombres por alcance |
| `apps/web/tests/perfil-liviano.test.ts` | 7 | 20 ciudadanos y el total, 30 actividades con su tipo, totales en la base, quién abre qué perfil, `?registro=` |
| `apps/web/tests/perfil-equipo.test.ts` | 5 | Los equipos reales de una persona y solo los enlaces que quien mira abre |
| `apps/web/src/lib/perfil-pestanas.test.ts` | 4 | `?pestana=` y que `/settings` lleve a Mi perfil → Seguridad |
| `apps/web/src/lib/areas-de-participacion.test.ts` | 3 | Las áreas separadas, no combinaciones de texto |
| `tests/unit/sin-adorno.test.ts` | 3 | Ningún botón ni campo del panel de adorno (sin excepciones desde la fase 7) |
| `apps/web/tests/bitacora-consulta.test.ts` | 8 | La lista de la Agenda: vistas y sus números, «Mi agenda» y «Todo mi equipo», `responsable=` solo dentro del alcance, la visita ligada una vez, el buscador, quién ve qué |
| `apps/web/tests/directorio-consulta.test.ts` | 6 | El buscador del Directorio por `POST` (no en la dirección): solo lo visible, exportar por `POST` con auditoría, enlaces viejos |
| `apps/web/src/lib/directorio-filtros.test.ts` | 3 | La dirección del Directorio nunca lleva el texto buscado |
| `apps/web/tests/usuarios-consulta.test.ts` | 5 | El buscador de Usuarios por `POST`: solo administración, cada una su municipio, acciones solo donde gobierna |
| `apps/web/src/lib/usuarios-filtros.test.ts` | 3 | La dirección de Usuarios nunca lleva el nombre o correo buscado |
| `apps/web/src/lib/secciones-del-catalogo.test.ts` | 2 | El catálogo de secciones del alta se pide una vez por visita y se reintenta si falla |
| `apps/web/tests/secciones-ligeras.test.ts` | 3 | El catálogo ligero: solo id, número y municipio, con sesión; el completo no cambia |

### Las pruebas atrapan errores

Para saber que las pruebas no pasan por pasar, se metió cada uno de estos errores en el código, de uno en uno, y
se corrió la prueba que lo debía atrapar. Las 26 quedaron en rojo (2026-10-07):

| Error metido | Lo atrapó |
|---|---|
| Permiso de meta por compañeros y no por mando | `metas-y-equipo` (3 en rojo) |
| Ponerse meta a uno mismo | `metas-y-equipo` (2) |
| Total de brigada con menos de 4 personas | `metas-y-equipo` (1) |
| Pulso para administración | `metas-y-equipo` (1) |
| Visita con actividad contada dos veces | `metas-y-equipo` (8) |
| Día en UTC y no en Jalisco | `metas-y-equipo` (2) |
| Ciudadanos dados de baja cuentan | `metas-y-equipo` (7) |
| Tablero con gente dada de baja | `metas-y-equipo` (1) |
| Tablero de todo el sistema para un líder | `metas-y-equipo` (4) |
| Medalla de oro con 2 días | `logros.test` (1) |
| La meta del líder no se lee | `metas-y-equipo` (2) |
| Cierre repetido de otra persona aceptado (visita) | `rutas-experiencia-sencilla` (1) |
| Cierre repetido con otra conclusión aceptado (actividad) | `rutas-experiencia-sencilla` (1) |
| Consulta de teléfono sin permiso de alta | `rutas-experiencia-sencilla` (1) |
| Ruta de la meta sin sesión | `rutas-experiencia-sencilla` (1) |
| Menú con secciones de una entrada | `menu-claro` (2) |
| Secciones de otro municipio en la lista | `secciones-del-municipio` (2) |
| Reportar sobre pantallas que no abre | `reportar-problema` (4) |
| El líder revisa reportes | `reportar-problema` (2) |
| Administración municipal ve reportes de otro municipio | `reportar-problema` (2) |
| Captura ajena aceptada | `reportar-problema` (3) |
| Reporte reenviado sin señal duplicado | `reportar-problema` (1) |
| Se guarda del teléfono lo que no se pidió | `problemas.test` (1) |
| Se avisa como respuesta lo que cambió la propia persona | `reportar-problema` (1) |
| Marcar vistas toca reportes de otras personas | `reportar-problema` (2) |
| La última pantalla recuerda el propio formulario | `problemas.test` (1) |

### Lo que no está en CI y cómo se cubre

El repositorio no tiene pruebas de componentes de React (ni jsdom ni Testing Library), y agregarlas es una
dependencia nueva que decide el dueño. Lo que solo se ve en pantalla lo cubren los recorridos locales, con un
navegador real a 375 px:

| Recorrido | Comprobaciones | Qué cubre |
|---|---|---|
| `experiencia-sencilla.mts` | 20 | Alta con «¡Listo!», vecino, ficha con sus enlaces, «+» por rol, «Primeros pasos», entrada fallida (mensajes del inicio de sesión) |
| `qr-y-unirme.mts` | 15 | QR público y «Unirme» |
| `resultado-sin-senal.mts` | 13 | Resultado sin señal, envío al volver, cierre repetido |
| `alta-fase3.mts` | 8 | Teléfono repetido al escribir, sección de otro municipio, botón de ubicación |
| `mi-dia-http.mts` | 46 | Cada cifra de «Mi día» contra la base, por rol |
| `fase4-http.mts` | 41 | Meta, brigada, pulso y Resumen contra la base del simulacro |

Las piezas de lógica que usan esas pantallas (resultados, secciones, pasos, «+», avisos, celebraciones, menú)
salieron a módulos sin React para que sí estén en CI.

## 9. Reportar un problema

Pedido del dueño (2026-10-07): que la gente pueda reportar errores y dar retroalimentación sobre el menú o la
función donde está, muy fácil, en un menú aparte, y solo sobre lo que puede usar.

### Para quien reporta

- **Dónde está:** en el menú, sección «Mi cuenta y ajustes», «Reportar un problema» (con la línea «Algo falla
  o no se entiende»). En el teléfono, en «Más».
- **Atajos en el momento del error:** cada aviso rojo de error trae «Reportar este problema» y se queda hasta
  que la persona lo cierra o cambia de pantalla; la pantalla de «No pudimos cargar esta pantalla» (panel,
  Directorio, Agenda, Mapa) también lo trae. El formulario llega con la pantalla elegida, «Algo falla» marcado
  y el mensaje que salió.
- **Desde el menú:** el formulario ya dice la última pantalla donde estuvo la persona («Es donde estabas»).
- **«Enviar» siempre a la vista** en el teléfono, fijo sobre la barra de abajo; en esa pantalla no sale el «+».
- **Primeros pasos** lo menciona al pie, para todos los roles.
- **Tres pasos:**
  1. ¿Dónde pasó? Una lista con las pantallas de su menú y estas funciones: la ficha de un ciudadano (si
     abre el Directorio), registrar el resultado de una visita o actividad (si abre la Agenda), lo que se
     guarda sin señal, «Mi día», su QR o enlace, recordatorios, entrar al sistema y «Otra cosa». Nada que no
     pueda abrir.
  2. ¿Qué pasó? Algo falla · No sé usarlo · Se ve mal · Tengo una idea.
  3. Una frase, con frases rápidas para no escribir de más. Captura de pantalla opcional.
- **Lo que se manda solo:** la pantalla donde estaba, el mensaje de error si lo hubo, el tipo de teléfono, el
  tamaño de pantalla y si había señal. Nunca contraseñas ni lo que estaba capturando.
- **Sin señal:** se guarda en el teléfono y se envía solo; si llega dos veces, se guarda una.
- **Mis reportes:** abajo, cada reporte con su estado («Recibido», «Lo estamos revisando», «Resuelto»,
  «Revisado, sin cambios») y la respuesta.
- **Cuando le responden:** un aviso «Te respondieron un reporte» con «Ver respuesta» (una vez por sesión), y un
  número junto a «Reportar un problema» y en «Más». Al abrirlo, la respuesta va primero, marcada como
  «Nueva», y el número se quita. Lo que cambia la propia persona no cuenta como respuesta.

### Para administración

- **«Problemas reportados»** (solo administración), con el número de reportes nuevos junto a la entrada.
- Cuántos hay por estado y **en qué pantallas se reporta más** (por atender).
- Filtros: por atender, nuevos, en revisión, resueltos, cerrados, todos.
- Cada reporte: qué, dónde, quién (nombre y rol), cuándo, lo que le salió, la captura y los datos técnicos.
- Se le cambia el estado (en revisión, resuelto, cerrar sin cambios) y se le escribe una respuesta, que la
  persona ve en sus reportes. Cambiar el estado sin escribir conserva la respuesta anterior.

### Quién ve qué

| Quién | Qué ve |
|---|---|
| Cualquier persona | Sus propios reportes y sus respuestas |
| Administración municipal | Los reportes de la gente activa de su municipio; los contesta |
| Administrador maestro | Todos los reportes |
| Líderes y dirección | Solo los suyos: revisar es de administración |
| La captura | Quien la subió y quien revisa ese reporte |

### Límites

- Hasta 30 reportes por hora por persona (para que nadie llene la bandeja).
- Descripción de 3 a 2000 letras; respuesta de hasta 1000.
- Una captura por reporte, subida por la misma persona.
