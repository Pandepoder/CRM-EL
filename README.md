# Tonala OS - Gestor Operativo Territorial

![Version](https://img.shields.io/badge/version-1.0.0--usable-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Node.js](https://img.shields.io/badge/node-%3E%3D24.0.0-success.svg)
![Architecture](https://img.shields.io/badge/architecture-Clean_Architecture-orange.svg)

**Tonala OS** es un ERP/CRM de grado empresarial disenado especificamente para el control logistico, auditoria territorial y administracion de estructuras ciudadanas.

## Descripcion General del Sistema

El proyecto actua como el centro de mando (Command Center) de campa�as y administraciones, resolviendo la complejidad de coordinar equipos en calle y analizar datos territoriales en tiempo real.

### Caracteristicas Principales

*   **Inteligencia Territorial (Mapa en Vivo):** Visualizacion geoespacial interactiva para auditorias de eventos, supervision de incidencias (Leaflet) y calor demografico.
*   **Directorio Ciudadano (CRM):** Motor de alta velocidad para gestion de contactos, captura de habilidades, roles, zonas y disponibilidad operativa.
*   **Estructura Jerarquica:** Asignacion de equipos, lideres, representantes de casilla y auditores en campo.
*   **Trazabilidad Inquebrantable:** Transacciones de base de datos protegidas por el patron *Outbox* (consistencia eventual) y validacion estricta de Roles por pagina y endpoint.

---

## Capturas de Pantalla

*(Nota: Reemplaza las imagenes de ejemplo en `docs/assets/` con tus capturas reales).*

| Panel de Control (Dashboard) | Directorio CRM | Mapa Operativo |
|:---:|:---:|:---:|
| ![-](./docs/assets/dashboard.png) | ![-](./docs/assets/crm-view.png) | ![-](./docs/assets/map-view.png) |
| *Metricas agregadas y graficas demograficas* | *Busqueda y paginacion de ciudadanos* | *Incidencias geolocalizadas* |

---

## Stack Tecnologico

El sistema esta construido con tecnologias modernas, priorizando la velocidad, escalabilidad y una separacion estricta de responsabilidades:

*   **Core:** [Next.js (App Router)](https://nextjs.org/) + React
*   **Base de Datos:** PostgreSQL
*   **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
*   **Estilos:** CSS Nativo (`globals.css`), siguiendo la convencion de no utilizar frameworks invasivos (Cero Tailwind).
*   **Arquitectura:** Modular Monolith orientado a Eventos (Clean Architecture).

## Empezando (Getting Started)

Sigue estos pasos para levantar un entorno de desarrollo local completo.

### Requisitos Previos

1.  Node.js v24+
2.  pnpm v11+
3.  Docker y Docker Compose

### 1. Instalacion de dependencias

```bash
corepack enable
pnpm install
```

### 2. Variables de Entorno

Duplica el archivo de ejemplo:

```bash
cp .env.example .env
```

### 3. Iniciar el Entorno Local

Todo el flujo de base de datos local esta automatizado. Ejecuta:

```bash
pnpm db:start     # Levanta PostgreSQL en Docker
pnpm db:migrate   # Aplica migraciones Drizzle
pnpm db:seed      # Carga usuarios demo y estructura base
pnpm web:dev      # Inicia el servidor en http://localhost:3000
```

## Flujo de Trabajo y Pruebas

Antes de enviar cualquier cambio al repositorio (Push), debes asegurar que tu codigo cumple con los estandares de la arquitectura:

```bash
# Ejecuta la suite de validacion completa
pnpm validate
```

Para comandos especificos:
*   `pnpm typecheck`: Valida contratos TypeScript.
*   `pnpm check:boundaries`: Analizador estatico que previene que los modulos rompan la arquitectura limpia.
*   `pnpm test:unit`: Pruebas unitarias ultrarrapidas.
*   `pnpm test:integration`: Pruebas de integracion completas (requiere BD).

## Contribucion al Proyecto

�Bienvenido! Apreciamos mucho las contribuciones. Si deseas aportar al proyecto, corregir bugs o a�adir nuevas funcionalidades, por favor lee nuestra [Guia de Contribucion (CONTRIBUTING.md)](./CONTRIBUTING.md) antes de empezar.

Revisa tambien nuestro [Codigo de Conducta](./CODE_OF_CONDUCT.md).

## Hoja de Ruta (Roadmap)

Puedes consultar el plan detallado de caracteristicas restantes para la Version 1 en nuestro documento oficial: [`docs/ROADMAP_V1_FEATURES.md`](./docs/ROADMAP_V1_FEATURES.md) (si aplica en tu carpeta actual).
