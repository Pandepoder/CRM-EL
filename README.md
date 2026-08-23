# Tonala OS

Sistema operativo territorial construido como modular monolith event-driven.

## Estado del producto

| Fase | Version | Estado |
|------|---------|--------|
| Walking Skeleton (baseline arquitectonico) | `v0.1.0-walking-skeleton` | Completado (ADR-010) |
| **V1 utilizable (objetivo actual)** | `v1.0.0-usable` | En planificacion / implementacion |

Direccion de producto: **web-first** (escritorio y laptop como experiencia principal) con **layout responsive** para telefonos. No es una app nativa separada.

Documentacion activa:

- [`docs/PRODUCT_OPERABILITY_PLAN_V1.md`](docs/PRODUCT_OPERABILITY_PLAN_V1.md) — alcance, incrementos y criterios de terminado V1
- [`docs/adr/ADR-012-v1-usable-web-first.md`](docs/adr/ADR-012-v1-usable-web-first.md) — decision arquitectonica V1
- [`docs/cliente/TONALA_OS_V1_QUE_FALTA.pdf`](docs/cliente/TONALA_OS_V1_QUE_FALTA.pdf) — resumen sencillo para cliente (que falta para V1)

## Requisitos

- Node.js 24 o compatible.
- pnpm 11.
- Docker con Docker Compose.

## Instalacion

```bash
corepack enable
pnpm install
```

Copia `.env.example` a `.env` para desarrollo local.

## Entorno Local

PostgreSQL local corre en Docker Compose. No se requiere base remota para desarrollo diario.

```bash
pnpm db:start
pnpm db:migrate
pnpm db:seed
pnpm web:dev
pnpm validate
```

Comandos utiles:

```bash
pnpm db:status
pnpm db:stop
pnpm db:reset
pnpm typecheck
pnpm lint
pnpm check:boundaries
pnpm test:unit
pnpm test:integration
pnpm test
pnpm validate:unit
```

Datos temporales: volumen Docker `tonala_os_postgres_data`. `pnpm db:reset` elimina ese volumen y reconstruye migraciones/seeds.

`pnpm test:unit` y `pnpm validate:unit` no requieren PostgreSQL. `pnpm test`,
`pnpm test:integration` y `pnpm validate` requieren `.env` con `DATABASE_URL`
y un PostgreSQL disponible, normalmente iniciado con `pnpm db:start`.

## Estructura

```txt
apps/web
packages/modules/<module>/{domain,application,infrastructure,contracts}
packages/shared/{kernel,database,auth,outbox,observability,errors}
packages/ui
packages/config
db/migrations
db/seeds
docs/adr
docs/PRODUCT_OPERABILITY_PLAN_V1.md
docs/ROADMAP_V1.md
```

## Reglas De Arquitectura

- Module-first.
- Los modulos no importan `domain`, `application` o `infrastructure` internos de otros modulos.
- La comunicacion entre modulos ocurre por contratos publicos, casos de uso autorizados, eventos o query models explicitos.
- Next.js es la delivery layer de V1: autentica, autoriza, valida entrada, invoca casos de uso y traduce resultado.
- Supabase es infraestructura, no arquitectura.

El boundary checker actual es una primera defensa automatizada. Podra complementarse despues con herramientas de analisis de dependencias, pero desde el Bloque 1 ya falla ante imports prohibidos.

## Convencion De Ramas Y Commits

Rama principal: `main`.

Ramas de trabajo:

- `feature/<descripcion-corta>`
- `fix/<descripcion-corta>`
- `chore/<descripcion-corta>`
- `adr/<numero-tema>`

Commits:

- `feat: ...`
- `fix: ...`
- `chore: ...`
- `docs: ...`
- `test: ...`
- `refactor: ...`
- `adr: ...`
