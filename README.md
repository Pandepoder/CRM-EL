# Tonala OS - Sistema de Gestion Operativa Territorial

**Tonala OS** es una plataforma integral (ERP/CRM) disenada especificamente para el control territorial, logistica y administracion de estructuras ciudadanas. Construida con una arquitectura de grado empresarial, la plataforma centraliza la informacion geografica, el padron ciudadano, y la agenda operativa en un solo ecosistema seguro.

## Descripcion General del Sistema

El proyecto esta disenado para resolver la complejidad de coordinar equipos en calle y analizar datos territoriales en tiempo real. Actua como el centro de mando (Command Center) para administradores y coordinadores, ofreciendo:

- **Inteligencia Territorial:** Un mapa interactivo en tiempo real que permite visualizar incidencias, auditorias de eventos y calor demografico.
- **Directorio Ciudadano (CRM):** Un motor de busqueda y paginacion avanzado para gestionar contactos, asignacion de habilidades, zonas y disponibilidad operativa.
- **Gestion de Estructuras:** Administracion jerarquica de equipos, asignacion de coordinadores territoriales, representantes generales y responsables de ruta.
- **Trazabilidad y Auditoria:** Cada interaccion en el sistema esta protegida por una capa de validacion de roles estricta y un patron de eventos (*Outbox Pattern*) para evitar la perdida de datos y asegurar consistencia.

---

## Capturas de Pantalla

*(Nota: Reemplaza las imagenes de ejemplo en la carpeta `docs/assets/` con tus capturas reales manteniendo los nombres de archivo, o ajusta las rutas aqui).*

### Panel de Control (Dashboard)
![Dashboard Overview](./docs/assets/dashboard.png)
*Vista principal con metricas agregadas, distribucion demografica y estadisticas de ciudadania.*

### Directorio y CRM
![Modulo CRM](./docs/assets/crm-view.png)
*Gestion de ciudadanos con busqueda, filtros de asignacion y tablas de datos paginadas.*

### Mapa Operativo
![Mapa Territorial](./docs/assets/map-view.png)
*Visualizacion geoespacial de reportes de campo y seccionamiento electoral.*

---

## Estado del Proyecto

| Fase | Version | Estado |
|------|---------|--------|
| Fundacion Base | v0.1.0 | Completado |
| V1 Produccion | v1.0.0 | Implementacion Activa |

Arquitectura principal: Next.js (App Router) en `apps/web`. Orientacion de diseno "Web-first" con adaptacion responsiva para dispositivos moviles.

## Requisitos del Entorno

- Node.js 24 o superior.
- pnpm 11 o superior.
- Docker y Docker Compose (requerido para el motor de base de datos local PostgreSQL).

## Instrucciones de Instalacion

1. Habilitar Corepack e instalar dependencias:
   ```bash
   corepack enable
   pnpm install
   ```

2. Configuracion de Variables de Entorno:
   Copiar el archivo de entorno base:
   ```bash
   cp .env.example .env
   ```

## Entorno de Desarrollo Local

El sistema utiliza PostgreSQL. Para el entorno local, se provee un contenedor mediante Docker Compose. No se requiere base de datos remota para el desarrollo diario.

Secuencia de inicio estandar:
```bash
pnpm db:start
pnpm db:migrate
pnpm db:seed
pnpm web:dev
```

Para ejecutar la validacion completa del codigo (requerida antes de enviar cambios al repositorio):
```bash
pnpm validate
```

### Comandos de Utilidad (Base de Datos)

- `pnpm db:status` : Verifica la conexion con PostgreSQL.
- `pnpm db:stop` : Detiene el contenedor de base de datos.
- `pnpm db:reset` : Elimina el esquema publico, regenera migraciones y puebla la base de datos con informacion predeterminada.

## Estructura Arquitectonica

El proyecto utiliza un patron **Modular Monolith (Event-Driven)** apoyado en **Clean Architecture**.

```txt
apps/web                                        # Interfaz de usuario (Next.js)
packages/modules/<module>/                      # Logica de negocio por dominio
  |- domain/                                    # Entidades e interfaces centrales
  |- application/                               # Casos de uso
  |- infrastructure/                            # Implementacion de repositorios y BD
  |- contracts/                                 # Contratos expuestos a otros modulos
packages/shared/                                # Codigo compartido (BD, Auth, Kernel)
packages/ui/                                    # Componentes visuales reutilizables
packages/config/                                # Configuracion central del sistema
db/migrations/                                  # Historial de cambios de base de datos
docs/assets/                                    # Imagenes y documentacion visual
```

- **Estructura Modular:** El codigo se organiza por modulo de negocio, no por capa tecnica.
- **Limites Estrictos:** Ningun modulo debe importar elementos internos de otro modulo. La comunicacion se realiza exclusivamente a traves de la capa `contracts`.
- **Capa de Presentacion:** `apps/web` actua unicamente como capa de entrega (Delivery Layer). Sus responsabilidades se limitan a autenticacion, validacion de entrada e invocacion de casos de uso.
- **Consistencia de Datos:** Toda operacion de escritura utiliza el patron Outbox para garantizar la consistencia eventual.
- **Revision Automatizada:** El analizador de limites (`boundary-checker`) bloquea cualquier violacion de dependencias en el entorno de integracion continua.

## Estandares de Versionamiento

Rama principal de produccion: `main`

Nomenclatura de ramas de desarrollo y Commits (Conventional Commits):
- `feat:` Nuevas caracteristicas
- `fix:` Correccion de errores
- `chore:` Mantenimiento, dependencias o tareas menores
- `docs:` Actualizacion de documentacion tecnica o README
- `refactor:` Reestructuracion de codigo sin alterar logica de negocio
