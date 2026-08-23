# Roadmap V1 (Post-Auditoria) - Tonala OS

Este documento refleja el estado **ACTUALIZADO** del proyecto tras la gran auditoria y refactorizacion arquitectonica (Fases 0 a 5).

## Estado Actual: Fundacion Completada (Fase 0 a 5) ?

El proyecto ha superado con exito la fase de prototipo (*Walking Skeleton*). Toda la deuda tecnica estructural ha sido pagada.

**Logros arquitectonicos completados:**
*   **Next.js App Router** implementado como capa de entrega (Delivery Layer).
*   **Seguridad y Roles:** Autenticacion funcional con `requirePageRole` protegiendo todas las rutas y server actions.
*   **Clean Architecture:** Modulos estrictamente separados (`contracts`, `domain`, `application`, `infrastructure`) con proteccion automatizada via `check-module-boundaries`.
*   **Base de Datos Segura:** Migracion a `drizzle-orm` estandarizada, sin scripts SQL ad-hoc.
*   **Calidad de Codigo:** Pipeline de CI operativo con 219 pruebas automatizadas (100% Passing).
*   **Consistencia de Datos:** Patron *Outbox* implementado en todas las mutaciones clave.

---

## Fases de Desarrollo Restantes (V1 Features)

Con la base tecnica 100% solida, el desarrollo se enfoca puramente en caracteristicas de negocio y usabilidad.

### ??? Fase 6: Dominio del Territorio (Mapa y Eventos)
*Prioridad Alta: El mapa es el corazon operativo del sistema en la calle.*

1. **Mapa en Vivo (`/mapa`)**
   - Integracion de iconos personalizados por tipo de incidencia.
   - Implementacion de "Clustering" (agrupacion de pines).
   - Panel lateral flotante de informacion rapida.
2. **Auditoria de Eventos (`/admin-inbox`)**
   - Crear *Kanban Board* para validacion de eventos del mapa.
3. **Alta de Eventos (`/reportes`)**
   - Geolocalizacion automatica (GPS).
   - Subida de evidencia fotografica.

### ?? Fase 7: Estructura y Factor Humano
*Prioridad Media-Alta: Gestion del ejercito de campana.*

1. **Gestion de Equipos (`/admin-equipos`)**
   - Interfaz interactiva para arrastrar y soltar (Drag & Drop) usuarios en cuadrillas.
2. **Estructura Electoral (`/estructura-electoral`)**
   - Tablero de semaforizacion (Verde/Amarillo/Rojo) de secciones electorales cubiertas.
3. **Directorio Ciudadano (`/crm`) y Agenda (`/equipo`)**
   - Exportacion de base de datos a Excel/CSV.
   - Boton de *Check-in* geolocalizado para promotores en campo.

### ?? Fase 8: Logistica e Inventarios
*Prioridad Media: Control de recursos fisicos (Nuevo Modulo).*

1. **Logistica e Inventarios (`/logistica`)**
   - Diseno de base de datos (almacenes, transacciones, items).
   - Pantalla de alta de inventario.
   - Sistema de escaneo/registro de entregas a lideres.

### ?? Fase 9: Call Center & Inbox Unificado
*Prioridad Media: Integracion con ciudadanos (Nuevo Modulo).*

1. **Call Center & Inbox (`/inbox`)**
   - Diseno de UI estilo mensajeria moderna.
   - Integracion con API oficial de Meta (WhatsApp Business).
   - Reglas de enrutamiento a agentes (capturistas).

### ?? Fase 10: Dashboards y Configuracion
*Prioridad Baja-Media: Ajustes administrativos finales.*

1. **Analisis Demografico (`/analytics`)**
   - Integracion de `Recharts` o `Chart.js` para visualizacion grafica avanzada.
2. **Usuarios y Ajustes (`/admin-usuarios`, `/settings`)**
   - Conectar UI al backend para revocacion de accesos.
   - Modificar foto de perfil y preferencias horarias.

---

## ?? Estatus de Mantenimiento de Documentos Historicos

*   `PRODUCT_OPERABILITY_PLAN_V1.md` -> **DEPRECADO**. Documento historico de la fase inicial (Walking Skeleton).
*   `PRODUCT_OPERABILITY_PLAN_MOBILE_FIRST.md` -> **DEPRECADO**. La decision oficial fue pivotar a *Web-First* responsivo.
