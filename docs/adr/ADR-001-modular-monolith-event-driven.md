# ADR-001 Modular Monolith Event-Driven

## Estado

Aprobado.

## Contexto

Tonala OS debe validar un flujo operativo completo antes de escalar a capacidades avanzadas.

## Problema

Necesitamos modularidad real sin pagar el costo operativo de microservicios en el MVP.

## Opciones Consideradas

- Monolito por capas globales.
- Microservicios.
- Modular monolith event-driven.

## Pros Y Contras

Monolito por capas es simple, pero tiende a mezclar dominios. Microservicios aíslan, pero agregan despliegue, red, observabilidad y consistencia distribuida. Modular monolith permite límites internos con transacciones locales.

## Decisión

Usar modular monolith event-driven con Transactional Outbox en PostgreSQL.

## Consecuencias

El repositorio será único y los módulos vivirán en el mismo proceso. Los límites se harán cumplir con contratos, casos de uso, eventos, pruebas y boundary checker.

## Riesgos

Los límites pueden erosionarse si se permiten imports cruzados o queries directas entre módulos.

## Cuándo Reconsiderarla

Cuando existan equipos independientes, cargas de trabajo separadas o necesidades de escalado que justifiquen extraer un módulo.
