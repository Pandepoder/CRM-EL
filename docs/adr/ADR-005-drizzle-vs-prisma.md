# ADR-005 Drizzle Vs Prisma

## Estado

Aprobado: Drizzle.

## Contexto

El MVP requiere PostgreSQL, migraciones claras, índices, control transaccional y Transactional Outbox.

## Problema

El ORM debe ayudar sin esconder demasiado SQL ni dificultar patrones de consistencia.

## Opciones Consideradas

- Drizzle.
- Prisma.
- SQL manual con `pg`.

## Pros Y Contras

Drizzle ofrece tipos, control cercano a SQL y migraciones explícitas. Prisma acelera CRUD, pero abstrae más la base y puede ser menos cómodo para SQL avanzado. SQL manual da máximo control, pero pierde ergonomía y tipos.

## Decisión

Usar Drizzle para schema, queries tipadas y migraciones.

## Consecuencias

La infraestructura de DB vivirá en `packages/shared/database`; los módulos usarán adaptadores/repositorios, no conexión global directa.

## Riesgos

Drizzle exige más criterio SQL del equipo que Prisma.

## Cuándo Reconsiderarla

Si el equipo necesita productividad CRUD por encima de control SQL, o si Drizzle bloquea migraciones/consultas críticas.
