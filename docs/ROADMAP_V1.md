# Roadmap V1 (Post-Auditoria) - Tonal� OS

Este documento refleja el estado **ACTUALIZADO** del proyecto tras la implementaci�n masiva de funcionalidades operativas (Dashboards, Mapas, Seguridad y M�dulos).

## Estado Actual: Fundaciones y Features Principales Completadas ?

El proyecto no solo tiene una base limpia (Clean Architecture), sino que **ya posee interfaces gr�ficas funcionales, encriptaci�n militar y dashboards visuales**.

**Logros operativos y t�cnicos completados (Agosto 2026):**
*   **Seguridad de Datos Sensibles (NUEVO):** Implementaci�n de m�dulo `crypto.ts` (AES-256-GCM). Todos los tel�fonos, disponibilidad y datos t�cticos del CRM ahora se guardan encriptados en PostgreSQL.
*   **Redise�o Visual (NUEVO):** Nuevo Login profesional con animaciones, �conos y CSS moderno (cero Tailwind), con aceptaci�n legal. Eliminaci�n de todos los errores de caracteres (unicode corrupto) a nivel binario.
*   **Dashboards Interactivos (Fase 10 Completada):** Pantalla `/analytics` implementada con Recharts. Desencripta perfiles en memoria RAM y muestra m�tricas reales en gr�ficas de Dona y Barras. `/resumen` muestra KPIs reales del padr�n.
*   **Mapa Avanzado (Fase 6 Avanzada):** Implementaci�n de `react-leaflet-cluster` en `/mapa`. El mapa ahora agrupa miles de pines operacionales de manera eficiente.
*   **M�dulos de Infraestructura (Fase 8 y 9 Inicializadas):** Pantallas base para `/logistica` y `/inbox` creadas, junto con sus migraciones SQL (`db/migrations/0001` y `0002`).

---

## Pr�ximos Pasos (V1.5 Features)

Con las pantallas gr�ficas listas, el foco actual es conectar los detalles finos y utilidades. **Plan de Implementaci�n Activo:**

### 1. Media Hub (Fotos y Videos de Campa�a)
* **Alta de Eventos (`/reportes`):** A�adir subida de evidencia fotogr�fica (desde c�mara de celular) guardada localmente en `/uploads/media/`.
* **Noticias (`/noticias`):** Muro interno estilo feed para que el Admin publique comunicados y videos para toda la brigada.

### 2. Exportaci�n de Datos
* **CRM (`/crm`):** Bot�n para desencriptar en memoria y descargar el padr�n ciudadano filtrado como archivo Excel/CSV.

### 3. Efectividad y Auditor�a
* **Dashboard de Efectividad:** Gr�ficas de visitas completadas vs programadas y ranking de promotores.
* **Historial de Actividad (`/actividad`):** Timeline cronol�gico de todo lo que hacen los usuarios (Audit Logs interactivos).

### 4. B�squeda Global
* **Command Palette:** Atajo de teclado (`Ctrl+K`) para buscar contactos, reportes o equipos desde cualquier p�gina instant�neamente.

### 5. Estructura y Factor Humano
* **Gesti�n de Equipos (`/admin-equipos`):** Interfaz interactiva para arrastrar y soltar (Drag & Drop) usuarios en cuadrillas.
* **Estructura Electoral (`/estructura-electoral`):** Tablero de semaforizaci�n (Verde/Amarillo/Rojo) de secciones electorales cubiertas.
