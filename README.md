# Tonala OS - Gestor Operativo Territorial

Sistema operativo de control territorial y estructura electoral.
Construido bajo el patron Modular Monolith (Event-Driven) utilizando Clean Architecture.

## Estado del Proyecto

| Fase | Version | Estado |
|------|---------|--------|
| Fundacion Base | v0.1.0 | Completado |
| V1 Produccion | v1.0.0 | Implementacion Activa |

Arquitectura principal: Next.js (App Router) en `apps/web`. Orientacion de diseno "Web-first" con adaptacion responsiva para dispositivos moviles.

## Documentacion Tecnica

- docs/PRODUCT_OPERABILITY_PLAN_V1.md : Alcance y criterios de termino V1.
- docs/adr/ADR-012-v1-usable-web-first.md : Decisiones de arquitectura principal.
- docs/cliente/TONALA_OS_V1_QUE_FALTA.pdf : Resumen ejecutivo.

## Requisitos del Entorno

- Node.js 24 o superior.
- pnpm 11 o superior.
- Docker y Docker Compose (requerido para base de datos local).

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

El sistema utiliza PostgreSQL. Para el entorno local, se provee un contenedor mediante Docker Compose. No se requiere base de datos remota para desarrollo diario.

Secuencia de inicio estandar:
```bash
pnpm db:start
pnpm db:migrate
pnpm db:seed
pnpm web:dev
```

Para ejecutar la validacion completa de codigo (requerida antes de enviar cambios al repositorio):
```bash
pnpm validate
```

### Comandos de Utilidad Base de Datos

- `pnpm db:status` : Verifica la conexion con PostgreSQL.
- `pnpm db:stop` : Detiene el contenedor de base de datos.
- `pnpm db:reset` : Elimina el esquema publico, regenera migraciones y puebla la base de datos con informacion predeterminada.

### Comandos de Calidad de Codigo

- `pnpm typecheck` : Validacion de tipos TypeScript.
- `pnpm lint` : Analisis estatico de codigo.
- `pnpm check:boundaries` : Validacion de limites arquitectonicos entre modulos.
- `pnpm test:unit` : Ejecucion de pruebas unitarias.
- `pnpm test:integration` : Ejecucion de pruebas de integracion.

Nota: Las pruebas unitarias no requieren conexion a base de datos. Las pruebas de integracion y el comando de validacion completa requieren el contenedor PostgreSQL activo.

## Estructura del Proyecto

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
scripts/db/                                     # Automatizacion de BD y semillas
docs/                                           # Documentacion tecnica y de negocio
```

## Estandares Arquitectonicos

- **Estructura Modular:** El codigo se organiza por modulo de negocio, no por capa tecnica.
- **Limites Estrictos:** Ningun modulo debe importar elementos internos (`domain`, `application`, `infrastructure`) de otro modulo. La comunicacion se realiza exclusivamente a traves de la carpeta `contracts`.
- **Capa de Presentacion:** `apps/web` actua unicamente como capa de entrega (Delivery Layer). Sus responsabilidades se limitan a autenticacion, validacion de entrada e invocacion de casos de uso (Application).
- **Consistencia de Datos:** Toda operacion de escritura utiliza el patron Outbox para garantizar la consistencia eventual.
- **Revision Automatizada:** El analizador de limites (`boundary-checker`) bloqueara cualquier violacion de importacion en el entorno de integracion continua.

## Estandares de Versionamiento

Rama principal de produccion: `main`

Nomenclatura de ramas de desarrollo:
- `feature/<descripcion-corta>`
- `fix/<descripcion-corta>`
- `chore/<descripcion-corta>`
- `adr/<numero-tema>`

Nomenclatura de commits (Conventional Commits):
- `feat: <mensaje>`
- `fix: <mensaje>`
- `chore: <mensaje>`
- `docs: <mensaje>`
- `test: <mensaje>`
- `refactor: <mensaje>`
- `adr: <mensaje>`
