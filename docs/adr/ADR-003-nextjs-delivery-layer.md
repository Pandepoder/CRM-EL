# ADR-003 Next.js Como Delivery Layer

## Estado

Aprobado. **Implementacion activa en V1** (`v1.0.0-usable`, ADR-012).

## Contexto

Next.js podrá ser frontend y capa de entrega del MVP.

## Problema

Server actions y API handlers pueden volverse lugares tentadores para reglas de negocio.

## Opciones Consideradas

- Lógica dentro de handlers.
- Backend separado desde el día uno.
- Handlers delgados que invocan casos de uso.

## Pros Y Contras

Handlers con lógica son rápidos al inicio, pero generan deuda. Backend separado aumenta ceremonia. Handlers delgados conservan velocidad y arquitectura.

## Decisión

Next.js solo autentica, autoriza, valida entrada, invoca un caso de uso y traduce resultado.

## Consecuencias

La lógica vive en módulos application/domain. Los handlers no acceden directo a tablas.

## Riesgos

Si el equipo mete queries en handlers, el modular monolith pierde valor.

## Cuándo Reconsiderarla

Si la capa de entrega necesita múltiples clientes con lógica de transporte muy distinta, se evaluará backend dedicado.
