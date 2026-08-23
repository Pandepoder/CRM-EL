# ADR-004 Supabase Como Infraestructura, No Arquitectura

## Estado

Aprobado.

## Contexto

Supabase aporta PostgreSQL, Auth, Storage y herramientas locales/operativas.

## Problema

Acoplar reglas de negocio a APIs propietarias o triggers no documentados dificultaría evolucionar Tonala OS.

## Opciones Consideradas

- Usar Supabase como arquitectura completa.
- Usar PostgreSQL administrado sin Supabase.
- Usar Supabase como infraestructura detrás de adaptadores.

## Pros Y Contras

Supabase acelera, pero puede acoplar. PostgreSQL puro da control, pero pierde Auth/operación. Adaptadores permiten velocidad con salida futura.

## Decisión

Supabase será infraestructura. La aplicación no accederá directo desde frontend a tablas de dominio.

## Consecuencias

RLS será defensa adicional, no única autorización. Application layer seguirá aplicando permisos.

## Riesgos

Duplicar reglas entre app y RLS puede causar inconsistencias si no se documenta.

## Cuándo Reconsiderarla

Si Supabase limita operación, costos, cumplimiento o patrones de despliegue.
