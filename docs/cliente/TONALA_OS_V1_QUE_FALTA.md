# Tonala OS — Que falta para la version utilizable (V1)

**Para:** Cliente / equipo territorial  
**Fecha:** 14 de agosto de 2026  
**Version objetivo:** V1 utilizable (`v1.0.0-usable`)

---

## En una frase

Hoy Tonala OS tiene el **motor** (registro de contactos, territorio, asignaciones y visitas en base de datos) pero **falta la aplicacion web completa** que el equipo use cada dia sin ayuda tecnica.

---

## Que ya esta hecho (no hay que volver a construir)

- Registrar contactos con nombre
- Vincular contacto a colonia (territorio)
- Asignar responsable a un contacto
- Programar y completar visitas (con reglas de negocio)
- Base de datos, seguridad de permisos en el servidor, historial de cambios
- Pruebas automaticas del nucleo (143 pruebas unitarias pasando)

Esto es la base tecnica validada. **No se tira; se usa.**

---

## Que falta para que sea utilizable

### 1. Aplicacion web real (escritorio y celular)

| Falta | Por que importa |
|-------|-----------------|
| Pagina de **inicio de sesion** (usuario y contraseña) | Hoy no hay login; es solo prototipo de desarrollo |
| **Next.js** como aplicacion web profesional | Reemplaza el prototipo HTML temporal |
| Diseño **web-first** que tambien funcione en el telefono | Coordinadores en laptop; responsables en campo |
| **Pantalla inicial segun rol** | Responsable ve su dia; coordinador ve CRM; direccion ve resumen |

### 2. CRM del dia a dia

| Falta | Por que importa |
|-------|-----------------|
| Lista y busqueda de contactos en la app | Encontrar antes de duplicar |
| Alta rapida en **4 pasos** (nombre → territorio → responsable → confirmar) | Captura rapida en campo |
| Ficha completa del contacto | Ver territorio, responsable y visitas en un lugar |
| **Completar visita sin copiar IDs tecnicos** | Hoy hay que pegar un codigo; en V1 se elige la visita de una lista |
| Estado **responsable pendiente** con color distinto | Capturista puede dejar pendiente; se ve claro quien falta |

### 3. Mapa de Tonala (para todos los usuarios)

| Falta | Por que importa |
|-------|-----------------|
| Mapa **visible y usable para todos** | Todos entienden el territorio, no solo direccion |
| Cartografia oficial importada (secciones de Tonala) | Sin depender del sitio del INE en tiempo real |
| Mapa **fluido** con mucha informacion | Secciones, colonias si hay catalogo, contactos, visitas, presencia operativa |
| Tocar una seccion y ver resumen + enlaces a contactos | Trabajo territorial desde el mapa |

### 4. Equipo (trabajo de campo)

| Falta | Por que importa |
|-------|-----------------|
| **Mi dia** — visitas de hoy | El responsable sabe que hacer al abrir la app |
| Mis visitas y mis contactos | Sin buscar en listas generales |
| Completar visita desde el telefono | Cerrar el dia con resultados |

### 5. Operacion automatica (sin botones de tecnico)

| Falta | Por que importa |
|-------|-----------------|
| Procesar eventos **automaticamente** tras cada accion | Hoy hay que pulsar "procesar outbox" manualmente |
| Quitar botones de "preparar base de datos" de la interfaz | Solo para desarrolladores, no para operadores |
| Ambiente de pruebas (staging) antes de produccion | Validar con el equipo real |

---

## Decisiones ya acordadas con usted

1. **Mapa** — Todos los usuarios lo ven y lo usan (las acciones sensibles siguen segun permiso).
2. **Capturista** — Puede dejar responsable pendiente; el pendiente se ve con **otro color**.
3. **Mapa V1** — Lo mas completo y fluido posible (secciones + colonias + capas operativas).
4. **Al entrar** — Cada rol ve la pantalla que mas le ayuda (no la misma para todos).

---

## Orden de trabajo (simplificado)

```
Paso 1  Login + aplicacion web (marco general)
Paso 2  CRM completo (lo que el equipo usa todos los dias)
Paso 3  Mi dia y visitas en campo
Paso 4  Mapa de Tonala completo
Paso 5  Pruebas finales y puesta en marcha
```

**Importante:** El CRM usable va antes que pulir el mapa al maximo, pero el mapa es prioridad alta en V1.

---

## Que NO entra en esta primera version utilizable

- Inteligencia artificial
- WhatsApp o chat en vivo
- Exportar datos masivamente
- Otros municipios (solo Tonala, Jalisco)
- App nativa separada (es la misma web en celular)
- Encuestas masivas o portal publico

---

## Como sabremos que V1 esta lista

- [ ] Edgar y el equipo **inician sesion** sin ayuda tecnica
- [ ] Crean un contacto, asignan territorio y responsable, programan y **completan** una visita
- [ ] El responsable ve **sus visitas de hoy** al entrar
- [ ] **Todos** pueden usar el mapa de Tonala con informacion operativa
- [ ] Funciona en computadora y en telefono
- [ ] No hay botones de desarrollador visibles

---

## Resumen para el cliente

| | Hoy | V1 utilizable |
|---|-----|----------------|
| Motor de negocio | Listo | Se reutiliza |
| App para el equipo | Prototipo | App web profesional |
| Login | No | Si |
| Mapa | No existe | Completo y para todos |
| Uso en celular | Parcial | Si, misma app |
| Listo para operacion diaria | No | Si |

**Esfuerzo restante:** construir la capa de producto (interfaz, login, mapa, Mi dia) sobre la base que ya funciona.

---

*Documento interno Tonala OS — V1 utilizable*  
*Detalle tecnico: `docs/PRODUCT_OPERABILITY_PLAN_V1.md`*
